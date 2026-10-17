import abc
from typing import Optional, Tuple
import cv2
import numpy as np
import time
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class CameraSource(abc.ABC):
    @abc.abstractmethod
    def start(self) -> bool:
        pass

    @abc.abstractmethod
    def stop(self) -> None:
        pass

    @abc.abstractmethod
    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        pass

    @abc.abstractmethod
    def is_opened(self) -> bool:
        pass


class BrowserStreamSource(CameraSource):
    def __init__(self):
        self._frame = None
        self._opened = False
        
    def start(self) -> bool:
        self._opened = True
        return True

    def stop(self) -> None:
        self._opened = False
        self._frame = None

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self._frame is not None:
            return True, self._frame
        else:
            frame = np.zeros((settings.FRAME_WIDTH or 640, settings.FRAME_WIDTH or 640, 3), dtype=np.uint8)
            return False, frame

    def is_opened(self) -> bool:
        return self._opened

    def set_frame(self, frame: np.ndarray):
        self._frame = frame


class OpenCVSource(CameraSource):
    def __init__(self, camera_id: int = 0):
        self.camera_id = camera_id
        self.cap = None
        self._opened = False
        self.target_fps = settings.STREAM_FPS or 5
        self.last_frame_time = 0

    def start(self) -> bool:
        self.cap = cv2.VideoCapture(self.camera_id)
        if not self.cap.isOpened():
            logger.error(f"Failed to open camera {self.camera_id}")
            return False
        self._opened = True
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, settings.FRAME_WIDTH or 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int((settings.FRAME_WIDTH or 640) * 0.75))
        self.cap.set(cv2.CAP_PROP_FPS, 30)
        return True

    def stop(self) -> None:
        if self.cap is not None:
            self.cap.release()
        self._opened = False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self.cap is None or not self.cap.isOpened():
            return False, None
            
        ret, frame = self.cap.read()
        if not ret:
            return False, None
            
        current_time = time.time()
        if current_time - self.last_frame_time < 1.0 / self.target_fps:
            return True, frame  # Return frame anyway, caller will skip if needed, or we just drop internally
            
        self.last_frame_time = current_time
        
        # Resize if necessary to match config
        target_w = settings.FRAME_WIDTH or 640
        if frame.shape[1] != target_w:
            h, w = frame.shape[:2]
            target_h = int(h * (target_w / w))
            frame = cv2.resize(frame, (target_w, target_h))
            
        return True, frame

    def is_opened(self) -> bool:
        return self._opened and self.cap is not None and self.cap.isOpened()


class PiCameraSource(CameraSource):
    def __init__(self):
        self._opened = False
        self.picam2 = None
        self.target_fps = settings.STREAM_FPS or 2
        self.last_frame_time = 0
        self.fallback_source = None

    def start(self) -> bool:
        try:
            # Try to load picamera2
            from picamera2 import Picamera2
            self.picam2 = Picamera2()
            
            target_w = settings.FRAME_WIDTH or 320
            target_h = int(target_w * 0.75)
            
            config = self.picam2.create_preview_configuration(main={"size": (target_w, target_h), "format": "RGB888"})
            self.picam2.configure(config)
            self.picam2.start()
            self._opened = True
            logger.info("PiCameraSource started with picamera2.")
            return True
        except ImportError:
            logger.warning("picamera2 not found. Falling back to OpenCV V4L2 source.")
            self.fallback_source = OpenCVSource(0)
            return self.fallback_source.start()
        except Exception as e:
            logger.warning(f"Failed to start picamera2: {e}. Falling back to OpenCVSource.")
            self.fallback_source = OpenCVSource(0)
            return self.fallback_source.start()

    def stop(self) -> None:
        if self.fallback_source:
            self.fallback_source.stop()
        elif self.picam2:
            self.picam2.stop()
        self._opened = False

    def read_frame(self) -> Tuple[bool, Optional[np.ndarray]]:
        if self.fallback_source:
            return self.fallback_source.read_frame()
            
        if not self._opened or not self.picam2:
            return False, None
            
        current_time = time.time()
        if current_time - self.last_frame_time < 1.0 / self.target_fps:
            return False, None # Skip frame
            
        try:
            # Capture as numpy array (RGB)
            frame = self.picam2.capture_array()
            # Convert RGB to BGR for OpenCV consistency
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            self.last_frame_time = time.time()
            return True, frame
        except Exception as e:
            logger.error(f"Error reading from picamera2: {e}")
            return False, None

    def is_opened(self) -> bool:
        if self.fallback_source:
            return self.fallback_source.is_opened()
        return self._opened