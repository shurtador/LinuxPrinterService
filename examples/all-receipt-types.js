/**
 * Comprehensive Examples for All Receipt Types
 * 
 * This file demonstrates how to use the enhanced POS Printer Service
 * with all supported receipt types.
 */

const http = require('http');

class POSPrinterService {
  constructor(baseUrl = 'http://127.0.0.1:8080') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(path, method = 'GET', data = null) {
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

  // Print methods for each receipt type
  async printSalesReceipt(receiptData) {
    return this.makeRequest('/print', 'POST', {
      type: 'sales',
      receipt: receiptData
    });
  }

  async printCashTransfer(transferData) {
    return this.makeRequest('/print', 'POST', {
      type: 'cash_transfer',
      receipt: transferData
    });
  }

  async printShiftClosure(closureData) {
    return this.makeRequest('/print', 'POST', {
      type: 'shift_closure',
      receipt: closureData
    });
  }

  async printShiftHandoff(handoffData) {
    return this.makeRequest('/print', 'POST', {
      type: 'shift_handoff',
      receipt: handoffData
    });
  }

  async printCashExpense(expenseData) {
    return this.makeRequest('/print', 'POST', {
      type: 'cash_expense',
      receipt: expenseData
    });
  }

  // Preview methods for each receipt type
  async previewSalesReceipt(receiptData) {
    return this.makeRequest('/preview', 'POST', {
      type: 'sales',
      receipt: receiptData
    });
  }

  async previewCashTransfer(transferData) {
    return this.makeRequest('/preview', 'POST', {
      type: 'cash_transfer',
      receipt: transferData
    });
  }

  async previewShiftClosure(closureData) {
    return this.makeRequest('/preview', 'POST', {
      type: 'shift_closure',
      receipt: closureData
    });
  }

  async previewShiftHandoff(handoffData) {
    return this.makeRequest('/preview', 'POST', {
      type: 'shift_handoff',
      receipt: handoffData
    });
  }

  async previewCashExpense(expenseData) {
    return this.makeRequest('/preview', 'POST', {
      type: 'cash_expense',
      receipt: expenseData
    });
  }

  // Test methods
  async testSalesPrint() {
    return this.makeRequest('/test-print', 'POST', {});
  }

  async testCashTransferPrint() {
    return this.makeRequest('/test-transfer', 'POST', {});
  }

  async testShiftClosurePrint() {
    return this.makeRequest('/test-shift-closure', 'POST', {});
  }

  async testShiftHandoffPrint() {
    return this.makeRequest('/test-shift-handoff', 'POST', {});
  }

  async testCashExpensePrint() {
    return this.makeRequest('/test-cash-expense', 'POST', {});
  }

  // Utility methods
  async getServiceStatus() {
    return this.makeRequest('/status');
  }

  async getPrinters() {
    return this.makeRequest('/printers');
  }
}

// Example data for each receipt type
const exampleData = {
  // Sales Receipt Example
  salesReceipt: {
    orderNumber: 'ORD-001',
    date: new Date().toISOString(),
    cashier: 'John Doe',
    items: [
      {
        name: 'Buñuelo tradicional',
        quantity: 2,
        price: 1500,
        total: 3000
      },
      {
        name: 'Café con leche',
        quantity: 1,
        price: 800,
        total: 800
      },
      {
        name: 'Empanada de carne',
        quantity: 3,
        price: 1200,
        total: 3600
      }
    ],
    subtotal: 7400,
    tax: 592,
    total: 7992,
    paymentMethod: 'cash',
    tendered: 8000,
    change: 8
  },

  // Cash Transfer Example
  cashTransfer: {
    transferId: 'TRANS-000123',
    date: '2024-08-30 14:30:00',
    shiftInfo: 'Turno Mañana',
    senderName: 'Juan Pérez',
    receiverName: 'María García',
    amount: 1250000,
    notes: 'Transfer for supplies and maintenance',
    locationName: 'Buñuelisimo - Estacion San Antonio',
    printTime: new Date().toISOString()
  },

  // Shift Closure Example
  shiftClosure: {
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
    printTime: new Date().toISOString()
  },

  // Shift Handoff Example
  shiftHandoff: {
    handoffId: 'HAND-000067',
    handoffDate: '2024-08-30 14:00:00',
    outgoingCashier: 'Carlos Ruiz',
    incomingCashier: 'Laura Silva',
    handoffAmount: 548000,
    verifiedAmount: 548000,
    variance: 0,
    status: 'VERIFICADO',
    locationName: 'Buñuelisimo - Estacion San Antonio',
    printTime: new Date().toISOString()
  },

  // Cash Expense Example
  cashExpense: {
    expenseId: 'EXP-000452',
    cashExpenseId: 'CASH-000089',
    date: '2024-08-30 16:45:00',
    cashierName: 'Roberto Díaz',
    category: 'Alimentación',
    description: 'Almuerzo para personal de cocina',
    amount: 25000,
    shiftInfo: 'Turno Tarde',
    locationName: 'Buñuelisimo - Estacion San Antonio',
    printTime: new Date().toISOString()
  }
};

// Main example function
async function runExamples() {
  const printer = new POSPrinterService();
  
  console.log('🚀 POS Printer Service Examples\n');

  try {
    // Check service status
    console.log('1. Checking service status...');
    const status = await printer.getServiceStatus();
    if (status.status === 200) {
      console.log('✅ Service is running');
      console.log(`   Printers available: ${status.data.printers.length}`);
    } else {
      console.log('❌ Service is not responding');
      return;
    }

    // Example 1: Print Sales Receipt
    console.log('\n2. Printing Sales Receipt...');
    const salesResult = await printer.printSalesReceipt(exampleData.salesReceipt);
    if (salesResult.status === 200) {
      console.log('✅ Sales receipt printed successfully');
      console.log(`   Printer: ${salesResult.data.printerId}`);
    } else {
      console.log('❌ Failed to print sales receipt:', salesResult.data.error);
    }

    // Example 2: Preview Cash Transfer
    console.log('\n3. Previewing Cash Transfer Receipt...');
    const transferPreview = await printer.previewCashTransfer(exampleData.cashTransfer);
    if (transferPreview.status === 200) {
      console.log('✅ Cash transfer preview generated');
      console.log(`   Preview length: ${transferPreview.data.preview.length} characters`);
      console.log(`   Type: ${transferPreview.data.type}`);
    } else {
      console.log('❌ Failed to preview cash transfer:', transferPreview.data.error);
    }

    // Example 3: Print Shift Closure
    console.log('\n4. Printing Shift Closure Receipt...');
    const closureResult = await printer.printShiftClosure(exampleData.shiftClosure);
    if (closureResult.status === 200) {
      console.log('✅ Shift closure receipt printed successfully');
      console.log(`   Printer: ${closureResult.data.printerId}`);
    } else {
      console.log('❌ Failed to print shift closure:', closureResult.data.error);
    }

    // Example 4: Preview Shift Handoff
    console.log('\n5. Previewing Shift Handoff Receipt...');
    const handoffPreview = await printer.previewShiftHandoff(exampleData.shiftHandoff);
    if (handoffPreview.status === 200) {
      console.log('✅ Shift handoff preview generated');
      console.log(`   Preview length: ${handoffPreview.data.preview.length} characters`);
      console.log(`   Type: ${handoffPreview.data.type}`);
    } else {
      console.log('❌ Failed to preview shift handoff:', handoffPreview.data.error);
    }

    // Example 5: Print Cash Expense
    console.log('\n6. Printing Cash Expense Receipt...');
    const expenseResult = await printer.printCashExpense(exampleData.cashExpense);
    if (expenseResult.status === 200) {
      console.log('✅ Cash expense receipt printed successfully');
      console.log(`   Printer: ${expenseResult.data.printerId}`);
    } else {
      console.log('❌ Failed to print cash expense:', expenseResult.data.error);
    }

    // Example 6: Test all receipt types
    console.log('\n7. Testing all receipt types...');
    
    const testResults = await Promise.allSettled([
      printer.testSalesPrint(),
      printer.testCashTransferPrint(),
      printer.testShiftClosurePrint(),
      printer.testShiftHandoffPrint(),
      printer.testCashExpensePrint()
    ]);

    const testTypes = ['Sales', 'Cash Transfer', 'Shift Closure', 'Shift Handoff', 'Cash Expense'];
    testResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status === 200) {
        console.log(`✅ ${testTypes[index]} test successful`);
      } else {
        console.log(`❌ ${testTypes[index]} test failed`);
      }
    });

    console.log('\n🎉 All examples completed!');

    // Show a sample preview
    console.log('\n📄 Sample Preview (Cash Transfer):');
    console.log('=' .repeat(50));
    if (transferPreview.status === 200) {
      const preview = transferPreview.data.preview;
      console.log(preview.substring(0, Math.min(500, preview.length)));
      if (preview.length > 500) {
        console.log('...');
      }
    }
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Make sure the server is running on http://127.0.0.1:8080');
  }
}

