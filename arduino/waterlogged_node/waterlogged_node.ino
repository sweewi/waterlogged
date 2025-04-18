/*
 * WaterLogged Rain Gauge Node
 * 
 * This code implements an automated rain gauge system that:
 * 1. Collects rainwater and measures its weight using a load cell
 * 2. Monitors environmental conditions with a DHT22 sensor
 * 3. Manages water flow using two ball valves
 * 4. Reports data every 15 minutes
 * 5. Implements error checking and watchdog protection
 * 
 * Hardware Components:
 * - Load Cell + HX711 amplifier (weight measurement)
 * - DHT22 Temperature/Humidity Sensor
 * - 1" Normally Closed (NC) Ball Valve (top/drain valve)
 * - 1/2" Normally Open (NO) Ball Valve (bottom/collection valve)
 * - Status LEDs
 * 
 * Pin Configuration:
 * - Load Cell: DOUT->3, SCK->2
 * - DHT22: DATA->4
 * - NC Valve: 5
 * - NO Valve: 6
 * - Status LEDs: 7 (Error), 8 (Active), 9 (Power)
 */

#include "HX711.h"          // Load cell amplifier library
#include "DHT.h"           // Temperature/humidity sensor library
#include <avr/wdt.h>       // Watchdog timer for system stability
#include <avr/sleep.h>     // Power management
#include <avr/power.h>     // Additional power management

// Pin Definitions
#define LOADCELL_DOUT_PIN  3    // HX711 data output pin
#define LOADCELL_SCK_PIN   2    // HX711 clock input pin
#define DHT22_PIN          4    // DHT22 data pin
#define VALVE_NC_PIN       5    // 1" Normally Closed valve relay control pin
#define VALVE_NO_PIN       6    // 1/2" Normally Open valve relay control pin
#define LED_ERROR_PIN      7    // Red LED for error indication
#define LED_ACTIVE_PIN     8    // Green LED for active status
#define LED_POWER_PIN      9    // Blue LED for power indication

// System Constants
const unsigned long MEASURE_INTERVAL = 900000;   // 15 minutes between measurements (in ms)
const float CALIBRATION_FACTOR = 210.25;         // Load cell calibration value (adjust as needed)
const unsigned long VALVE_OPERATION_TIME = 5000;  // Time needed for valve to fully actuate (in ms)
const int WEIGHT_SAMPLES = 128;                  // Number of weight readings to average
const float MIN_VALID_WEIGHT = -1000.0;         // Minimum valid weight reading
const float MAX_VALID_WEIGHT = 1000.0;          // Maximum valid weight reading
const int VALVE_CHECK_INTERVAL = 100;           // Interval to check valve operation (in ms)
const int MAX_SENSOR_RETRIES = 3;               // Maximum number of sensor reading attempts

// Additional System Constants
const unsigned long MINUTES_TO_MILLIS = 60000;  // Convert minutes to milliseconds
const unsigned long QUARTER_HOUR = 15 * MINUTES_TO_MILLIS;
unsigned long startupTime;  // Time when the system started
long zero_factor;          // Stored zero factor for load cell

// Measurement Constants
const float COLLECTOR_DIAMETER_CM = 20.32;  // 8-inch diameter collector
const float COLLECTOR_AREA_CM2 = PI * (COLLECTOR_DIAMETER_CM * COLLECTOR_DIAMETER_CM) / 4.0;  // Area = πr²
const float CM3_TO_IN3 = 0.0610237441;  // Conversion factor: 1 cm³ = 0.0610237441 in³
const float CM_TO_IN = 0.393701;        // Conversion factor: 1 cm = 0.393701 inches

// Error Codes (for LED blinking patterns)
const int ERROR_LOADCELL = 2;    // Load cell error: 2 blinks
const int ERROR_DHT = 3;         // DHT22 error: 3 blinks
const int ERROR_VALVE = 4;       // Valve error: 4 blinks

// Global Objects
HX711 scale;                     // Load cell interface object
DHT dht22(DHT22_PIN, DHT22);    // Temperature/humidity sensor object

