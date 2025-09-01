# POS Printer Service API Documentation

## Overview

The POS Printer Service is a REST API that handles thermal receipt printing for multiple receipt types. It supports sales receipts, cash transfers, shift closures, shift handoffs, and cash expenses.

**Base URL:** `http://127.0.0.1:8080`

## Receipt Types

The service supports the following receipt types:

1. **`sales`** - Standard sales receipts (default)
2. **`cash_transfer`** - Cash transfer receipts
3. **`shift_closure`** - Shift closure receipts
4. **`shift_handoff`** - Shift handoff receipts
5. **`cash_expense`** - Cash expense receipts

## Endpoints

### Service Information

#### GET /
Get service information and available endpoints.

**Response:**
```json
{
  "service": "POS Printer Service",
  "version": "1.0.0",
  "status": "running",
  "timestamp": "2024-08-30T14:30:00.000Z",
  "uptime": 3600,
  "endpoints": {
    "print": "POST /print",
    "preview": "POST /preview",
    "testPrint": "POST /test-print",
    "testTransfer": "POST /test-transfer",
    "testShiftClosure": "POST /test-shift-closure",
    "testShiftHandoff": "POST /test-shift-handoff",
    "testCashExpense": "POST /test-cash-expense",
    "status": "GET /status",
    "printers": "GET /printers"
  }
}
```

### Service Status

#### GET /status
Get detailed service status including printer information.

