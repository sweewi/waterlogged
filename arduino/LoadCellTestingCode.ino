/*
Charlie Neill
Date Jan 21, 2025
Credit to Nathan Seidle, whose code this is based on
"" SparkFun Electronics
Date: November 19th, 2014
License: This code is public domain but you buy me a beer if you use this and we meet someday (Beerware license).""
Arduino pin 2 -> HX711 CLK
3 -> DOUT
5V -> VCC
GND -> GND
*/

#include "HX711.h" //This library can be obtained here http://librarymanager/All#Avia_HX711

#define LOADCELL_DOUT_PIN  3
#define LOADCELL_SCK_PIN  2

HX711 scale;

float calibration_factor = 210.25; //210.25 works well for testing scale setup

void setup() {
 Serial.begin(9600);
 Serial.println("HX711 load cell sketch");
 Serial.println("Units: grams");
 Serial.println("Taring scale...");

 scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
 scale.set_scale();
 scale.tare(80); //Reset the scale to 0, takes average of readings over 80 bytes to get zero

 long zero_factor = scale.read_average(); //Get a baseline reading
 Serial.print("Taring complete: Zero factor: "); //This can be used to remove the need to tare the scale. Useful in permanent scale projects.
 Serial.println(zero_factor);

 scale.set_scale(calibration_factor); // adjust to the calibration factor
}

void loop() {
 Serial.print(scale.get_units(32), 5); //number inside get_units() function is bytes used for average scale reading. Second number is sig figs I think
 Serial.println();
}
