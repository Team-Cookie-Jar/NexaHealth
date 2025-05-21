# app/routers/report.py

from fastapi import APIRouter, HTTPException
from app.models.report_model import RiskPredictionRequest, RiskPredictionResponse
from app.core.ml import predict_risk

router = APIRouter()

@router.post("/predict-risk", response_model=RiskPredictionResponse)
async def predict_risk_endpoint(payload: RiskPredictionRequest):
    try:
        risk = predict_risk(payload.text)
        return {"risk": risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
