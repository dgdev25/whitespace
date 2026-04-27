"""add why_novel, who_builds, who_buys to project_ideas"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("project_ideas", sa.Column("why_novel", sa.Text(), nullable=True))
    op.add_column("project_ideas", sa.Column("who_builds", sa.Text(), nullable=True))
    op.add_column("project_ideas", sa.Column("who_buys", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("project_ideas", "who_buys")
    op.drop_column("project_ideas", "who_builds")
    op.drop_column("project_ideas", "why_novel")
