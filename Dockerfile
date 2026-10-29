FROM node:20 AS fe
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build
FROM python:3.12-slim
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend .
COPY --from=fe /fe/dist ./frontend/dist
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
