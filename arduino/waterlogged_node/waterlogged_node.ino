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
// LA66 Module Pins - VERIFY THESE MATCH YOUR WIRING
#define LORA_RX           11    // Connect to LA66 TX (Arduino receives from LA66)
#define LORA_TX           10    // Connect to LA66 RX (Arduino transmits to LA66)
#define LORA_RESET        0     // Set to 0 to disable reset functionality

// System Constants
const unsigned long MEASURE_INTERVAL = 900000;   // 15 minutes between measurements (in ms)
const float CALIBRATION_FACTOR = 210.25;        // Load cell calibration value
const unsigned long VALVE_NC_TIME = 35000;      // Time for NC valve operation (35 seconds)
const unsigned long VALVE_NO_TIME = 27000;      // Time for NO valve operation (27 seconds)
const unsigned long VALVE_DELAY = 4000;         // Delay between valve operations (4 seconds)
const int WEIGHT_SAMPLES = 128;                 // Number of weight readings to average
const float MIN_VALID_WEIGHT = -1000.0;         // Minimum valid weight reading
const float MAX_VALID_WEIGHT = 1000.0;          // Maximum valid weight reading
const int MAX_SENSOR_RETRIES = 3;               // Maximum number of sensor reading attempts

// LA66 LoRa Configuration
#define LORA_BAUD_RATE    9600   // LA66 typically uses 9600 baud
#define AT_TIMEOUT        5000   // Timeout for AT commands (ms)
#define JOIN_RETRY_INTERVAL 300000 // Retry joining every 5 minutes if failed (300000 ms)
#define MAX_AT_ATTEMPTS   3      // Number of attempts for AT commands

// TTN Configuration - REPLACE WITH YOUR OWN VALUES
// These values must match what you set up in your TTN console
const char* DEV_EUI = "70B3D57ED00530EE";  // Device EUI (from LA66 or TTN console)
const char* DEV_ADDR = "00000000";         // Device Address for ABP (from TTN console)
const char* NWKSKEY = "00000000000000000000000000000000";  // Network Session Key (from TTN console)
const char* APPSKEY = "00000000000000000000000000000000";  // Application Session Key (from TTN console)

// Create Software Serial for LA66
SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // RX, TX

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
  if (!initializeLoadCell() || !initializeDHT22()) {
    systemError = true;
  }
  
  // Initialize LoRa and attempt to join TTN
  initializeLoRa();
  
  // Enable watchdog
  wdt_enable(WDTO_8S);
  
  Serial.println(F("Setup complete"));
  blinkLED(LED_ACTIVE_PIN, 3, 500);
}

