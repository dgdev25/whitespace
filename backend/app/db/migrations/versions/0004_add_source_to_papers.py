"""add source column to papers"""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("papers", sa.Column("source", sa.String(32), nullable=True, server_default="arxiv"))


def downgrade():
    op.drop_column("papers", "source")
