#pragma once

// Project-specific dependencies
#define DISABLE_PING
#define DISABLE_BEACONS

// Define the region
#define CFG_us915 1
#define CFG_sx1276_radio 1

// Debug level
#define CFG_DEBUG_LEVEL 2

// Enable this to allow using printf to print to serial
#define LMIC_PRINTF_TO Serial

// Use hardware SPI
#define hal_init() ({ \
    SPI.begin(); \
    pinMode(lmic_pins.nss, OUTPUT); \
    digitalWrite(lmic_pins.nss, HIGH); \
})