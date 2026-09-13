from fastapi import APIRouter

from app.schemas import PredictionResponse
from app.services.prediction_service import PredictionService
from app.services.risk_service import RiskService


router = APIRouter(
    prefix="/predictions",
    tags=["Predictions"]
)

prediction_service = PredictionService()
risk_service = RiskService()


@router.get("/{account_id}", response_model=PredictionResponse)
def get_prediction(account_id: int):

    predictions = prediction_service.predict(account_id)

    ranked_predictions = risk_service.rank_predictions(
        predictions
    )

    return {
        "account_id": account_id,
        "predictions": ranked_predictions
    }