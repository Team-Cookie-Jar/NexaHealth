# app/models/report_model.py

from pydantic import BaseModel

class RiskPredictionRequest(BaseModel):
    text: str

class RiskPredictionResponse(BaseModel):
    risk: str
