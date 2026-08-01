async def test_health_returns_ok(client):
    r = await client.get("/api/system/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["database"] == "ok"
    assert r.json()["last_ingestion_run"] is None


async def test_showcase_mode_rejects_live_pipeline(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "showcase_demo_mode", True)
    response = await client.post("/api/system/pipeline/run")

    assert response.status_code == 403
    assert "disabled" in response.json()["detail"]
