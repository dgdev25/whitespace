"""add projects, project_runs, project_ideas tables"""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("domain", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("focus_statement", sa.Text(), nullable=True),
        sa.Column("source_config", sa.JSON(), nullable=True),
        sa.Column("pipeline_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "project_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="running"),
        sa.Column("stages", sa.JSON(), nullable=True),
        sa.Column("papers_fetched", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ideas_generated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "project_ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False, index=True),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("project_runs.id"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("paper_refs", sa.JSON(), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("novelty_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("feasibility_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("impact_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("project_ideas")
    op.drop_table("project_runs")
    op.drop_table("projects")
