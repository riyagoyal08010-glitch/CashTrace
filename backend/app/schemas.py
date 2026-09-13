from datetime import datetime
from pydantic import BaseModel


# -----------------------------
# ACCOUNT
# -----------------------------

class AccountCreate(BaseModel):
    account_number: str
    holder_name: str


class AccountResponse(BaseModel):
    id: int
    account_number: str
    holder_name: str

    class Config:
        from_attributes = True


# -----------------------------
# TRANSACTION
# -----------------------------

class TransactionCreate(BaseModel):
    account_id: int
    amount: float
    transaction_type: str
    timestamp: datetime


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    amount: float
    transaction_type: str
    timestamp: datetime

    class Config:
        from_attributes = True


# -----------------------------
# COMPLAINT
# -----------------------------

class ComplaintCreate(BaseModel):
    account_id: int | None = None
    complaint_text: str
    timestamp: datetime | None = None


class ComplaintResponse(BaseModel):
    id: int
    account_id: int | None
    complaint_text: str | None
    timestamp: datetime | None

    class Config:
        from_attributes = True


# -----------------------------
# LOCATION
# -----------------------------

class LocationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float


class LocationResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


# -----------------------------
# WITHDRAWAL EVENT
# -----------------------------

class WithdrawalEventCreate(BaseModel):
    account_id: int
    location_id: int
    amount: float
    timestamp: datetime


class WithdrawalEventResponse(BaseModel):
    id: int
    account_id: int
    location_id: int
    amount: float
    timestamp: datetime

    class Config:
        from_attributes = True

class Prediction(BaseModel):
    location_id: int
    confidence: float
    time_window: str
    risk_score: float


class PredictionResponse(BaseModel):
    account_id: int
    predictions: list[Prediction]
