"""add analysis cache to papers"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("papers", sa.Column("analysis", sa.JSON(), nullable=True))


def downgrade():
    op.drop_column("papers", "analysis")
