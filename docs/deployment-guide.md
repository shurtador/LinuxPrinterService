# Deployment and Testing Guide

## Overview

This guide covers the deployment and testing of the enhanced POS Printer Service with support for multiple receipt types.

## Prerequisites

- **OS**: Linux (Ubuntu 20.04+ or Debian 10+)
- **Hardware**: Rongta 80mm thermal printer with USB connection
- **Software**: 
  - Node.js 16+ 
  - CUPS (Common Unix Printing System)
  - npm

## Installation

### 1. System Dependencies

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

### 2. Service Setup

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

## Configuration

### Basic Configuration

Edit `/opt/pos-printer-service/config.json`:

```json
{
  "server": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "receipt": {
    "restaurantName": "BUÑUELISIMO",
    "address": "Estacion San Antonio, Medellin",
    "phone": "Tel: (604) 1234567",
    "footerMessage": "Gracias por tu visita buñuelisima",
    "paperWidth": 48,
    "receiptTypes": {
      "cash_transfer": {
        "header": "TRANSFER DE EFECTIVO",
        "footer": "CONSERVAR PARA AUDITORIA"
      },
      "shift_closure": {
        "header": "CIERRE DE TURNO",
        "footer": "CIERRE COMPLETADO"
      },
      "shift_handoff": {
        "header": "ENTREGA DE TURNO",
        "footer": "CONSERVAR PARA AUDITORIA"
      },
      "cash_expense": {
        "header": "GASTO DE CAJA",
        "footer": "CONSERVAR PARA AUDITORIA"
      }
    }
  },
  "logging": {
    "level": "info",
    "directory": "./logs",
    "maxSize": "10MB",
    "maxFiles": 5
  }
}
```

### Customizing Receipt Types

You can customize the headers and footers for each receipt type:

```json
{
  "receiptTypes": {
    "cash_transfer": {
      "header": "CUSTOM TRANSFER HEADER",
      "footer": "CUSTOM TRANSFER FOOTER"
    },
    "shift_closure": {
      "header": "CUSTOM CLOSURE HEADER",
      "footer": "CUSTOM CLOSURE FOOTER"
    }
  }
}
```

## Testing

### 1. Service Status

```bash
# Check if service is running
sudo systemctl status pos-printer-service

# Check service logs
sudo journalctl -u pos-printer-service -f
```

### 2. API Testing

#### Test Service Info
```bash
curl http://127.0.0.1:8080/
```

#### Test Service Status
```bash
curl http://127.0.0.1:8080/status
```

#### Test Printer List
```bash
curl http://127.0.0.1:8080/printers
```

### 3. Receipt Type Testing

#### Test Sales Receipt
```bash
curl -X POST http://127.0.0.1:8080/test-print
```

#### Test Cash Transfer Receipt
```bash
curl -X POST http://127.0.0.1:8080/test-transfer
```

#### Test Shift Closure Receipt
```bash
curl -X POST http://127.0.0.1:8080/test-shift-closure
```

#### Test Shift Handoff Receipt
```bash
curl -X POST http://127.0.0.1:8080/test-shift-handoff
```

#### Test Cash Expense Receipt
```bash
curl -X POST http://127.0.0.1:8080/test-cash-expense
```

### 4. Preview Testing

#### Preview Sales Receipt
```bash
curl -X POST http://127.0.0.1:8080/preview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sales",
    "receipt": {
      "orderNumber": "ORD-001",
      "date": "2024-08-09T12:04:43.000Z",
      "cashier": "John Doe",
      "items": [
        {
          "name": "Buñuelo tradicional",
          "quantity": 2,
          "price": 1500,
          "total": 3000
        }
      ],
      "subtotal": 3000,
      "tax": 240,
      "total": 3240,
      "paymentMethod": "cash"
    }
  }'
```

#### Preview Cash Transfer Receipt
```bash
curl -X POST http://127.0.0.1:8080/preview \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cash_transfer",
    "receipt": {
      "transferId": "TRANS-000123",
      "date": "2024-08-30 14:30:00",
      "senderName": "Juan Pérez",
      "receiverName": "María García",
      "amount": 1250000,
      "locationName": "Buñuelisimo - Estacion San Antonio",
      "printTime": "2024-08-30T14:30:00.000Z"
    }
  }'
```

### 5. Automated Testing

Run the automated test scripts:

```bash
# Test validation functions
node test-validation.js

# Test receipt formatter
node test-receipt-formatter.js

# Test server endpoints (requires server to be running)
node test-server-endpoints.js
```

## Integration Testing

### 1. JavaScript Integration

```javascript
// Example integration with your POS system
class POSPrinterService {
  constructor(baseUrl = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
  }

  async printSalesReceipt(receiptData) {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'sales',
        receipt: receiptData
      })
    });
    return response.json();
  }

  async printCashTransfer(transferData) {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cash_transfer',
        receipt: transferData
      })
    });
    return response.json();
  }

  async printShiftClosure(closureData) {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'shift_closure',
        receipt: closureData
      })
    });
    return response.json();
  }

  async printShiftHandoff(handoffData) {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'shift_handoff',
        receipt: handoffData
      })
    });
    return response.json();
  }

  async printCashExpense(expenseData) {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cash_expense',
        receipt: expenseData
      })
    });
    return response.json();
  }
}

// Usage example
const printer = new POSPrinterService();

// Print a sales receipt
const salesResult = await printer.printSalesReceipt({
  orderNumber: 'ORD-001',
  date: new Date().toISOString(),
  cashier: 'John Doe',
  items: [
    { name: 'Buñuelo tradicional', quantity: 2, price: 1500, total: 3000 }
  ],
  subtotal: 3000,
  tax: 240,
  total: 3240,
  paymentMethod: 'cash'
});

// Print a cash transfer
const transferResult = await printer.printCashTransfer({
  transferId: 'TRANS-000123',
  date: new Date().toISOString(),
  senderName: 'Juan Pérez',
  receiverName: 'María García',
  amount: 1250000,
  locationName: 'Buñuelisimo - Estacion San Antonio',
  printTime: new Date().toISOString()
});
```

