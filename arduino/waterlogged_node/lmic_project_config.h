#pragma once

// Project-specific dependencies
#if !defined(DISABLE_PING)
#define DISABLE_PING
#endif
#if !defined(DISABLE_BEACONS)
#define DISABLE_BEACONS
#endif

// Define the region
#define CFG_us915 1
#define CFG_sx1276_radio 1

// This is the SX1276 radio, which is also used by the RFM95
#define LMIC_PRINTF_TO Serial
#define USE_ORIGINAL_AES