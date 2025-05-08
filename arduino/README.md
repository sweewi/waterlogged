# Arduino Rain Gauge Node

This directory contains the firmware and documentation for the Arduino-based rain gauge nodes of the Waterlogged system.

## Documentation Links

- [Dragino LA66 LoRaWAN Shield User Manual](https://wiki.dragino.com/xwiki/bin/view/Main/User%20Manual%20for%20LoRaWAN%20End%20Nodes/LA66%20LoRaWAN%20Shield%20User%20Manual/#H1.4A0PinMapping26LED) - Official documentation for the LA66 LoRa module

## Directory Structure

- **waterlogged_node/**: Production code for the Arduino rain gauge node
  - `waterlogged_node.ino`: Main Arduino sketch
  - `lmic_pinmap.h`: Pin mapping for LMIC library
  - `lmic_project_config.h`: Configuration for LMIC library

- **documentation/**: Technical specifications and reference material
  - `LA66 AT commands.pdf`: Reference documentation for LA66 LoRa module
  - `LA66 AT commands.txt`: Text version of AT commands
  - Various images showing hardware configuration

- **tests/**: Test sketches and development iterations
  - `Join-TTN-network.ino`: Basic test for TTN network connection
  - `LA66-LoRaWAN-shield-AT-command-via-Arduino-UNO.ino`: Basic AT command interface test
  - `Log-Temperature-Sensor-and-send-data-to-TTN.ino`: Test for temperature sensor and TTN integration
  - `waterlogged_drainage_test/`: Testing water drainage functionality
  - `waterlogged_May7_BothBallValvesOperative/`: Test of dual ball valve operation
  - `waterlogged_test/`: General functionality test
  - `waterlogged_ttn_join_test/`: Test of TTN join process

## Hardware Configuration

The rain gauge node uses the following components:
- Arduino Uno or compatible board
- LA66 LoRaWAN module for wireless communication
- HX711 load cell amplifier with load cell for weight measurement
- DHT22 temperature and humidity sensor
- Two ball valves (1" NC valve and 1/2" NO valve) controlled via relays
- Status LEDs for system state indication
- DS3231 RTC for time-keeping

## Pin Configuration

| Component | Arduino Pin | Function |
|-----------|-------------|----------|
| Load Cell (HX711) | 6 | DOUT (Data Out) |
| Load Cell (HX711) | 5 | SCK (Serial Clock) |
| DHT22 | 7 | Data |
| NC Valve | A3 | Control |
| NO Valve | A4 | Control |
| Error LED | A0 | Status indication |
| Active LED | A1 | Status indication |
| Power LED | A2 | Status indication |
| LA66 Module | 10 | RX (Arduino receives) |
| LA66 Module | 11 | TX (Arduino transmits) |

## Operation

The rain gauge node operates in the following sequence:

1. Collects rainwater in a container placed on the load cell
2. Periodically measures the weight of collected water (every 15 minutes)
3. Executes precise valve control sequence:
   - Close top (NC) valve to prevent water entry
   - Take initial weight reading with water
   - Open bottom (NO) valve to drain water
   - Close bottom valve after drainage
   - Take empty container weight reading
   - Open top valve to resume collection
4. Records temperature and humidity data
5. Calculates rainfall based on weight difference
6. Transmits data to TTN via LoRaWAN
7. Enters low-power sleep mode between measurements

### Improved Valve Operation Sequence (May 2025 Version)

The updated code implements the validated ball valve operation sequence from the May 7th, 2025 test:

1. **Top valve (NC)**: Normally OPEN, requires power to CLOSE
   - Open: `digitalWrite(VALVE_NC_PIN, LOW)` - Default state, no power
   - Close: `digitalWrite(VALVE_NC_PIN, HIGH)` - Apply power to close

2. **Bottom valve (NO)**: Normally CLOSED, requires power to OPEN
   - Close: `digitalWrite(VALVE_NO_PIN, LOW)` - Default state, no power
   - Open: `digitalWrite(VALVE_NO_PIN, HIGH)` - Apply power to open

This sequence ensures reliable water collection and drainage while minimizing power consumption.

## Rainfall Calculation

The system calculates rainfall using a calibrated collection funnel with a precise surface area:

```
Rainfall (mm) = Water Weight (g) / Collection Area (cm²)
Rainfall (inches) = Rainfall (mm) / 25.4
```

With our standard funnel (area = 50.2654 cm²):
- 1 gram of water = 0.01989 mm of rainfall
- 1 mm of rainfall = 50.2654 grams of water

This calculation allows for high-precision rainfall measurement with resolution down to 0.01mm.

## TTN Configuration

The node uses OTAA (Over-the-Air Activation) to join The Things Network. The following settings must match your TTN console configuration:
- Device EUI
- Join EUI (App EUI)
- App Key

The payload format is structured as follows:
- First 2 bytes: Water weight in centigrams (int16)
- Next 2 bytes: Temperature in centi-degrees (int16)
- Final 2 bytes: Humidity in centi-percent (int16)

## Troubleshooting

### Common Issues and Solutions

#### Network Connectivity
- **Node fails to join TTN**: 
  - Verify TTN credentials (DEV_EUI, JOIN_EUI, APP_KEY) match those in console
  - Check gateway status and coverage
  - Ensure your gateway supports the US915 frequency plan
  - Try adjusting antenna position for better reception

#### Sensor Issues
- **Unstable weight readings**:
  - Check for mechanical binding in the collection container
  - Verify proper grounding of the load cell and HX711
  - Increase `WEIGHT_SAMPLES` for more averaging
  - Shield load cell wiring from EMI/RFI

#### Valve Operation Problems
- **Valves not operating correctly**:
  - Verify 12V power supply is sufficient (valve solenoids need adequate power)
  - Check relay connections and operation
  - Increase `VALVE_DELAY` to give valves more time to fully open/close
  - Manually test valve operation using the test scripts

#### Battery Life
- **Short battery life**:
  - Verify sleep mode is functioning correctly
  - Reduce measurement frequency if possible
  - Consider using larger capacity battery
  - Check for unexpected current draw when idle

### Debug Flags

Enable these debugging flags at the top of the main sketch:
```cpp
#define DEBUG_LA66   1     // Detailed LoRa communication logging
#define DEBUG_VALVES 1     // Valve operation logging
```

### Test Scripts

Several test scripts are provided in the `tests/` directory to isolate and troubleshoot individual components:
- `waterlogged_May7_BothBallValvesOperative/`: Validates valve operation sequence
- `waterlogged_ttn_join_test/`: Tests TTN connectivity

Run these scripts individually to validate component operation before deploying the complete system.
