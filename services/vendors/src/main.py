from fastapi import FastAPI

app = FastAPI(title="vendors-service")

@app.get("/health")
def health():
    return {"status": "ok", "service": "vendors"}

@app.get("/ready")
def ready():
    return {"ready": True}

@app.get("/api/vendors/ping")
def ping():
    return {"pong": True}
