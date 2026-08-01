from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.core.showcase_seed import _SHOWCASE_SKETCHES, seed_showcase_data
from app.db.models.build_output import BuildOutput


async def test_showcase_seed_creates_complete_static_product_sketches(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        await seed_showcase_data(session)
        builds = (await session.execute(select(BuildOutput))).scalars().all()

        assert len(builds) == 3
        assert {build.idea_id for build in builds} == set(_SHOWCASE_SKETCHES)
        for build in builds:
            assert build.status == "ready"
            assert build.product_sketch == _SHOWCASE_SKETCHES[build.idea_id]
            assert build.product_sketch["buyer_signals"]
            assert build.product_sketch["risks"]
            assert build.product_sketch["monetisation"]

        await seed_showcase_data(session)
        assert len((await session.execute(select(BuildOutput))).scalars().all()) == 3
