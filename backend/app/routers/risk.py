from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import WithdrawalEvent, Location
from app.services.risk_service import RiskService


router = APIRouter(
    prefix="/risk",
    tags=["Risk"]
)

risk_service = RiskService()


@router.get("/withdrawals")
def get_withdrawal_risk(db: Session = Depends(get_db)):

    withdrawals = (
        db.query(
            WithdrawalEvent,
            Location.name.label("location_name"),
            Location.city.label("city"),
            func.ST_X(Location.coordinates).label("longitude"),
            func.ST_Y(Location.coordinates).label("latitude")
        )
        .outerjoin(
            Location,
            WithdrawalEvent.location_id == Location.location_id
        )
        .all()
    )

    results = []

    for withdrawal, location_name, city, longitude, latitude in withdrawals:

        # Temporary risk calculation.
        # Later this can use the actual prediction/model output.
        confidence = 0.5

        risk_score = risk_service.calculate_risk(confidence)

        results.append({
            "withdrawal_id": withdrawal.event_id,
            "account_id": withdrawal.account_id,
            "location_id": withdrawal.location_id,
            "location_name": location_name,
            "city": city,
            "latitude": latitude,
            "longitude": longitude,
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