from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.core.db import reports_collection
from app.models.report_model import ReportResponse
from datetime import datetime
import uuid
import os

router = APIRouter()

@router.post("/submit-report", response_model=ReportResponse)
async def submit_report(
    drug_name: str = Form(...),
    nafdac_reg_no: Optional[str] = Form(None),
    pharmacy_name: str = Form(...),
    description: str = Form(...),
    state: str = Form(...),
    lga: str = Form(...),
    street_address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    try:
        # Validate required string fields are not empty or whitespace
        for field_name, value in {
            "drug_name": drug_name,
            "pharmacy_name": pharmacy_name,
            "description": description,
            "state": state,
            "lga": lga,
        }.items():
            if not value or not value.strip():
                raise HTTPException(status_code=400, detail=f"{field_name} cannot be empty")

        image_url = None
        if image:
            filename = f"{uuid.uuid4().hex}_{image.filename}"
            file_location = f"uploads/{filename}"
            os.makedirs("uploads", exist_ok=True)
            with open(file_location, "wb") as f:
                f.write(await image.read())
            image_url = file_location

        report_data = {
            "drug_name": drug_name,
            "nafdac_reg_no": nafdac_reg_no,
            "pharmacy_name": pharmacy_name,
            "description": description,
            "state": state,
            "lga": lga,
            "street_address": street_address,
            "timestamp": datetime.utcnow().isoformat(),
            "image_url": image_url
        }

        reports_collection.add(report_data)

        return ReportResponse(
            message="Report submitted successfully.",
            status="success"
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        return ReportResponse(
            message=f"An error occurred: {str(e)}",
            status="error"
        )