**Response:**
```json
{
  "service": "online",
  "printers": [
    {
      "name": "Rongta",
      "status": "online",
      "isDefault": true,
      "model": "Rongta 80mm Thermal Printer"
    }
  ],
  "lastPrintTime": "2024-08-30T14:30:00.000Z",
  "uptime": 3600,
  "queueLength": 0,
  "maxQueueSize": 10,
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

### Printer Management

#### GET /printers
Get list of available printers.

**Response:**
```json
{
  "printers": [
    {
      "name": "Rongta",
      "status": "online",
      "isDefault": true,
      "model": "Rongta 80mm Thermal Printer",
      "location": "",
      "description": ""
    }
  ],
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

## Print Endpoints

### Main Print Endpoint

#### POST /print
Print any type of receipt.

**Request Body:**
```json
{
  "type": "cash_transfer",
  "receipt": {
    // Receipt data based on type
  }
}
```

**Parameters:**
- `type` (optional): Receipt type. Defaults to `"sales"` if not specified.
- `receipt` (required): Receipt data object.

**Response:**
```json
{
  "success": true,
  "message": "Receipt printed successfully",
  "printerId": "Rongta",
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

### Preview Endpoint

#### POST /preview
Preview any type of receipt without printing.

**Request Body:**
```json
{
  "type": "cash_transfer",
  "receipt": {
    // Receipt data based on type
  }
}
```

**Response:**
```json
{
  "success": true,
  "preview": "Formatted receipt text without ESC/POS codes",
  "escPosCodes": ["INIT", "BOLD_ON", "CENTER_ON"],
  "rawLength": 870,
  "type": "cash_transfer",
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

## Test Endpoints

### Test Sales Print

#### POST /test-print
Print a test sales receipt.

**Request Body:**
```json
{
  "printerName": "Rongta"
}
```

### Test Cash Transfer Print

#### POST /test-transfer
Print a test cash transfer receipt.

**Request Body:**
```json
{
  "printerName": "Rongta"
}
```

### Test Shift Closure Print

#### POST /test-shift-closure
Print a test shift closure receipt.

**Request Body:**
```json
{
  "printerName": "Rongta"
}
```

### Test Shift Handoff Print

#### POST /test-shift-handoff
Print a test shift handoff receipt.

**Request Body:**
```json
{
  "printerName": "Rongta"
}
```

### Test Cash Expense Print

#### POST /test-cash-expense
Print a test cash expense receipt.

**Request Body:**
```json
{
  "printerName": "Rongta"
}
```

## Receipt Data Structures

### Sales Receipt (`type: "sales"`)

```json
{
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
  "paymentMethod": "cash",
  "tendered": 3500,
  "change": 260
}
```

### Cash Transfer Receipt (`type: "cash_transfer"`)

```json
{
  "transferId": "TRANS-000123",
  "date": "2024-08-30 14:30:00",
  "shiftInfo": "Turno Mañana",
  "senderName": "Juan Pérez",
  "receiverName": "María García",
  "amount": 1250000,
  "notes": "Transfer for supplies",
  "locationName": "Buñuelisimo - Estacion San Antonio",
  "printTime": "2024-08-30T14:30:00.000Z"
}
```

### Shift Closure Receipt (`type: "shift_closure"`)

```json
{
  "shiftId": "SHIFT-000045",
  "shiftType": "Turno Tarde",
  "shiftDate": "2024-08-30",
  "cashierName": "Ana López",
  "startTime": "14:00",
  "endTime": "22:00",
  "startingCash": 500000,
  "endingCashExpected": 1350000,
  "endingCashCounted": 1348000,
  "variance": -2000,
  "shiftSales": 850000,
  "transfersOut": 800000,
  "locationName": "Buñuelisimo - Estacion San Antonio",
  "printTime": "2024-08-30T22:00:00.000Z"
}
```

### Shift Handoff Receipt (`type: "shift_handoff"`)

```json
{
  "handoffId": "HAND-000067",
  "handoffDate": "2024-08-30 14:00:00",
  "outgoingCashier": "Carlos Ruiz",
  "incomingCashier": "Laura Silva",
  "handoffAmount": 548000,
  "verifiedAmount": 548000,
  "variance": 0,
  "status": "VERIFICADO",
  "locationName": "Buñuelisimo - Estacion San Antonio",
  "printTime": "2024-08-30T14:00:00.000Z"
}
```

### Cash Expense Receipt (`type: "cash_expense"`)

```json
{
  "expenseId": "EXP-000452",
  "cashExpenseId": "CASH-000089",
  "date": "2024-08-30 16:45:00",
  "cashierName": "Roberto Díaz",
  "category": "Alimentación",
  "description": "Almuerzo para personal",
  "amount": 25000,
  "shiftInfo": "Turno Tarde",
  "locationName": "Buñuelisimo - Estacion San Antonio",
  "printTime": "2024-08-30T16:45:00.000Z"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Invalid receipt data: Transfer ID is required, Date is required",
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "No printers available",
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Endpoint not found",
  "method": "POST",
  "path": "/invalid-endpoint",
  "availableEndpoints": {
    "GET /": "Service info",
    "GET /status": "Service status",
    "GET /printers": "List printers",
    "POST /test-print": "Test sales print",
    "POST /test-transfer": "Test cash transfer print",
    "POST /test-shift-closure": "Test shift closure print",
    "POST /test-shift-handoff": "Test shift handoff print",
    "POST /test-cash-expense": "Test cash expense print",
    "POST /print": "Print receipt (with type parameter)",
    "POST /preview": "Preview receipt (with type parameter)"
  },
  "timestamp": "2024-08-30T14:30:00.000Z"
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
// Print a cash transfer receipt
async function printCashTransfer() {
  const response = await fetch('http://127.0.0.1:8080/print', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'cash_transfer',
      receipt: {
        transferId: 'TRANS-000123',
        date: '2024-08-30 14:30:00',
        senderName: 'Juan Pérez',
        receiverName: 'María García',
        amount: 1250000,
        locationName: 'Buñuelisimo - Estacion San Antonio',
        printTime: new Date().toISOString()
      }
    })
  });
  
  const result = await response.json();
  console.log('Print result:', result);
}

// Preview a shift closure receipt
async function previewShiftClosure() {
  const response = await fetch('http://127.0.0.1:8080/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'shift_closure',
      receipt: {
        shiftId: 'SHIFT-000045',
        shiftType: 'Turno Tarde',
        cashierName: 'Ana López',
        startingCash: 500000,
        endingCashCounted: 1348000,
        locationName: 'Buñuelisimo - Estacion San Antonio',
        printTime: new Date().toISOString()
      }
    })
  });
  
  const result = await response.json();
  console.log('Preview:', result.preview);
}
```

### cURL Examples

```bash
# Print a sales receipt
curl -X POST http://127.0.0.1:8080/print \
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

# Preview a cash transfer receipt
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

# Test a specific receipt type
curl -X POST http://127.0.0.1:8080/test-cash-expense
```

## Configuration

The service can be configured via `config.json`:

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

## Notes

- All receipt types support backward compatibility
- Unknown receipt types fall back to sales format with a warning
- The service automatically handles printer queue management
- All timestamps are in ISO 8601 format
- Currency amounts should be provided as numbers (not strings)
- The service uses ESC/POS commands for thermal printer formatting
