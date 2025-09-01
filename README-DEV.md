# POS Printer Service - Development Setup

## Overview

This guide helps you set up and run the POS Printer Service in development mode on your local machine. The development server simulates printing by displaying visual representations of receipts in the console, so you don't need a physical thermal printer.

## Quick Start

### 1. Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### 2. Installation

```bash
# Clone the repository (if you haven't already)
git clone <your-repository-url>
cd PrinterService

# Install dependencies
npm install
```

### 3. Start Development Server

```bash
# Option 1: Use the startup script
./start-dev.sh

# Option 2: Start manually
node server-dev.js
```

The server will start on `http://127.0.0.1:8080` and you'll see output like:

```
🚀 POS Printer Service - Development Mode
==================================================
📍 Server running on http://127.0.0.1:8080
🖨️  Printing is simulated - receipts shown in console
📝 Logs saved to ./logs/combined-dev.log
==================================================

Available endpoints:
  GET  /                    - Service info
  GET  /status              - Service status
  GET  /printers            - List printers
  POST /print               - Print receipt
  POST /preview             - Preview receipt
  POST /test-print          - Test sales receipt
  POST /test-transfer       - Test cash transfer
  POST /test-shift-closure  - Test shift closure
  POST /test-shift-handoff  - Test shift handoff
  POST /test-cash-expense   - Test cash expense

💡 Try: curl http://127.0.0.1:8080/test-print
==================================================
```

## Testing the Service

### 1. Quick Test

Test a sales receipt:

```bash
curl -X POST http://127.0.0.1:8080/test-print
```

You should see a visual representation of the receipt in the console where the server is running.

### 2. Run All Tests

```bash
# In a separate terminal
node test-dev-server.js
```

This will test all receipt types and show you visual representations of each.

### 3. Manual Testing

Test each receipt type individually:

```bash
# Sales receipt
curl -X POST http://127.0.0.1:8080/test-print

# Cash transfer
curl -X POST http://127.0.0.1:8080/test-transfer

# Shift closure
curl -X POST http://127.0.0.1:8080/test-shift-closure

# Shift handoff
curl -X POST http://127.0.0.1:8080/test-shift-handoff

# Cash expense
curl -X POST http://127.0.0.1:8080/test-cash-expense
```

## Visual Output

When you print a receipt, you'll see output like this in the console:

```
============================================================
🖨️  DEVELOPMENT PRINTER OUTPUT
============================================================
                **BUÑUELISIMO**
            Estacion San Antonio, Medellin
                Tel: (604) 1234567

                TRANSFER DE EFECTIVO

Transfer ID: TRANS-000123
Date: 2024-08-30 14:30:00
Shift: Turno Mañana

From: Juan Pérez
To: María García
Amount: $1,250,000

Notes: Transfer for supplies and maintenance

Location: Buñuelisimo - Estacion San Antonio

────────────────────────────────────────────────

                CONSERVAR PARA AUDITORIA

============================================================
📅 Printed at: 8/30/2024, 2:30:00 PM
🆔 Job ID: CASH_TRANSFER-1735582200000
============================================================
```

## API Usage

### Print a Custom Receipt

```bash
curl -X POST http://127.0.0.1:8080/print \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cash_transfer",
    "receipt": {
      "transferId": "CUSTOM-001",
      "date": "2024-08-30 14:30:00",
      "senderName": "John Doe",
      "receiverName": "Jane Smith",
      "amount": 50000,
      "locationName": "Test Location",
      "printTime": "2024-08-30T14:30:00.000Z"
    }
  }'
```

### Preview a Receipt

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

## Configuration

The development server uses the same `config.json` file as the production server. You can modify it to test different configurations:

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
  }
}
```

## Development Features

### 1. Visual Receipt Simulation
- Converts ESC/POS commands to readable text
- Shows exactly what would be printed on a thermal printer
- Includes formatting, alignment, and special characters

### 2. No Physical Printer Required
- Perfect for development and testing
- No hardware dependencies
- Works on any operating system

### 3. Same API as Production
- Identical endpoints and functionality
- Same validation and error handling
- Easy to switch between dev and production

### 4. Comprehensive Logging
- All operations logged to `./logs/combined-dev.log`
- Error logs saved to `./logs/error-dev.log`
- Console output for immediate feedback

## Troubleshooting

### Server Won't Start

```bash
# Check if Node.js is installed
node --version

# Check if dependencies are installed
ls node_modules

# Install dependencies if needed
npm install
```

### Port Already in Use

```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process or change the port in config.json
```

### Receipt Not Displaying

```bash
# Check server logs
tail -f logs/combined-dev.log

# Check for errors
tail -f logs/error-dev.log
```

## Integration with Your Application

You can integrate the development server with your application using the same API calls you'd use with the production server:

```javascript
// Example: Print a cash transfer
const response = await fetch('http://127.0.0.1:8080/print', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'cash_transfer',
    receipt: {
      transferId: 'TRANS-001',
      date: new Date().toISOString(),
      senderName: 'John Doe',
      receiverName: 'Jane Smith',
      amount: 50000,
      locationName: 'Test Location',
      printTime: new Date().toISOString()
    }
  })
});

const result = await response.json();
console.log('Print result:', result);
```

## Next Steps

1. **Test all receipt types** using the provided test scripts
2. **Customize the configuration** to match your needs
3. **Integrate with your application** using the API
4. **Deploy to production** when ready

The development server provides a perfect environment for testing and development without requiring any hardware setup!
