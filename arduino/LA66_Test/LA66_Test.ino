/*
 * LA66 LoRa Module Test Sketch
 * 
 * A simple sketch to test communication with the LA66 LoRa module
 * Try different baud rates and pin configurations
 */

#include <SoftwareSerial.h>

// ===== LA66 PINS - UPDATE THESE TO MATCH YOUR WIRING =====
#define LORA_RX           11    // Arduino pin that connects to LA66 TX
#define LORA_TX           10    // Arduino pin that connects to LA66 RX

// Try different baud rates
const long BAUD_RATES[] = {9600, 115200, 57600, 38400, 19200};
const int NUM_BAUD_RATES = 5;

// Create Software Serial for LA66
SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // RX, TX

unsigned long lastAttempt = 0;
const unsigned long ATTEMPT_INTERVAL = 5000; // 5 seconds between attempts
int currentBaudRateIndex = 0;
bool deviceResponded = false;

void setup() {
  // Initialize serial ports
  Serial.begin(9600);   // Debug console
  
  // Wait for serial monitor to open
  delay(3000);
  
  Serial.println(F("LA66 LoRa Module Test"));
  Serial.println(F("----------------------"));
  Serial.print(F("Arduino RX (connect to LA66 TX): "));
  Serial.println(LORA_RX);
  Serial.print(F("Arduino TX (connect to LA66 RX): "));
  Serial.println(LORA_TX);
  
  // Start with first baud rate
  Serial.print(F("Trying baud rate: "));
  Serial.println(BAUD_RATES[currentBaudRateIndex]);
  loraSerial.begin(BAUD_RATES[currentBaudRateIndex]);
  
  lastAttempt = millis();
}

void loop() {
  // Check for response
  if (loraSerial.available()) {
    deviceResponded = true;
    Serial.println(F("RESPONSE RECEIVED! Module is responding!"));
    Serial.println(F("Content from module:"));
    
    // Print all available data
    while (loraSerial.available()) {
      char c = loraSerial.read();
      Serial.write(c);
    }
    
    Serial.println();
    Serial.print(F("Working baud rate: "));
    Serial.println(BAUD_RATES[currentBaudRateIndex]);
    Serial.println(F("Testing AT commands:"));
    
    // Try some AT commands
    sendCommand("AT");
    delay(1000);
    sendCommand("AT+VER=?");
    delay(1000);
    sendCommand("AT+DEUI=?");
    delay(1000);
  }
  
  // Send periodic AT commands to test the connection
  unsigned long currentTime = millis();
  if (!deviceResponded && (currentTime - lastAttempt >= ATTEMPT_INTERVAL)) {
    lastAttempt = currentTime;
    
    // Send simple AT command
    Serial.print(F("Sending AT... (Baud rate: "));
    Serial.print(BAUD_RATES[currentBaudRateIndex]);
    Serial.println(F(")"));
    loraSerial.println("AT");
    
    // Try next baud rate if no response
    if (currentTime > ATTEMPT_INTERVAL * (currentBaudRateIndex + 1) * 2) {
      currentBaudRateIndex = (currentBaudRateIndex + 1) % NUM_BAUD_RATES;
      Serial.print(F("No response. Trying baud rate: "));
      Serial.println(BAUD_RATES[currentBaudRateIndex]);
      loraSerial.end();
      loraSerial.begin(BAUD_RATES[currentBaudRateIndex]);
    }
  }
  
  // Show continuous info if device is detected
  if (deviceResponded && (currentTime - lastAttempt >= 10000)) {
    lastAttempt = currentTime;
    sendCommand("AT");
  }
}

// Send a command and print any response
void sendCommand(const char* cmd) {
  Serial.print(F("Sending: "));
  Serial.println(cmd);
  
  loraSerial.println(cmd);
  
  // Wait for response
  delay(500);
  
  if (loraSerial.available()) {
    Serial.println(F("Response:"));
    while (loraSerial.available()) {
      char c = loraSerial.read();
      Serial.write(c);
    }
    Serial.println();
  } else {
    Serial.println(F("No response."));
  }
}