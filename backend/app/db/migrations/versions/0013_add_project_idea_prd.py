"""add prd column to project_ideas"""
import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("project_ideas", sa.Column("prd", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("project_ideas", "prd")
