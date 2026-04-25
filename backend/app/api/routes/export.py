import html
import io
import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_session
from app.db.models.build_output import BuildOutput
from app.db.models.idea import Idea

router = APIRouter(prefix="/export", tags=["export"])

_MD_HEADER_RE = re.compile(r"^(#{1,6}\s)", re.MULTILINE)
_MD_RULE_RE = re.compile(r"^(-{3,}|\*{3,}|_{3,})\s*$", re.MULTILINE)


def _escape_md(text: str) -> str:
    """Escape markdown structure characters that could break document layout."""
    if not text:
        return ""
    text = _MD_HEADER_RE.sub(r"\\\1", text)
    text = _MD_RULE_RE.sub(lambda m: f"\\{m.group(0)}", text)
    return text


def _build_markdown(idea: Idea, build: BuildOutput) -> str:
    sketch = build.product_sketch or {}
    risks = sketch.get("risks", [])
    monetisation = sketch.get("monetisation", [])

    risks_md = "\n".join(
        f"- **{r.get('title', '')}**: {r.get('description', '')}" for r in risks
    )
    monetisation_md = "\n".join(
        f"- **{m.get('name', '')}** ({m.get('fit', '')}): {m.get('description', '')}"
        for m in monetisation
    )

    e = _escape_md
    return f"""# {e(idea.title)}

{e(idea.description)}

## Why Novel
{e(idea.why_novel)}

## Who Builds This
{e(idea.who_builds)}

## Who Buys This
{e(idea.who_buys)}

---

## Product Sketch

### Value Proposition
{e(sketch.get('value_prop_headline', ''))}

{e(sketch.get('value_prop_body', ''))}

### Buyer Profile
{e(sketch.get('buyer_profile', ''))}

### Risks
{risks_md}

### Monetisation
{monetisation_md}

---

## Technical Plan

{e(build.technical_plan)}
"""


@router.get("/{idea_id}/markdown")
async def export_md(
    idea_id: str, session: AsyncSession = Depends(get_session)
) -> Response:
    build = (
        await session.execute(
            select(BuildOutput).where(BuildOutput.idea_id == idea_id)
        )
    ).scalars().first()
    idea = (
        await session.execute(select(Idea).where(Idea.id == idea_id))
    ).scalars().first()

    if not build or build.status != "ready":
        raise HTTPException(status_code=404, detail="Build not ready")
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    safe_id = "".join(c for c in idea_id if c.isalnum() or c == "-")
    content = _build_markdown(idea, build)
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}.md"'},
    )


@router.get("/{idea_id}/pdf")
async def export_pdf_route(
    idea_id: str, session: AsyncSession = Depends(get_session)
) -> Response:
    build = (
        await session.execute(
            select(BuildOutput).where(BuildOutput.idea_id == idea_id)
        )
    ).scalars().first()
    idea = (
        await session.execute(select(Idea).where(Idea.id == idea_id))
    ).scalars().first()

    if not build or build.status != "ready":
        raise HTTPException(status_code=404, detail="Build not ready")
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    try:
        from weasyprint import HTML  # noqa: PLC0415
    except (ImportError, OSError) as exc:
        raise HTTPException(status_code=501, detail="PDF export not yet available") from exc

    sketch = build.product_sketch or {}
    risks = sketch.get("risks", [])
    monetisation = sketch.get("monetisation", [])

    e = html.escape
    risks_html = "".join(
        f"<li><strong>{e(r.get('title', ''))}</strong>: {e(r.get('description', ''))}</li>"
        for r in risks
    )
    monetisation_html = "".join(
        f"<li><strong>{e(m.get('name', ''))}</strong> ({e(m.get('fit', ''))}):"
        f" {e(m.get('description', ''))}</li>"
        for m in monetisation
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body {{ font-family: sans-serif; max-width: 800px; margin: 40px auto; color: #222; }}
  h1, h2, h3 {{ color: #111; }}
  hr {{ border: 1px solid #ddd; }}
</style></head>
<body>
  <h1>{e(idea.title)}</h1>
  <p>{e(idea.description)}</p>
  <h2>Why Novel</h2><p>{e(idea.why_novel)}</p>
  <h2>Who Builds This</h2><p>{e(idea.who_builds)}</p>
  <h2>Who Buys This</h2><p>{e(idea.who_buys)}</p>
  <hr/>
  <h2>Product Sketch</h2>
  <h3>Value Proposition</h3>
  <p><strong>{e(sketch.get('value_prop_headline', ''))}</strong></p>
  <p>{e(sketch.get('value_prop_body', ''))}</p>
  <h3>Buyer Profile</h3><p>{e(sketch.get('buyer_profile', ''))}</p>
  <h3>Risks</h3><ul>{risks_html}</ul>
  <h3>Monetisation</h3><ul>{monetisation_html}</ul>
  <hr/>
  <h2>Technical Plan</h2><pre>{e(build.technical_plan)}</pre>
</body>
</html>"""

    safe_id = "".join(c for c in idea_id if c.isalnum() or c == "-")
    buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(buffer)
    pdf_bytes = buffer.getvalue()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_id}.pdf"'},
    )
