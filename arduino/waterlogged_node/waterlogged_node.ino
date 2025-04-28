/*
 * WaterLogged Rain Gauge Node with LA66 LoRa Module
 * 
 * This code implements an automated rain gauge system that:
 * 1. Collects rainwater and measures its weight using a load cell
 * 2. Monitors environmental conditions with a DHT22 sensor
 * 3. Manages water flow using two ball valves
 * 4. Reports data every 15 minutes
 * 5. Implements error checking and watchdog protection
 * 6. Sends data via LoRaWAN using LA66 module with AT commands
 * 
 * Hardware Components:
 * - Load Cell + HX711 amplifier (weight measurement)
 * - DHT22 Temperature/Humidity Sensor
 * - 1" Normally Closed (NC) Ball Valve (top/drain valve)
 * - 1/2" Normally Open (NO) Ball Valve (bottom/collection valve)
 * - Status LEDs
 * - LA66 LoRa module (controlled via AT commands over Serial)
 * 
 * Pin Configuration:
 * - Load Cell: DOUT->6, SCK->5
 * - DHT22: DATA->7
 * - NC Valve: A3
 * - NO Valve: A4
 * - Status LEDs: A0 (Error), A1 (Active), A2 (Power)
 * - LA66: RX->11, TX->10
 */

#include "HX711.h"          // Load cell amplifier library
#include "DHT.h"            // Temperature/humidity sensor library
#include <avr/wdt.h>        // Watchdog timer
#include <avr/sleep.h>      // Power management
#include <avr/power.h>      // Additional power management
#include <SoftwareSerial.h> // For Arduino boards that don't have multiple hardware serial ports
#include <Wire.h>           // I2C communication for RTC
#include <RTClib.h>         // RTC library for DS3231

// Pin Definitions
#define LOADCELL_DOUT_PIN  6    // HX711 data output pin
#define LOADCELL_SCK_PIN   5    // HX711 clock input pin
#define DHT22_PIN          7    // DHT22 data pin
#define VALVE_NC_PIN       A3   // NC valve relay control pin
#define VALVE_NO_PIN       A4   // NO valve relay control pin
#define LED_ERROR_PIN      A0   // Red LED for error indication
#define LED_ACTIVE_PIN     A1   // Green LED for active status
#define LED_POWER_PIN      A2   // Blue LED for power indication

#define DEBUG_LA66   1     // Set to 1 to enable extended debugging for LA66 communications
#define DEBUG_VALVES 1     // Set to 1 to enable detailed valve operation debugging
// LA66 Module Pins - VERIFY THESE MATCH YOUR WIRING
#define LORA_RX           11    // Connect to LA66 TX (Arduino receives from LA66)
#define LORA_TX           10    // Connect to LA66 RX (Arduino transmits to LA66)
#define LORA_RESET        0     // Set to 0 to disable reset functionality

// Error code definitions
#define ERROR_HX711_NOT_FOUND      0x01
#define ERROR_HX711_READING        0x02
#define ERROR_DHT22_NOT_FOUND      0x03
#define ERROR_DHT22_READING        0x04
#define ERROR_RTC_NOT_FOUND        0x05
#define ERROR_VALVE_OPERATION      0x06
#define ERROR_LORA_CONNECTION      0x07

// System Constants
const unsigned long MEASURE_INTERVAL = 900000;   // 15 minutes between measurements (in ms)
const float CALIBRATION_FACTOR = 210.25;        // Load cell calibration value
const unsigned long DRAINAGE_TIME = 35000;      // Time for NC valve operation (35 seconds)
const unsigned long VALVE_DELAY = 4000;         // Delay between valve operations (4 seconds)
const int WEIGHT_SAMPLES = 128;                 // Number of weight readings to average
const float MIN_VALID_WEIGHT = -1000.0;         // Minimum valid weight reading
const float MAX_VALID_WEIGHT = 1000.0;          // Maximum valid weight reading
const int MAX_SENSOR_RETRIES = 3;               // Maximum number of sensor reading attempts

// Power Management Constants
#define SLEEP_CYCLES_PER_MEASUREMENT 4  // Number of 8-second sleep cycles between RTC checks (32 seconds)
#define USE_POWER_SAVING true           // Set to false to disable sleep mode for debugging

// LA66 LoRa Configuration
#define LORA_BAUD_RATE    9600   // LA66 typically uses 9600 baud
#define AT_TIMEOUT        5000   // Timeout for AT commands (ms)
#define JOIN_RETRY_INTERVAL 300000 // Retry joining every 5 minutes if failed (300000 ms)
#define MAX_AT_ATTEMPTS   3      // Number of attempts for AT commands

// TTN Configuration - REPLACE WITH YOUR OWN VALUES
// These values must match what you set up in your TTN console
const char* DEV_EUI = "A840419731896C75";  // Device EUI (from LA66 or TTN console)
const char* JOIN_EUI = "A840410000000101"; // JOIN EUI (APP EUI) - Used for OTAA
const char* APP_KEY = "483C2434ACED9A95BB6C93A86461194A";  // Application Key for OTAA
// The following are no longer needed for OTAA but kept for reference
const char* DEV_ADDR = "";                 // Only used in ABP mode
const char* NWKSKEY = "";                  // Only used in ABP mode 
const char* APPSKEY = "";                  // Only used in ABP mode

// Create Software Serial for LA66
SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // RX, TX

// RTC Object
RTC_DS3231 rtc;

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
bool loraTxComplete = true;  // Flag for tracking LoRa transmission completion
unsigned long lastJoinAttempt = 0;
bool networkJoined = false;

