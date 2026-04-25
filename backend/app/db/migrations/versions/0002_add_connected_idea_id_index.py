"""add index on connected_ideas.connected_idea_id"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_connected_ideas_connected_idea_id",
        "connected_ideas",
        ["connected_idea_id"],
    )


def downgrade():
    op.drop_index("ix_connected_ideas_connected_idea_id", table_name="connected_ideas")
