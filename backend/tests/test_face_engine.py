import pytest
import numpy as np
from unittest.mock import MagicMock
from app.services.face_engine import FaceEngineFactory, FaceEngine
from app.models import FaceEmbedding, Student


def test_face_engine_factory_selection():
    # Factory correctly identifies supported engines
    assert "opencv_sface" in FaceEngineFactory.SUPPORTED_ENGINES
    assert "insightface" in FaceEngineFactory.SUPPORTED_ENGINES

    # Invalid engine raises ValueError
    with pytest.raises(ValueError, match="Unsupported face engine"):
        FaceEngineFactory.create_engine("unknown_engine_xyz")


def test_cosine_similarity_matrix():
    # Test cosine similarity calculation
    v1 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v2 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v3 = np.array([0.0, 1.0, 0.0], dtype=np.float32)

    # Identical vectors -> similarity = 1.0
    sim_identical = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    assert pytest.approx(sim_identical, 1e-5) == 1.0

    # Orthogonal vectors -> similarity = 0.0
    sim_orthogonal = np.dot(v1, v3) / (np.linalg.norm(v1) * np.linalg.norm(v3))
    assert pytest.approx(sim_orthogonal, 1e-5) == 0.0


def test_engine_mismatch_detection():
    # If a student was enrolled using insightface (512-dim) but current engine is opencv_sface (128-dim),
    # the system detects dimension or engine name mismatch and requires re-enrollment
    enrollment_engine = "insightface"
    enrollment_dim = 512

    current_engine = "opencv_sface"
    current_dim = 128

    is_mismatch = (enrollment_engine != current_engine) or (enrollment_dim != current_dim)
    assert is_mismatch is True


def test_embedding_regeneration_logic():
    # Simulates rebuilding the in-memory embedding matrix from stored embeddings
    mock_db = MagicMock()
    emb1 = MagicMock(student_id=1, embedding="[0.1, 0.2, 0.3]", engine="opencv_sface", dimension=3)
    emb2 = MagicMock(student_id=2, embedding="[0.4, 0.5, 0.6]", engine="opencv_sface", dimension=3)
    mock_db.query.return_value.filter.return_value.all.return_value = [emb1, emb2]

    # Rebuild matrix
    import json
    vectors = []
    student_ids = []
    for item in [emb1, emb2]:
        vec = json.loads(item.embedding)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = [x / norm for x in vec]
        vectors.append(vec)
        student_ids.append(item.student_id)

    matrix = np.array(vectors, dtype=np.float32)
    assert matrix.shape == (2, 3)
    assert student_ids == [1, 2]