// Response buffer for AT commands
char responseBuffer[128];

void setup() {
  // Initialize serial communication
  Serial.begin(9600);   // Debug console
  
  // Wait for serial to initialize (useful when debugging)
  delay(3000);
  
  Serial.println(F("WaterLogged Rain Gauge Node"));
  Serial.println(F("LA66 LoRa Module TTN Version"));
  Serial.print(F("LORA_RX (Arduino receive) pin: "));
  Serial.println(LORA_RX);
  Serial.print(F("LORA_TX (Arduino transmit) pin: "));
  Serial.println(LORA_TX);
  Serial.print(F("LORA_BAUD_RATE: "));
  Serial.println(LORA_BAUD_RATE);
  
  loraSerial.begin(LORA_BAUD_RATE);  // LA66 communication
  
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
  if (!initializeLoadCell() || !initializeDHT22() || !initializeRTC()) {
    systemError = true;
  }
  
  // Initialize LoRa and attempt to join TTN
  initializeLoRa();
  
  // Configure watchdog for sleep/wake cycles
  // Set up watchdog as interrupt, not reset
  cli(); // Disable interrupts
  wdt_reset(); // Reset the watchdog timer
  
  // Enter watchdog configuration mode:
  WDTCSR |= (1<<WDCE) | (1<<WDE);
  
  // Set Watchdog settings:
  // WDIE - Interrupt Enable
  // WDE - Reset Enable (set to 0 to disable, 1 to enable)
  // WDP3:0 - Prescaler (8s = 1001, 4s = 1000, 2s = 0111, 1s = 0110)
  WDTCSR = (1<<WDIE) | (0<<WDE) | (1<<WDP3) | (0<<WDP2) | (0<<WDP1) | (1<<WDP0);
  
  sei(); // Enable interrupts
  
  Serial.println(F("Setup complete"));
  Serial.println(F("Power saving mode active"));
  blinkLED(LED_ACTIVE_PIN, 3, 500);
}

void loop() {
  wdt_reset();
  
  // Check for responses from LA66
  checkLoRaSerial();
  
  // Check LoRa module and network status
  checkLoRaStatus();
  
  // Get current time from RTC
  DateTime now = rtc.now();
  
  // Use static variable to track last measurement minute
  static int8_t lastMeasurementMinute = -1;
  
  // Check if it's time for a measurement (every 15 minutes: 00, 15, 30, 45)
  // Only proceed if we haven't already taken a measurement this minute and LoRa is ready
  if (now.minute() % 15 == 0 && now.minute() != lastMeasurementMinute && loraTxComplete && networkJoined) {
    // Record that we've taken a measurement this minute
    lastMeasurementMinute = now.minute();
    
    Serial.print(F("Scheduled measurement at: "));
    char timeStr[9];
    sprintf(timeStr, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
    Serial.println(timeStr);
    
    digitalWrite(LED_ACTIVE_PIN, HIGH);
    performMeasurementCycle();
    digitalWrite(LED_ACTIVE_PIN, LOW);
  }
  
  // Reset lastMeasurementMinute when we're no longer at an interval of 15
  if (now.minute() % 15 != 0) {
    lastMeasurementMinute = -1;
  }
  
  // Error indication
  if (systemError) {
    blinkLED(LED_ERROR_PIN, 1, 1000);
    if (recoverFromSensorError()) {
      systemError = false;
      Serial.println(F("Sensor recovery successful"));
    } else {
      Serial.println(F("Sensor recovery failed"));
    }
  }
  
  // Enter sleep mode to save power
  // Using the RTC to wake up periodically and check the time
  // This dramatically reduces power consumption between measurements
  enterSleepMode();
}

// Emergency watchdog reset function in case things hang
void resetWatchdogTimeout() {
  wdt_reset();
}

// Check LoRa module and network status
void checkLoRaStatus() {
  static unsigned long lastCheckTime = 0;
  unsigned long currentTime = millis();
  
  // Only check status every minute to reduce power consumption
  if (currentTime - lastCheckTime > 60000) {
    lastCheckTime = currentTime;
    
    // Check join status with minimal power use
    if (!networkJoined) {
      // If we're not joined, check less frequently to save power
      if ((currentTime - lastJoinAttempt > JOIN_RETRY_INTERVAL)) {
        Serial.println(F("Attempting to rejoin TTN..."));
        joinNetwork();
      }
    } else {
      // We're joined, make sure the LoRa module is still responsive
      #if DEBUG_LA66
      // Ping the module with a simple AT command
      if (!sendATCommand("AT+NJS=?", NULL, 2000)) {
        // If no response, we may have lost connection
        Serial.println(F("LoRa module not responding, connection may be lost"));
        // Don't immediately set networkJoined to false - it might be temporary
      }
      #endif
    }
  }
}

// Initialize load cell
bool initializeLoadCell() {
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Check if HX711 is responding
  byte count = 0;
  while (count < 10 && !scale.is_ready()) {
    count++;
    delay(100);
  }
  
  if (count >= 10) {
    // HX711 not responding
    Serial.println(F("HX711 not found! Check wiring."));
    sendSensorErrorToTTN(ERROR_HX711_NOT_FOUND);
    return false;
  }
  
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
    sendSensorErrorToTTN(ERROR_DHT22_NOT_FOUND);
    return false;
  }
  
  return true;
}

