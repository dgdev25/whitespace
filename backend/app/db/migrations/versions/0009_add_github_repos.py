"""add github_repos to user_settings

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("github_repos", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "github_repos")
