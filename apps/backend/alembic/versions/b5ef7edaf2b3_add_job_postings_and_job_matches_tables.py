"""add job_postings and job_matches tables

Revision ID: b5ef7edaf2b3
Revises: e6f5e0b9e853
Create Date: 2025-11-03 09:39:35.009024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5ef7edaf2b3'
down_revision: Union[str, Sequence[str], None] = 'e6f5e0b9e853'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create job_postings table
    op.create_table(
        'job_postings',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('external_id', sa.String(), index=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('company', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Create job_matches table
    op.create_table(
        'job_matches',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('session_id', sa.Integer, sa.ForeignKey('interview_sessions.id')),
        sa.Column('resume_id', sa.Integer, sa.ForeignKey('resumes.id')),
        sa.Column('job_id', sa.Integer, sa.ForeignKey('job_postings.id'), nullable=False),
        sa.Column('similarity', sa.Float(), default=0.0),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('job_matches')
    op.drop_table('job_postings')
