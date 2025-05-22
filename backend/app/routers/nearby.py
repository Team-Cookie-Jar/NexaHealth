from fastapi import APIRouter, Query, HTTPException
from typing import List
from pydantic import BaseModel
import requests

router = APIRouter()

class Location(BaseModel):
    lat: float
    lng: float

class NearbyPlace(BaseModel):
    name: str
    type: str
    location: Location
    address: str

OVERPASS_URL = "http://overpass-api.de/api/interpreter"

def query_overpass(lat: float, lng: float, radius=3000, amenity_type="pharmacy"):
    query = f"""
    [out:json];
    node
      (around:{radius},{lat},{lng})
      [amenity={amenity_type}];
    out body;
    """
    response = requests.post(OVERPASS_URL, data={"data": query})
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Failed to fetch from Overpass API")
    return response.json()

@router.get("/get-nearby", response_model=List[NearbyPlace])
def get_nearby(lat: float = Query(...), lng: float = Query(...)):
    nearby_places = []
    for amenity in ["pharmacy", "hospital"]:
        data = query_overpass(lat, lng, amenity_type=amenity)
        for element in data.get("elements", []):
            name = element.get("tags", {}).get("name", "Unknown")
            address = element.get("tags", {}).get("addr:street", "No address")
            nearby_places.append({
                "name": name,
                "type": amenity.capitalize(),
                "location": {
                    "lat": element.get("lat"),
                    "lng": element.get("lon")
                },
                "address": address
            })
    return nearby_places