// Initialize DS3231 RTC module
bool initializeRTC() {
  Serial.println(F("Initializing RTC..."));
  
  if (!rtc.begin()) {
    Serial.println(F("Couldn't find RTC! Check wiring"));
    return false;
  }
  
  if (rtc.lostPower()) {
    Serial.println(F("RTC lost power, setting to compile time!"));
    // Set RTC to the date & time this sketch was compiled
    // This is useful as a fallback but should be set to current time via Serial if possible
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    
    // Flash the error LED to indicate RTC time was reset
    blinkLED(LED_ERROR_PIN, 5, 200);
  }
  
  DateTime now = rtc.now();
  
  // Validate the time to ensure it's reasonable
  if (now.year() < 2023) {
    Serial.println(F("RTC has invalid year, resetting to compile time"));
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    blinkLED(LED_ERROR_PIN, 3, 200);
  }
  
  // Get RTC temperature - useful for monitoring system temperature
  float rtcTemp = rtc.getTemperature();
  
  Serial.print(F("Current RTC time: "));
  char timeStr[20];
  sprintf(timeStr, "%04d-%02d-%02d %02d:%02d:%02d", 
          now.year(), now.month(), now.day(),
          now.hour(), now.minute(), now.second());
  Serial.println(timeStr);
  
  Serial.print(F("RTC temperature: "));
  Serial.print(rtcTemp);
  Serial.println(F(" °C"));
  
  // Note: We are not using SQW or 32K pins, so we don't need to configure alarms
  // or interrupt functionality. This is a simple time-keeping usage only.
  
  return true;
}

