async def test_today_feed_empty(client):
    r = await client.get("/api/ideas/today")
    assert r.status_code == 200
    assert r.json()["ideas"] == []


async def test_surprise_no_ideas(client):
    r = await client.get("/api/ideas/surprise")
    assert r.status_code == 404


async def test_idea_detail_not_found(client):
    r = await client.get("/api/ideas/nonexistent")
    assert r.status_code == 404
