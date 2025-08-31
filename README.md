# POS Printer Service

A standalone local printer service for POS systems that handles thermal receipt printing via CUPS on Linux systems. Designed specifically for Rongta 80mm thermal printers with USB serial interface.

## 🚀 Features

- **Instant Receipt Printing**: Print receipts within 2 seconds of request
- **Thermal Printer Support**: Optimized for 80mm thermal printers (Rongta)
- **Logo Support**: Include your restaurant logo on receipts
- **Queue Management**: Handle up to 10 receipts when printer is offline
- **REST API**: Simple HTTP endpoints for integration
- **Error Recovery**: Automatic retry and graceful error handling
- **Systemd Integration**: Run as a system service with auto-restart
- **Comprehensive Logging**: Track all print jobs and errors

## 📋 Prerequisites

- **OS**: Linux (Ubuntu 20.04+ or Debian 10+)
- **Hardware**: Rongta 80mm thermal printer with USB connection
- **Software**: 
  - Node.js 16+ 
  - CUPS (Common Unix Printing System)
  - npm

## 🔧 Quick Installation

1. **Download and extract the service files**
2. **Run the installation script:**
   ```bash
   sudo chmod +x install.sh
   sudo ./install.sh
   ```

The installation script will:
- Install system dependencies (CUPS if not present)
- Create a dedicated service user
- Install the service to `/opt/pos-printer-service`
- Set up systemd service
- Start the service automatically

## 📝 Manual Installation

If you prefer to install manually:

### 1. Install Dependencies

```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install CUPS
sudo apt-get update
sudo apt-get install -y cups cups-client

# Start CUPS
sudo systemctl start cups
sudo systemctl enable cups
```

### 2. Set Up the Service

```bash
# Create installation directory
sudo mkdir -p /opt/pos-printer-service

# Copy service files
sudo cp -r . /opt/pos-printer-service/

# Create service user
sudo useradd --system --no-create-home --shell /bin/false pos-printer
sudo usermod -a -G lp pos-printer

# Set permissions
sudo chown -R pos-printer:pos-printer /opt/pos-printer-service
sudo chmod -R 755 /opt/pos-printer-service

# Install Node.js dependencies
cd /opt/pos-printer-service
sudo -u pos-printer npm install --production
```

### 3. Configure CUPS Printer

Add your Rongta printer to CUPS:

```bash
# Method 1: Web interface
# Open http://localhost:631 in your browser
# Go to Administration > Add Printer

# Method 2: Command line
sudo lpadmin -p rongta-printer -v usb://RONGTA/80mm -E
sudo lpadmin -d rongta-printer  # Set as default
```

### 4. Install Systemd Service

```bash
# Copy service file
sudo cp pos-printer-service.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable pos-printer-service
sudo systemctl start pos-printer-service
```

## ⚙️ Configuration

Edit `/opt/pos-printer-service/config.json` to customize your setup:

```json
{
  "receipt": {
    "restaurantName": "Your Restaurant Name",
    "address": "123 Main Street, Your City, State 12345",
    "phone": "Tel: (555) 123-4567",
    "footerMessage": "Thank you for your visit!",
    "logoPath": "./assets/logo.png"
  }
}
```

### Adding Your Logo

1. Convert your logo to PNG format (black and white works best)
2. Place it at `/opt/pos-printer-service/assets/logo.png`
3. Restart the service: `sudo systemctl restart pos-printer-service`

## 🔌 API Usage

### Print a Receipt

```bash
curl -X POST http://localhost:8080/print \
  -H "Content-Type: application/json" \
  -d '{
    "receipt": {
      "orderNumber": "ORD-001",
      "date": "2024-08-09T12:04:43.000Z",
      "cashier": "John Doe",
      "items": [
        {
          "name": "Burger Deluxe",
          "quantity": 2,
          "price": 12.00,
          "total": 24.00
        },
        {
          "name": "French Fries", 
          "quantity": 1,
          "price": 4.50,
          "total": 4.50
        }
      ],
      "subtotal": 28.50,
      "tax": 2.42,
      "total": 30.92,
      "paymentMethod": "cash",
      "tendered": 35.00,
      "change": 4.08
    }
  }'
```

