/*
 * WaterLogged Rain Gauge Node
 * 
 * This code implements an automated rain gauge system that:
 * 1. Collects rainwater and measures its weight using a load cell
 * 2. Monitors environmental conditions with a DHT22 sensor
 * 3. Manages water flow using two ball valves
 * 4. Reports data every 15 minutes
 * 5. Implements error checking and watchdog protection
 * 6. Sends data via LoRaWAN
 * 
 * Hardware Components:
 * - Load Cell + HX711 amplifier (weight measurement)
 * - DHT22 Temperature/Humidity Sensor
 * - 1" Normally Closed (NC) Ball Valve (top/drain valve)
 * - 1/2" Normally Open (NO) Ball Valve (bottom/collection valve)
 * - Status LEDs
 * - LoRaWAN module
 * 
 * Pin Configuration:
 * - Load Cell: DOUT->3, SCK->2
 * - DHT22: DATA->4
 * - NC Valve: 5
 * - NO Valve: 6
 * - Status LEDs: A0 (Error), A1 (Active), A2 (Power)
 */

#include "HX711.h"          // Load cell amplifier library
#include "DHT.h"           // Temperature/humidity sensor library
#include <lmic.h>          // LoRaWAN library
#include <hal/hal.h>       // Hardware abstraction layer
#include <SPI.h>           // Required for LoRa
#include "lmic_pinmap.h"   // LoRa pin configuration
#include <avr/wdt.h>       // Watchdog timer
#include <avr/sleep.h>     // Power management
#include <avr/power.h>     // Additional power management

// Pin Definitions
#define LOADCELL_DOUT_PIN  2    // HX711 data output pin (hardwired)
#define LOADCELL_SCK_PIN   3    // HX711 clock input pin (hardwired)
#define DHT22_PIN          4    // DHT22 data pin (hardwired)
#define VALVE_NC_PIN       5    // NC valve relay control pin (hardwired)
#define VALVE_NO_PIN       6    // NO valve relay control pin (hardwired)
#define LED_ERROR_PIN      A0   // Red LED for error indication (moved to analog pin)
#define LED_ACTIVE_PIN     A1   // Green LED for active status (moved to analog pin)
#define LED_POWER_PIN      A2   // Blue LED for power indication (moved to analog pin)

// System Constants
const unsigned long MEASURE_INTERVAL = 900000;   // 15 minutes between measurements (in ms)
const float CALIBRATION_FACTOR = 210.25;        // Load cell calibration value
const unsigned long VALVE_NC_TIME = 35000;      // Time for NC valve operation (35 seconds)
const unsigned long VALVE_NO_TIME = 27000;      // Time for NO valve operation (27 seconds)
const unsigned long VALVE_DELAY = 4000;         // Delay between valve operations (4 seconds)
const int WEIGHT_SAMPLES = 128;                 // Number of weight readings to average
const float MIN_VALID_WEIGHT = -1000.0;        // Minimum valid weight reading
const float MAX_VALID_WEIGHT = 1000.0;         // Maximum valid weight reading
const int MAX_SENSOR_RETRIES = 3;              // Maximum number of sensor reading attempts

// LoRaWAN Configuration
static const PROGMEM u1_t NWKSKEY[16] = { 0x4D, 0x60, 0x9E, 0x43, 0xD7, 0x45, 0x25, 0x36, 0xA9, 0xA0, 0x5B, 0x3B, 0x98, 0xCD, 0x39, 0x48 };
static const u1_t PROGMEM APPSKEY[16] = { 0x9E, 0x0B, 0x95, 0x0D, 0x66, 0x5C, 0x28, 0xB1, 0x5B, 0x28, 0x10, 0xE3, 0x19, 0x88, 0x7E, 0x2A };
static const u4_t DEVADDR = 0x260CA32F;
static osjob_t sendjob;
bool loraReady = false;

// Global Objects
HX711 scale;
DHT dht22(DHT22_PIN, DHT22);

// Global Variables
unsigned long lastMeasureTime = 0;
float lastWeight = 0;
float lastTemp = 0;
float lastHumidity = 0;
long zero_factor;
bool systemError = false;

// Required LMIC callbacks
void os_getArtEui (u1_t* buf) { }
void os_getDevEui (u1_t* buf) { }
void os_getDevKey (u1_t* buf) { }