// Initialize LA66 LoRa Module
void initializeLoRa() {
  Serial.println(F("Initializing LA66 module..."));
  
  // Clear any pending data
  while (loraSerial.available()) {
    loraSerial.read();
  }
  
  // Try to communicate with the module multiple times
  bool moduleResponding = false;
  for (int attempt = 1; attempt <= MAX_AT_ATTEMPTS; attempt++) {
    Serial.print(F("AT command attempt "));
    Serial.print(attempt);
    Serial.print(F(" of "));
    Serial.println(MAX_AT_ATTEMPTS);
    
    // Send a simple AT command to check if module is responsive
    loraSerial.println("AT");
    delay(1000); // Delay for LA66 response
    
    // Check for response
    unsigned long startTime = millis();
    while (millis() - startTime < AT_TIMEOUT) {
      if (loraSerial.available()) {
        String response = loraSerial.readStringUntil('\n');
        response.trim();
        #if DEBUG_LA66
        Serial.print(F("Response: "));
        Serial.println(response);
        #endif
        
        if (response.indexOf("OK") != -1) {
          moduleResponding = true;
          Serial.println(F("LA66 module is responding!"));
          break;
        }
      }
      delay(10);
    }
    
    if (moduleResponding) break;
    
    // If we're still not getting a response, try different baud rates
    if (attempt == 2 && !moduleResponding) {
      Serial.println(F("Trying alternative baud rate (115200)..."));
      loraSerial.end();
      loraSerial.begin(115200);
      delay(1000);
    }
    
    delay(1000); // Wait before next attempt
  }
  
  // If module is not responding, set error and return
  if (!moduleResponding) {
    Serial.println(F("LA66 module not responding after multiple attempts!"));
    Serial.println(F("Check connections and verify the module is powered."));
    systemError = true;
    digitalWrite(LED_ERROR_PIN, HIGH); // Turn on error LED
    return;
  }
  
  // Ensure we're at the correct baud rate
  loraSerial.end();
  loraSerial.begin(LORA_BAUD_RATE);
  delay(1000);
  
  // Module is responding, continue with configuration
  Serial.println(F("Configuring LA66 module for TTN using OTAA..."));
  
  // Get firmware version
  sendATCommand("AT+VER=?", NULL, 2000);
  
  // CRITICAL: Set the TTN keys for OTAA activation
  // Set Device EUI
  char deui_cmd[50];
  sprintf(deui_cmd, "AT+DEUI=%s", DEV_EUI);
  if (!sendATCommand(deui_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set Device EUI"));
    systemError = true;
  }
  
  // Set App EUI (JOIN EUI) - REQUIRED for OTAA
  char appeui_cmd[50];
  sprintf(appeui_cmd, "AT+APPEUI=%s", JOIN_EUI);
  if (!sendATCommand(appeui_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set App EUI"));
    systemError = true;
  }
  
  // Set App Key - REQUIRED for OTAA
  char appkey_cmd[70];
  sprintf(appkey_cmd, "AT+APPKEY=%s", APP_KEY);
  if (!sendATCommand(appkey_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set App Key"));
    systemError = true;
  }
  
  // Set join mode to OTAA
  if (!sendATCommand("AT+NJM=1", "OK", 2000)) {
    Serial.println(F("Failed to set OTAA join mode"));
    systemError = true;
  }
  
  // Verify the keys were set correctly
  #if DEBUG_LA66
  Serial.println(F("Verifying TTN keys..."));
  sendATCommand("AT+DEUI=?", NULL, 2000);
  sendATCommand("AT+APPEUI=?", NULL, 2000);
  sendATCommand("AT+APPKEY=?", NULL, 2000);
  sendATCommand("AT+NJM=?", NULL, 2000);
  #endif
  
  // Configure for US915 frequency band (TTN US typically uses channels 8-15)
  // For US915, set the proper channels
  sendATCommand("AT+CHE=2", "OK", 2000); // Use second subband (channels 8-15) for TTN US
  
  // Set data rate (0-4 for US915)
  if (!sendATCommand("AT+DR=3", "OK", 2000)) { // DR3 is SF9/BW125 - good balance between range and power
    Serial.println(F("Failed to set data rate"));
  }
  
  // Set confirmed message mode
  if (!sendATCommand("AT+CFM=1", "OK", 2000)) {
    Serial.println(F("Failed to set confirmed mode"));
  }
  
  // Set retry count for confirmed messages
  if (!sendATCommand("AT+RETY=3", "OK", 2000)) {
    Serial.println(F("Failed to set retry count"));
  }
  
  // Set port for uplink messages
  if (!sendATCommand("AT+PORT=1", "OK", 2000)) {
    Serial.println(F("Failed to set port"));
  }
  
  // Disable adaptive data rate for more reliable transmissions
  if (!sendATCommand("AT+ADR=0", "OK", 2000)) {
    Serial.println(F("Failed to disable ADR"));
  }
  
  // Set class A operation (standard for most TTN devices)
  if (!sendATCommand("AT+CLASS=A", "OK", 2000)) {
    Serial.println(F("Failed to set Class A"));
  }
  
  // Public network mode ON (required for TTN)
  if (!sendATCommand("AT+PNM=1", "OK", 2000)) {
    Serial.println(F("Failed to set public network mode"));
  }
  
  // Attempt to join network using OTAA
  joinNetwork();
  
  Serial.println(F("LA66 configuration complete"));
}

// Join LoRaWAN network using OTAA
void joinNetwork() {
  lastJoinAttempt = millis();
  
  // Set join mode to OTAA (1)
  if (!sendATCommand("AT+NJM=1", "OK", 2000)) {
    Serial.println(F("Failed to set OTAA join mode"));
    return;
  }
  
  // Send join command
  if (!sendATCommand("AT+JOIN", "+EVT:JOINED", 10000)) {
    Serial.println(F("Failed to join TTN network"));
    networkJoined = false;
    return;
  }
  
  // Network joined successfully
  networkJoined = true;
  Serial.println(F("OTAA mode activated, device ready to send data"));
  
  // Blink the active LED to show ready state
  blinkLED(LED_ACTIVE_PIN, 3, 200);
}

// Send data via LoRa to TTN
void sendLoRaData(float weight, float temperature, float humidity) {
  if (!networkJoined) {
    Serial.println(F("Not joined to TTN, cannot send data"));
    return;
  }

  wdt_reset(); // Reset watchdog before data processing

  // Pack data into hex string - optimize for smaller payloads to save airtime and battery
  // Format: 6 bytes - 2 bytes for each value (weight, temp, humidity)
  
  // Convert float values to integers (multiply by 100 to preserve 2 decimal places)
  int16_t weightInt = (int16_t)(weight * 100);
  int16_t tempInt = (int16_t)(temperature * 100);
  int16_t humidInt = (int16_t)(humidity * 100);
  
  // Create hex payload string - more efficient memory usage with fixed length
  char payload[13]; // 12 chars for hex + null terminator
  sprintf(payload, "%04X%04X%04X", weightInt & 0xFFFF, tempInt & 0xFFFF, humidInt & 0xFFFF);
  
  // Print data being sent for debugging
  Serial.println(F("Sending data to TTN:"));
  Serial.print(F("Weight: ")); Serial.print(weight); Serial.println(F(" g"));
  Serial.print(F("Temperature: ")); Serial.print(temperature); Serial.println(F(" °F"));
  Serial.print(F("Humidity: ")); Serial.print(humidity); Serial.println(F(" %"));
  Serial.print(F("Hex payload: ")); Serial.println(payload);
  
  // Format AT command for sending data
  char cmd[40];
  sprintf(cmd, "AT+SENDB=1,1,6,%s", payload);  // Port 1, confirmed message, 6 bytes
  
  // Set transmission flags
  loraTxComplete = false;
  digitalWrite(LED_ACTIVE_PIN, HIGH);
  
  wdt_reset(); // Reset watchdog before sending command
  
  // Add robust transmission with status checking and multiple retries
  bool sendSuccess = false;
  bool transmissionConfirmed = false;
  uint8_t sendAttempts = 0;
  const uint8_t MAX_SEND_ATTEMPTS = 3;
  
  while (!sendSuccess && sendAttempts < MAX_SEND_ATTEMPTS) {
    sendAttempts++;
    
    if (sendAttempts > 1) {
      Serial.print(F("Retrying uplink, attempt "));
      Serial.println(sendAttempts);
      delay(2000 * sendAttempts); // Increasing delay between retries
      wdt_reset();
    }
    
    // Clear any pending response data before sending new command
    while (loraSerial.available()) {
      loraSerial.read();
    }
    
    sendSuccess = sendATCommand(cmd, "OK", 5000);
    
    if (sendSuccess) {
      Serial.println(F("TTN uplink initiated successfully"));
      
      // Wait for confirmation feedback from module (looking for SEND_CONFIRMED_OK)
      unsigned long waitStart = millis();
      bool receivedResponse = false;
      
      // Wait up to 15 seconds for transmission confirmation
      while (millis() - waitStart < 15000 && !transmissionConfirmed) {
        if (checkForTransmissionConfirmation()) {
          transmissionConfirmed = true;
          break;
        }
        delay(100);
        wdt_reset(); // Keep resetting watchdog while waiting
      }
      
      if (transmissionConfirmed) {
        Serial.println(F("Transmission confirmed by network"));
        break; // Exit retry loop on confirmed success
      } else {
        Serial.println(F("No confirmation received from network"));
        sendSuccess = false; // Reset to try again if we didn't get confirmation
      }
    } else {
      Serial.print(F("Failed to send command, status: "));
      Serial.println(responseBuffer);
    }
  }
  
  if (!sendSuccess) {
    Serial.println(F("Failed to send uplink to TTN after maximum attempts"));
    systemError = true;
  }
  
  loraTxComplete = true; // Mark transmission as complete regardless of outcome
  digitalWrite(LED_ACTIVE_PIN, LOW);
  wdt_reset(); // Final watchdog reset after transmission attempt
}

// Send a sensor error code to TTN
void sendSensorErrorToTTN(uint8_t errorCode) {
  // Only attempt to send if we're connected to the network
  if (!networkJoined) {
    Serial.println(F("Not connected to TTN, can't send error notification"));
    return;
  }
  
  Serial.print(F("Sending sensor error code to TTN: 0x"));
  Serial.println(errorCode, HEX);
  
  // Format the error packet - compact format with error code and battery voltage
  // Error packet format: FF (error marker) + error code + battery voltage
  uint16_t batteryMv = 0;
  
  // Try to get battery voltage from LA66 if available
  if (sendATCommand("AT+BAT=?", NULL, 2000)) {
    // Extract battery voltage from response if possible
    // Format is typically a number like "3329" (mV)
    batteryMv = atoi(responseBuffer);
    
    if (batteryMv < 100 || batteryMv > 5000) {
      // Invalid voltage reading, use a default
      batteryMv = 3300;
    }
  } else {
    // If can't get voltage, use a default
    batteryMv = 3300;
  }
  
  // Create error payload
  char payload[9];
  sprintf(payload, "FF%02X%04X", errorCode, batteryMv & 0xFFFF);
  
  // Create and send command
  char cmd[30];
  sprintf(cmd, "AT+SENDB=2,1,4,%s", payload);  // Port 2 for errors, confirmed, 4 bytes
  
  // Set transmission flags
  loraTxComplete = false;
  digitalWrite(LED_ERROR_PIN, HIGH);
  
  // Try to send the error message
  bool sendSuccess = sendATCommand(cmd, "OK", 5000);
  
  if (sendSuccess) {
    Serial.println(F("Error notification sent to TTN"));
    
    // Blink to indicate error packet sent
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_ERROR_PIN, LOW);
      delay(100);
      digitalWrite(LED_ERROR_PIN, HIGH);
      delay(100);
    }
  } else {
    Serial.println(F("Failed to send error notification to TTN"));
  }
  
  digitalWrite(LED_ERROR_PIN, LOW);
  loraTxComplete = true;
}

// Define the measurement sequence with debug information
void performMeasurementCycle() {
  Serial.println(F("=== Starting measurement cycle ==="));
  Serial.println(F("- Cycle start time: "));
  
  DateTime now = rtc.now();
  char timeStr[20];
  sprintf(timeStr, "%04d-%02d-%02d %02d:%02d:%02d", 
          now.year(), now.month(), now.day(),
          now.hour(), now.minute(), now.second());
  Serial.println(timeStr);
  
  systemError = false;
  
  // Step 1: Close top valve (stop water inflow)
  // NC_PIN = top valve, normally open when not powered, setting HIGH closes it
  Serial.println(F("STEP 1: Closing top valve to seal collection chamber..."));
  if (!operateValve(VALVE_NC_PIN, HIGH, "top valve close")) {
    Serial.println(F("ABORT: Top valve close operation failed"));
    return;
  }
  
  Serial.print(F("- Waiting for valve settling: "));
  Serial.print(VALVE_DELAY);
  Serial.println(F(" ms"));
  delay(VALVE_DELAY);
  wdt_reset(); // Reset watchdog after valve delay
  
  // Step 2: Take measurements with water in container
  Serial.println(F("STEP 2: Taking initial measurements with water..."));
  
  // Tare the scale first to account for any drift
  Serial.println(F("- Taring scale..."));
  scale.tare(32);
  wdt_reset();
  
  // Take weight measurement of container with water
  float weightWithWater = getTaredWeight();
  Serial.print(F("- Weight with water: "));
  Serial.print(weightWithWater);
  Serial.println(F(" g"));
  wdt_reset(); // Reset watchdog after weight measurement
  
  // Take temperature measurement
  float temp = getTemperature();
  Serial.print(F("- Temperature: "));
  Serial.print(temp);
  Serial.println(F(" °F"));
  wdt_reset(); // Reset watchdog after temperature measurement
  
  // Take humidity measurement
  float humidity = getHumidity();
  Serial.print(F("- Humidity: "));
  Serial.print(humidity);
  Serial.println(F(" %"));
  wdt_reset(); // Reset watchdog after humidity measurement
  
  if (weightWithWater == -999 || temp == -999 || humidity == -999) {
    Serial.println(F("ABORT: One or more sensors failed to provide readings"));
    systemError = true;
    
    // Ensure valves return to normal state before aborting
    operateValve(VALVE_NC_PIN, LOW, "top valve open");
    operateValve(VALVE_NO_PIN, LOW, "bottom valve close");
    return;
  }
  
  // Step 3: Open bottom valve to drain water
  // NO_PIN = bottom valve, normally closed when not powered, setting HIGH opens it
  Serial.println(F("STEP 3: Opening bottom valve to drain water..."));
  if (!operateValve(VALVE_NO_PIN, HIGH, "bottom valve open")) {
    Serial.println(F("ABORT: Bottom valve operation failed"));
    // Ensure top valve returns to normal state before aborting
    operateValve(VALVE_NC_PIN, LOW, "top valve open");
    return;
  }
  
  // Wait for water to drain completely
  Serial.print(F("- Waiting for drainage: "));
  Serial.print(DRAINAGE_TIME);
  Serial.println(F(" ms"));
  
  // Show progress during long draining operation
  unsigned long drainStartTime = millis();
  uint8_t progressMarker = 0;
  while (millis() - drainStartTime < DRAINAGE_TIME) {
    wdt_reset(); // Keep resetting the watchdog during long drainage
    
    // Print progress marker every 5 seconds
    if ((millis() - drainStartTime) / 5000 > progressMarker) {
      progressMarker = (millis() - drainStartTime) / 5000;
      Serial.print(F("."));
    }
    
    delay(1000); // Check every second
  }
  Serial.println(F(" done"));
  
  // Step 4: Close bottom valve
  // NO_PIN = bottom valve, stop applying power to close it
  Serial.println(F("STEP 4: Closing bottom valve to reseal collection chamber..."));
  if (!operateValve(VALVE_NO_PIN, LOW, "bottom valve close")) {
    Serial.println(F("ABORT: Bottom valve close operation failed"));
    // Ensure top valve returns to normal state before aborting
    operateValve(VALVE_NC_PIN, LOW, "top valve open");
    return;
  }
  
  Serial.print(F("- Waiting for valve settling: "));
  Serial.print(VALVE_DELAY);
  Serial.println(F(" ms"));
  delay(VALVE_DELAY);
  wdt_reset(); // Reset watchdog after valve delay
  
  // Step 5: CRITICAL - Measure empty container weight
  Serial.println(F("STEP 5: Measuring empty container weight..."));
  
  // Take weight measurement of empty container
  float emptyContainerWeight = getTaredWeight();
  Serial.print(F("- Empty container weight: "));
  Serial.print(emptyContainerWeight);
  Serial.println(F(" g"));
  wdt_reset(); // Reset watchdog after weight measurement
  
  if (emptyContainerWeight == -999) {
    Serial.println(F("ABORT: Failed to measure empty container weight"));
    systemError = true;
    // Ensure top valve returns to normal state before aborting
    operateValve(VALVE_NC_PIN, LOW, "top valve open");
    return;
  }
  
  // Step 6: Open top valve to resume water collection
  // NC_PIN = top valve, stop applying power to open it
  Serial.println(F("STEP 6: Opening top valve to resume water collection..."));
  if (!operateValve(VALVE_NC_PIN, LOW, "top valve open")) {
    Serial.println(F("ABORT: Top valve open operation failed"));
    return;
  }
  
  // Step 7: Calculate actual water weight
  Serial.println(F("STEP 7: Calculating actual water weight..."));
  // Actual water weight = (container with water) - (empty container)
  float actualWaterWeight = weightWithWater - emptyContainerWeight;
  
  Serial.print(F("- Container with water: "));
  Serial.print(weightWithWater);
  Serial.println(F(" g"));
  
  Serial.print(F("- Empty container: "));
  Serial.print(emptyContainerWeight);
  Serial.println(F(" g"));
  
  Serial.print(F("- Actual water weight: "));
  Serial.print(actualWaterWeight);
  Serial.println(F(" g"));
  
  // Save measurements
  lastWeight = actualWaterWeight;
  lastTemp = temp;
  lastHumidity = humidity;
  
  // Step 8: Send data to TTN
  if (!systemError) {
    Serial.println(F("STEP 8: Sending data to TTN..."));
    sendLoRaData(lastWeight, lastTemp, lastHumidity);
    // Note: sendLoRaData has its own watchdog resets
  } else {
    Serial.println(F("ABORT: Not sending data due to system error"));
  }
  
  Serial.println(F("=== Measurement cycle complete ==="));
}

// Get weight measurement
float getTaredWeight() {
  // First attempt with no delay
  if (scale.is_ready()) {
    float weight = scale.get_units(WEIGHT_SAMPLES);
    if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
      return weight;
    }
  }
  
  // If first attempt failed, try up to 2 more times with shorter delays
  for (int i = 0; i < MAX_SENSOR_RETRIES - 1; i++) {
    delay(500);  // Reduced from 1000ms to 500ms
    
    if (!scale.is_ready()) {
      continue;
    }

    float weight = scale.get_units(WEIGHT_SAMPLES);
    if (weight >= MIN_VALID_WEIGHT && weight <= MAX_VALID_WEIGHT) {
      return weight;
    }
  }
  
  // Failed to get valid reading after retries
  Serial.println(F("Failed to get valid weight reading"));
  sendSensorErrorToTTN(ERROR_HX711_READING);
  return -999;
}

