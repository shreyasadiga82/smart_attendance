import cv2
import numpy as np
import json
import os
import urllib.request
import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Tuple
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class FaceEngine(ABC):
    def __init__(self):
        self.embeddings = {}  # student_id -> list of embeddings
        self.threshold = settings.RECOGNITION_THRESHOLD
        self.engine_name = "base"
        self.dimension = 0

    @abstractmethod
    def detect_faces(self, frame: np.ndarray) -> List[Dict]:
        pass

    @abstractmethod
    def get_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        pass

    @abstractmethod
    def match_embedding(self, embedding: np.ndarray) -> Tuple[Optional[int], float]:
        pass

    def load_embeddings_from_db(self, db_session):
        self.embeddings = {}
        if db_session is None:
            return

        try:
            from app.models import FaceEmbedding
            # Load only embeddings for this specific engine to avoid dimension mismatches
            face_embeddings = db_session.query(FaceEmbedding).filter(FaceEmbedding.engine == self.engine_name).all()
            for fe in face_embeddings:
                embedding_list = json.loads(fe.embedding)
                embedding = np.array(embedding_list, dtype=np.float32)
                if fe.student_id not in self.embeddings:
                    self.embeddings[fe.student_id] = []
                self.embeddings[fe.student_id].append(embedding)
            
            # Check for embeddings that belong to other engines
            other_engines_count = db_session.query(FaceEmbedding).filter(FaceEmbedding.engine != self.engine_name).count()
            if other_engines_count > 0:
                logger.warning(f"Found {other_engines_count} embeddings from a different engine. Users may need re-enrollment or embeddings need regeneration.")
                
            logger.info(f"Loaded embeddings for {len(self.embeddings)} students (Engine: {self.engine_name})")
        except Exception as e:
            logger.error(f"Error loading embeddings from DB: {e}")

    def add_embedding(self, student_id: int, embedding: np.ndarray):
        if student_id not in self.embeddings:
            self.embeddings[student_id] = []
        self.embeddings[student_id].append(embedding)

    def remove_embeddings_for_student(self, student_id: int):
        if student_id in self.embeddings:
            del self.embeddings[student_id]


class InsightFaceEngine(FaceEngine):
    def __init__(self):
        super().__init__()
        self.engine_name = "insightface"
        self.dimension = 512
        self.model_name = settings.FACE_MODEL_NAME
        self.model = None
        self._load_model()
        self.load_embeddings_from_db(None)

    def _load_model(self):
        try:
            # Lazy import to avoid loading heavy deps if not needed
            import insightface
            self.model = insightface.app.FaceAnalysis(name=self.model_name)
            self.model.prepare(ctx_id=0, det_size=(640, 640))
            logger.info(f"Loaded InsightFace model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to load InsightFace model: {e}")
            raise

    def detect_faces(self, frame: np.ndarray) -> List[Dict]:
        if self.model is None:
            return []
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        faces = self.model.get(rgb_frame)
        results = []
        for face in faces:
            bbox = face.bbox.astype(int)
            landmarks = face.landmark_2d_106 if hasattr(face, 'landmark_2d_106') else face.landmarks
            face_img = face.aligned_image if hasattr(face, 'aligned_image') else frame[bbox[1]:bbox[3], bbox[0]:bbox[2]]
            embedding = face.embedding if hasattr(face, 'embedding') else None
            results.append({
                "bbox": bbox.tolist(),
                "image": face_img,
                "embedding": embedding,
                "landmarks": landmarks
            })
        return results

    def get_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        if self.model is None:
            return None
        try:
            rgb_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
            faces = self.model.get(rgb_image)
            if faces:
                return faces[0].embedding
            return None
        except Exception as e:
            logger.error(f"Error extracting embedding: {e}")
            return None

    def match_embedding(self, embedding: np.ndarray) -> Tuple[Optional[int], float]:
        if self.model is None or len(self.embeddings) == 0:
            return None, 0.0
        embedding_norm = embedding / np.linalg.norm(embedding)
        best_score = -1
        best_student_id = None
        for student_id, embeddings_list in self.embeddings.items():
            for known_embedding in embeddings_list:
                known_norm = known_embedding / np.linalg.norm(known_embedding)
                similarity = np.dot(embedding_norm, known_norm)
                if similarity > best_score:
                    best_score = similarity
                    best_student_id = student_id
        if best_score < self.threshold:
            return None, float(best_score)
        return best_student_id, float(best_score)


