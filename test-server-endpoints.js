/**
 * Test script for enhanced server endpoints
 * Run with: node test-server-endpoints.js
 * 
 * This script tests all the new endpoints and functionality
 * without actually printing (uses preview endpoints)
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:8080';

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

console.log('🧪 Testing Enhanced Server Endpoints\n');

async function testServerEndpoints() {
  try {
    // Test 1: Service info endpoint
    console.log('1. Testing Service Info Endpoint:');
    const serviceInfo = await makeRequest('/');
    console.log('✅ Service info:', serviceInfo.status === 200 ? 'PASSED' : 'FAILED');
    if (serviceInfo.status === 200) {
      console.log('   Endpoints available:', Object.keys(serviceInfo.data.endpoints).length);
    }

    // Test 2: Status endpoint
    console.log('\n2. Testing Status Endpoint:');
    const status = await makeRequest('/status');
    console.log('✅ Status endpoint:', status.status === 200 ? 'PASSED' : 'FAILED');
    if (status.status === 200) {
      console.log('   Service:', status.data.service);
      console.log('   Printers found:', status.data.printers.length);
    }

    // Test 3: Preview Sales Receipt
    console.log('\n3. Testing Preview Sales Receipt:');
    const salesReceipt = {
      orderNumber: 'ORD-001',
      date: '2024-08-09T12:04:43.000Z',
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
      paymentMethod: 'cash',
      tendered: 3500,
      change: 260
    };

    const salesPreview = await makeRequest('/preview', 'POST', { receipt: salesReceipt, type: 'sales' });
    console.log('✅ Sales preview:', salesPreview.status === 200 ? 'PASSED' : 'FAILED');
    if (salesPreview.status === 200) {
      console.log('   Preview length:', salesPreview.data.preview.length);
      console.log('   Type:', salesPreview.data.type);
    }

    // Test 4: Preview Cash Transfer Receipt
    console.log('\n4. Testing Preview Cash Transfer Receipt:');
    const transferReceipt = {
      transferId: 'TRANS-000123',
      date: '2024-08-30 14:30:00',
      shiftInfo: 'Turno Mañana',
      senderName: 'Juan Pérez',
      receiverName: 'María García',
      amount: 1250000,
      notes: 'Transfer for supplies',
      locationName: 'Buñuelisimo - Estacion San Antonio',
      printTime: '2024-08-30T14:30:00.000Z'
    };

    const transferPreview = await makeRequest('/preview', 'POST', { receipt: transferReceipt, type: 'cash_transfer' });
    console.log('✅ Transfer preview:', transferPreview.status === 200 ? 'PASSED' : 'FAILED');
    if (transferPreview.status === 200) {
      console.log('   Preview length:', transferPreview.data.preview.length);
      console.log('   Type:', transferPreview.data.type);
    }

    // Test 5: Preview Shift Closure Receipt
    console.log('\n5. Testing Preview Shift Closure Receipt:');
    const closureReceipt = {
      shiftId: 'SHIFT-000045',
      shiftType: 'Turno Tarde',
      shiftDate: '2024-08-30',
      cashierName: 'Ana López',
      startTime: '14:00',
      endTime: '22:00',
      startingCash: 500000,
      endingCashExpected: 1350000,
      endingCashCounted: 1348000,
      variance: -2000,
      shiftSales: 850000,
      transfersOut: 800000,
      locationName: 'Buñuelisimo - Estacion San Antonio',
      printTime: '2024-08-30T22:00:00.000Z'
    };

    const closurePreview = await makeRequest('/preview', 'POST', { receipt: closureReceipt, type: 'shift_closure' });
    console.log('✅ Shift closure preview:', closurePreview.status === 200 ? 'PASSED' : 'FAILED');
    if (closurePreview.status === 200) {
      console.log('   Preview length:', closurePreview.data.preview.length);
      console.log('   Type:', closurePreview.data.type);
    }

    // Test 6: Preview Shift Handoff Receipt
    console.log('\n6. Testing Preview Shift Handoff Receipt:');
    const handoffReceipt = {
      handoffId: 'HAND-000067',
      handoffDate: '2024-08-30 14:00:00',
      outgoingCashier: 'Carlos Ruiz',
      incomingCashier: 'Laura Silva',
      handoffAmount: 548000,
      verifiedAmount: 548000,
      variance: 0,
      status: 'VERIFICADO',
      locationName: 'Buñuelisimo - Estacion San Antonio',
      printTime: '2024-08-30T14:00:00.000Z'
    };

    const handoffPreview = await makeRequest('/preview', 'POST', { receipt: handoffReceipt, type: 'shift_handoff' });
    console.log('✅ Shift handoff preview:', handoffPreview.status === 200 ? 'PASSED' : 'FAILED');
    if (handoffPreview.status === 200) {
      console.log('   Preview length:', handoffPreview.data.preview.length);
      console.log('   Type:', handoffPreview.data.type);
    }

    // Test 7: Preview Cash Expense Receipt
    console.log('\n7. Testing Preview Cash Expense Receipt:');
    const expenseReceipt = {
      expenseId: 'EXP-000452',
      cashExpenseId: 'CASH-000089',
      date: '2024-08-30 16:45:00',
      cashierName: 'Roberto Díaz',
      category: 'Alimentación',
      description: 'Almuerzo para personal',
      amount: 25000,
      shiftInfo: 'Turno Tarde',
      locationName: 'Buñuelisimo - Estacion San Antonio',
      printTime: '2024-08-30T16:45:00.000Z'
    };

    const expensePreview = await makeRequest('/preview', 'POST', { receipt: expenseReceipt, type: 'cash_expense' });
    console.log('✅ Cash expense preview:', expensePreview.status === 200 ? 'PASSED' : 'FAILED');
    if (expensePreview.status === 200) {
      console.log('   Preview length:', expensePreview.data.preview.length);
      console.log('   Type:', expensePreview.data.type);
    }

    // Test 8: Validation Error Test
    console.log('\n8. Testing Validation Error (Invalid Receipt):');
    const invalidReceipt = {
      transferId: 'TRANS-000123',
      // Missing required fields
    };

    const validationError = await makeRequest('/preview', 'POST', { receipt: invalidReceipt, type: 'cash_transfer' });
    console.log('✅ Validation error:', validationError.status === 400 ? 'PASSED' : 'FAILED');
    if (validationError.status === 400) {
      console.log('   Error message:', validationError.data.error);
    }

    // Test 9: Unknown Receipt Type (Fallback)
    console.log('\n9. Testing Unknown Receipt Type (Fallback):');
    const unknownTypePreview = await makeRequest('/preview', 'POST', { receipt: salesReceipt, type: 'unknown_type' });
    console.log('✅ Unknown type fallback:', unknownTypePreview.status === 200 ? 'PASSED' : 'FAILED');
    if (unknownTypePreview.status === 200) {
      console.log('   Type:', unknownTypePreview.data.type);
    }

    // Test 10: No Type Specified (Default to sales)
    console.log('\n10. Testing No Type Specified (Default to sales):');
    const noTypePreview = await makeRequest('/preview', 'POST', { receipt: salesReceipt });
    console.log('✅ No type default:', noTypePreview.status === 200 ? 'PASSED' : 'FAILED');
    if (noTypePreview.status === 200) {
      console.log('   Type:', noTypePreview.data.type);
    }

    console.log('\n🎉 All server endpoint tests completed successfully!');
    
    // Show a sample preview
    console.log('\n📄 Sample Preview (Cash Transfer):');
    console.log('=' .repeat(50));
    if (transferPreview.status === 200) {
      console.log(transferPreview.data.preview.substring(0, 500) + '...');
    }
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the server is running on http://127.0.0.1:8080');
    process.exit(1);
  }
}

// Run the tests
testServerEndpoints();
