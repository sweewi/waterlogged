/**
 * WaterLogged Rain Gauge Node Payload Decoder for The Things Network
 * 
 * This decoder converts the binary payload from the WaterLogged rain gauge
 * into a readable JSON format with validated measurements.
 * 
 * Payload format: 6 bytes total
 * - Bytes 0-1: Weight (grams) as int16 (x100)
 * - Bytes 2-3: Temperature (°F) as int16 (x100)
 * - Bytes 4-5: Humidity (%) as int16 (x100)
 * 
 * To use:
 * 1. Log in to The Things Network Console
 * 2. Go to your application
 * 3. Navigate to "Payload Formatters" tab
 * 4. Select "Custom JavaScript formatter" from the dropdown
 * 5. Paste this entire code in the decoder function editor
 * 6. Click "Save changes"
 */

// Define valid ranges for measurements
const VALID_RANGES = {
  weight: [-2000, 2000],        // grams (increased range)
  temperature: [-20, 140],      // °F
  humidity: [0, 100],           // %
};

// Rainfall conversion factor (from weight to inches)
const RAINFALL_CONVERSION_FACTOR = 0.00116; // Adjust based on your collector dimensions

/**
 * TTN Decoder Function
 * This is the main entry point for The Things Network
 */
function decodeUplink(input) {
  try {
    // Check payload length
    if (input.bytes.length !== 6) {
      return {
        errors: ["Invalid payload length: expected 6 bytes"]
      };
    }
    
    // Extract values (big-endian format, 2 bytes per value)
    const weightRaw = (input.bytes[0] << 8) | input.bytes[1];
    const temperatureRaw = (input.bytes[2] << 8) | input.bytes[3];
    const humidityRaw = (input.bytes[4] << 8) | input.bytes[5];
    
    // Convert from int16 (with 2 decimal places) to float
    let weight = weightRaw / 100.0;
    let temperature = temperatureRaw / 100.0;
    let humidity = humidityRaw / 100.0;

    // Calculate rainfall from weight
    const rainfall = weight * RAINFALL_CONVERSION_FACTOR;
    
    // Validate measurements
    const warnings = [];

    if (!isValueInRange(weight, VALID_RANGES.weight)) {
      warnings.push(`Weight out of range: ${weight}g (valid: ${VALID_RANGES.weight[0]}-${VALID_RANGES.weight[1]}g)`);
    }
    
    if (!isValueInRange(temperature, VALID_RANGES.temperature)) {
      warnings.push(`Temperature out of range: ${temperature}°F (valid: ${VALID_RANGES.temperature[0]}-${VALID_RANGES.temperature[1]}°F)`);
    }
    
    if (!isValueInRange(humidity, VALID_RANGES.humidity)) {
      warnings.push(`Humidity out of range: ${humidity}% (valid: ${VALID_RANGES.humidity[0]}-${VALID_RANGES.humidity[1]}%)`);
    }
    
    // Return decoded data
    return {
      data: {
        weight_g: parseFloat(weight.toFixed(2)),
        rainfall_in: parseFloat(rainfall.toFixed(4)),
        temperature_f: parseFloat(temperature.toFixed(1)),
        humidity_pct: parseFloat(humidity.toFixed(1)),
        decoded_at: new Date().toISOString(),
        node_id: 1  // Placeholder for multiple node support
      },
      warnings: warnings.length > 0 ? warnings : []
    };
  } catch (error) {
    return {
      errors: [`Decoder error: ${error.message}`]
    };
  }
}

/**
 * Helper function to check if a value is within a valid range
 */
function isValueInRange(value, range) {
  return (typeof value === 'number' && 
          !isNaN(value) && 
          value >= range[0] && 
          value <= range[1]);
}

/**
 * Legacy V2 decoder for backward compatibility if needed
 */
function Decoder(bytes, port) {
  // Extract data using the same logic as decodeUplink
  if (bytes.length !== 6) {
    return { error: "Invalid payload length" };
  }
  
  const weightRaw = (bytes[0] << 8) | bytes[1];
  const temperatureRaw = (bytes[2] << 8) | bytes[3];
  const humidityRaw = (bytes[4] << 8) | bytes[5];
  
  const weight = weightRaw / 100.0;
  const temperature = temperatureRaw / 100.0;
  const humidity = humidityRaw / 100.0;
  const rainfall = weight * RAINFALL_CONVERSION_FACTOR;
  
  return {
    weight_g: parseFloat(weight.toFixed(2)),
    rainfall_in: parseFloat(rainfall.toFixed(4)),
    temperature_f: parseFloat(temperature.toFixed(1)),
    humidity_pct: parseFloat(humidity.toFixed(1)),
    node_id: 1
  };
}