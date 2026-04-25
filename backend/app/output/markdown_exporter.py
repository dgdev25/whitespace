from datetime import datetime


def _fmt_date(value: str | None) -> str:
    if not value:
        return "Unknown"
    try:
        return datetime.fromisoformat(value).strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return value


def export_markdown(payload: dict) -> str:
    """Export session data as formatted markdown."""
    lines: list[str] = []

    session = payload.get("session", {})
    project = payload.get("project", {})
    industries = payload.get("industries", [])
    papers = payload.get("papers", [])
    analyses = payload.get("analyses", [])
    gaps = payload.get("gaps", {})
    ideas = payload.get("ideas", [])

    lines.append("# Whitespace Research Synthesis Report")

    lines.append("")
    lines.append("## Session Summary")
    lines.append(f"- **Project**: {project.get('name') or 'Unknown'}")
    lines.append(f"- **Session ID**: {session.get('id')}")
    lines.append(f"- **Status**: {session.get('status')}")
    lines.append(f"- **Created**: {_fmt_date(session.get('created_at'))}")
    lines.append(f"- **Completed**: {_fmt_date(session.get('completed_at'))}")
    lines.append(f"- **Runner**: {session.get('runner_used') or 'Unknown'}")
    lines.append(f"- **Analysis Model**: {session.get('analysis_model') or 'Unknown'}")
    lines.append(f"- **Synthesis Model**: {session.get('synthesis_model') or 'Unknown'}")
    lines.append(
        f"- **Thresholds**: novelty ≥ {session.get('novelty_threshold')}, "
        f"feasibility ≥ {session.get('feasibility_threshold')}"
    )

    if industries:
        lines.append("")
        lines.append("## Industries")
        for industry in industries:
            lines.append(f"- **{industry.get('name')}** — {industry.get('description')}")

    if papers:
        lines.append("")
        lines.append("## Papers")
        for paper in papers:
            title = paper.get("title") or "Untitled"
            lines.append(f"- **{title}** ({paper.get('source_type')})")

    if analyses:
        lines.append("")
        lines.append("## Paper Analyses")
        for analysis in analyses:
            lines.append("")
            lines.append(f"### Paper {analysis.get('paper_id')}")
            if analysis.get("summary"):
                lines.append(analysis["summary"])
            if analysis.get("key_claims"):
                lines.append("**Key Claims:**")
                for claim in analysis["key_claims"]:
                    lines.append(f"- {claim}")
            if analysis.get("methods"):
                lines.append("**Methods:**")
                for method in analysis["methods"]:
                    lines.append(f"- {method}")
            if analysis.get("open_questions"):
                lines.append("**Open Questions:**")
                for question in analysis["open_questions"]:
                    lines.append(f"- {question}")
            if analysis.get("stated_limitations"):
                lines.append("**Stated Limitations:**")
                for limitation in analysis["stated_limitations"]:
                    lines.append(f"- {limitation}")

    lines.append("")
    lines.append("## Gap Map")
    if gaps.get("gaps"):
        lines.append("### Gaps")
        for gap in gaps["gaps"]:
            lines.append(f"- {gap}")
    if gaps.get("contradictions"):
        lines.append("### Contradictions")
        for contradiction in gaps["contradictions"]:
            lines.append(f"- {contradiction}")
    if gaps.get("recurring_themes"):
        lines.append("### Recurring Themes")
        for theme in gaps["recurring_themes"]:
            lines.append(f"- {theme}")

    if ideas:
        lines.append("")
        lines.append("## Synthesized Ideas")
        for idea in ideas:
            lines.append("")
            lines.append(f"### {idea.get('title')}")
            if idea.get("description"):
                lines.append(idea["description"])
            lines.append(
                f"- **Scores**: Novelty {idea.get('novelty_score')}, "
                f"Feasibility {idea.get('feasibility_score')}"
            )
            if idea.get("supporting_gaps"):
                lines.append("- **Supporting Gaps:**")
                for gap in idea["supporting_gaps"]:
                    lines.append(f"  - {gap}")
            if idea.get("why_unexplored"):
                lines.append(f"- **Why Unexplored**: {idea.get('why_unexplored')}")
            if idea.get("industry_assessments"):
                lines.append("- **Industry Assessments:**")
                for assessment in idea["industry_assessments"]:
                    lines.append(
                        f"  - **{assessment.get('industry_name')}**: "
                        f"{assessment.get('applicability_score')} — "
                        f"{assessment.get('applicability_description')}"
                    )

    if papers:
        lines.append("")
        lines.append("## Appendix: Paper Metadata")
        for paper in papers:
            lines.append(
                f"- {paper.get('title') or 'Untitled'} "
                f"({paper.get('source_type')}): {paper.get('source_url') or 'n/a'}"
            )

    lines.append("")
    lines.append("---")
    lines.append("Generated by Whitespace Research Synthesis Engine")

    return "\n".join(lines)