// Get temperature
float getTemperature() {
  // First attempt with no delay
  float temp = dht22.readTemperature(true); // true = Fahrenheit
  if (!isnan(temp)) {
    return temp;
  }
  
  // If first attempt failed, try up to 2 more times with shorter delays
  for (int i = 0; i < MAX_SENSOR_RETRIES - 1; i++) {
    delay(500);  // Reduced from 1000ms to 500ms
    
    temp = dht22.readTemperature(true);
    if (!isnan(temp)) {
      return temp;
    }
  }
  
  // Failed to get valid reading after retries
  Serial.println(F("Failed to get valid temperature reading"));
  sendSensorErrorToTTN(ERROR_DHT22_READING);
  return -999;
}

// Get humidity
float getHumidity() {
  // First attempt with no delay
  float humidity = dht22.readHumidity();
  if (!isnan(humidity)) {
    return humidity;
  }
  
  // If first attempt failed, try up to 2 more times with shorter delays
  for (int i = 0; i < MAX_SENSOR_RETRIES - 1; i++) {
    delay(500);  // Reduced from 1000ms to 500ms
    
    humidity = dht22.readHumidity();
    if (!isnan(humidity)) {
      return humidity;
    }
  }
  
  // Failed to get valid reading after retries
  Serial.println(F("Failed to get valid humidity reading"));
  sendSensorErrorToTTN(ERROR_DHT22_READING);
  return -999;
}

