# Stage 1: Build the React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python Backend and Final Image
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for psycopg2 (if needed later)
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Switch to backend directory for runtime
WORKDIR /app/backend

# Expose the port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP="app:create_app()"
ENV PYTHONUNBUFFERED=1

# Run migrations and start the server
CMD ["sh", "-c", "flask db upgrade && gunicorn --bind 0.0.0.0:$PORT \"app:create_app()\""]
