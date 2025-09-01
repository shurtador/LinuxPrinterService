# Web Application Integration Guide

## Overview

This guide shows how to integrate the POS Printer Service with web applications, including handling CORS and making API calls from JavaScript.

## CORS Support

The development and production servers both include CORS (Cross-Origin Resource Sharing) support to allow web applications to make requests from different domains.

### Development Server CORS Configuration

```javascript
// CORS configuration for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

### Production Server CORS Configuration

```javascript
// Enhanced CORS setup with detailed logging
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins for now (you can restrict this later)
    callback(null, true);
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));
```

## JavaScript Integration Examples

### Basic Fetch API Usage

```javascript
// Print a sales receipt
async function printSalesReceipt(receiptData) {
  try {
    const response = await fetch('http://127.0.0.1:8080/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'sales',
        receipt: receiptData
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Receipt printed successfully:', result);
      return result;
    } else {
      console.error('Print failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

// Print a cash transfer
async function printCashTransfer(transferData) {
  try {
    const response = await fetch('http://127.0.0.1:8080/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'cash_transfer',
        receipt: transferData
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Transfer printed successfully:', result);
      return result;
    } else {
      console.error('Print failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

### React Component Example

```jsx
import React, { useState } from 'react';

const PrinterService = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const printSalesReceipt = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const receiptData = {
        orderNumber: 'ORD-001',
        date: new Date().toISOString(),
        cashier: 'John Doe',
        items: [
          {
            name: 'Buñuelo tradicional',
            quantity: 2,
            price: 1500,
            total: 3000
          }
        ],
        subtotal: 3000,
        tax: 240,
        total: 3240,
        paymentMethod: 'cash'
      };

      const response = await fetch('http://127.0.0.1:8080/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sales',
          receipt: receiptData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResult(result);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const printCashTransfer = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const transferData = {
        transferId: 'TRANS-001',
        date: new Date().toISOString(),
        senderName: 'Juan Pérez',
        receiverName: 'María García',
        amount: 1250000,
        locationName: 'Buñuelisimo - Estacion San Antonio',
        printTime: new Date().toISOString()
      };

      const response = await fetch('http://127.0.0.1:8080/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'cash_transfer',
          receipt: transferData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResult(result);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>POS Printer Service</h2>
      
      <div>
        <button 
          onClick={printSalesReceipt} 
          disabled={loading}
        >
          {loading ? 'Printing...' : 'Print Sales Receipt'}
        </button>
        
        <button 
          onClick={printCashTransfer} 
          disabled={loading}
        >
          {loading ? 'Printing...' : 'Print Cash Transfer'}
        </button>
      </div>
      
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          Error: {error}
        </div>
      )}
      
      {result && (
        <div style={{ color: 'green', marginTop: '10px' }}>
          Success: {result.message}
          <br />
          Job ID: {result.jobId}
        </div>
      )}
    </div>
  );
};

export default PrinterService;
```

### TypeScript Example

```typescript
interface ReceiptData {
  orderNumber: string;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

interface TransferData {
  transferId: string;
  date: string;
  senderName: string;
  receiverName: string;
  amount: number;
  locationName: string;
  printTime: string;
}

interface PrintResponse {
  success: boolean;
  message: string;
  printerId: string;
  jobId: string;
  timestamp: string;
}

class PrinterService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
  }

  async printSalesReceipt(receiptData: ReceiptData): Promise<PrintResponse> {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'sales',
        receipt: receiptData
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result;
  }

  async printCashTransfer(transferData: TransferData): Promise<PrintResponse> {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'cash_transfer',
        receipt: transferData
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result;
  }

  async previewReceipt(receiptData: ReceiptData, type: string = 'sales'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        receipt: receiptData
      })
    });
    
    return await response.json();
  }
}

// Usage
const printer = new PrinterService();

// Print a sales receipt
const receiptData: ReceiptData = {
  orderNumber: 'ORD-001',
  date: new Date().toISOString(),
  cashier: 'John Doe',
  items: [
    {
      name: 'Buñuelo tradicional',
      quantity: 2,
      price: 1500,
      total: 3000
    }
  ],
  subtotal: 3000,
  tax: 240,
  total: 3240,
  paymentMethod: 'cash'
};

try {
  const result = await printer.printSalesReceipt(receiptData);
  console.log('Print successful:', result);
} catch (error) {
  console.error('Print failed:', error);
}
```

## Error Handling

### Common CORS Errors

1. **"No 'Access-Control-Allow-Origin' header"**
   - Solution: Ensure the server is running with CORS support
   - Check that the `cors` middleware is properly configured

2. **"Request method 'POST' not allowed"**
   - Solution: Ensure the server allows POST methods in CORS configuration

3. **"Request header 'Content-Type' not allowed"**
   - Solution: Ensure 'Content-Type' is in the allowed headers list

### Network Errors

1. **Connection refused**
   - Solution: Ensure the server is running on the correct port
   - Check firewall settings

2. **Timeout errors**
   - Solution: Increase timeout settings in your fetch requests
   - Check server response times

## Testing CORS

You can test CORS support using curl:

```bash
# Test preflight request
curl -H "Origin: https://your-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS http://127.0.0.1:8080/print -v

# Test actual request
curl -H "Origin: https://your-domain.com" \
     -H "Content-Type: application/json" \
     -X POST http://127.0.0.1:8080/test-print -v
```

## Security Considerations

### Development vs Production

- **Development**: CORS allows all origins for easy testing
- **Production**: Restrict CORS origins to your specific domains

### Example Production CORS Configuration

```javascript
app.use(cors({
  origin: [
    'https://your-app.com',
    'https://www.your-app.com',
    'https://admin.your-app.com'
  ],
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## Troubleshooting

### Debug CORS Issues

1. **Check browser console** for detailed error messages
2. **Verify server is running** and accessible
3. **Test with curl** to isolate CORS vs network issues
4. **Check server logs** for CORS-related messages

### Common Solutions

1. **Restart the server** after CORS configuration changes
2. **Clear browser cache** and try again
3. **Use HTTPS** if your web app is on HTTPS
4. **Check for proxy/firewall** blocking requests

## Next Steps

1. **Test the integration** with your web application
2. **Implement error handling** for production use
3. **Add loading states** and user feedback
4. **Consider implementing retry logic** for failed requests
5. **Add logging** for debugging production issues
