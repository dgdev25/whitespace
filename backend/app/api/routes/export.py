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


@router.get("/{idea_id}/prd")
async def export_prd(
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

    if not build or build.status != "ready" or not build.prd:
        raise HTTPException(status_code=404, detail="PRD not available")
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    safe_title = "".join(c if c.isalnum() or c in " -" else "" for c in idea.title).strip()
    safe_title = "-".join(safe_title.split())[:80] or "prd"
    return Response(
        content=build.prd,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}-prd.md"'},
    )


@router.get("/{idea_id}/plan")
async def export_plan(
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

    if not build or build.status != "ready" or not build.technical_plan:
        raise HTTPException(status_code=404, detail="Technical plan not available")
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    safe_title = "".join(c if c.isalnum() or c in " -" else "" for c in idea.title).strip()
    safe_title = "-".join(safe_title.split())[:80] or "technical-plan"
    return Response(
        content=build.technical_plan,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}-technical-plan.md"'},
    )


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

    safe_title = "".join(c if c.isalnum() or c in " -" else "" for c in idea.title).strip()
    safe_title = "-".join(safe_title.split())[:80] or "build-plan"
    content = _build_markdown(idea, build)
    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.md"'},
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

    from fpdf import FPDF  # noqa: PLC0415

    _UNICODE_MAP = {
        "—": "--", "–": "-", "‘": "'", "’": "'",
        "“": '"', "”": '"', "…": "...", "•": "*",
        "·": "*", "‒": "-", "‑": "-", "‐": "-",
    }

    def _safe(text: str) -> str:
        for ch, rep in _UNICODE_MAP.items():
            text = text.replace(ch, rep)
        return text.encode("latin-1", errors="replace").decode("latin-1")

    sketch = build.product_sketch or {}
    risks = sketch.get("risks", [])
    monetisation = sketch.get("monetisation", [])

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_left_margin(20)
    pdf.set_right_margin(20)

    def _write(font: str, style: str, size: int, color: tuple, text: str, line_h: float, pad: float) -> None:
        pdf.set_font(font, style, size)
        pdf.set_text_color(*color)
        pdf.set_x(pdf.l_margin)
        pdf.multi_cell(pdf.epw, line_h, _safe(text or ""))
        pdf.set_x(pdf.l_margin)
        if pad:
            pdf.ln(pad)

    def heading(text: str, size: int = 16) -> None:
        _write("Helvetica", "B", size, (17, 17, 17), text, 8, 2)

    def subheading(text: str) -> None:
        _write("Helvetica", "B", 11, (60, 60, 60), text, 7, 1)

    def body(text: str) -> None:
        _write("Helvetica", "", 10, (50, 50, 50), text, 6, 3)

    def rule() -> None:
        pdf.set_draw_color(220, 220, 220)
        pdf.line(20, pdf.get_y(), 190, pdf.get_y())
        pdf.ln(5)

    heading(idea.title, 18)
    body(idea.description or "")
    rule()

    subheading("Why Novel")
    body(idea.why_novel or "")

    subheading("Who Builds This")
    body(idea.who_builds or "")

    subheading("Who Buys This")
    body(idea.who_buys or "")
    rule()

    heading("Product Sketch", 14)

    if sketch.get("value_prop_headline"):
        subheading("Value Proposition")
        _write("Helvetica", "B", 10, (30, 30, 30), sketch["value_prop_headline"], 6, 1)
        body(sketch.get("value_prop_body", ""))

    if sketch.get("buyer_profile"):
        subheading("Buyer Profile")
        body(sketch["buyer_profile"])

    if risks:
        subheading("Risks")
        for r in risks:
            _write("Helvetica", "B", 10, (30, 30, 30), f"• {r.get('title', '')}", 6, 0)
            _write("Helvetica", "", 10, (70, 70, 70), f"  {r.get('description', '')}", 6, 1)

    if monetisation:
        subheading("Monetisation")
        for m in monetisation:
            _write("Helvetica", "B", 10, (30, 30, 30), f"• {m.get('name', '')} ({m.get('fit', '')})", 6, 0)
            _write("Helvetica", "", 10, (70, 70, 70), f"  {m.get('description', '')}", 6, 1)

    rule()
    heading("Technical Plan", 14)
    _write("Courier", "", 9, (40, 40, 40), build.technical_plan or "", 5, 0)

    safe_title = "".join(c if c.isalnum() or c in " -" else "" for c in idea.title).strip()
    safe_title = "-".join(safe_title.split())[:80] or "build-plan"
    pdf_bytes = pdf.output()

    return Response(
        content=bytes(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.pdf"'},
    )
