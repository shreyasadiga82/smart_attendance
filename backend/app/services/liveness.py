import cv2
import numpy as np
import time
from typing import List, Tuple, Dict, Any
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class LivenessChecker:
    def __init__(self):
        self.history = {}
        self.is_pi_mode = (settings.PROFILE == "pi3")

    def check_liveness(self, face_id: str, frame: np.ndarray, bbox: List[int], landmarks: np.ndarray = None) -> bool:
        """
        Check liveness. Uses light frame-difference for Pi, or landmarks for Laptop.
        """
        if not settings.LIVENESS_CHECK:
            return True
            
        if self.is_pi_mode:
            return self._light_liveness_check(face_id, frame, bbox)
        else:
            return self._heavy_liveness_check(face_id, landmarks)

    def _light_liveness_check(self, face_id: str, frame: np.ndarray, bbox: List[int]) -> bool:
        # Lightweight check: frame difference inside the bounding box over consecutive frames
        current_time = time.time()
        x1, y1, x2, y2 = bbox
        
        # Ensure bbox is within frame
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        
        face_crop = frame[y1:y2, x1:x2]
        if face_crop.size == 0:
            return False
            
        gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        gray_crop = cv2.resize(gray_crop, (64, 64)) # Normalize size for comparison
        
        if face_id not in self.history:
            self.history[face_id] = {'last_frame': gray_crop, 'last_time': current_time, 'score': 0}
            return False # Need more frames
            
        prev_data = self.history[face_id]
        if current_time - prev_data['last_time'] > 2.0:
            # Stale history
            self.history[face_id] = {'last_frame': gray_crop, 'last_time': current_time, 'score': 0}
            return False
            
        prev_frame = prev_data['last_frame']
        diff = cv2.absdiff(gray_crop, prev_frame)
        mean_diff = np.mean(diff)
        
        # Extremely simple heuristic: some movement implies liveness, too much implies track loss
        # Since it's a Pi, we just want to avoid printed photos which have exactly 0 change (ignoring noise)
        if 2.0 < mean_diff < 40.0:
            prev_data['score'] += 1
        else:
            prev_data['score'] = max(0, prev_data['score'] - 1)
            
        prev_data['last_frame'] = gray_crop
        prev_data['last_time'] = current_time
        
        # Require a few consecutive "good" frames
        return prev_data['score'] >= 2

    def _heavy_liveness_check(self, face_id: str, landmarks: np.ndarray) -> bool:
        if landmarks is None or len(landmarks) < 5:
            return False

        current_time = time.time()
        # Landmarks: 0: left_eye, 1: right_eye, 2: nose, 3: left_mouth, 4: right_mouth
        pts = np.array(landmarks, dtype=np.float32)

        # Inter-ocular distance for normalization
        eye_dist = np.linalg.norm(pts[0] - pts[1])
        if eye_dist < 1e-4:
            return False

        # Nose to eye-center displacement ratio
        eye_center = (pts[0] + pts[1]) / 2.0
        nose_offset = np.linalg.norm(pts[2] - eye_center) / eye_dist

        if face_id not in self.history:
            self.history[face_id] = {
                'last_offset': nose_offset,
                'last_time': current_time,
                'movements': 0
            }
            return False

        prev = self.history[face_id]
        if current_time - prev['last_time'] > 2.5:
            self.history[face_id] = {
                'last_offset': nose_offset,
                'last_time': current_time,
                'movements': 0
            }
            return False

        delta = abs(nose_offset - prev['last_offset'])
        # Dynamic micro-movement: natural live faces show subtle variation (0.01 to 0.25)
        if 0.008 < delta < 0.35:
            prev['movements'] += 1
        elif delta <= 0.005:
            # Completely static photo held steady
            prev['movements'] = max(0, prev['movements'] - 1)

        prev['last_offset'] = nose_offset
        prev['last_time'] = current_time

        return prev['movements'] >= 2

    def clear_history(self, face_id: str):
        if face_id in self.history:
            del self.history[face_id]