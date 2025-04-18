#ifndef _LMIC_PINMAP_H_
#define _LMIC_PINMAP_H_

#include <Arduino_LMIC.h>

static const lmic_pinmap lmic_pins = {
    .nss = 10,
    .rxtx = LMIC_UNUSED_PIN,
    .rst = 9,
    .dio = {2, 6, 7},
};

#endif // _LMIC_PINMAP_H_