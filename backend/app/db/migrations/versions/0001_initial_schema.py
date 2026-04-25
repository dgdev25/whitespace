"""initial schema"""
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS ruvector")
    op.create_table("papers",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("arxiv_id", sa.String(32), nullable=False, unique=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("authors", sa.Text(), nullable=False),
        sa.Column("abstract", sa.Text()),
        sa.Column("full_text", sa.Text()),
        sa.Column("categories", sa.String(256), nullable=False),
        sa.Column("published_date", sa.String(32), nullable=False),
        sa.Column("url", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_papers_arxiv_id", "papers", ["arxiv_id"])
    op.create_table("chunks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("paper_id", sa.String(), sa.ForeignKey("papers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding_id", sa.String()),
    )
    op.create_index("ix_chunks_paper_id", "chunks", ["paper_id"])
    op.create_table("ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("why_novel", sa.Text(), nullable=False),
        sa.Column("who_builds", sa.Text(), nullable=False),
        sa.Column("who_buys", sa.Text(), nullable=False),
        sa.Column("novelty_score", sa.Float(), nullable=False),
        sa.Column("feasibility_score", sa.Float(), nullable=False),
        sa.Column("badge", sa.String(32), nullable=False),
        sa.Column("featured_date", sa.String(16)),
        sa.Column("is_featured", sa.Boolean(), default=False),
        sa.Column("paper_ids", sa.JSON(), default=list),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ideas_featured_date", "ideas", ["featured_date"])
    op.create_table("connected_ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("connected_idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_paper_count", sa.Integer(), default=1),
    )
    op.create_index("ix_connected_ideas_idea_id", "connected_ideas", ["idea_id"])
    op.create_table("saved_ideas",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table("build_outputs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("idea_id", sa.String(), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("product_sketch", sa.JSON(), nullable=False),
        sa.Column("technical_plan", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_build_outputs_idea_id", "build_outputs", ["idea_id"])
    op.create_table("ingestion_runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("run_date", sa.String(16), nullable=False),
        sa.Column("papers_fetched", sa.Integer(), default=0),
        sa.Column("ideas_generated", sa.Integer(), default=0),
        sa.Column("error", sa.Text()),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )


def downgrade():
    for t in ["ingestion_runs", "build_outputs", "saved_ideas", "connected_ideas", "ideas", "chunks", "papers"]:
        op.drop_table(t)
