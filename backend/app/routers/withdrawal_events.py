from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WithdrawalEvent
from app.schemas import (
    WithdrawalEventCreate,
    WithdrawalEventResponse
)


router = APIRouter(
    prefix="/withdrawal-events",
    tags=["Withdrawal Events"]
)


@router.post("/", response_model=WithdrawalEventResponse)
def create_withdrawal_event(
    withdrawal: WithdrawalEventCreate,
    db: Session = Depends(get_db)
):
    new_withdrawal = WithdrawalEvent(
        account_id=withdrawal.account_id,
        location_id=withdrawal.location_id,
        amount=withdrawal.amount,
        timestamp=withdrawal.timestamp
    )

    db.add(new_withdrawal)
    db.commit()
    db.refresh(new_withdrawal)

    return new_withdrawal


@router.get("/", response_model=list[WithdrawalEventResponse])
def get_withdrawal_events(db: Session = Depends(get_db)):
    return db.query(WithdrawalEvent).all()