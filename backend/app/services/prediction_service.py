from typing import List


class PredictionService:

    def predict(self, account_id: int) -> List[dict]:
        """
        Temporary prediction implementation.

        This is only a backend placeholder.
        The actual ML model can replace this later.
        """

        return [
            {
                "location_id": 1,
                "confidence": 0.82,
                "time_window": "18:00-20:00"
            },
            {
                "location_id": 2,
                "confidence": 0.67,
                "time_window": "20:00-22:00"
            }
        ]