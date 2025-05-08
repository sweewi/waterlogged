#!/usr/bin/env python3
"""
Database Handler for WaterLogged Rain Gauge System

This module handles all database operations for the WaterLogged system, including:
- Storing raw measurement data from rain gauge nodes
- Creating and maintaining aggregated data tables (hourly, daily)
- Providing query interfaces for the API server
- Managing database maintenance tasks

The database schema includes four main tables:
1. raw_measurements: Individual readings from nodes
2. hourly_aggregates: Hourly aggregated statistics
3. daily_aggregates: Daily aggregated statistics
4. nodes: Information about registered nodes

Dependencies:
- sqlite3: For database operations
- datetime: For time operations and aggregation
"""

import sqlite3
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Optional, Union
import json
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('WaterLogged_DB')

class DatabaseHandler:
    def __init__(self, db_path: str = "waterlogged.db"):
        """Initialize database connection and create tables if they don't exist"""
        self.db_path = db_path
        self.conn = None
        self.create_tables()
    
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection, creating it if necessary"""
        if self.conn is None:
            self.conn = sqlite3.connect(self.db_path)
            self.conn.row_factory = sqlite3.Row
        return self.conn
    
    def create_tables(self):
        """Create necessary database tables if they don't exist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Raw measurements table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME NOT NULL,
                node_id INTEGER NOT NULL,
                weight_g REAL NOT NULL,
                rainfall_in REAL NOT NULL,
                temperature_f REAL NOT NULL,
                humidity_pct REAL NOT NULL,
                zero_factor INTEGER NOT NULL
            )
        ''')
        
        # Hourly aggregates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS hourly_aggregates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hour_start DATETIME NOT NULL,
                node_id INTEGER NOT NULL,
                total_rainfall_in REAL NOT NULL,
                avg_temperature_f REAL NOT NULL,
                avg_humidity_pct REAL NOT NULL,
                measurement_count INTEGER NOT NULL,
                UNIQUE(hour_start, node_id)
            )
        ''')
        
        # Daily aggregates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS daily_aggregates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                node_id INTEGER NOT NULL,
                total_rainfall_in REAL NOT NULL,
                avg_temperature_f REAL NOT NULL,
                avg_humidity_pct REAL NOT NULL,
                measurement_count INTEGER NOT NULL,
                UNIQUE(date, node_id)
            )
        ''')
        
        conn.commit()
    
    def insert_measurement(self, measurement: Dict[str, Union[float, int, str]]):
        """Insert a new raw measurement into the database"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO raw_measurements (
                    timestamp, node_id, weight_g, rainfall_in, 
                    temperature_f, humidity_pct, zero_factor
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                measurement['timestamp'],
                measurement['node_id'],
                measurement['weight_g'],
                measurement['rainfall_in'],
                measurement['temperature_f'],
                measurement['humidity_pct'],
                measurement['zero_factor']
            ))
            conn.commit()
            
            # After inserting raw data, update aggregates
            self.update_aggregates(measurement['timestamp'])
            
        except sqlite3.Error as e:
            logger.error(f"Error inserting measurement: {e}")
            conn.rollback()
    
    def update_aggregates(self, timestamp: str):
        """Update hourly and daily aggregates for the given timestamp"""
        dt = datetime.fromisoformat(timestamp)
        hour_start = dt.replace(minute=0, second=0, microsecond=0)
        day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        
        self._update_hourly_aggregate(hour_start)
        self._update_daily_aggregate(day_start)
    
    def _update_hourly_aggregate(self, hour_start: datetime):
        """Update or create hourly aggregate for the given hour"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        hour_end = hour_start + timedelta(hours=1)
        
        try:
            # Calculate hourly aggregates
            cursor.execute('''
                INSERT OR REPLACE INTO hourly_aggregates (
                    hour_start, node_id, total_rainfall_in, 
                    avg_temperature_f, avg_humidity_pct, measurement_count
                )
                SELECT 
                    ?, 
                    node_id,
                    SUM(rainfall_in),
                    AVG(temperature_f),
                    AVG(humidity_pct),
                    COUNT(*)
                FROM raw_measurements
                WHERE timestamp >= ? AND timestamp < ?
                GROUP BY node_id
            ''', (hour_start.isoformat(), hour_start.isoformat(), hour_end.isoformat()))
            
            conn.commit()
        except sqlite3.Error as e:
            logger.error(f"Error updating hourly aggregate: {e}")
            conn.rollback()
    
    def _update_daily_aggregate(self, day_start: datetime):
        """Update or create daily aggregate for the given day"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        day_end = day_start + timedelta(days=1)
        
        try:
            # Calculate daily aggregates
            cursor.execute('''
                INSERT OR REPLACE INTO daily_aggregates (
                    date, node_id, total_rainfall_in, 
                    avg_temperature_f, avg_humidity_pct, measurement_count
                )
                SELECT 
                    ?,
                    node_id,
                    SUM(rainfall_in),
                    AVG(temperature_f),
                    AVG(humidity_pct),
                    COUNT(*)
                FROM raw_measurements
                WHERE timestamp >= ? AND timestamp < ?
                GROUP BY node_id
            ''', (day_start.date().isoformat(), day_start.isoformat(), day_end.isoformat()))
            
            conn.commit()
        except sqlite3.Error as e:
            logger.error(f"Error updating daily aggregate: {e}")
            conn.rollback()
    
    def get_hourly_data(self, start_time: datetime, end_time: datetime, node_id: int = 1) -> List[Dict]:
        """Get hourly aggregated data for the specified time range"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM hourly_aggregates
            WHERE hour_start >= ? AND hour_start < ?
            AND node_id = ?
            ORDER BY hour_start
        ''', (start_time.isoformat(), end_time.isoformat(), node_id))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def get_daily_data(self, start_date: datetime, end_date: datetime, node_id: int = 1) -> List[Dict]:
        """Get daily aggregated data for the specified date range"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM daily_aggregates
            WHERE date >= ? AND date < ?
            AND node_id = ?
            ORDER BY date
        ''', (start_date.date().isoformat(), end_date.date().isoformat(), node_id))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def close(self):
        """Close the database connection"""
        if self.conn:
            self.conn.close()
            self.conn = None