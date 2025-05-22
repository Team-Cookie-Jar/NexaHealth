from pydantic import BaseModel
from typing import List

class SuggestedDrug(BaseModel):
    name: str
    dosage_form: str
    use_case: str

class SymptomInput(BaseModel):
    symptoms: str

class RiskPredictionResponse(BaseModel):
    risk: str
    risk_score: int
    suggested_drugs: List[SuggestedDrug]



