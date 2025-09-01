/**
 * Development Server Test Script
 * 
 * This script tests the development server functionality
 * and shows visual representations of all receipt types.
 */

const http = require('http');

class DevServerTester {
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

  async testServiceInfo() {
    console.log('🔍 Testing service info...');
    const result = await this.makeRequest('/');
    if (result.status === 200) {
      console.log('✅ Service info retrieved');
      console.log(`   Service: ${result.data.service}`);
      console.log(`   Mode: ${result.data.mode}`);
      console.log(`   Status: ${result.data.status}`);
    } else {
      console.log('❌ Failed to get service info');
    }
  }

  async testServiceStatus() {
    console.log('🔍 Testing service status...');
    const result = await this.makeRequest('/status');
    if (result.status === 200) {
      console.log('✅ Service status retrieved');
      console.log(`   Service: ${result.data.service}`);
      console.log(`   Mode: ${result.data.mode}`);
      console.log(`   Printers: ${result.data.printers.length}`);
      console.log(`   Queue: ${result.data.queueLength}/${result.data.maxQueueSize}`);
    } else {
      console.log('❌ Failed to get service status');
    }
  }

  async testPrinters() {
    console.log('🔍 Testing printers endpoint...');
    const result = await this.makeRequest('/printers');
    if (result.status === 200) {
      console.log('✅ Printers info retrieved');
      result.data.printers.forEach(printer => {
        console.log(`   Printer: ${printer.name} (${printer.model})`);
        console.log(`   Status: ${printer.status}`);
        console.log(`   Location: ${printer.location}`);
      });
    } else {
      console.log('❌ Failed to get printers info');
    }
  }

  async testSalesPrint() {
    console.log('🛒 Testing sales receipt print...');
    const result = await this.makeRequest('/test-print', 'POST');
    if (result.status === 200) {
      console.log('✅ Sales receipt print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Sales receipt print test failed:', result.data.error);
    }
  }

  async testCashTransferPrint() {
    console.log('💰 Testing cash transfer print...');
    const result = await this.makeRequest('/test-transfer', 'POST');
    if (result.status === 200) {
      console.log('✅ Cash transfer print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Cash transfer print test failed:', result.data.error);
    }
  }

  async testShiftClosurePrint() {
    console.log('🔚 Testing shift closure print...');
    const result = await this.makeRequest('/test-shift-closure', 'POST');
    if (result.status === 200) {
      console.log('✅ Shift closure print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Shift closure print test failed:', result.data.error);
    }
  }

  async testShiftHandoffPrint() {
    console.log('🤝 Testing shift handoff print...');
    const result = await this.makeRequest('/test-shift-handoff', 'POST');
    if (result.status === 200) {
      console.log('✅ Shift handoff print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Shift handoff print test failed:', result.data.error);
    }
  }

  async testCashExpensePrint() {
    console.log('💸 Testing cash expense print...');
    const result = await this.makeRequest('/test-cash-expense', 'POST');
    if (result.status === 200) {
      console.log('✅ Cash expense print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Cash expense print test failed:', result.data.error);
    }
  }

  async testCustomPrint() {
    console.log('📝 Testing custom receipt print...');
    
    const customReceipt = {
      transferId: 'CUSTOM-001',
      date: new Date().toISOString(),
      senderName: 'Test Sender',
      receiverName: 'Test Receiver',
      amount: 50000,
      locationName: 'Test Location',
      printTime: new Date().toISOString()
    };

    const result = await this.makeRequest('/print', 'POST', {
      type: 'cash_transfer',
      receipt: customReceipt
    });

    if (result.status === 200) {
      console.log('✅ Custom receipt print test successful');
      console.log(`   Printer: ${result.data.printerId}`);
      console.log(`   Job ID: ${result.data.jobId}`);
      console.log(`   Message: ${result.data.message}`);
    } else {
      console.log('❌ Custom receipt print test failed:', result.data.error);
    }
  }

  async testPreview() {
    console.log('👀 Testing receipt preview...');
    
    const testReceipt = {
      orderNumber: 'PREVIEW-001',
      date: new Date().toISOString(),
      cashier: 'Preview User',
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 1000,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 80,
      total: 1080,
      paymentMethod: 'cash'
    };

    const result = await this.makeRequest('/preview', 'POST', {
      type: 'sales',
      receipt: testReceipt
    });

    if (result.status === 200) {
      console.log('✅ Receipt preview test successful');
      console.log(`   Type: ${result.data.type}`);
      console.log(`   Preview length: ${result.data.preview.length} characters`);
      console.log(`   Raw length: ${result.data.rawLength}`);
    } else {
      console.log('❌ Receipt preview test failed:', result.data.error);
    }
  }

  async runAllTests() {
    console.log('🧪 Running Development Server Tests');
    console.log('='.repeat(50));
    
    try {
      // Test basic endpoints
      await this.testServiceInfo();
      console.log('');
      
      await this.testServiceStatus();
      console.log('');
      
      await this.testPrinters();
      console.log('');
      
      // Test preview functionality
      await this.testPreview();
      console.log('');
      
      // Test all receipt types
      console.log('🖨️  Testing all receipt types (check console for visual output):');
      console.log('');
      
      await this.testSalesPrint();
      console.log('');
      
      await this.testCashTransferPrint();
      console.log('');
      
      await this.testShiftClosurePrint();
      console.log('');
      
      await this.testShiftHandoffPrint();
      console.log('');
      
      await this.testCashExpensePrint();
      console.log('');
      
      // Test custom print
      await this.testCustomPrint();
      console.log('');
      
      console.log('🎉 All tests completed!');
      console.log('');
      console.log('💡 Check the console output above to see the visual representations');
      console.log('   of all the receipts that would be printed.');
      console.log('');
      console.log('📝 Logs are saved to ./logs/combined-dev.log');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('Make sure the development server is running on http://127.0.0.1:8080');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DevServerTester();
  tester.runAllTests();
}

module.exports = DevServerTester;
