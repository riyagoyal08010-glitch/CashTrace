from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (accounts, transactions, complaints, locations, withdrawal_events, predictions,risk)
from app.database import Base, engine
from app import models


app = FastAPI(
    title="CashTrace API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(complaints.router)
app.include_router(locations.router)
app.include_router(withdrawal_events.router)
app.include_router(predictions.router)
app.include_router(risk.router)

@app.get("/")
def root():
    return {
        "message": "CashTrace Backend is running"
    }