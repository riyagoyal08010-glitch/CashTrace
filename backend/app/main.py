from fastapi import FastAPI

from app.routers import (accounts, transactions, complaints, locations, withdrawal_events, predictions,risk)


app = FastAPI(
    title="CashTrace API",
    version="1.0.0"
)


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