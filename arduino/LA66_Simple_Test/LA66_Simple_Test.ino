/*
 * LA66 Ultra Basic Test
 * Simplest possible code to test communication with the LA66
 */

#include <SoftwareSerial.h>

// LA66 connection pins
#define LORA_RX 11  // Arduino pin connected to LA66 TX
#define LORA_TX 10  // Arduino pin connected to LA66 RX

SoftwareSerial loraSerial(LORA_RX, LORA_TX);  // RX, TX

void setup() {
  // Hardware serial for debugging
  Serial.begin(9600);
  
  // Wait for serial monitor to open
  delay(3000);
  
  Serial.println("LA66 Ultra Basic Test");
  Serial.println("--------------------");
  
  // Initialize LA66 serial at standard baud rate
  loraSerial.begin(9600);
  
  // Clear any pending data
  while(loraSerial.available()) {
    loraSerial.read();
  }
  
  // Print connection details
  Serial.print("Arduino pin connected to LA66 TX: ");
  Serial.println(LORA_RX);
  Serial.print("Arduino pin connected to LA66 RX: ");
  Serial.println(LORA_TX);
  Serial.println("Baud rate: 9600");
  Serial.println("Sending AT command every 2 seconds...");
}

void loop() {
  // Send AT command
  Serial.println("\nSending: AT");
  loraSerial.println("AT");
  
  // Check for response
  unsigned long startTime = millis();
  boolean receivedResponse = false;
  
  // Wait up to 1 second for a response
  while (millis() - startTime < 1000) {
    if (loraSerial.available()) {
      receivedResponse = true;
      Serial.println("RESPONSE FROM LA66:");
      
      // Print all available data
      while (loraSerial.available()) {
        char c = loraSerial.read();
        Serial.print(c);
      }
      break;
    }
  }
  
  if (!receivedResponse) {
    Serial.println("No response from LA66");
  }
  
  // Wait before trying again
  delay(2000);
}