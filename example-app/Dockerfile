FROM python:3.13

WORKDIR /app
COPY . .

RUN pip install poetry
RUN poetry install --no-root

EXPOSE 9000
ENV UVICORN_HOST="0.0.0.0"
ENV UVICORN_PORT="9000"

CMD ["poetry", "run", "python", "app.py"]
