#!/bin/bash

# Configuration
LOG_FILE="/home/SIP/lora_log.txt"
MAX_LOG_SIZE=$((50*1024*1024))  # 50MB
LORA_DIR="/home/SIP/LR1302_loraWAN/LR1302_HAL/sx1302_hal/packet_forwarder"
RESET_SCRIPT="/home/SIP/LR1302_loraWAN/LR1302_HAL/sx1302_hal/packet_forwarder/reset_lgw.sh"

# Function to rotate log file if it gets too large
rotate_log() {
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
    fi
}

# Function to initialize GPIO using gpiod
init_gpio() {
    echo "$(date): Initializing GPIO pins..." | tee -a "$LOG_FILE"
    
    # Install gpiod if not present
    if ! command -v gpioset &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y gpiod
    fi
    
    # Set initial states using gpioset
    sudo gpioset gpiochip0 17=0 5=0 18=0 13=0
    
    sleep 0.1
    echo "$(date): GPIO initialization complete" | tee -a "$LOG_FILE"
}

# Function to set GPIO value using gpiod
set_gpio() {
    local pin=$1
    local value=$2
    sudo gpioset gpiochip0 ${pin}=${value}
}

# Function to reset the concentrator
reset_concentrator() {
    echo "$(date): Resetting LoRa concentrator..." | tee -a "$LOG_FILE"
    cd "$LORA_DIR"
    
    # Power down sequence
    set_gpio 18 0  # Power down
    set_gpio 17 0  # Reset low
    set_gpio 13 0  # ADC reset low
    sleep 0.5     # Wait for discharge
    
    # Power up sequence
    set_gpio 18 1  # Power up
    sleep 0.5     # Wait for power stabilization
    
    # Reset pulse
    set_gpio 17 1  # Reset high
    sleep 0.1     # 100ms reset pulse
    set_gpio 17 0  # Reset low
    
    # ADC reset
    sleep 0.1
    set_gpio 13 1  # ADC reset high
    
    # Final stabilization
    sleep 1
    echo "$(date): Reset sequence completed" | tee -a "$LOG_FILE"
}

# Start the packet forwarder with error handling and logging
while true; do
    rotate_log
    
    echo "$(date): Starting LoRa packet forwarder..." | tee -a "$LOG_FILE"
    
    # Change to the packet forwarder directory
    cd "$LORA_DIR" || exit 1
    
    # Initialize GPIO and reset concentrator
    init_gpio
    reset_concentrator
    
    # Run the packet forwarder with proper error handling
    if ! sudo ./lora_pkt_fwd -c global_conf.json.sx1250.US915 2>&1 | tee -a "$LOG_FILE"; then
        echo "$(date): Packet forwarder exited with error" | tee -a "$LOG_FILE"
    fi
    
    # If the program crashes, wait before restart
    echo "$(date): Packet forwarder stopped, restarting in 30 seconds..." | tee -a "$LOG_FILE"
    sleep 30
done