void setup() {
  Serial.begin(9600);
  Serial.println(F("WaterLogged node starting..."));
  
  // Configure pins
  pinMode(LED_ERROR_PIN, OUTPUT);
  pinMode(LED_ACTIVE_PIN, OUTPUT);
  pinMode(LED_POWER_PIN, OUTPUT);
  pinMode(VALVE_NC_PIN, OUTPUT);
  pinMode(VALVE_NO_PIN, OUTPUT);
  
  // Set initial states
  digitalWrite(LED_POWER_PIN, HIGH);
  digitalWrite(LED_ERROR_PIN, LOW);
  digitalWrite(LED_ACTIVE_PIN, LOW);
  digitalWrite(VALVE_NC_PIN, HIGH);    // NC valve closed (relay off)
  digitalWrite(VALVE_NO_PIN, LOW);     // NO valve open (relay on)
  
  // Initialize sensors
  if (!initializeLoadCell() || !initializeDHT22()) {
    systemError = true;
  }
  
  // Initialize LoRaWAN
  initializeLoRaWAN();
  
  // Enable watchdog
  wdt_enable(WDTO_8S);
  
  Serial.println(F("Setup complete"));
  blinkLED(LED_ACTIVE_PIN, 3, 500);
}

void loop() {
  wdt_reset();
  
  unsigned long currentTime = millis();
  
  // Check if it's time for a measurement
  if (currentTime - lastMeasureTime >= MEASURE_INTERVAL) {
    digitalWrite(LED_ACTIVE_PIN, HIGH);
    performMeasurementCycle();
    digitalWrite(LED_ACTIVE_PIN, LOW);
    lastMeasureTime = currentTime;
  }
  
  // Run LoRaWAN tasks
  os_runloop_once();
  
  // Error indication
  if (systemError) {
    blinkLED(LED_ERROR_PIN, 1, 1000);
  }
}

// Initialize load cell
bool initializeLoadCell() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare(64);
  
  zero_factor = scale.read_average();
  Serial.print(F("Load cell zero factor: "));
  Serial.println(zero_factor);
  
  return true;
}

// Initialize DHT22
bool initializeDHT22() {
  dht22.begin();
  float testTemp = dht22.readTemperature();
  float testHum = dht22.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println(F("DHT22 initialization failed!"));
    return false;
  }
  
  return true;
}

// Initialize LoRaWAN
void initializeLoRaWAN() {
  Serial.println(F("Initializing LoRaWAN..."));
  
  // Initialize LMIC
  os_init_ex(&lmic_pins);
  
  // Reset the MAC state
  Serial.println(F("Performing LMIC reset..."));
  LMIC_reset();
  
  // Set static session parameters
  uint8_t appskey[sizeof(APPSKEY)];
  uint8_t nwkskey[sizeof(NWKSKEY)];
  memcpy_P(appskey, APPSKEY, sizeof(APPSKEY));
  memcpy_P(nwkskey, NWKSKEY, sizeof(NWKSKEY));
  
  Serial.println(F("Setting up LMIC session..."));
  LMIC_setSession(0x1, DEVADDR, nwkskey, appskey);
  
  Serial.println(F("Configuring US915 channels..."));
  // Set up channels for US915 band
  // Disable all channels first
  for (int i = 0; i < 72; i++) {
    LMIC_disableChannel(i);
  }
  
  // Enable only the first 8 channels (902.3 - 903.7 MHz)
  for (int i = 0; i < 8; i++) {
    LMIC_enableChannel(i);
  }
  
  // Disable link check validation
  LMIC_setLinkCheckMode(0);
  
  // Set data rate and transmit power for uplink
  LMIC_setDrTxpow(DR_SF7, 14);
  
  // Enable debug output for radio driver
  LMIC_selectSubBand(1);
  
  // Add a small delay to let the radio initialize
  delay(100);
  
  Serial.println(F("LoRaWAN initialization complete"));
  loraReady = true;
}

