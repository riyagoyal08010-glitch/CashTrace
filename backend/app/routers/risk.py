from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WithdrawalEvent
from app.services.risk_service import RiskService


router = APIRouter(
    prefix="/risk",
    tags=["Risk"]
)

risk_service = RiskService()


@router.get("/withdrawals")
def get_withdrawal_risk(db: Session = Depends(get_db)):

    withdrawals = db.query(WithdrawalEvent).all()

    results = []

    for withdrawal in withdrawals:
        # Temporary risk calculation.
        # Later this can use the actual prediction/model output.
        confidence = 0.5

        risk_score = risk_service.calculate_risk(
            confidence
        )

        results.append({
            "withdrawal_id": withdrawal.id,
            "account_id": withdrawal.account_id,
            "location_id": withdrawal.location_id,
            "amount": withdrawal.amount,
            "timestamp": withdrawal.timestamp,
            "risk_score": risk_score
        })

    results.sort(
        key=lambda x: x["risk_score"],
        reverse=True
    )

    return {
        "count": len(results),
        "results": results
    }