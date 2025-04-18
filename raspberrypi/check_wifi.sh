#!/bin/bash

# Configuration
WIFI_SSID="Boston College"
PING_HOST="8.8.8.8"
TTN_HOST="nam1.cloud.thethings.network"
CHECK_INTERVAL=60
LOG_FILE="/home/SIP/connection_log.txt"

# Function to check internet connectivity
check_internet() {
    ping -c 1 $PING_HOST &> /dev/null
    return $?
}

# Function to check TTN connectivity
check_ttn() {
    nc -zw5 $TTN_HOST 1700 &> /dev/null
    return $?
}

while true; do
    # Check internet connection
    if ! check_internet; then
        echo "$(date): Internet connection lost. Attempting to reconnect..."
        sudo nmcli radio wifi off
        sleep 5
        sudo nmcli radio wifi on
        sleep 5
        sudo nmcli connection up "$WIFI_SSID"
        
        # Wait for connection to stabilize
        sleep 10
        
        # If still no connection, try cycling the network interface
        if ! check_internet; then
            echo "$(date): Still no connection. Cycling network interface..."
            sudo ifconfig wlan0 down
            sleep 5
            sudo ifconfig wlan0 up
        fi
    fi
    
    # Check TTN connectivity
    if ! check_ttn; then
        echo "$(date): TTN connection lost. Restarting packet forwarder..."
        sudo systemctl restart lora-packet-forwarder
    fi
    
    # Log successful connection status periodically
    if check_internet && check_ttn; then
        echo "$(date): Connections OK - WiFi and TTN are connected" >> "$LOG_FILE"
    fi
    
    sleep $CHECK_INTERVAL
done