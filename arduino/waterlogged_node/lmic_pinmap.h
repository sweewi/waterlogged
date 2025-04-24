#ifndef _lmic_pinmap_h_
#define _lmic_pinmap_h_

#include <Arduino.h>

// Pin mapping for LoRa radio
const lmic_pinmap lmic_pins = {
    .nss = 10,      // CS pin (kept the same as it's not conflicting)
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 9,       // Reset pin (kept the same as it's not conflicting)
    .dio = {2, 3, 4}, // DIO0, DIO1, DIO2 (moved to non-conflicting pins)
    .rxtx_rx_active = 0,
    .rssi_cal = 0,
    .spi_freq = 8000000     // 8MHz SPI clock
};

#endif // _lmic_pinmap_h_