### 2. cURL Integration

```bash
#!/bin/bash

# Print sales receipt
print_sales_receipt() {
  curl -X POST http://127.0.0.1:8080/print \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"sales\",
      \"receipt\": {
        \"orderNumber\": \"$1\",
        \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"cashier\": \"$2\",
        \"items\": $3,
        \"subtotal\": $4,
        \"tax\": $5,
        \"total\": $6,
        \"paymentMethod\": \"$7\"
      }
    }"
}

# Print cash transfer
print_cash_transfer() {
  curl -X POST http://127.0.0.1:8080/print \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"cash_transfer\",
      \"receipt\": {
        \"transferId\": \"$1\",
        \"date\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
        \"senderName\": \"$2\",
        \"receiverName\": \"$3\",
        \"amount\": $4,
        \"locationName\": \"$5\",
        \"printTime\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
      }
    }"
}

# Usage examples
print_sales_receipt "ORD-001" "John Doe" '[{"name":"Buñuelo","quantity":2,"price":1500,"total":3000}]' 3000 240 3240 "cash"
print_cash_transfer "TRANS-000123" "Juan Pérez" "María García" 1250000 "Buñuelisimo - Estacion San Antonio"
```

## Monitoring

### 1. Service Monitoring

```bash
# Check service status
sudo systemctl status pos-printer-service

# View real-time logs
sudo journalctl -u pos-printer-service -f

# View recent logs
sudo journalctl -u pos-printer-service --since "1 hour ago"

# Check application logs
sudo tail -f /opt/pos-printer-service/logs/combined.log
sudo tail -f /opt/pos-printer-service/logs/error.log
```

### 2. API Monitoring

```bash
# Monitor API health
watch -n 5 'curl -s http://127.0.0.1:8080/status | jq .'

# Check printer status
watch -n 10 'curl -s http://127.0.0.1:8080/printers | jq .'
```

### 3. Printer Monitoring

```bash
# Check CUPS status
sudo systemctl status cups

# Check print queue
lpq

# Check printer status
lpstat -p

# Cancel stuck jobs
sudo cancel -a
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check service status
sudo systemctl status pos-printer-service

# Check logs
sudo journalctl -u pos-printer-service --since "10 minutes ago"

# Check if port is available
sudo netstat -tlnp | grep 8080
```

#### 2. Printer Not Found
```bash
# List available printers
lpstat -p

# Check printer status
lpstat -p rongta-printer

# Test printer directly
echo "test" | lp -d rongta-printer
```

#### 3. Print Jobs Not Working
```bash
# Check CUPS status
sudo systemctl status cups

# Check print queue
lpq

# Cancel stuck jobs
sudo cancel -a
```

#### 4. Permission Issues
```bash
# Fix permissions
sudo chown -R pos-printer:pos-printer /opt/pos-printer-service
sudo usermod -a -G lp pos-printer
sudo systemctl restart pos-printer-service
```

#### 5. Validation Errors
```bash
# Check receipt data structure
# Ensure all required fields are present
# Verify data types (numbers vs strings)
# Check receipt type is valid
```

### Debug Mode

Enable debug logging by modifying `config.json`:

```json
{
  "logging": {
    "level": "debug"
  }
}
```

Then restart the service:

```bash
sudo systemctl restart pos-printer-service
```

## Performance Tuning

### 1. Queue Management

Adjust queue settings in `config.json`:

```json
{
  "printing": {
    "maxQueueSize": 20,
    "timeout": 15000,
    "retryAttempts": 5
  }
}
```

### 2. Logging Optimization

```json
{
  "logging": {
    "level": "info",
    "maxSize": "20MB",
    "maxFiles": 10
  }
}
```

### 3. Server Configuration

```json
{
  "server": {
    "port": 8080,
    "host": "0.0.0.0"  // Allow external connections if needed
  }
}
```

## Security Considerations

1. **Network Security**: The service runs on localhost by default
2. **User Permissions**: Service runs with minimal permissions
3. **Input Validation**: All receipt data is validated
4. **Error Handling**: Sensitive information is not exposed in error messages

## Backup and Recovery

### Backup Configuration
```bash
# Backup configuration
sudo cp /opt/pos-printer-service/config.json /backup/config.json.$(date +%Y%m%d)

# Backup logs
sudo tar -czf /backup/logs.$(date +%Y%m%d).tar.gz /opt/pos-printer-service/logs/
```

### Recovery
```bash
# Restore configuration
sudo cp /backup/config.json.20240830 /opt/pos-printer-service/config.json

# Restart service
sudo systemctl restart pos-printer-service
```
