FROM python:3.11-slim

WORKDIR /workspace/backend

# System dependencies for opencv-headless, psutil, postgresql-client (backup API)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (cached layer)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application + ML package (repo root layout for sys.path)
COPY backend/ .
COPY ml/ /workspace/ml/

ENV PYTHONPATH=/workspace

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /workspace
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
