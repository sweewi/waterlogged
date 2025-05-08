/*
 * WaterLogged Rain Gauge Node with LA66 LoRa Module
 * 
 * This code implements an automated rain gauge system that:
 * 1. Collects rainwater into a calibrated container
 * 2. Takes initial weight measurement using a load cell
 * 3. Manages a precise drainage cycle using two ball valves
 * 4. Calculates rainfall amount from the difference in weights
 * 5. Reports data via LoRaWAN to The Things Network (TTN) every 15 minutes
 * 6. Implements extensive error checking and watchdog protection
 * 7. Uses power saving features to extend battery life
 * 
 * Hardware Components:
 * - Load Cell + HX711 amplifier (weight measurement)
 * - DHT22 Temperature/Humidity Sensor (environmental data)
 * - 1" Normally Open (NC) Ball Valve (top valve - normally open, close to seal for measurement)
 * - 1/2" Normally Closed (NO) Ball Valve (bottom valve - normally closed, open for drainage)
 * - Status LEDs (error indication, activity status)
 * - LA66 LoRa module (controlled via AT commands over Serial)
 * - DS3231 RTC (for accurate timing)
 * 
 * Measurement Sequence:
 * 1. Close top valve to prevent water entry during measurement
 * 2. Take initial weight reading
 * 3. Open bottom valve to drain water
 * 4. Close bottom valve
 * 5. Take empty container weight reading
 * 6. Calculate rainfall from weight difference
 * 7. Open top valve to resume water collection
 * 8. Report data to TTN via LoRaWAN
 * 
 * Pin Configuration:
 * - Load Cell: DOUT->6, SCK->5
 * - DHT22: DATA->7
 * - NC Valve (Top): A3 (LOW=open, HIGH=closed)
 * - NO Valve (Bottom): A4 (LOW=closed, HIGH=open)
 * - Status LEDs: A0 (Error), A1 (Active), A2 (Power)
 * - LA66: RX->10, TX->11 (Arduino RX connects to LA66 TX and vice versa)
 * 
 * Version: 1.0.0 - Synthesized from May 7th test with operational ball valve sequence
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

// LA66 Module Pins - CRITICAL: Match the pin order from our working test
#define LORA_RX           10    // Connect to LA66 TX (Arduino receives from LA66)
#define LORA_TX           11    // Connect to LA66 RX (Arduino transmits to LA66)
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
const float CALIBRATION_FACTOR = 210.25;        // Load cell calibration value (verified in May 7th tests)
const unsigned long DRAINAGE_TIME = 35000;      // Time to wait for complete drainage (35 seconds)
const unsigned long VALVE_DELAY = 4000;         // Delay between valve operations for reliable operation (4 seconds)
const int WEIGHT_SAMPLES = 128;                 // Number of weight readings to average for stability
const float MIN_VALID_WEIGHT = -1000.0;         // Minimum valid weight reading (reject outliers)
const float MAX_VALID_WEIGHT = 1000.0;          // Maximum valid weight reading (reject outliers)
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
const char* JOIN_EUI = "01010000004140A8"; // Updated to match what's showing in gateway logs
const char* APP_KEY = "D52006078C0C46179C598DFE8302BA41";  // New freshly generated AppKey

// TTN configuration flags - CRITICAL FOR JOINING
const bool REVERSE_DEV_EUI = false;   // No need to reverse - already in correct format
const bool REVERSE_JOIN_EUI = false;  // Already in reversed format based on gateway logs
const int PREFERRED_SUB_BAND = 2;     // TTN typically uses sub-band 2 (channels 8-15) in US915

// The following are no longer needed for OTAA but kept for reference
const char* DEV_ADDR = "";                 // Only used in ABP mode
const char* NWKSKEY = "";                  // Only used in ABP mode 
const char* APPSKEY = "";                  // Only used in ABP mode

// Create Software Serial for LA66 - NOTE pin order: RX first, TX second
SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // Arduino RX(10), TX(11)

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

// Input string and processing buffer for LA66 responses
String inputString = "";
bool stringComplete = false;
char rxbuff[128];
uint8_t rxbuff_index = 0;

// Formats a hex string by inserting spaces between each byte (pair of hex chars)
String formatKeyWithSpaces(const char* key) {
  String formattedKey = "";
  int len = strlen(key);
  
  for (int i = 0; i < len; i += 2) {
    // Add the two characters (one byte)
    formattedKey += key[i];
    if (i + 1 < len) {
      formattedKey += key[i + 1];
    }
    
    // Add space after each byte except the last one
    if (i + 2 < len) {
      formattedKey += ' ';
    }
  }
  
  return formattedKey;
}

// Reverses the byte order of a hex string (needed for JOIN_EUI/AppEUI)
String reverseByteOrder(const char* input) {
  String reversed = "";
  int len = strlen(input);
  
  // Make sure we have an even number of characters
  if (len % 2 != 0) return input;
  
  // Process two chars (one byte) at a time, in reverse order
  for (int i = len - 2; i >= 0; i -= 2) {
    reversed += input[i];
    reversed += input[i + 1];
  }
  
  return reversed;
}

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);
  
  // Wait for serial to initialize (helpful when connected to computer)
  // This ensures we don't miss early debug messages
  delay(3000);
  
  // Print startup banner with version information
  Serial.println(F("======================================="));
  Serial.println(F("WaterLogged Rain Gauge Node v1.0.0"));
  Serial.println(F("LA66 LoRaWAN TTN Integration"));
  Serial.println(F("May 2025 - Final Release"));
  Serial.println(F("======================================="));
  
  // Log LoRa configuration details for verification
  Serial.print(F("LoRa module: Dragino LA66 on pins RX:"));
  Serial.print(LORA_RX);
  Serial.print(F(", TX:"));
  Serial.println(LORA_TX);
  Serial.print(F("Baud rate: "));
  Serial.println(LORA_BAUD_RATE);
  
  // Initialize serial communication with LA66 module
  loraSerial.begin(LORA_BAUD_RATE);
  
  // Configure all output pins
  Serial.println(F("Configuring control pins..."));
  pinMode(LED_ERROR_PIN, OUTPUT);    // Red error indicator
  pinMode(LED_ACTIVE_PIN, OUTPUT);   // Green activity indicator
  pinMode(LED_POWER_PIN, OUTPUT);    // Blue power indicator
  pinMode(VALVE_NC_PIN, OUTPUT);     // Top valve control (NC - normally open)
  pinMode(VALVE_NO_PIN, OUTPUT);     // Bottom valve control (NO - normally closed)
  
  // Set initial states
  digitalWrite(LED_POWER_PIN, HIGH);  // Power indicator on
  digitalWrite(LED_ERROR_PIN, LOW);   // Error indicator off
  digitalWrite(LED_ACTIVE_PIN, LOW);  // Activity indicator off

  // Initialize valves to their default states:
  // Top valve (NC) should be OPEN initially (no power)
  digitalWrite(VALVE_NC_PIN, LOW);    // NC valve OPEN (no power applied)
  
  // Bottom valve (NO) should be CLOSED initially (no power)
  digitalWrite(VALVE_NO_PIN, LOW);    // NO valve CLOSED (no power applied)
  
  // Initialize sensors
  if (!initializeLoadCell() || !initializeDHT22() || !initializeRTC()) {
    systemError = true;
  }
  
  // Initialize LoRa and attempt to join TTN
  initializeLA66();
  
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
  // Reset watchdog timer to prevent system reset
  wdt_reset();
  
  // Check for responses from LA66 LoRa module
  checkLoraSerial();
  
  // Check LoRa module and network status, retry join if needed
  checkLoRaStatus();
  
  // Get current time from RTC for scheduling
  DateTime now = rtc.now();
  
  // Use static variable to track last measurement minute to prevent duplicate measurements
  static int8_t lastMeasurementMinute = -1;
  
  // Measurement criteria:
  // 1. We're at a 15-minute interval (00, 15, 30, 45)
  // 2. We haven't taken a measurement at this interval yet
  // 3. Any previous LoRa transmission has completed
  // 4. We're successfully joined to the TTN network
  if (now.minute() % 15 == 0 && 
      now.minute() != lastMeasurementMinute && 
      loraTxComplete && 
      networkJoined) {
    
    // Record that we've taken a measurement this minute
    lastMeasurementMinute = now.minute();
    
    // Log the measurement time
    Serial.print(F("Scheduled measurement at: "));
    char timeStr[9];
    sprintf(timeStr, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
    Serial.println(timeStr);
    
    // Turn on activity LED during measurement cycle
    digitalWrite(LED_ACTIVE_PIN, HIGH);
    
    // Perform the complete measurement sequence
    performMeasurementCycle();
    
    // Turn off activity LED when complete
    digitalWrite(LED_ACTIVE_PIN, LOW);
  }
  
  // Reset minute tracking when we're no longer at an interval of 15
  // This allows the next measurement to trigger properly
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

// Initialize load cell
bool initializeLoadCell() {
  Serial.println(F("Initializing load cell..."));
  
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  // Check if HX711 is responding
  if (!scale.is_ready()) {
    Serial.println(F("HX711 not found - check wiring"));
    digitalWrite(LED_ERROR_PIN, HIGH);
    return false;
  }
  
  Serial.println(F("Calibrating scale..."));
  scale.set_scale(CALIBRATION_FACTOR);
  
  // Tare scale - assumes empty container at startup
  Serial.println(F("Taring scale..."));
  scale.tare();  // Reset to zero
  
  Serial.println(F("Load cell ready"));
  return true;
}

// Initialize DHT22 sensor
bool initializeDHT22() {
  Serial.println(F("Initializing DHT22..."));
  
  dht22.begin();
  delay(2000);  // Allow sensor to stabilize
  
  // Take a test reading to verify sensor is working
  float tempTest = dht22.readTemperature();
  float humTest = dht22.readHumidity();
  
  if (isnan(tempTest) || isnan(humTest)) {
    Serial.println(F("DHT22 not found or failed to read - check wiring"));
    digitalWrite(LED_ERROR_PIN, HIGH);
    return false;
  }
  
  Serial.print(F("DHT22 test reading - Temperature: "));
  Serial.print(tempTest);
  Serial.print(F("°C, Humidity: "));
  Serial.print(humTest);
  Serial.println(F("%"));
  
  Serial.println(F("DHT22 ready"));
  return true;
}

// Initialize RTC
bool initializeRTC() {
  Serial.println(F("Initializing RTC..."));
  
  if (!rtc.begin()) {
    Serial.println(F("RTC not found - check wiring"));
    digitalWrite(LED_ERROR_PIN, HIGH);
    return false;
  }
  
  // If RTC lost power and time is invalid, set it to compilation time
  if (rtc.lostPower()) {
    Serial.println(F("RTC lost power - setting to compile time"));
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }
  
  // Print current time
  DateTime now = rtc.now();
  char timeStr[20];
  sprintf(timeStr, "%04d/%02d/%02d %02d:%02d:%02d", 
          now.year(), now.month(), now.day(), 
          now.hour(), now.minute(), now.second());
  Serial.print(F("RTC time: "));
  Serial.println(timeStr);
  
  Serial.println(F("RTC ready"));
  return true;
}

// Take readings from sensors
void readSensors() {
  // Read weight from scale
  Serial.println(F("Reading weight..."));
  
  scale.power_up();
  
  delay(100);  // Allow scale to power up and stabilize
  
  // Take multiple readings and average them
  float weightSum = 0;
  int validReadings = 0;
  
  for (int i = 0; i < WEIGHT_SAMPLES; i++) {
    if (scale.is_ready()) {
      float reading = scale.get_units();
      
      // Only count readings in the valid range
      if (reading > MIN_VALID_WEIGHT && reading < MAX_VALID_WEIGHT) {
        weightSum += reading;
        validReadings++;
      }
      
      delay(10);
    } else {
      delay(50);
    }
  }
  
  // Calculate average if we have valid readings
  if (validReadings > 0) {
    lastWeight = weightSum / validReadings;
  } else {
    // Set error flag if no valid readings
    systemError = true;
    Serial.println(F("ERROR: No valid weight readings"));
    digitalWrite(LED_ERROR_PIN, HIGH);
    lastWeight = -999.0;  // Error value
  }
  
  // Power down scale to save energy
  scale.power_down();
  
  Serial.print(F("Weight: "));
  Serial.print(lastWeight);
  Serial.println(F(" g"));
  
  // Read temperature and humidity
  Serial.println(F("Reading temperature/humidity..."));
  
  float tempSum = 0;
  float humSum = 0;
  int tempValidReadings = 0;
  int humValidReadings = 0;
  
  for (int i = 0; i < 3; i++) {
    float temp = dht22.readTemperature();
    float hum = dht22.readHumidity();
    
    if (!isnan(temp)) {
      tempSum += temp;
      tempValidReadings++;
    }
    
    if (!isnan(hum)) {
      humSum += hum;
      humValidReadings++;
    }
    
    delay(2000);  // DHT22 needs ~2 seconds between readings
  }
  
  // Calculate averages if we have valid readings
  if (tempValidReadings > 0) {
    lastTemp = tempSum / tempValidReadings;
  } else {
    lastTemp = -999.0;  // Error value
    systemError = true;
    Serial.println(F("ERROR: No valid temperature readings"));
    digitalWrite(LED_ERROR_PIN, HIGH);
  }
  
  if (humValidReadings > 0) {
    lastHumidity = humSum / humValidReadings;
  } else {
    lastHumidity = -999.0;  // Error value
    systemError = true;
    Serial.println(F("ERROR: No valid humidity readings"));
    digitalWrite(LED_ERROR_PIN, HIGH);
  }
  
  Serial.print(F("Temperature: "));
  Serial.print(lastTemp);
  Serial.print(F("°C, Humidity: "));
  Serial.print(lastHumidity);
  Serial.println(F("%"));
}

// Open normally closed valve (top input valve)
// NC valve is normally OPEN, remove power to open
void openNCValve() {
  if (DEBUG_VALVES) Serial.println(F("Opening NC (top input) valve - removing power"));
  digitalWrite(VALVE_NC_PIN, LOW);  // Remove power to open NC valve (return to default state)
}

// Close normally closed valve (top input valve)
// NC valve is normally OPEN, apply power to close
void closeNCValve() {
  if (DEBUG_VALVES) Serial.println(F("Closing NC (top input) valve - applying power"));
  digitalWrite(VALVE_NC_PIN, HIGH);  // Apply power to close NC valve
}

// Close normally open valve (bottom drainage valve)
// NO valve is normally CLOSED, remove power to close
void closeNOValve() {
  if (DEBUG_VALVES) Serial.println(F("Closing NO (bottom drainage) valve - removing power"));
  digitalWrite(VALVE_NO_PIN, LOW);  // Remove power to close NO valve (return to default state)
}

// Open normally open valve (bottom drainage valve)
// NO valve is normally CLOSED, apply power to open
void openNOValve() {
  if (DEBUG_VALVES) Serial.println(F("Opening NO (bottom drainage) valve - applying power"));
  digitalWrite(VALVE_NO_PIN, HIGH);  // Apply power to open NO valve
}

// Perform a full measurement cycle
void performMeasurementCycle() {
  Serial.println(F("===== BEGINNING MEASUREMENT CYCLE ====="));
  
  // Record measurement start time
  unsigned long cycleStartTime = millis();
  
  // Step 1: Close top valve (NC valve - normally open, apply power to close)
  Serial.println(F("Step 1: Closing top ball valve"));
  closeNCValve();  // Apply power to close NC valve
  delay(VALVE_DELAY);  // Allow time for valve to operate
  
  // Step 2: Take initial weight reading
  Serial.println(F("Step 2: Taking initial weight reading"));
  readSensors();
  float initialWeight = lastWeight;
  
  Serial.print(F("Initial weight: "));
  Serial.print(initialWeight);
  Serial.println(F(" g"));
  
  // Step 3: Open bottom valve to drain water
  Serial.println(F("Step 3: Opening bottom drainage valve"));
  openNOValve();  // Apply power to open NO valve
  
  // Wait for drainage to complete
  Serial.println(F("Draining water..."));
  
  // Wait for water to drain completely
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
  Serial.println(F("Step 4: Closing bottom valve"));
  closeNOValve();  // Remove power to close NO valve
  delay(VALVE_DELAY);  // Allow time for valve to operate
  
  // Step 5: Take final weight reading
  Serial.println(F("Step 5: Taking empty container weight"));
  readSensors();
  float emptyWeight = lastWeight;
  
  Serial.print(F("Empty weight: "));
  Serial.print(emptyWeight);
  Serial.println(F(" g"));
  
  // Step 6: Open top valve to resume collection
  Serial.println(F("Step 6: Opening top valve to resume collection"));
  openNCValve();  // Remove power to open NC valve
  delay(VALVE_DELAY);  // Allow time for valve to operate
  
  // Calculate actual water weight
  float waterWeight = initialWeight - emptyWeight;
  
  Serial.print(F("Water weight: "));
  Serial.print(waterWeight);
  Serial.println(F(" g"));
  
  // Convert water weight to rainfall in inches
  // This calculation is based on our calibrated funnel with 50.2654 cm² collection area
  // 1 gram of water over this area = 0.01979 mm of rain = 0.00078 inches
  float rainfall_mm = waterWeight / 50.2654;  // Convert to millimeters
  float rainfall_inches = rainfall_mm / 25.4; // Convert to inches
  
  Serial.print(F("Rainfall amount: "));
  Serial.print(rainfall_mm, 2);
  Serial.print(F(" mm ("));
  Serial.print(rainfall_inches, 4);
  Serial.println(F(" inches)"));
  
  // Report measurements
  if (networkJoined) {
    sendLoRaData(waterWeight, lastTemp, lastHumidity);
  } else {
    Serial.println(F("Not reporting - LoRaWAN not connected"));
    Serial.println(F("Will attempt to join network before next measurement"));
  }
  
  // Log total cycle time
  unsigned long cycleTime = millis() - cycleStartTime;
  Serial.print(F("Measurement cycle completed in "));
  Serial.print(cycleTime);
  Serial.println(F(" ms"));
  Serial.println(F("===== MEASUREMENT CYCLE COMPLETE ====="));
}

// Try to recover from sensor errors
bool recoverFromSensorError() {
  Serial.println(F("Attempting to recover from errors..."));
  
  bool recoverySuccess = true;
  
  // Re-initialize sensors that might have issues
  if (!scale.is_ready()) {
    recoverySuccess &= initializeLoadCell();
  }
  
  // Check DHT22
  float tempTest = dht22.readTemperature();
  if (isnan(tempTest)) {
    recoverySuccess &= initializeDHT22();
  }
  
  return recoverySuccess;
}

// Enter low-power sleep mode
void enterSleepMode() {
  if (!USE_POWER_SAVING) return;
  
  // We'll skip sleep if we're in the middle of something important
  if (!loraTxComplete) return;
  
  // Use a static counter to determine when to wake up and check the time
  static byte sleepCycles = 0;
  
  // Only check the time periodically to save power
  if (++sleepCycles > SLEEP_CYCLES_PER_MEASUREMENT) {
    sleepCycles = 0;
    return;  // Skip sleep this cycle to check time
  }
  
  // Prepare to sleep
  Serial.flush();  // Complete any pending serial transmissions
  
  // Enter power-down state with ADC and BOD disabled for maximum power saving
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  sleep_enable();
  
  // Disable all peripherals we can
  power_all_disable();
  
  // Now enter sleep mode - the WDT will wake us in about 8 seconds
  sleep_mode();
  
  // Code will resume here on wake
  sleep_disable();
  
  // Re-enable all the peripherals
  power_all_enable();
}

// Watchdog Timer Interrupt Service Routine
ISR(WDT_vect) {
  // This is automatically called when the watchdog timer expires
  // Don't do anything here - just wake up from sleep
}

// Initialize LA66 LoRaWAN module
bool initializeLA66() {
  Serial.println(F("Initializing LA66 LoRaWAN module..."));
  
  loraSerial.begin(LORA_BAUD_RATE);
  
  // Reset module to ensure clean state
  loraSerial.println("ATZ");
  delay(1500);  // Wait for module to reset
  
  // Set module to factory defaults but keep keys
  loraSerial.println("AT+FDR");
  delay(1500);  // Wait for reset to complete
  
  // Disable ADR to ensure fixed settings
  loraSerial.println("AT+ADR=0");
  delay(300);

  // For US915, configure RX2 window explicitly
  loraSerial.println("AT+RX2FQ=923300000");  // 923.3 MHz for RX2 window
  delay(300);
  
  loraSerial.println("AT+RX2DR=8");  // DR8 for RX2 window (SF12/500kHz)
  delay(300);
  
  // Set the RX windows delay values correctly for US915
  loraSerial.println("AT+RX1DL=5000");  // Set RX1 delay to 5 seconds (recommend by US915 spec)
  delay(300);
  
  loraSerial.println("AT+RX2DL=6000");  // Set RX2 delay to 6 seconds (recommend by US915 spec)
  delay(300);
  
  // Set join delay windows correctly
  loraSerial.println("AT+JN1DL=5000");  // Join accept delay 1
  delay(300);
  
  loraSerial.println("AT+JN2DL=6000");  // Join accept delay 2
  delay(300);
  
  // Configure channel plan for US915 region
  // For TTN US915, we use subband 2 (channels 8-15) to match network expectations
  loraSerial.println("AT+CHE=2");  // Use subband 2 (channels 16-23, 905.5-906.9 MHz)
  delay(300);
  
  // Set fixed data rate for guaranteed performance
  loraSerial.println("AT+DR=0");  // Use DR0 (SF10/BW125) for uplink
  delay(300);
  
  // Configure OTAA join parameters
  loraSerial.println("AT+NJM=1");  // Set to OTAA mode 
  delay(300);
  
  // Set device EUI (from global DevEUI) with proper formatting
  loraSerial.print("AT+DEUI=");
  loraSerial.println(formatKeyWithSpaces(DEV_EUI));
  delay(300);
  
  // Set application EUI (JOIN_EUI)
  Serial.println(F("Setting App EUI..."));
  String joinEuiToUse = JOIN_EUI;
  if (REVERSE_JOIN_EUI) {
    joinEuiToUse = reverseByteOrder(JOIN_EUI);
    Serial.println(F("Using reversed JOIN_EUI"));
  }
  loraSerial.print("AT+APPEUI=");
  loraSerial.println(formatKeyWithSpaces(joinEuiToUse.c_str()));
  delay(300);
  
  // Set application key (from global AppKey) with proper formatting
  loraSerial.print("AT+APPKEY=");
  loraSerial.println(formatKeyWithSpaces(APP_KEY));
  delay(300);
  
  // Print configuration to verify settings
  Serial.println(F("LoRaWAN configuration:"));
  loraSerial.println("AT+CFG");
  delay(300);
  
  // Wait for configuration data to arrive
  unsigned long startTime = millis();
  while (millis() - startTime < 3000) {
    if (loraSerial.available()) {
      String response = loraSerial.readStringUntil('\n');
      Serial.println(response);
    }
  }
  
  // Initiate join procedure
  startJoinProcedure();
  
  Serial.println(F("LA66 module initialized"));
  return true;
}

// Retry join if needed
void checkLoRaStatus() {
  // If not joined and retry interval passed, attempt to join again
  unsigned long currentTime = millis();
  if (!networkJoined && (currentTime - lastJoinAttempt >= JOIN_RETRY_INTERVAL)) {
    Serial.println(F("\nRetrying TTN join..."));
    startJoinProcedure();
  }
}

// Start join procedure with TTN
void startJoinProcedure() {
  Serial.println(F("Starting join procedure..."));
  
  // Record time of join attempt
  lastJoinAttempt = millis();
  
  // Send join command
  loraSerial.println("AT+JOIN");
  
  // Wait for a moment to see initial join response
  delay(500);
  checkLoraSerial();
}

// Process responses from LA66 module
void checkLoraSerial() {
  while (loraSerial.available()) {
    // Get the new byte
    char inChar = (char)loraSerial.read();
    
    // Add it to the input string
    inputString += inChar;
    
    // Add to buffer for processing
    rxbuff[rxbuff_index++] = inChar;
    
    // Prevent buffer overflow
    if (rxbuff_index >= sizeof(rxbuff)) {
      rxbuff_index = 0;
    }
    
    // If end of line, process the line
    if (inChar == '\n' || inChar == '\r') {
      stringComplete = true;
      rxbuff[rxbuff_index] = '\0';
      
      // CRITICAL: Check for successful join (exact match "JOINED" at start of buffer)
      // This is the format that works in our test code
      if (strncmp(rxbuff, "JOINED", 6) == 0 || strstr(rxbuff, "+EVT:JOINED") != NULL) {
        Serial.println(F("\n*** TTN NETWORK JOINED SUCCESSFULLY! ***"));
        networkJoined = true;
        blinkLED(LED_ACTIVE_PIN, 5, 200); // Visual indication
      }
      
      // Check for module reset
      if (strncmp(rxbuff, "Dragino LA66 Device", 19) == 0) {
        Serial.println(F("\nLA66 module reset detected - reconfiguring"));
        networkJoined = false;
        delay(2000);
        initializeLA66();
      }

      // Check for join failure
      if (strstr(rxbuff, "JOIN_FAILED") != NULL) {
        Serial.println(F("\nJoin explicitly failed - will retry"));
        networkJoined = false;
      }

      // Check for RX timeouts (common when waiting for join accept)
      if (strstr(rxbuff, "rxTimeout") != NULL) {
        Serial.println(F("\nRX timeout - no join response received"));
      }
      
      // Check for successful message transmission
      if (strstr(rxbuff, "+EVT:SEND_CONFIRMED_OK") != NULL) {
        Serial.println(F("\nMessage confirmed by network"));
        loraTxComplete = true;
      }
      
      // Reset buffer for next line
      rxbuff_index = 0;
    }
  }
  
  // Print any completed strings
  if (stringComplete) {
    if (DEBUG_LA66) {
      Serial.print(inputString);
    }
    inputString = "";
    stringComplete = false;
  }
}

// Send data over LoRaWAN to The Things Network
void sendLoRaData(float weight, float temperature, float humidity) {
  // Verify network connection before attempting to send
  if (!networkJoined) {
    Serial.println(F("ERROR: LoRaWAN network not joined, cannot send data"));
    return;
  }
  
  Serial.println(F("Preparing data for TTN transmission..."));
  
  // Validate data before sending
  if (weight < -100 || temperature < -100 || humidity < -100) {
    Serial.println(F("ERROR: Invalid sensor data, aborting transmission"));
    return;
  }
  
  // Prepare data packet - format the values as integers to save bytes
  // We multiply by 100 to preserve 2 decimal places without floating point
  int16_t weightInt = (int16_t)(weight * 100);     // Convert to centi-units (0.01g)
  int16_t tempInt = (int16_t)(temperature * 100);  // Convert to centi-degrees (0.01°C)
  int16_t humInt = (int16_t)(humidity * 100);      // Convert to centi-percent (0.01%)

  // Format data as hex string for AT+SENDB command
  // Parameters:
  // 1 = Confirmed uplink (requesting ack)
  // 2 = Port number (standard for sensor data)
  // 6 = Payload length in bytes (2 bytes each for weight, temp, humidity)
  // Last parameter = Payload in hex format
  char dataPacket[48];
  sprintf(dataPacket, "AT+SENDB=1,2,6,%02X%02X%02X%02X%02X%02X", 
          (uint8_t)(weightInt >> 8), (uint8_t)weightInt,
          (uint8_t)(tempInt >> 8), (uint8_t)tempInt,
          (uint8_t)(humInt >> 8), (uint8_t)humInt);

  // Mark transmission as in progress
  loraTxComplete = false;
  
  // Send data to LA66 module
  Serial.print(F("Sending packet: "));
  Serial.println(dataPacket);
  loraSerial.println(dataPacket);
  
  // Wait for transmission confirmation with timeout
  // LoRaWAN Class A devices need to wait for receive windows
  Serial.println(F("Waiting for transmission confirmation..."));
  unsigned long startTime = millis();
  uint8_t dotCount = 0;
  
  // Wait for up to 10 seconds for network acknowledgment
  while (!loraTxComplete && (millis() - startTime < 10000)) {
    // Process any incoming LoRa responses
    checkLoraSerial();
    
    // Print progress dots
    if ((millis() - startTime) / 1000 > dotCount) {
      Serial.print(F("."));
      dotCount++;
    }
    
    delay(100);
  }
  Serial.println();
  
  // Check if transmission was successful
  if (loraTxComplete) {
    Serial.println(F("SUCCESS: Data confirmed by network"));
    blinkLED(LED_ACTIVE_PIN, 3, 100); // Visual confirmation
  } else {
    Serial.println(F("WARNING: Transmission confirmation timed out"));
    blinkLED(LED_ERROR_PIN, 2, 100);  // Visual error indication
    
    // Set flag to retry later (handled by main loop)
    loraTxComplete = true; // Reset to allow next transmission
  }
}

// Flash LED for visual indication
void blinkLED(uint8_t pin, int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(delayMs / 2);
    digitalWrite(pin, LOW);
    delay(delayMs / 2);
  }
}