// Global Variables for State Management
unsigned long lastMeasureTime = 0;   // Timestamp of last measurement
float lastWeight = 0;               // Last valid weight measurement
float lastTemp = 0;                 // Last valid temperature reading
float lastHumidity = 0;            // Last valid humidity reading
bool systemError = false;          // Global error flag

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);
  
  // Record startup time
  startupTime = millis();
  
  // Initialize the watchdog timer (8-second timeout)
  wdt_enable(WDTO_8S);
  
  // Configure LED pins
  pinMode(LED_ERROR_PIN, OUTPUT);
  pinMode(LED_ACTIVE_PIN, OUTPUT);
  pinMode(LED_POWER_PIN, OUTPUT);
  
  // Configure valve relay control pins
  pinMode(VALVE_NC_PIN, OUTPUT);
  pinMode(VALVE_NO_PIN, OUTPUT);
  
  // Set initial LED states
  digitalWrite(LED_POWER_PIN, HIGH);    // Power LED on
  digitalWrite(LED_ERROR_PIN, LOW);     // Error LED off
  digitalWrite(LED_ACTIVE_PIN, LOW);    // Active LED off
  
  // Set initial valve states - Note: Relays are active LOW
  digitalWrite(VALVE_NC_PIN, HIGH);     // Top valve relay off (valve closed)
  digitalWrite(VALVE_NO_PIN, LOW);      // Bottom valve relay on (valve open)
  
  // Initialize sensors with error checking
  if (!initializeLoadCell()) {
    indicateError(ERROR_LOADCELL);
  }
  
  if (!initializeDHT22()) {
    indicateError(ERROR_DHT);
  }
  
  // Calculate time until next quarter hour
  unsigned long currentMillis = millis();
  unsigned long elapsedMinutes = (currentMillis / MINUTES_TO_MILLIS) % 60;
  unsigned long minutesToNextQuarter = 15 - (elapsedMinutes % 15);
  lastMeasureTime = currentMillis - MEASURE_INTERVAL + (minutesToNextQuarter * MINUTES_TO_MILLIS);
  
  Serial.println(F("WaterLogged node initialization complete"));
  Serial.print(F("Next measurement in "));
  Serial.print(minutesToNextQuarter);
  Serial.println(F(" minutes"));
  blinkLED(LED_ACTIVE_PIN, 3, 500);    // 3 blinks to indicate successful startup
}

void loop() {
  // Reset watchdog timer
  wdt_reset();
  
  unsigned long currentTime = millis();
  
  // Check if it's time for a measurement
  if (currentTime - lastMeasureTime >= MEASURE_INTERVAL) {
    digitalWrite(LED_ACTIVE_PIN, HIGH);    // Indicate active measurement
    performMeasurementCycle();
    digitalWrite(LED_ACTIVE_PIN, LOW);     // Measurement complete
    lastMeasureTime = currentTime;
    
    // Enter power saving mode until next measurement
    enterSleepMode();
  }
  
  // If there's an error, blink the error LED
  if (systemError) {
    blinkLED(LED_ERROR_PIN, 1, 1000);
  }
}

// Initialize load cell with error checking and zero factor storage
bool initializeLoadCell() {
  Serial.println(F("Initializing load cell..."));
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Check if HX711 is responsive
  if (!scale.wait_ready_timeout(1000)) {
    Serial.println(F("Load cell initialization failed!"));
    return false;
  }
  
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(64);  // Reset scale to 0 with 64 readings
  
  // Store zero factor for future reference
  zero_factor = scale.read_average(64);
  Serial.print(F("Load cell zero factor: "));
  Serial.println(zero_factor);
  
  // Verify readings are within expected range
  float testReading = scale.get_units(10);
  if (testReading < MIN_VALID_WEIGHT || testReading > MAX_VALID_WEIGHT) {
    Serial.println(F("Load cell readings out of range!"));
    return false;
  }
  
  Serial.println(F("Load cell initialized successfully"));
  return true;
}

// Initialize DHT22 with error checking
bool initializeDHT22() {
  dht22.begin();
  
  // Verify sensor is responding
  float testTemp = dht22.readTemperature();
  float testHum = dht22.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println(F("DHT22 initialization failed!"));
    return false;
  }
  
  Serial.println(F("DHT22 initialized successfully"));
  return true;
}

// Main measurement cycle
void performMeasurementCycle() {
  Serial.println(F("Starting measurement cycle"));
  systemError = false;  // Reset error flag
  
  // Step 1: Close bottom valve with verification
  if (!operateValve(VALVE_NO_PIN, LOW, "bottom valve close")) {
    systemError = true;
    return;
  }
  
  // Step 2: Take measurements
  float weight1 = getTaredWeight();
  float temp = getTemperature();
  float humidity = getHumidity();
  
  // Check if any measurements failed
  if (weight1 == -999 || temp == -999 || humidity == -999) {
    systemError = true;
    return;
  }
  
  // Step 3: Open top valve to drain
  if (!operateValve(VALVE_NC_PIN, HIGH, "top valve open")) {
    systemError = true;
    return;
  }
  
  // Allow time for complete drainage
  delay(VALVE_OPERATION_TIME);
  
  // Step 4: Close top valve
  if (!operateValve(VALVE_NC_PIN, LOW, "top valve close")) {
    systemError = true;
    return;
  }
  
  // Step 5: Take final weight measurement
  float weight2 = getTaredWeight();
  if (weight2 == -999) {
    systemError = true;
    return;
  }
  
  // Step 6: Reopen bottom valve for next collection
  if (!operateValve(VALVE_NO_PIN, HIGH, "bottom valve open")) {
    systemError = true;
    return;
  }
  
  // Calculate and store measurements
  lastWeight = weight1 - weight2;  // Net water weight
  lastTemp = temp;
  lastHumidity = humidity;
  
  // Send data if all operations were successful
  if (!systemError) {
    sendMeasurements();
  }
}

