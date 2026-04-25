async def test_health_returns_ok(client):
    r = await client.get("/api/system/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["database"] == "ok"
    assert r.json()["last_ingestion_run"] is None
