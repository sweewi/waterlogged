/*
 * LA66 LoRa Shield Basic Test
 * 
 * A simple sketch to test communication with the LA66 LoRa module on a Dragino Shield
 * Uses jumper-selected pins (D10/D11) for UART communication with the LA66 module
 */

#include <SoftwareSerial.h>

// LA66 Shield with jumpers in default position
#define LORA_RX           11    // Arduino pin D11 connected to LA66 TX
#define LORA_TX           10    // Arduino pin D10 connected to LA66 RX

// Create Software Serial for LA66
SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // RX, TX

void setup() {
  // Initialize serial ports
  Serial.begin(9600);   // Debug console
  
  // Wait for serial monitor to open
  delay(3000);
  
  Serial.println(F("LA66 Dragino Shield Test"));
  Serial.println(F("------------------------"));
  Serial.println(F("Shield jumpers should be in default position"));
  Serial.println(F("Digital pin D10 = TX to LA66"));
  Serial.println(F("Digital pin D11 = RX from LA66"));
  
  // Initialize the LA66 module
  loraSerial.begin(9600);
  
  // Clear any pending data
  while (loraSerial.available()) {
    loraSerial.read();
  }
  
  // Send a simple AT command to check if it's working
  Serial.println(F("Sending AT command..."));
  loraSerial.println("AT");
  
  // Wait for response
  delay(1000);
  checkResponse();
}

void loop() {
  // Send AT command every 5 seconds
  Serial.println(F("\nSending: AT"));
  loraSerial.println("AT");
  delay(500);
  checkResponse();
  
  // Get version info
  Serial.println(F("\nSending: AT+VER=?"));
  loraSerial.println("AT+VER=?");
  delay(500);
  checkResponse();
  
  // Get device EUI
  Serial.println(F("\nSending: AT+DEUI=?"));
  loraSerial.println("AT+DEUI=?");
  delay(500);
  checkResponse();
  
  // Wait before sending next command batch
  delay(5000);
}

void checkResponse() {
  Serial.println(F("Response:"));
  
  // Check for response with timeout
  unsigned long startTime = millis();
  boolean responseReceived = false;
  
  while (millis() - startTime < 1000) {
    if (loraSerial.available()) {
      responseReceived = true;
      // Read and print all available data
      char c = loraSerial.read();
      Serial.write(c);
    }
  }
  
  if (!responseReceived) {
    Serial.println(F("No response"));
    Serial.println(F("Possible issues:"));
    Serial.println(F("1. LA66 module not powered"));
    Serial.println(F("2. TX/RX pins swapped"));
    Serial.println(F("3. Jumper configuration issue"));
    Serial.println(F("4. Shield not seated properly"));
    Serial.println(F("5. Baud rate mismatch (should be 9600)"));
  }
}