def test_worker_session_creates():
    from worker.db import SessionLocal
    session = SessionLocal()
    assert session is not None
    session.close()