// Individual example functions for specific use cases
async function printSalesExample() {
  const printer = new POSPrinterService();
  console.log('🛒 Printing Sales Receipt Example...');
  
  const result = await printer.printSalesReceipt(exampleData.salesReceipt);
  if (result.status === 200) {
    console.log('✅ Sales receipt printed successfully');
  } else {
    console.log('❌ Failed:', result.data.error);
  }
}

async function printTransferExample() {
  const printer = new POSPrinterService();
  console.log('💰 Printing Cash Transfer Example...');
  
  const result = await printer.printCashTransfer(exampleData.cashTransfer);
  if (result.status === 200) {
    console.log('✅ Cash transfer printed successfully');
  } else {
    console.log('❌ Failed:', result.data.error);
  }
}

async function printClosureExample() {
  const printer = new POSPrinterService();
  console.log('🔚 Printing Shift Closure Example...');
  
  const result = await printer.printShiftClosure(exampleData.shiftClosure);
  if (result.status === 200) {
    console.log('✅ Shift closure printed successfully');
  } else {
    console.log('❌ Failed:', result.data.error);
  }
}

async function printHandoffExample() {
  const printer = new POSPrinterService();
  console.log('🤝 Printing Shift Handoff Example...');
  
  const result = await printer.printShiftHandoff(exampleData.shiftHandoff);
  if (result.status === 200) {
    console.log('✅ Shift handoff printed successfully');
  } else {
    console.log('❌ Failed:', result.data.error);
  }
}

async function printExpenseExample() {
  const printer = new POSPrinterService();
  console.log('💸 Printing Cash Expense Example...');
  
  const result = await printer.printCashExpense(exampleData.cashExpense);
  if (result.status === 200) {
    console.log('✅ Cash expense printed successfully');
  } else {
    console.log('❌ Failed:', result.data.error);
  }
}

// Export for use in other files
module.exports = {
  POSPrinterService,
  exampleData,
  runExamples,
  printSalesExample,
  printTransferExample,
  printClosureExample,
  printHandoffExample,
  printExpenseExample
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}
