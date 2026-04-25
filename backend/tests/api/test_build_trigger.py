import pytest


@pytest.mark.asyncio
async def test_trigger_build_nonexistent_idea(client):
    r = await client.post("/api/build/nonexistent")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_get_build_not_found(client):
    r = await client.get("/api/build/nonexistent")
    assert r.status_code == 404
