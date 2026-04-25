async def test_list_saved_empty(client):
    r = await client.get("/api/saved/")
    assert r.status_code == 200
    assert r.json() == []


async def test_save_nonexistent_idea(client):
    r = await client.post("/api/saved/", json={"idea_id": "bad-id"})
    assert r.status_code == 404


async def test_unsave_nonexistent_returns_404(client):
    r = await client.delete("/api/saved/bad-id")
    assert r.status_code == 404