// Operate valve with verification
bool operateValve(int valvePin, int targetState, const char* operation) {
  #if DEBUG_VALVES
  Serial.print(F("VALVE: Operating "));
  Serial.print(operation);
  Serial.print(F(" - Setting pin "));
  Serial.print(valvePin);
  Serial.print(F(" to "));
  Serial.println(targetState ? "HIGH" : "LOW");
  
  unsigned long startTime = millis();
  #endif
  
  digitalWrite(valvePin, targetState);
  
  // Add verification logic
  // We could read back the pin state, check for expected current draw, etc.
  // For now just verifying by checking digital read
  if (digitalRead(valvePin) != targetState) {
    Serial.print(F("ERROR: Valve operation failed for "));
    Serial.println(operation);
    sendSensorErrorToTTN(ERROR_VALVE_OPERATION);
    return false;
  }
  
  #if DEBUG_VALVES
  // Calculate and report operation time
  unsigned long opTime = millis() - startTime;
  Serial.print(F("VALVE: "));
  Serial.print(operation);
  Serial.print(F(" completed in "));
  Serial.print(opTime);
  Serial.println(F(" ms"));
  #endif
  
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

// Send AT command and wait for response
bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
  // Clear previous response
  memset(responseBuffer, 0, sizeof(responseBuffer));
  
  #if DEBUG_LA66
  Serial.print(F("Sending command: "));
  Serial.println(command);
  #endif
  
  // Reset watchdog before sending command
  wdt_reset();
  
  // Send the command
  loraSerial.println(command);
  
  // Wait for response or timeout
  unsigned long startTime = millis();
  int bufferPos = 0;
  
  while (millis() - startTime < timeout) {
    if (loraSerial.available()) {
      char c = loraSerial.read();
      
      // Ignore carriage returns and line feeds until we have actual data
      if ((c == '\r' || c == '\n') && bufferPos == 0) {
        continue;
      }
      
      // If we receive a termination character and have data in the buffer
      if (c == '\r' || c == '\n') {
        if (bufferPos > 0) {
          // Null-terminate the buffer and print response
          responseBuffer[bufferPos] = '\0';
          
          #if DEBUG_LA66
          Serial.print(F("Response: "));
          Serial.println(responseBuffer);
          #endif
          
          // Check for expected response if provided
          if (expectedResponse == NULL || strstr(responseBuffer, expectedResponse) != NULL) {
            return true;
          }
          // Clear buffer for next line
          bufferPos = 0;
        }
      } else if (bufferPos < sizeof(responseBuffer) - 1) {
        responseBuffer[bufferPos++] = c;
      }
    }
    
    // For long timeouts, reset the watchdog periodically
    // This is crucial for commands like AT+JOIN which can take several seconds
    if ((millis() - startTime) % 4000 < 10) {  // Reset every ~4 seconds
      wdt_reset();
    }
  }
  
  #if DEBUG_LA66
  Serial.println(F("Command timed out"));
  #endif
  
  wdt_reset();  // Reset watchdog after timeout
  
  // Flush any remaining data in the serial buffer
  while (loraSerial.available()) {
    loraSerial.read();
  }
  
  return false;
}

