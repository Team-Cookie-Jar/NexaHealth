# app/core/ml.py

import joblib
import os
from sklearn.feature_extraction.text import TfidfVectorizer

# Load the trained model and vectorizer (assumed saved together or separately)
MODEL_PATH = os.path.join("ml", "risk_classifier.joblib")
VECTORIZER_PATH = os.path.join("ml", "vectorizer.joblib")

try:
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)
except Exception as e:
    model, vectorizer = None, None
    print(f"[ML LOAD ERROR] {e}")

def predict_risk(text: str) -> str:
    if not model or not vectorizer:
        raise ValueError("Risk classifier model not loaded")

    features = vectorizer.transform([text])
    prediction = model.predict(features)[0]

    # Optionally apply mapping for uniqueness
    label_map = {
        "low": "Low",
        "medium": "Medium",
        "high": "High"
    }

    return label_map.get(str(prediction).lower(), "Unknown")
