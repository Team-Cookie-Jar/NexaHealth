# app/main.py
from fastapi import FastAPI
from app.routers import verify , report , map , risk #, nearby

app = FastAPI(title="NexaHealth API")

app.include_router(verify.router)
app.include_router(report.router)
app.include_router(map.router)
app.include_router(risk.router)
#app.include_router(nearby.router)

@app.get("/")
async def root():
    return {"message": "NexaHealth"}
