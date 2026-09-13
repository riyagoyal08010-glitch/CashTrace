class RiskService:

    def calculate_risk(self, confidence: float) -> float:
        """
        Convert model confidence into a risk score from 0 to 100.
        """

        risk_score = confidence * 100

        return round(risk_score, 2)

    def rank_predictions(self, predictions: list[dict]) -> list[dict]:
        """
        Calculate risk scores and rank predictions
        from highest risk to lowest risk.
        """

        results = []

        for prediction in predictions:
            confidence = prediction["confidence"]

            risk_score = self.calculate_risk(confidence)

            results.append({
                **prediction,
                "risk_score": risk_score
            })

        results.sort(
            key=lambda x: x["risk_score"],
            reverse=True
        )

        return results