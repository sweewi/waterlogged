#include "HX711.h" // This library can be obtained here http://librarymanager/All#Avia_HX711
#include <lmic.h>
#include <hal/hal.h>
#include <SPI.h>
#include "lmic_pinmap.h"
#include "DHT.h" // Include the DHT library

#define LOADCELL_DOUT_PIN  3
#define LOADCELL_SCK_PIN  2
#define DHTPIN 4 // Define the pin for the DHT22 sensor

#define DHTTYPE DHT22 // Define the type of DHT sensor

#define RELAY_UPPER_PIN 5 // Define the pin for the upper ball valve relay
#define RELAY_LOWER_PIN 6 // Define the pin for the lower ball valve relay

HX711 scale;
DHT dht(DHTPIN, DHTTYPE); // Initialize the DHT sensor

const float calibration_factor = 210.25; // Calibration factor for the load cell

// LoRaWAN NwkSKey, network session key
static const PROGMEM u1_t NWKSKEY[16] = { 0x4D, 0x60, 0x9E, 0x43, 0xD7, 0x45, 0x25, 0x36, 0xA9, 0xA0, 0x5B, 0x3B, 0x98, 0xCD, 0x39, 0x48 };

// LoRaWAN AppSKey, application session key
static const u1_t PROGMEM APPSKEY[16] = { 0x9E, 0x0B, 0x95, 0x0D, 0x66, 0x5C, 0x28, 0xB1, 0x5B, 0x28, 0x10, 0xE3, 0x19, 0x88, 0x7E, 0x2A };

// LoRaWAN end-device address (DevAddr)
static const u4_t DEVADDR = 0x260CA32F;

// Schedule TX every this many seconds (might become longer due to duty cycle limitations).
const unsigned TX_INTERVAL = 60;

// Forward declaration of the send job
static osjob_t sendjob;

void do_send(osjob_t* j);

// Define the missing functions
void os_getArtEui (u1_t* buf) { }
void os_getDevEui (u1_t* buf) { }
void os_getDevKey (u1_t* buf) { }

void setup() {
  Serial.begin(9600);
  Serial.println(F("HX711 load cell sketch with DHT22 and Relay Control"));
  Serial.println(F("Units: grams"));

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale();
  scale.tare(64);	// Reset the scale to 0, takes average of readings over 64 bytes to get zero

  long zero_factor = scale.read_average(); // Get a baseline reading
  Serial.print(F("Taring complete: Zero factor: ")); // This can be used to remove the need to tare the scale. Useful in permanent scale projects.
  Serial.println(zero_factor);

  scale.set_scale(calibration_factor); // Adjust to the calibration factor

  // Initialize the DHT sensor
  dht.begin();

  // Initialize the relay pins
  pinMode(RELAY_UPPER_PIN, OUTPUT);
  pinMode(RELAY_LOWER_PIN, OUTPUT);

  // Ensure relays are off initially
  digitalWrite(RELAY_UPPER_PIN, LOW);
  digitalWrite(RELAY_LOWER_PIN, LOW);

  // Initialize LMIC with the custom pin mapping
  os_init_ex(&lmic_pins);
  LMIC_reset();

  // Set static session parameters. Instead of dynamically establishing a session
  // by joining the network, precomputed session parameters are being used.
  #ifdef PROGMEM
  // On AVR, these values are stored in flash and only copied to RAM once.
  // Copy them to a temporary buffer here, LMIC_setSession will copy them into a buffer of its own again.
  uint8_t appskey[sizeof(APPSKEY)];
  uint8_t nwkskey[sizeof(NWKSKEY)];
  memcpy_P(appskey, APPSKEY, sizeof(APPSKEY));
  memcpy_P(nwkskey, NWKSKEY, sizeof(NWKSKEY));
  LMIC_setSession (0x1, DEVADDR, nwkskey, appskey);
  #else
  // If not running an AVR with PROGMEM, just use the arrays directly
  LMIC_setSession (0x1, DEVADDR, NWKSKEY, APPSKEY);
  #endif

  // Disable link check validation
  LMIC_setLinkCheckMode(0);

  // Set data rate and transmit power (note: txpow seems to be ignored by the library)
  LMIC_setDrTxpow(DR_SF7,14);

  // Start job
  do_send(&sendjob);
}

void loop() {
  os_runloop_once();
}

void do_send(osjob_t* j) {
  // Check if there is not a current TX/RX job running
  if (LMIC.opmode & OP_TXRXPEND) {
    Serial.println(F("OP_TXRXPEND, not sending"));
  } else {
    // Read data from the load cell
    float weight = scale.get_units(128); // Number inside get_units function() is bytes used for average scale reading
    unsigned long timeStamp = millis(); // Get time stamp at this measurement

    // Read temperature from the DHT22 sensor in Fahrenheit
    float temperature = dht.readTemperature(true);

    // Print the temperature to the Serial Monitor
    Serial.print(F("Temperature: "));
    Serial.print(temperature);
    Serial.println(F(" *F"));

    // Prepare upstream data transmission at the next possible time.
    uint8_t payload[8];
    memcpy(&payload[0], &weight, 4); // Copy the float weight into the payload
    memcpy(&payload[4], &timeStamp, 4); // Copy the time stamp into the payload

    LMIC_setTxData2(1, payload, sizeof(payload), 0);
    Serial.println(F("Packet queued"));

    // Control the relays based on the specified sequence
    controlRelays();
  }

  // Schedule the next transmission
  os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
}

// Function to control the relays based on the specified sequence
void controlRelays() {
  // Close the upper valve for 35 seconds
  Serial.println(F("Closing upper valve"));
  digitalWrite(RELAY_UPPER_PIN, HIGH);
  delay(35000);
  digitalWrite(RELAY_UPPER_PIN, LOW);
  Serial.println(F("Upper valve closed"));

  // Wait for 4 seconds
  delay(4000);

  // Open the lower valve for 27 seconds
  Serial.println(F("Opening lower valve"));
  digitalWrite(RELAY_LOWER_PIN, HIGH);
  delay(27000);
  digitalWrite(RELAY_LOWER_PIN, LOW);
  Serial.println(F("Lower valve closed"));

  // Wait for 4 seconds
  delay(4000);

  // Open the upper valve
  Serial.println(F("Opening upper valve"));
  digitalWrite(RELAY_UPPER_PIN, HIGH);
  delay(1000); // Small delay to ensure the relay is activated
  digitalWrite(RELAY_UPPER_PIN, LOW);
  Serial.println(F("Upper valve opened"));
}