// Check for LA66 module responses
void checkLoRaSerial() {
  if (loraSerial.available()) {
    char buffer[64];
    int pos = 0;
    
    while (loraSerial.available() && pos < sizeof(buffer) - 1) {
      char c = loraSerial.read();
      
      // Ignore carriage returns and line feeds until we have actual data
      if ((c == '\r' || c == '\n') && pos == 0) {
        continue;
      }
      
      // If we receive a termination character and have data in the buffer
      if (c == '\r' || c == '\n') {
        if (pos > 0) {
          buffer[pos] = '\0';
          
          // Process received line
          #if DEBUG_LA66
          Serial.print(F("LA66: "));
          Serial.println(buffer);
          #endif
          
          // Check for specific LA66 event notifications
          // Based on the LA66 documentation
          
          // Transmission confirmations
          if (strstr(buffer, "+EVT:SEND_CONFIRMED_OK") != NULL) {
            // Confirmed uplink was acknowledged by TTN
            Serial.println(F("Uplink confirmed by TTN"));
            loraTxComplete = true;
          } 
          else if (strstr(buffer, "+EVT:SEND_CONFIRMED_FAILED") != NULL) {
            // Confirmed uplink failed
            Serial.println(F("Uplink confirmation failed"));
            loraTxComplete = true;
            // Don't set systemError=true here to avoid triggering false alarms
            // TTN might not be able to send downlinks sometimes
          }
          else if (strstr(buffer, "+EVT:SEND_UNCONFIRMED_OK") != NULL) {
            // Unconfirmed uplink sent successfully
            Serial.println(F("Unconfirmed uplink sent"));
            loraTxComplete = true;
          }
          
          // Join notifications
          else if (strstr(buffer, "+EVT:JOINED") != NULL) {
            // Network joined successfully (OTAA)
            Serial.println(F("TTN joined successfully!"));
            networkJoined = true;
            
            // After successful join, check and print network details
            #if DEBUG_LA66
            sendATCommand("AT+NJS=?", NULL, 2000);  // Verify join status
            sendATCommand("AT+DEVADDR=?", NULL, 2000); // Confirm Device Address
            sendATCommand("AT+DR=?", NULL, 2000);   // Check data rate
            #endif
            
            // Blink the active LED to show successful join
            blinkLED(LED_ACTIVE_PIN, 5, 200);
          }
          else if (strstr(buffer, "+EVT:JOIN_FAILED") != NULL) {
            // Join failed (OTAA)
            Serial.println(F("TTN join failed"));
            networkJoined = false;
            
            // Blink the error LED to show join failure
            blinkLED(LED_ERROR_PIN, 3, 500);
          }
          
          // Downlink data received
          else if (strstr(buffer, "+EVT:RX") != NULL) {
            // Downlink received
            Serial.println(F("Downlink data received from TTN"));
            // You could parse this data if needed
            #if DEBUG_LA66
            sendATCommand("AT+RECVB=?", NULL, 2000);  // Print received data in binary format
            #endif
          }
          
          // Link status
          else if (strstr(buffer, "+EVT:LINK_INVALID") != NULL) {
            // Connection lost
            Serial.println(F("TTN connection lost, will try to rejoin"));
            networkJoined = false;
          }
          
          pos = 0;
        }
      } else {
        buffer[pos++] = c;
      }
    }
  }
}