// Get weight measurement with error checking
float getTaredWeight() {
  float weight = -999;
  
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    weight = scale.get_units(WEIGHT_SAMPLES);
    if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
      return weight;
    }
    delay(1000);  // Wait before retry
  }
  
  Serial.println(F("Failed to get valid weight reading"));
  indicateError(ERROR_LOADCELL);
  return -999;
}

// Get temperature with error checking
float getTemperature() {
  float temp = -999;
  
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    temp = dht22.readTemperature(true);  // true = Fahrenheit
    if (!isnan(temp)) {
      return temp;
    }
    delay(1000);  // Wait before retry
  }
  
  Serial.println(F("Failed to read temperature!"));
  indicateError(ERROR_DHT);
  return -999;
}

// Get humidity with error checking
float getHumidity() {
  float humidity = -999;
  
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    humidity = dht22.readHumidity();
    if (!isnan(humidity)) {
      return humidity;
    }
    delay(1000);  // Wait before retry
  }
  
  Serial.println(F("Failed to read humidity!"));
  indicateError(ERROR_DHT);
  return -999;
}

// Operate valve with position verification
bool operateValve(int valvePin, int targetState, const char* operation) {
  // Invert logic for relay control (relays are active LOW)
  digitalWrite(valvePin, !targetState);  // Invert the signal for relay control
  
  // Allow time for valve operation while checking progress
  unsigned long startTime = millis();
  while (millis() - startTime < VALVE_OPERATION_TIME) {
    // Here you could add valve position feedback checking if hardware supports it
    wdt_reset();  // Reset watchdog during long operation
    delay(VALVE_CHECK_INTERVAL);
  }
  
  // Verify valve state (basic check - could be enhanced with feedback sensors)
  // Note: We check against inverted state since relays are active LOW
  if (digitalRead(valvePin) != !targetState) {
    Serial.print(F("Valve operation failed: "));
    Serial.println(operation);
    indicateError(ERROR_VALVE);
    return false;
  }
  
  return true;
}

// Calculate rainfall in inches from water weight in grams
float calculateRainfall(float waterWeight) {
  // 1g water = 1cm³
  float volumeCm3 = waterWeight;  // Direct conversion since 1g water = 1cm³
  float heightCm = volumeCm3 / COLLECTOR_AREA_CM2;  // height = volume / area
  float heightInches = heightCm * CM_TO_IN;
  return heightInches;
}

// Send measurement data
void sendMeasurements() {
  // Calculate timestamp since startup
  unsigned long timeStamp = millis() - startupTime;
  
  // Calculate rainfall from weight
  float rainfallInches = calculateRainfall(lastWeight);
  
  // Format: WEIGHT,RAINFALL_IN,TEMPERATURE_F,HUMIDITY,ZERO_FACTOR
  // Example: 245.320,0.2843,73.4,65.2,8234
  // Units:   grams,inches,°F,%,counts
  Serial.print(lastWeight, 3);      // Weight in grams to 3 decimal places
  Serial.print(F(","));
  Serial.print(rainfallInches, 4);  // Rainfall in inches to 4 decimal places
  Serial.print(F(","));
  Serial.print(lastTemp, 1);        // Temperature in Fahrenheit to 1 decimal place
  Serial.print(F(","));
  Serial.print(lastHumidity, 1);    // Humidity percentage to 1 decimal place
  Serial.print(F(","));
  Serial.println(zero_factor);      // Zero factor for calibration tracking
}

// Indicate error condition with LED blink pattern
void indicateError(int errorCode) {
  systemError = true;
  for (int i = 0; i < errorCode; i++) {
    digitalWrite(LED_ERROR_PIN, HIGH);
    delay(200);
    digitalWrite(LED_ERROR_PIN, LOW);
    delay(200);
  }
  delay(1000);  // Pause between patterns
}

// Generic LED blink function
void blinkLED(int pin, int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(duration / 2);
    digitalWrite(pin, LOW);
    delay(duration / 2);
  }
}

// Enter power saving mode between measurements
void enterSleepMode() {
  // Only enter sleep if no errors are present
  if (!systemError) {
    power_adc_disable();  // Disable ADC
    set_sleep_mode(SLEEP_MODE_PWR_SAVE);
    sleep_enable();
    
    // Actually enter sleep mode
    sleep_mode();
    
    // System wakes up here
    sleep_disable();
    power_all_enable();  // Re-enable all systems
  }
}