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

# Function to reset the concentrator
reset_concentrator() {
    echo "$(date): Resetting LoRa concentrator..." | tee -a "$LOG_FILE"
    cd $LORA_DIR
    sudo ./reset_lgw.sh stop
    sleep 1
    sudo ./reset_lgw.sh start
    sleep 1
}

# Change to the packet forwarder directory
cd $LORA_DIR

# Start the packet forwarder with error handling and logging
while true; do
    rotate_log
    
    echo "$(date): Starting LoRa packet forwarder..." | tee -a "$LOG_FILE"
    
    # Reset the concentrator before starting
    reset_concentrator
    
    # Run the packet forwarder
    if ! ./lora_pkt_fwd -c global_conf.json.sx1250.US915 2>&1 | tee -a "$LOG_FILE"; then
        echo "$(date): Packet forwarder exited with error" | tee -a "$LOG_FILE"
    fi
    
    # If the program crashes, wait before restart
    echo "$(date): Packet forwarder stopped, restarting in 30 seconds..." | tee -a "$LOG_FILE"
    sleep 30
done