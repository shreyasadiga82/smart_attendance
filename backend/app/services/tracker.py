"""
Spatial Multi-Face & Eye Tracker.

Provides persistent multi-frame tracking for detected faces using IoU and centroid proximity.
Enables continuous eye sensor observation, blink detection, and prevents repeated attendance
database hammering.
"""

import time
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def compute_iou(boxA: List[int], boxB: List[int]) -> float:
    """Compute Intersection-over-Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interWidth = max(0, xB - xA)
    interHeight = max(0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    return float(interArea / float(boxAArea + boxBArea - interArea))


def compute_centroid_distance_norm(boxA: List[int], boxB: List[int]) -> float:
    """Compute normalized Euclidean distance between centroids of two boxes."""
    cAx = (boxA[0] + boxA[2]) / 2.0
    cAy = (boxA[1] + boxA[3]) / 2.0
    cBx = (boxB[0] + boxB[2]) / 2.0
    cBy = (boxB[1] + boxB[3]) / 2.0

    diagA = np.hypot(boxA[2] - boxA[0], boxA[3] - boxA[1])
    dist = np.hypot(cAx - cBx, cAy - cBy)
    return float(dist / (diagA + 1e-5))


class TrackedFace:
    def __init__(self, track_id: int, bbox: List[int]):
        self.track_id = track_id
        self.bbox = bbox
        self.created_at = time.time()
        self.last_seen = time.time()
        self.frames_tracked = 1

        # Identity & Attendance state
        self.student_id: Optional[int] = None
        self.student_name: Optional[str] = None
        self.roll_no: Optional[str] = None
        self.confidence: float = 0.0
        self.attendance_marked: bool = False
        self.already_marked: bool = False
        self.last_attendance_attempt: float = 0.0


class SpatialFaceTracker:
    """
    IoU and Centroid based multi-object tracker for faces across stream frames.
    """

    def __init__(self, max_stale_seconds: float = 2.5, iou_threshold: float = 0.25, max_centroid_dist: float = 0.40):
        self.max_stale_seconds = max_stale_seconds
        self.iou_threshold = iou_threshold
        self.max_centroid_dist = max_centroid_dist
        self.tracks: Dict[int, TrackedFace] = {}
        self._next_id = 1

    def update(self, detected_bboxes: List[List[int]]) -> List[Tuple[int, List[int], TrackedFace]]:
        """
        Match detected bounding boxes to existing tracks or create new tracks.
        Returns list of (track_id, bbox, tracked_face).
        """
        now = time.time()

        # 1. Prune stale tracks
        stale_ids = [tid for tid, trk in self.tracks.items() if now - trk.last_seen > self.max_stale_seconds]
        for tid in stale_ids:
            del self.tracks[tid]

        if not detected_bboxes:
            return []

        matched_results = []
        unmatched_bboxes = list(range(len(detected_bboxes)))
        unmatched_tracks = list(self.tracks.keys())

        # Match existing tracks with detected bboxes by IoU first, then centroid distance
        if unmatched_tracks and unmatched_bboxes:
            # Score matrix
            cost_matrix = []
            for b_idx in unmatched_bboxes:
                box = detected_bboxes[b_idx]
                row = []
                for tid in unmatched_tracks:
                    trk_box = self.tracks[tid].bbox
                    iou = compute_iou(box, trk_box)
                    cdist = compute_centroid_distance_norm(box, trk_box)
                    # Combined score: higher is better match
                    match_score = iou if iou > 0.1 else (1.0 - min(1.0, cdist)) * 0.5
                    row.append(match_score)
                cost_matrix.append(row)

            # Greedy matching
            used_tracks = set()
            used_bboxes = set()

            # Flatten and sort matches by highest score
            all_matches = []
            for b_idx in range(len(unmatched_bboxes)):
                for t_idx in range(len(unmatched_tracks)):
                    all_matches.append((cost_matrix[b_idx][t_idx], b_idx, unmatched_tracks[t_idx]))

            all_matches.sort(reverse=True, key=lambda x: x[0])

            for score, b_idx, tid in all_matches:
                if b_idx in used_bboxes or tid in used_tracks:
                    continue
                if score >= self.iou_threshold or score >= 0.35:
                    used_bboxes.add(b_idx)
                    used_tracks.add(tid)
                    trk = self.tracks[tid]
                    box = detected_bboxes[b_idx]
                    trk.bbox = box
                    trk.last_seen = now
                    trk.frames_tracked += 1
                    matched_results.append((tid, box, trk))

            # Remaining unmatched bboxes get new tracks
            for b_idx in unmatched_bboxes:
                if b_idx not in used_bboxes:
                    tid = self._next_id
                    self._next_id += 1
                    box = detected_bboxes[b_idx]
                    trk = TrackedFace(track_id=tid, bbox=box)
                    self.tracks[tid] = trk
                    matched_results.append((tid, box, trk))
        else:
            # No existing tracks, register all as new
            for box in detected_bboxes:
                tid = self._next_id
                self._next_id += 1
                trk = TrackedFace(track_id=tid, bbox=box)
                self.tracks[tid] = trk
                matched_results.append((tid, box, trk))

        return matched_results

    def get_track(self, track_id: int) -> Optional[TrackedFace]:
        return self.tracks.get(track_id)

    def reset(self):
        self.tracks.clear()
        self._next_id = 1
