import sys
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# ✅ Add your app to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# ✅ Import Base and all models (existing + new interview models)
from app.core.database import Base
from app.models.resume import Resume
from app.models.candidate import Candidate
from app.models import interview  # 👈 import your new interview models

# ✅ Alembic target metadata
target_metadata = Base.metadata

# ----------------------------------------------------------------
# Alembic Config
# ----------------------------------------------------------------
config = context.config

# ✅ Load URL from alembic.ini if not already set
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", "postgresql://localhost/ai_interviewer_db")

# ✅ Logging setup
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ----------------------------------------------------------------
# Migration Runners
# ----------------------------------------------------------------
def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()