// Set up sleep mode and enter it
void enterSleepMode() {
  if (!USE_POWER_SAVING) {
    return; // Skip sleep mode if disabled for debugging
  }
  
  Serial.println(F("Entering sleep mode to save power..."));
  Serial.flush(); // Make sure all serial output is sent before sleep
  
  // Prepare for sleep
  digitalWrite(LED_ACTIVE_PIN, LOW);
  digitalWrite(LED_POWER_PIN, LOW); // Turn off power LED during sleep
  
  // Note: We're not using SQW pin for alarms, so we'll use watchdog timer
  // to wake up periodically and check the RTC instead
  
  // Disable ADC to save power
  ADCSRA &= ~(1 << ADEN);
  
  // Power down various components to save battery
  power_adc_disable();    // ADC converter
  power_spi_disable();    // SPI
  power_timer1_disable(); // Timer 1
  power_timer2_disable(); // Timer 2
  
  // We need to keep I2C active for RTC communication
  
  // Configure sleep mode
  set_sleep_mode(SLEEP_MODE_PWR_DOWN); // Deepest sleep mode
  
  // Watchdog is already configured for 8-second intervals
  
  // Enter multiple sleep cycles
  for (uint8_t i = 0; i < SLEEP_CYCLES_PER_MEASUREMENT; i++) {
    // Reset watchdog before each sleep cycle
    wdt_reset();
    
    // Disable brown-out detection during sleep (saves power)
    #if defined(BODS) && defined(BODSE)
      sleep_bod_disable();
    #endif
    
    // Enter sleep mode
    sleep_enable();
    interrupts(); // Ensure interrupts are enabled so watchdog can wake us
    sleep_mode(); // The program will continue from here after waking
    
    // After waking up...
    sleep_disable();
    
    // Short flash of power LED to indicate we're still alive (debugging)
    #if DEBUG_LA66
    digitalWrite(LED_POWER_PIN, HIGH);
    delay(5);
    digitalWrite(LED_POWER_PIN, LOW);
    #endif
  }
  
  // Re-enable power to components
  power_all_enable();
  
  // Re-enable ADC
  ADCSRA |= (1 << ADEN);
  
  // Turn power LED back on
  digitalWrite(LED_POWER_PIN, HIGH);
  
  Serial.println(F("Woke from sleep"));
}

// Watchdog timer interrupt service routine
ISR(WDT_vect) {
  // This is called when watchdog times out - we don't need to do anything here
  // Just having this ISR allows the watchdog to be used as a wake timer
}

// Detect and recover from sensor errors
bool recoverFromSensorError() {
  static uint8_t recoveryAttempts = 0;
  const uint8_t MAX_RECOVERY_ATTEMPTS = 3;
  
  recoveryAttempts++;
  Serial.print(F("Attempting sensor recovery ("));
  Serial.print(recoveryAttempts);
  Serial.print(F(" of "));
  Serial.print(MAX_RECOVERY_ATTEMPTS);
  Serial.println(F(")"));
  
  // Reset each sensor subsystem
  // First, HX711 load cell
  scale.power_down();
  delay(1000);
  scale.power_up();
  scale.tare(64);
  zero_factor = scale.read_average();
  
  // Reset DHT22 (just re-initialize it)
  dht22.begin();
  
  // Reset RTC if needed
  DateTime now = rtc.now();
  if (now.year() < 2023) {
    // RTC has invalid time
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  
  // Basic validation checks
  bool loadCellOk = (getTaredWeight() != -999);
  bool dhtOk = (getTemperature() != -999 && getHumidity() != -999);
  
  // Only reset error state if all sensors are working
  if (loadCellOk && dhtOk) {
    recoveryAttempts = 0;
    return true;
  }
  
  // If we've reached max attempts, give up for now
  if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
    recoveryAttempts = 0;
    return false;
  }
  
  return false;
}

// Check for transmission confirmation
bool checkForTransmissionConfirmation() {
  if (loraSerial.available()) {
    char buffer[64];
    int pos = 0;

    while (loraSerial.available() && pos < sizeof(buffer) - 1) {
      char c = loraSerial.read();

      if ((c == '\r' || c == '\n') && pos == 0) {
        continue;
      }

      if (c == '\r' || c == '\n') {
        if (pos > 0) {
          buffer[pos] = '\0';

          if (strstr(buffer, "+EVT:SEND_CONFIRMED_OK") != NULL) {
            return true;
          }

          pos = 0;
        }
      } else {
        buffer[pos++] = c;
      }
    }
  }

  return false;
}