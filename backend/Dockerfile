# Python slim base
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Workdir
WORKDIR /app

# Copy pyproject (you created it) or fallback to requirements if you prefer
COPY pyproject.toml /app/pyproject.toml

# Install uv + project deps from pyproject
RUN pip install --upgrade pip \
 && pip install "uv>=0.2.0" \
 && uv pip install -r <(uv pip compile --generate-hashes --quiet pyproject.toml) --system

# Copy app
COPY app /app/app

# Expose & run
EXPOSE 8000
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
