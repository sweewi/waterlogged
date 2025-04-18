#!/usr/bin/env python3

import json
from datetime import datetime
import logging
from typing import Dict, Optional, Union

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('WaterLogged_Decoder')

class PayloadDecoder:
    """Decoder for WaterLogged node payload data"""
    
    def __init__(self):
        # Define valid ranges for measurements
        self.VALID_RANGES = {
            'weight': (-2000, 2000),        # grams (increased range)
            'rainfall': (0, 15),            # inches (increased max to 15")
            'temperature': (-20, 140),      # °F
            'humidity': (0, 100),           # %
            'zero_factor': (7000, 10000)    # Load cell zero factor range
        }
    
    def validate_measurement(self, value: float, measurement_type: str) -> bool:
        """
        Validate if a measurement is within expected ranges
        
        Args:
            value: The measurement value to validate
            measurement_type: Type of measurement (weight, rainfall, temperature, humidity, zero_factor)
            
        Returns:
            bool: True if measurement is valid, False otherwise
        """
        if measurement_type not in self.VALID_RANGES:
            logger.error(f"Unknown measurement type: {measurement_type}")
            return False
            
        min_val, max_val = self.VALID_RANGES[measurement_type]
        if not isinstance(value, (int, float)) or value < min_val or value > max_val:
            logger.warning(f"Invalid {measurement_type}: {value} (valid range: {min_val} to {max_val})")
            return False
            
        return True

    def decode(self, payload: str) -> Optional[Dict[str, Union[float, int, str]]]:
        """
        Decode a payload string from the WaterLogged node
        
        Args:
            payload: Comma-separated string with format:
                    WEIGHT,RAINFALL_IN,TEMPERATURE_F,HUMIDITY,ZERO_FACTOR
                    
        Returns:
            Dictionary containing decoded and validated measurements with timestamp,
            or None if payload is invalid
        """
        try:
            # Split payload into components
            parts = payload.strip().split(',')
            if len(parts) != 5:
                logger.error(f"Invalid payload format. Expected 5 values, got {len(parts)}")
                return None
                
            # Parse values
            weight = float(parts[0])
            rainfall = float(parts[1])
            temperature = float(parts[2])
            humidity = float(parts[3])
            zero_factor = int(parts[4])
            
            # Validate all measurements
            validations = [
                ('weight', weight),
                ('rainfall', rainfall),
                ('temperature', temperature),
                ('humidity', humidity),
                ('zero_factor', zero_factor)
            ]
            
            if not all(self.validate_measurement(value, measure_type) 
                      for measure_type, value in validations):
                return None
            
            # Create measurement packet with timestamp
            measurement = {
                'timestamp': datetime.now().isoformat(),
                'weight_g': round(weight, 3),
                'rainfall_in': round(rainfall, 4),
                'temperature_f': round(temperature, 1),
                'humidity_pct': round(humidity, 1),
                'zero_factor': zero_factor,
                'node_id': 1  # Placeholder for multiple node support
            }
            
            return measurement
            
        except ValueError as e:
            logger.error(f"Error parsing payload values: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error decoding payload: {e}")
            return None

    def to_json(self, decoded_data: Dict) -> str:
        """Convert decoded data to JSON string"""
        return json.dumps(decoded_data)

def main():
    """Test the decoder with sample data"""
    decoder = PayloadDecoder()
    
    # Test with valid data
    test_payload = "245.320,0.2843,73.4,65.2,8234"
    result = decoder.decode(test_payload)
    if result:
        print("Decoded payload:")
        print(json.dumps(result, indent=2))
    
    # Test with invalid data
    invalid_payload = "1000.0,99.99,200.0,101.0,12000"
    result = decoder.decode(invalid_payload)
    if result is None:
        print("\nInvalid payload correctly rejected")

if __name__ == "__main__":
    main()