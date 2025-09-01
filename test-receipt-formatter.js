/**
 * Test script for enhanced receipt formatter
 * Run with: node test-receipt-formatter.js
 */

const ReceiptFormatter = require('./lib/receiptFormatter');
const config = require('./config.json');

// Create a simple logger for testing
const logger = {
  info: (msg, data) => console.log('INFO:', msg, data || ''),
  error: (msg, error) => console.error('ERROR:', msg, error),
  warn: (msg, data) => console.warn('WARN:', msg, data || '')
};

const formatter = new ReceiptFormatter(config.receipt, logger);

console.log('🧪 Testing Enhanced Receipt Formatter\n');

async function testReceiptFormatting() {
  try {
    // Test 1: Sales Receipt (existing functionality)
    console.log('1. Testing Sales Receipt:');
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

    const salesFormatted = await formatter.formatReceipt(salesReceipt, 'sales');
    console.log('✅ Sales receipt formatted successfully');
    console.log('   Length:', salesFormatted.length, 'characters');

    // Test 2: Cash Transfer Receipt
    console.log('\n2. Testing Cash Transfer Receipt:');
    const cashTransferReceipt = {
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

    const transferFormatted = await formatter.formatReceipt(cashTransferReceipt, 'cash_transfer');
    console.log('✅ Cash transfer receipt formatted successfully');
    console.log('   Length:', transferFormatted.length, 'characters');

    // Test 3: Shift Closure Receipt
    console.log('\n3. Testing Shift Closure Receipt:');
    const shiftClosureReceipt = {
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

    const closureFormatted = await formatter.formatReceipt(shiftClosureReceipt, 'shift_closure');
    console.log('✅ Shift closure receipt formatted successfully');
    console.log('   Length:', closureFormatted.length, 'characters');

    // Test 4: Shift Handoff Receipt
    console.log('\n4. Testing Shift Handoff Receipt:');
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

    const handoffFormatted = await formatter.formatReceipt(handoffReceipt, 'shift_handoff');
    console.log('✅ Shift handoff receipt formatted successfully');
    console.log('   Length:', handoffFormatted.length, 'characters');

    // Test 5: Cash Expense Receipt
    console.log('\n5. Testing Cash Expense Receipt:');
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

    const expenseFormatted = await formatter.formatReceipt(expenseReceipt, 'cash_expense');
    console.log('✅ Cash expense receipt formatted successfully');
    console.log('   Length:', expenseFormatted.length, 'characters');

    // Test 6: Preview functionality
    console.log('\n6. Testing Preview Functionality:');
    const preview = await formatter.previewReceipt(cashTransferReceipt, 'cash_transfer');
    console.log('✅ Preview generated successfully');
    console.log('   Raw length:', preview.raw.length);
    console.log('   Preview length:', preview.preview.length);
    console.log('   ESC/POS codes used:', preview.escPosCodes.length);

    // Test 7: Unknown receipt type (should fallback to sales)
    console.log('\n7. Testing Unknown Receipt Type (Fallback):');
    const unknownFormatted = await formatter.formatReceipt(salesReceipt, 'unknown_type');
    console.log('✅ Unknown type fallback successful');
    console.log('   Length:', unknownFormatted.length, 'characters');

    // Test 8: No type specified (should default to sales)
    console.log('\n8. Testing No Type Specified (Default to sales):');
    const defaultFormatted = await formatter.formatReceipt(salesReceipt);
    console.log('✅ Default type successful');
    console.log('   Length:', defaultFormatted.length, 'characters');

    console.log('\n🎉 All receipt formatting tests completed successfully!');
    
    // Show a sample preview
    console.log('\n📄 Sample Preview (Cash Transfer):');
    console.log('=' .repeat(50));
    console.log(preview.preview);
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
testReceiptFormatting();
