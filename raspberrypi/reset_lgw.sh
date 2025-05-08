#!/bin/bash

# This script is intended to be used with SX1302 CoreCell
# Reset procedure from gateway_v2 datasheet

WAIT_GPIO() {
    sleep $1
}

check_gpiod() {
    if ! command -v gpioset &> /dev/null; then
        echo "Installing gpiod..."
        sudo apt-get update
        sudo apt-get install -y gpiod
    fi
}

init_gpio() {
    # Set all pins to output, low
    sudo gpioset gpiochip0 17=0 5=0 18=0 13=0
}

# Check command line
if [ -z "$1" ]
then
    echo "Usage: $0 start|stop"
    echo "  start: reset the gateway and start the packet forwarder"
    echo "  stop: stop the packet forwarder and reset the gateway"
    exit 1
fi

check_gpiod

case "$1" in
    start)
    # Reset sequence
    echo "CoreCell reset through GPIO17..."
    echo "SX1261 reset through GPIO17..."
    echo "CoreCell power enable through GPIO18..."
    echo "CoreCell ADC reset through GPIO13..."
    
    # Initialize all pins
    init_gpio
    WAIT_GPIO 0.5  # Longer delay for initial state
    
    # Power up sequence
    sudo gpioset gpiochip0 18=1  # power up
    WAIT_GPIO 0.5  # Increased from 0.1 to 0.5 seconds
    sudo gpioset gpiochip0 17=1  # reset high
    WAIT_GPIO 0.5  # Increased from 0.1 to 0.5 seconds
    sudo gpioset gpiochip0 17=0  # reset low
    WAIT_GPIO 0.5  # Increased from 0.1 to 0.5 seconds
    sudo gpioset gpiochip0 13=1  # ADC reset high
    WAIT_GPIO 0.5  # Added additional delay after ADC reset
    ;;
    stop)
    # Reset sequence for stop
    init_gpio
    ;;
    *)
    echo "Unknown command $1"
    exit 1
    ;;
esac