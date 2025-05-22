import pandas as pd
import re
import json
from difflib import get_close_matches
from pathlib import Path

# === Paths ===
RISK_DATA_PATH = "C:/Users/USER/PycharmProjects/NexaHealth/backend/app/data/keyword_risk_map.csv"
VERIFIED_DRUGS_PATH = "C:/Users/USER/PycharmProjects/NexaHealth/backend/app/data/verified_drugs.json"

# === Load and Normalize Risk Data ===
risk_df = pd.read_csv(RISK_DATA_PATH)
risk_df["symptom_keyword"] = risk_df["symptom_keyword"].str.lower().str.strip()

risk_map = {
    row["symptom_keyword"]: {
        "risk_weight": row["risk_weight"],
        "common_drugs": [drug.strip() for drug in row["common_drugs"].split(",")] if pd.notna(row["common_drugs"]) else []
    }
    for _, row in risk_df.iterrows()
}

# === Load Verified Drugs Data ===
with open(VERIFIED_DRUGS_PATH, "r", encoding="utf-8") as file:
    verified_drugs = json.load(file)

# Flatten a set of all verified ingredient names (normalized for comparison)
verified_ingredients = set()
for drug in verified_drugs:
    # fixed typo 'i ngredients' => 'ingredients' if needed
    ingredients = drug.get("ingredients") or drug.get("i ngredients")
    if ingredients:
        verified_ingredients.update(ing.strip().lower() for ing in ingredients)

# === Core Functions ===

def extract_keywords(user_input: str, cutoff=0.8):
    """Extract known symptom keywords using exact and fuzzy matching, supporting multi-word symptoms."""
    user_input_lower = user_input.lower()
    matched = set()

    # First, check exact substring matches for all symptom keywords
    for symptom in risk_map.keys():
        if symptom in user_input_lower:
            matched.add(symptom)

    # If no exact matches found, try fuzzy matching on words as fallback
    if not matched:
        input_words = re.findall(r'\b\w+\b', user_input_lower)
        for word in input_words:
            close = get_close_matches(word, risk_map.keys(), n=1, cutoff=cutoff)
            if close:
                matched.add(close[0])
    return list(matched)



def verify_drug_suggestions(drug_names):
    """Cross-reference recommended drugs with verified product names or ingredients."""
    verified_suggestions = []

    product_names = {drug["product_name"].lower(): drug for drug in verified_drugs}

    for drug_name in drug_names:
        normalized = drug_name.lower().strip()

        # Check if drug_name matches a product name exactly
        if normalized in product_names:
            verified_suggestions.append(product_names[normalized]["product_name"])
            continue

        # Else check if it matches any ingredient substring
        if any(normalized in ing for ing in verified_ingredients):
            verified_suggestions.append(drug_name)

    return verified_suggestions



def calculate_risk(user_input: str):
    """Compute cumulative risk and suggest drugs based on matched symptoms."""
    matched_keywords = extract_keywords(user_input)

    if not matched_keywords:
        return {
            "risk_score": 0,
            "risk_level": "Low",
            "matched_keywords": [],
            "recommended_drugs": [],
            "verified_recommendations": []
        }

    # Sum risk weights
    total_risk = sum(risk_map[key]["risk_weight"] for key in matched_keywords)
    capped_risk = min(total_risk, 100)

    # Determine risk level
    if capped_risk < 30:
        risk_level = "Low"
    elif 30 <= capped_risk <= 60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # Collect suggested drugs from matched keywords
    suggested_drugs = set()
    for key in matched_keywords:
        suggested_drugs.update(risk_map[key]["common_drugs"])

    # Match symptom keywords to ingredients in verified drugs (use-case match)
    for drug in verified_drugs:
        ingredients = drug.get("ingredients", [])
        for ing in ingredients:
            if any(word in ing.lower() for word in matched_keywords):
                suggested_drugs.add(drug["product_name"])

    # Verify suggested drugs
    verified_recommendations = verify_drug_suggestions(suggested_drugs)

    return {
        "risk_score": capped_risk,
        "risk_level": risk_level,
        "matched_keywords": matched_keywords,
        "recommended_drugs": sorted(suggested_drugs),
        "verified_recommendations": sorted(verified_recommendations)
    }
