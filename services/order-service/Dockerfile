FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN opentelemetry-bootstrap -a install
COPY main.py .
RUN useradd -m appuser && mkdir -p /data && chown -R appuser /data
USER appuser
EXPOSE 4005
CMD ["opentelemetry-instrument", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4005"]