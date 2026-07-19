# Star-map backend: FastAPI + astronomy pipeline.
FROM python:3.12-slim

# CairoSVG needs the Cairo system libraries for PNG rasterisation.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcairo2 \
        libpango-1.0-0 \
        libgdk-pixbuf-2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for better layer caching.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Application code, bundled data, and setup scripts.
COPY backend ./backend
COPY data ./data
COPY scripts ./scripts

# Download the JPL ephemeris into the bundled data dir (catalogue is committed).
RUN python scripts/setup_data.py

ENV PYTHONPATH=/app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "backend"]