class OpenCVSFaceEngine(FaceEngine):
    def __init__(self):
        super().__init__()
        self.engine_name = "opencv_sface"
        self.dimension = 128
        self.detector = None
        self.recognizer = None
        
        self.yunet_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
        self.yunet_hash = "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4"
        
        self.sface_url = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
        self.sface_hash = "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79"
        
        self._load_model()
        self.load_embeddings_from_db(None)

    def _download_model(self, url, filename, expected_hash):
        filepath = os.path.join(settings.MODELS_DIR, filename)
        os.makedirs(settings.MODELS_DIR, exist_ok=True)
        
        if os.path.exists(filepath):
            with open(filepath, "rb") as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            if file_hash.lower() == expected_hash.lower():
                return filepath
            logger.warning(f"Checksum mismatch for {filename}, re-downloading...")
            
        logger.info(f"Downloading {filename}...")
        try:
            urllib.request.urlretrieve(url, filepath)
            with open(filepath, "rb") as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
            if file_hash.lower() != expected_hash.lower():
                raise ValueError(f"Downloaded file {filename} failed checksum validation.")
            return filepath
        except Exception as e:
            logger.error(f"Failed to download {filename}. Offline? Error: {e}")
            raise

    def _load_model(self):
        try:
            yunet_path = self._download_model(self.yunet_url, "face_detection_yunet_2023mar.onnx", self.yunet_hash)
            sface_path = self._download_model(self.sface_url, "face_recognition_sface_2021dec.onnx", self.sface_hash)
            
            self.detector = cv2.FaceDetectorYN.create(
                model=yunet_path,
                config="",
                input_size=(320, 320),
                score_threshold=0.6,
                nms_threshold=0.3,
                top_k=5000
            )
            
            self.recognizer = cv2.FaceRecognizerSF.create(
                model=sface_path,
                config=""
            )
            logger.info("Loaded OpenCV SFace models (YuNet + SFace).")
        except Exception as e:
            logger.error(f"Failed to load OpenCV SFace models: {e}")
            raise

    def detect_faces(self, frame: np.ndarray) -> List[Dict]:
        if self.detector is None:
            return []
            
        height, width, _ = frame.shape
        self.detector.setInputSize((width, height))
        
        faces_status, faces = self.detector.detect(frame)
        results = []
        if faces_status and faces is not None:
            for face in faces:
                bbox = face[0:4].astype(int)
                bbox_xyxy = [bbox[0], bbox[1], bbox[0]+bbox[2], bbox[1]+bbox[3]]
                
                aligned_face = self.recognizer.alignCrop(frame, face)
                embedding = self.recognizer.feature(aligned_face)
                
                results.append({
                    "bbox": bbox_xyxy,
                    "image": aligned_face,
                    "embedding": embedding[0],
                    "landmarks": face[4:14].reshape((5, 2))
                })
        return results

    def get_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        if self.detector is None or self.recognizer is None:
            return None
        try:
            height, width, _ = face_image.shape
            self.detector.setInputSize((width, height))
            faces_status, faces = self.detector.detect(face_image)
            if faces_status and faces is not None and len(faces) > 0:
                aligned_face = self.recognizer.alignCrop(face_image, faces[0])
                embedding = self.recognizer.feature(aligned_face)
                return embedding[0]
            return None
        except Exception as e:
            logger.error(f"Error extracting embedding: {e}")
            return None

    def match_embedding(self, embedding: np.ndarray) -> Tuple[Optional[int], float]:
        if self.recognizer is None or len(self.embeddings) == 0:
            return None, 0.0
            
        best_score = -1
        best_student_id = None
        
        for student_id, embeddings_list in self.embeddings.items():
            for known_embedding in embeddings_list:
                similarity = self.recognizer.match(
                    embedding.reshape(1, -1),
                    known_embedding.reshape(1, -1),
                    cv2.FaceRecognizerSF_FR_COSINE
                )
                if similarity > best_score:
                    best_score = similarity
                    best_student_id = student_id
                    
        if best_score < self.threshold:
            return None, float(best_score)
        return best_student_id, float(best_score)


def get_face_engine() -> FaceEngine:
    if settings.FACE_ENGINE == "opencv_sface":
        return OpenCVSFaceEngine()
    else:
        return InsightFaceEngine()


engine_instance = None

def get_engine() -> FaceEngine:
    global engine_instance
    if engine_instance is None:
        engine_instance = get_face_engine()
    return engine_instance