#!/usr/bin/env python3

import serial
import time
import logging
import requests
from typing import Optional
import json
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('WaterLogged_Serial')

class SerialHandler:
    def __init__(self, port: str = '/dev/waterlogged_arduino', baudrate: int = 9600):
        self.port = port
        self.baudrate = baudrate
        self.serial = None
        self.api_url = 'http://localhost:8000/measurements'
    
    def connect(self) -> bool:
        """Establish connection to Arduino"""
        try:
            self.serial = serial.Serial(self.port, self.baudrate, timeout=1)
            time.sleep(2)  # Allow Arduino to reset
            logger.info(f"Connected to Arduino on {self.port}")
            return True
        except serial.SerialException as e:
            logger.error(f"Failed to connect to Arduino: {e}")
            return False
    
    def read_line(self) -> Optional[str]:
        """Read a line from the serial port"""
        if not self.serial:
            return None
        
        try:
            if self.serial.in_waiting:
                line = self.serial.readline().decode('utf-8').strip()
                return line
        except Exception as e:
            logger.error(f"Error reading from serial: {e}")
            self.reconnect()
        return None
    
    def reconnect(self):
        """Attempt to reconnect to Arduino"""
        logger.info("Attempting to reconnect...")
        try:
            if self.serial:
                self.serial.close()
            time.sleep(5)  # Wait before reconnecting
            self.connect()
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")
    
    def send_to_api(self, data: str):
        """Send measurement data to API server"""
        try:
            response = requests.post(self.api_url, json=data)
            if response.status_code == 200:
                logger.info("Data successfully sent to API")
            else:
                logger.error(f"API error: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send data to API: {e}")
    
    def run(self):
        """Main loop to read and process data"""
        while True:
            try:
                if not self.serial and not self.connect():
                    time.sleep(5)
                    continue
                
                line = self.read_line()
                if line:
                    logger.info(f"Received data: {line}")
                    self.send_to_api(line)
                
                time.sleep(0.1)  # Prevent CPU overuse
                
            except KeyboardInterrupt:
                logger.info("Stopping serial handler...")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(5)
    
    def close(self):
        """Close the serial connection"""
        if self.serial:
            self.serial.close()
            logger.info("Serial connection closed")

def main():
    handler = SerialHandler()
    try:
        handler.run()
    finally:
        handler.close()

if __name__ == "__main__":
    main()