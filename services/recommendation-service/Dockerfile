FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN useradd -m appuser
USER appuser
EXPOSE 4009
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4009"]