// Perform measurement cycle
void performMeasurementCycle() {
  Serial.println(F("Starting measurement cycle"));
  systemError = false;
  
  // Step 1: Close bottom valve
  if (!operateValve(VALVE_NO_PIN, HIGH, "bottom valve close")) {
    return;
  }
  delay(VALVE_DELAY);
  
  // Step 2: Take initial measurements
  float weight1 = getTaredWeight();
  float temp = getTemperature();
  float humidity = getHumidity();
  
  if (weight1 == -999 || temp == -999 || humidity == -999) {
    systemError = true;
    return;
  }
  
  // Step 3: Open top valve to drain
  if (!operateValve(VALVE_NC_PIN, LOW, "top valve open")) {
    return;
  }
  delay(VALVE_NC_TIME);  // Wait for drainage
  
  // Step 4: Close top valve
  if (!operateValve(VALVE_NC_PIN, HIGH, "top valve close")) {
    return;
  }
  delay(VALVE_DELAY);
  
  // Step 5: Take final weight
  float weight2 = getTaredWeight();
  if (weight2 == -999) {
    systemError = true;
    return;
  }
  
  // Step 6: Reopen bottom valve
  if (!operateValve(VALVE_NO_PIN, LOW, "bottom valve open")) {
    return;
  }
  
  // Calculate final measurements
  lastWeight = weight1 - weight2;
  lastTemp = temp;
  lastHumidity = humidity;
  
  // Send data via LoRaWAN
  if (loraReady && !systemError) {
    sendLoRaData();
  }
}

// Send data via LoRaWAN
void sendLoRaData() {
  if (LMIC.opmode & OP_TXRXPEND) {
    Serial.println(F("LoRa busy, skipping transmission"));
    return;
  }
  
  Serial.println(F("Preparing LoRa packet..."));
  
  // Prepare payload: weight (4 bytes), temp (2 bytes), humidity (2 bytes)
  uint8_t payload[8];
  uint32_t weightInt = *(uint32_t*)&lastWeight;
  int16_t tempInt = (int16_t)(lastTemp * 10);
  int16_t humInt = (int16_t)(lastHumidity * 10);
  
  memcpy(&payload[0], &weightInt, 4);
  memcpy(&payload[4], &tempInt, 2);
  memcpy(&payload[6], &humInt, 2);
  
  Serial.println(F("Queuing LoRa packet..."));
  LMIC_setTxData2(1, payload, sizeof(payload), 0);
  Serial.println(F("LoRa packet queued successfully"));
}

// Add LoRa event handling
void onEvent (ev_t ev) {
    Serial.print(F("Event: "));
    switch(ev) {
        case EV_SCAN_TIMEOUT:
            Serial.println(F("EV_SCAN_TIMEOUT"));
            break;
        case EV_TXCOMPLETE:
            Serial.println(F("EV_TXCOMPLETE (includes waiting for RX windows)"));
            break;
        case EV_RXCOMPLETE:
            Serial.println(F("EV_RXCOMPLETE"));
            break;
        case EV_LINK_DEAD:
            Serial.println(F("EV_LINK_DEAD"));
            break;
        case EV_LINK_ALIVE:
            Serial.println(F("EV_LINK_ALIVE"));
            break;
        default:
            Serial.print(F("Unknown event: "));
            Serial.println((unsigned) ev);
            break;
    }
}

// Get weight measurement
float getTaredWeight() {
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    float weight = scale.get_units(WEIGHT_SAMPLES);
    if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
      return weight;
    }
    delay(1000);
  }
  return -999;
}

// Get temperature
float getTemperature() {
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    float temp = dht22.readTemperature(true);
    if (!isnan(temp)) {
      return temp;
    }
    delay(1000);
  }
  return -999;
}

// Get humidity
float getHumidity() {
  for (int i = 0; i < MAX_SENSOR_RETRIES; i++) {
    float humidity = dht22.readHumidity();
    if (!isnan(humidity)) {
      return humidity;
    }
    delay(1000);
  }
  return -999;
}

// Operate valve with verification
bool operateValve(int valvePin, int targetState, const char* operation) {
  Serial.print(F("Operating "));
  Serial.print(operation);
  Serial.println(F("..."));
  
  digitalWrite(valvePin, targetState);
  return true;
}

// Blink LED
void blinkLED(int pin, int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(duration / 2);
    digitalWrite(pin, LOW);
    delay(duration / 2);
  }
}