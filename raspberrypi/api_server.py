#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import uvicorn
from typing import Optional, List, Dict
from database_handler import DatabaseHandler
from payload_decoder import PayloadDecoder
from pydantic import BaseModel

app = FastAPI(title="WaterLogged API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and decoder
db = DatabaseHandler()
decoder = PayloadDecoder()

class Measurement(BaseModel):
    """Raw measurement data model"""
    timestamp: str
    weight_g: float
    rainfall_in: float
    temperature_f: float
    humidity_pct: float
    zero_factor: int
    node_id: int = 1

@app.post("/measurements")
async def add_measurement(payload: str):
    """Add a new measurement from the Arduino node"""
    try:
        decoded = decoder.decode(payload)
        if decoded:
            db.insert_measurement(decoded)
            return {"status": "success", "data": decoded}
        return {"status": "error", "message": "Failed to decode payload"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/data/hourly")
async def get_hourly_data(
    start: Optional[str] = None,
    end: Optional[str] = None,
    node_id: int = 1
):
    """Get hourly aggregated data for the specified time range"""
    try:
        # Default to last 24 hours if no range specified
        if not start:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=24)
        else:
            start_time = datetime.fromisoformat(start)
            end_time = datetime.fromisoformat(end) if end else datetime.now()
            
        data = db.get_hourly_data(start_time, end_time, node_id)
        return {
            "status": "success",
            "data": data,
            "timeRange": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/data/daily")
async def get_daily_data(
    start: Optional[str] = None,
    end: Optional[str] = None,
    node_id: int = 1
):
    """Get daily aggregated data for the specified date range"""
    try:
        # Default to last 7 days if no range specified
        if not start:
            end_time = datetime.now()
            start_time = end_time - timedelta(days=7)
        else:
            start_time = datetime.fromisoformat(start)
            end_time = datetime.fromisoformat(end) if end else datetime.now()
            
        data = db.get_daily_data(start_time, end_time, node_id)
        return {
            "status": "success",
            "data": data,
            "timeRange": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/data/current")
async def get_current_conditions(node_id: int = 1):
    """Get the most recent measurement"""
    try:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM raw_measurements
            WHERE node_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        ''', (node_id,))
        row = cursor.fetchone()
        if row:
            return {"status": "success", "data": dict(row)}
        return {"status": "error", "message": "No data available"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def start_server():
    """Start the FastAPI server"""
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    start_server()