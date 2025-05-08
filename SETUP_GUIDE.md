# Waterlogged Project Setup Guide

This guide provides step-by-step instructions for setting up the complete Waterlogged system, including the Arduino nodes, Raspberry Pi gateway, and web application.

## Prerequisites

### Hardware Requirements
- Arduino Uno or compatible boards (for rain gauge nodes)
- Raspberry Pi 3B+ or newer (for gateway)
- LA66 LoRa modules (one per Arduino node)
- HX711 load cell amplifiers with load cells
- DHT22 temperature and humidity sensors
- Ball valves (1" NC valve and 1/2" NO valve) with appropriate relays
- Power supplies for nodes and gateway

### Software Requirements
- Arduino IDE (1.8.x or newer)
- Node.js (14.x or newer) with npm
- Python 3.8 or newer
- Git

## Step 1: Arduino Node Setup

1. Open the Arduino IDE
2. Install the following libraries through the Arduino Library Manager:
   - HX711 by Bogdan Necula
   - DHT sensor library by Adafruit
   - RTClib by Adafruit
3. Clone this repository and navigate to the Arduino code:
   ```
   git clone https://github.com/yourname/waterlogged.git
   cd waterlogged/arduino/waterlogged_node
   ```
4. Open `waterlogged_node.ino` in the Arduino IDE
5. Configure your TTN credentials (DEV_EUI, JOIN_EUI, APP_KEY)
6. Upload the sketch to your Arduino

### Hardware Connections
Connect components according to the pin configuration in the code:
- Load Cell: DOUT->6, SCK->5
- DHT22: DATA->7
- NC Valve: A3
- NO Valve: A4
- Status LEDs: A0 (Error), A1 (Active), A2 (Power)
- LA66: RX->11, TX->10

## Step 2: Raspberry Pi Gateway Setup

1. Clone this repository on your Raspberry Pi:
   ```
   git clone https://github.com/yourname/waterlogged.git
   cd waterlogged/raspberrypi
   ```

2. Run the setup script:
   ```
   chmod +x setup.sh
   sudo ./setup.sh
   ```

3. Configure your TTN application credentials in the `.env` file:
   ```
   # Create .env from the template
   cp .env.example .env
   nano .env
   ```

4. Start the services:
   ```
   sudo systemctl start serial-handler
   sudo systemctl start api-server
   sudo systemctl start wifi-monitor
   ```

5. Enable services to start on boot:
   ```
   sudo systemctl enable serial-handler
   sudo systemctl enable api-server
   sudo systemctl enable wifi-monitor
   ```

## Step 3: Web Application Setup

1. Navigate to the root directory:
   ```
   cd waterlogged
   ```

2. Install the Node.js dependencies:
   ```
   npm install
   ```

3. Configure the environment variables:
   ```
   cp .env.example .env
   # Edit .env with your ThingSpeak credentials
   ```

4. Start the web server:
   ```
   node server.js
   ```

5. Access the web interface at http://localhost:3000

## Step 4: Testing the System

1. **Test the Arduino Node**
   - Power up the node and observe the status LEDs
   - Check the Arduino serial monitor for debugging output

2. **Test the Raspberry Pi Gateway**
   - Check the logs: `journalctl -u api-server -f`
   - Verify API is working: `curl http://localhost:8000/data/latest`

3. **Test the Web Application**
   - Navigate to http://localhost:3000
   - Verify that data is being displayed

## Troubleshooting

### Arduino Node Issues
- If the node fails to join TTN, check the key format and ensure your gateway is operational
- Weight readings that appear unstable may indicate a grounding issue with the load cell

### Raspberry Pi Gateway Issues
- Check API server logs: `journalctl -u api-server -f`
- Check serial handler logs: `journalctl -u serial-handler -f`
- Verify database is created and accessible

### Web Application Issues
- Check server logs for errors
- Verify ThingSpeak API keys are correctly configured

## Deployment

For production deployment:

1. **Arduino Nodes**
   - Install in weatherproof enclosures
   - Set up solar power if required

2. **Raspberry Pi Gateway**
   - Configure firewall rules
   - Set up SSL for API using nginx reverse proxy
   - Install as a service using systemd

3. **Web Application**
   - Deploy to a cloud platform like Heroku
   - Or set up on a VPS with nginx and PM2
