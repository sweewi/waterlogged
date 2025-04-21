#pragma once

#include <Arduino.h>
#include <arduino_lmic_hal_boards.h>
#include <Arduino_LMIC.h>

const Arduino_LMIC::HalPinmap_t lmic_pins = {
    .nss = 10,           // CS pin (keep as is)
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 7,            // Changed to digital pin 7
    .dio = {8, 9, LMIC_UNUSED_PIN},  // Changed to digital pins 8,9
    .rxtx_rx_active = 0,
    .rssi_cal = 0,
    .spi_freq = 8000000  // 8MHz SPI clock
};