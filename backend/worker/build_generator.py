import logging
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea
from app.pipeline.json_parsing import parse_json_response
from app.runners.selector import _default_runners, select_runner_or_raise

logger = logging.getLogger(__name__)

_SKETCH_PROMPT = (Path(__file__).parent / "prompts" / "product_sketch.md").read_text()
_PLAN_PROMPT = (Path(__file__).parent / "prompts" / "technical_plan.md").read_text()
_PRD_PROMPT = (Path(__file__).parent / "prompts" / "prd.md").read_text()


def _sanitize(value: str) -> str:
    return value.replace("{{", "{ {").replace("}}", "} }")


def _fill(template: str, idea: Idea) -> str:
    return (template
        .replace("{{title}}", _sanitize(idea.title))
        .replace("{{description}}", _sanitize(idea.description))
        .replace("{{why_novel}}", _sanitize(idea.why_novel))
        .replace("{{who_builds}}", _sanitize(idea.who_builds))
        .replace("{{who_buys}}", _sanitize(idea.who_buys))
        .replace("{{paper_ids}}", ", ".join(_sanitize(p) for p in idea.paper_ids)))


def generate_product_sketch(idea: Idea, runner) -> dict:
    prompt = _fill(_SKETCH_PROMPT, idea)
    response = runner.run(prompt)
    return parse_json_response(response, expected_type=dict)


def generate_technical_plan(idea: Idea, runner) -> str:
    prompt = _fill(_PLAN_PROMPT, idea)
    return runner.run(prompt)


def generate_prd(idea: Idea, runner) -> str:
    prompt = _fill(_PRD_PROMPT, idea)
    return runner.run(prompt)


def run_build(session: Session, build_id: str, idea_id: str) -> None:
    build = session.get(BuildOutput, build_id)
    idea = session.get(Idea, idea_id)
    if not build or not idea:
        logger.error(f"Build {build_id} or idea {idea_id} not found")
        return

    runner = select_runner_or_raise(_default_runners())

    try:
        build.product_sketch = generate_product_sketch(idea, runner)
        flag_modified(build, "product_sketch")
        session.commit()

        build.technical_plan = generate_technical_plan(idea, runner)
        session.commit()

        build.prd = generate_prd(idea, runner)
        build.status = "ready"
        session.commit()
        logger.info(f"Build {build_id} complete")
    except Exception as e:
        build.status = "failed"
        session.commit()
        logger.error(f"Build {build_id} failed: {e}")
        raise