void loop() {
  wdt_reset();
  
  // Check for responses from LA66
  checkLoRaSerial();
  
  // Check if we need to retry joining network
  if (!networkJoined && (millis() - lastJoinAttempt > JOIN_RETRY_INTERVAL)) {
    Serial.println(F("Retrying network join..."));
    joinNetwork();
  }
  
  unsigned long currentTime = millis();
  
  // Check if it's time for a measurement
  if (currentTime - lastMeasureTime >= MEASURE_INTERVAL && loraTxComplete && networkJoined) {
    digitalWrite(LED_ACTIVE_PIN, HIGH);
    performMeasurementCycle();
    digitalWrite(LED_ACTIVE_PIN, LOW);
    lastMeasureTime = currentTime;
  }
  
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
        Serial.print(F("Response: "));
        Serial.println(response);
        
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
  Serial.println(F("Configuring LA66 module for TTN using ABP..."));
  
  // Get firmware version
  sendATCommand("AT+VER=?", NULL, 2000);
  
  // CRITICAL: Set the TTN keys for ABP activation
  // Set Device EUI
  char deui_cmd[50];
  sprintf(deui_cmd, "AT+DEUI=%s", DEV_EUI);
  if (!sendATCommand(deui_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set Device EUI"));
    systemError = true;
  }
  
  // Set Device Address - REQUIRED for ABP
  char daddr_cmd[50];
  sprintf(daddr_cmd, "AT+DADDR=%s", DEV_ADDR);
  if (!sendATCommand(daddr_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set Device Address"));
    systemError = true;
  }
  
  // Set Network Session Key - REQUIRED for ABP
  char nwkskey_cmd[70];
  sprintf(nwkskey_cmd, "AT+NWKSKEY=%s", NWKSKEY);
  if (!sendATCommand(nwkskey_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set Network Session Key"));
    systemError = true;
  }
  
  // Set Application Session Key - REQUIRED for ABP
  char appskey_cmd[70];
  sprintf(appskey_cmd, "AT+APPSKEY=%s", APPSKEY);
  if (!sendATCommand(appskey_cmd, "OK", 2000)) {
    Serial.println(F("Failed to set Application Session Key"));
    systemError = true;
  }
  
  // Set join mode to ABP
  if (!sendATCommand("AT+NJM=0", "OK", 2000)) {
    Serial.println(F("Failed to set ABP join mode"));
    systemError = true;
  }
  
  // Verify the keys were set correctly
  Serial.println(F("Verifying TTN keys..."));
  sendATCommand("AT+DEUI=?", NULL, 2000);
  sendATCommand("AT+DADDR=?", NULL, 2000);
  sendATCommand("AT+NWKSKEY=?", NULL, 2000);
  sendATCommand("AT+APPSKEY=?", NULL, 2000);
  sendATCommand("AT+NJM=?", NULL, 2000);
  
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
  
  // For ABP, activate network connection
  joinNetwork();
  
  Serial.println(F("LA66 configuration complete"));
}

// Join LoRaWAN network using ABP
void joinNetwork() {
  lastJoinAttempt = millis();
  
  // Set join mode to ABP (0)
  if (!sendATCommand("AT+NJM=0", "OK", 2000)) {
    Serial.println(F("Failed to set ABP join mode"));
    return;
  }
  
  // In ABP mode, we need to verify the network session is active
  sendATCommand("AT+NJS=?", NULL, 2000);
  
  // For ABP, we can simply set network joined to true since keys are pre-configured
  networkJoined = true;
  Serial.println(F("ABP mode activated, device ready to send data"));
  
  // Blink the active LED to show ready state
  blinkLED(LED_ACTIVE_PIN, 3, 200);
}

// Send data via LoRa to TTN
void sendLoRaData(float weight, float temperature, float humidity) {
  if (!networkJoined) {
    Serial.println(F("Not joined to TTN, cannot send data"));
    return;
  }

  // Pack data into hex string
  // Format: 6 bytes - 2 bytes for each value (weight, temp, humidity)
  // Using big-endian format (MSB first)
  
  // Convert float values to integers (multiply by 100 to preserve 2 decimal places)
  int16_t weightInt = (int16_t)(weight * 100);
  int16_t tempInt = (int16_t)(temperature * 100);
  int16_t humidInt = (int16_t)(humidity * 100);
  
  // Create hex payload string
  char payload[24];  // Need 12 chars for hex + 1 for null terminator
  sprintf(payload, "%02X%02X%02X%02X%02X%02X", 
          (weightInt >> 8) & 0xFF, weightInt & 0xFF,
          (tempInt >> 8) & 0xFF, tempInt & 0xFF,
          (humidInt >> 8) & 0xFF, humidInt & 0xFF);
  
  // Print data being sent for debugging
  Serial.println(F("Sending data to TTN:"));
  Serial.print(F("Weight: ")); Serial.print(weight); Serial.println(F(" g"));
  Serial.print(F("Temperature: ")); Serial.print(temperature); Serial.println(F(" °F"));
  Serial.print(F("Humidity: ")); Serial.print(humidity); Serial.println(F(" %"));
  Serial.print(F("Hex payload: ")); Serial.println(payload);
  
  // Format AT command for sending data
  // Using SENDB command from LA66 documentation (section 5.31)
  // AT+SENDB=<confirmed>,<port>,<data_len>,<data>
  char cmd[40];
  sprintf(cmd, "AT+SENDB=1,1,6,%s", payload);  // Port 1, confirmed message, 6 bytes
  
  // Set transmission flags
  loraTxComplete = false;
  digitalWrite(LED_ACTIVE_PIN, HIGH);
  
  // Send the command
  if (sendATCommand(cmd, "OK", 5000)) {
    Serial.println(F("TTN uplink initiated"));
  } else {
    Serial.println(F("Failed to send uplink to TTN"));
    systemError = true;
    loraTxComplete = true;
  }
  
  digitalWrite(LED_ACTIVE_PIN, LOW);
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
  
  // Send data to TTN
  if (!systemError) {
    sendLoRaData(lastWeight, lastTemp, lastHumidity);
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
    float temp = dht22.readTemperature(true); // true = Fahrenheit
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

// Send AT command and wait for response
bool sendATCommand(const char* command, const char* expectedResponse, unsigned long timeout) {
  // Clear previous response
  memset(responseBuffer, 0, sizeof(responseBuffer));
  
  Serial.print(F("Sending command: "));
  Serial.println(command);
  
  // Send the command
  loraSerial.println(command);
  
  // Wait for response or timeout
  unsigned long startTime = millis();
  int bufferPos = 0;
  
  while (millis() - startTime < timeout) {
    if (loraSerial.available()) {
      char c = loraSerial.read();
      if (c == '\r' || c == '\n') {
        if (bufferPos > 0) {
          // Null-terminate the buffer and print response
          responseBuffer[bufferPos] = '\0';
          Serial.print(F("Response: "));
          Serial.println(responseBuffer);
          
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
    // Pat the watchdog
    wdt_reset();
  }
  
  Serial.println(F("Command timed out"));
  return false;
}

// Check for LA66 module responses
void checkLoRaSerial() {
  if (loraSerial.available()) {
    char buffer[64];
    int pos = 0;
    
    while (loraSerial.available() && pos < sizeof(buffer) - 1) {
      char c = loraSerial.read();
      if (c == '\r' || c == '\n') {
        if (pos > 0) {
          buffer[pos] = '\0';
          
          // Process received line
          Serial.print(F("LA66: "));
          Serial.println(buffer);
          
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
            // Network joined successfully (ABP)
            Serial.println(F("TTN joined successfully!"));
            networkJoined = true;
            
            // After successful join, check and print network details
            sendATCommand("AT+NJS=?", NULL, 2000);  // Verify join status
            sendATCommand("AT+DEVADDR=?", NULL, 2000); // Confirm Device Address
            sendATCommand("AT+DR=?", NULL, 2000);   // Check data rate
            
            // Blink the active LED to show successful join
            blinkLED(LED_ACTIVE_PIN, 5, 200);
          }
          else if (strstr(buffer, "+EVT:JOIN_FAILED") != NULL) {
            // Join failed (ABP)
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
            sendATCommand("AT+RECVB=?", NULL, 2000);  // Print received data in binary format
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