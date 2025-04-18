#!/bin/bash

# Exit on error
set -e

echo "Setting up Arduino connection..."

# Add current user to dialout group for serial port access
sudo usermod -a -G dialout $USER

# Create udev rule for Arduino
sudo tee /etc/udev/rules.d/99-arduino.rules << EOF
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", ATTRS{idProduct}=="0043", SYMLINK+="waterlogged_arduino", MODE="0666"
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", ATTRS{idProduct}=="0001", SYMLINK+="waterlogged_arduino", MODE="0666"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "Arduino setup complete!"
echo "The Arduino should now be accessible at /dev/waterlogged_arduino"
echo "Note: You may need to log out and back in for group changes to take effect"