### Test Print

```bash
curl -X POST http://localhost:8080/test-print
```

### Check Status

```bash
curl http://localhost:8080/status
```

### List Printers

```bash
curl http://localhost:8080/printers
```

## 🧪 Testing

### Test the Service

```bash
# Test if service is running
sudo systemctl status pos-printer-service

# Test API response
curl http://localhost:8080/status

# Test print functionality
curl -X POST http://localhost:8080/test-print
```

### Integration with Your POS Web App

From your POS web application, make a POST request to print receipts:

```javascript
// Example JavaScript code for your POS web app
async function printReceipt(receiptData) {
  try {
    const response = await fetch('http://localhost:8080/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receipt: receiptData })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Receipt printed successfully');
    } else {
      console.error('Print failed:', result.error);
    }
  } catch (error) {
    console.error('Print request failed:', error);
  }
}
```

## 🛠️ Service Management

```bash
# Start service
sudo systemctl start pos-printer-service

# Stop service  
sudo systemctl stop pos-printer-service

# Restart service
sudo systemctl restart pos-printer-service

# Check status
sudo systemctl status pos-printer-service

# View logs
sudo journalctl -u pos-printer-service -f

# View recent logs
sudo journalctl -u pos-printer-service --since "1 hour ago"
```

## 📊 Monitoring

### View Service Status

```bash
curl http://localhost:8080/status | python3 -m json.tool
```

### Check Logs

```bash
# Service logs
sudo journalctl -u pos-printer-service -f

# Application logs
sudo tail -f /opt/pos-printer-service/logs/combined.log

# Error logs only
sudo tail -f /opt/pos-printer-service/logs/error.log
```

## 🔧 Troubleshooting

### Service Won't Start

```bash
# Check status
sudo systemctl status pos-printer-service

# Check logs
sudo journalctl -u pos-printer-service --since "10 minutes ago"

# Check if port is available
sudo netstat -tlnp | grep 8080
```

### Printer Not Found

```bash
# List available printers
lpstat -p

# Check printer status
lpstat -p rongta-printer

# Test printer directly
echo "test" | lp -d rongta-printer
```

### Print Jobs Not Working

```bash
# Check CUPS status
sudo systemctl status cups

# Check print queue
lpq

# Cancel stuck jobs
sudo cancel -a
```

### Permission Issues

```bash
# Fix permissions
sudo chown -R pos-printer:pos-printer /opt/pos-printer-service
sudo usermod -a -G lp pos-printer
sudo systemctl restart pos-printer-service
```

## 📁 File Structure

```
/opt/pos-printer-service/
├── server.js              # Main server file
├── lib/
│   ├── receiptFormatter.js # Receipt formatting logic
│   └── printerManager.js   # CUPS printer management
├── config.json            # Configuration file
├── package.json           # Node.js dependencies
├── assets/
│   └── logo.png           # Your restaurant logo
├── logs/                  # Application logs
│   ├── combined.log
│   └── error.log
└── pos-printer-service.service  # Systemd service file
```

## 🔒 Security Notes

- Service runs on localhost (127.0.0.1) by default
- Dedicated service user with minimal permissions
- No external network access required
- All data is processed locally

## 📋 Receipt Format Example

```
================================
        YOUR RESTAURANT
================================
Order #: ORD-001
Date: 2024-08-09 12:04:43 AM
Cashier: John Doe
--------------------------------
Burger Deluxe x2          $24.00
French Fries x1            $4.50
Coca Cola x2               $6.00
--------------------------------
Subtotal:                 $34.50
Tax (8.5%):                $2.93
Total:                    $37.43
--------------------------------
Payment: Cash
Tendered:                 $40.00
Change:                    $2.57
================================
     Thank you for your visit!
================================
```

## 🤝 Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u pos-printer-service -f`
2. Verify printer connection: `lpstat -p`
3. Test basic printing: `echo "test" | lp`
4. Check service status: `sudo systemctl status pos-printer-service`

## 📄 License

MIT License - See LICENSE file for details.

---

**Ready to print! 🖨️**