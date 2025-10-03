from fastapi import FastAPI

app = FastAPI(title="events-service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "events"}

@app.get("/ready")
def ready():
    # Placeholder readiness logic (future: DB ping)
    return {"ready": True}

@app.get("/api/events/ping")
def ping():
    return {"pong": True}
