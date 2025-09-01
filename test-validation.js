/**
 * Simple test script for validation functions
 * Run with: node test-validation.js
 */

const { 
  validateReceipt, 
  validateSalesReceipt, 
  validateCashTransferReceipt,
  validateShiftClosureReceipt,
  validateShiftHandoffReceipt,
  validateCashExpenseReceipt
} = require('./lib/validation');

console.log('🧪 Testing Validation Functions\n');

// Test 1: Sales Receipt (Valid)
console.log('1. Testing Sales Receipt (Valid):');
const validSalesReceipt = {
  orderNumber: 'ORD-001',
  date: '2024-08-09T12:04:43.000Z',
  cashier: 'John Doe',
  items: [
    {
      name: 'Burger Deluxe',
      quantity: 2,
      price: 12.00,
      total: 24.00
    }
  ],
  subtotal: 24.00,
  tax: 2.04,
  total: 26.04,
  paymentMethod: 'cash'
};

const salesResult = validateReceipt(validSalesReceipt, 'sales');
console.log('✅ Sales receipt validation:', salesResult.valid ? 'PASSED' : 'FAILED');
if (!salesResult.valid) console.log('   Errors:', salesResult.errors);

// Test 2: Cash Transfer Receipt (Valid)
console.log('\n2. Testing Cash Transfer Receipt (Valid):');
const validCashTransfer = {
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

const transferResult = validateReceipt(validCashTransfer, 'cash_transfer');
console.log('✅ Cash transfer validation:', transferResult.valid ? 'PASSED' : 'FAILED');
if (!transferResult.valid) console.log('   Errors:', transferResult.errors);

// Test 3: Shift Closure Receipt (Valid)
console.log('\n3. Testing Shift Closure Receipt (Valid):');
const validShiftClosure = {
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

const closureResult = validateReceipt(validShiftClosure, 'shift_closure');
console.log('✅ Shift closure validation:', closureResult.valid ? 'PASSED' : 'FAILED');
if (!closureResult.valid) console.log('   Errors:', closureResult.errors);

// Test 4: Shift Handoff Receipt (Valid)
console.log('\n4. Testing Shift Handoff Receipt (Valid):');
const validHandoff = {
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

const handoffResult = validateReceipt(validHandoff, 'shift_handoff');
console.log('✅ Shift handoff validation:', handoffResult.valid ? 'PASSED' : 'FAILED');
if (!handoffResult.valid) console.log('   Errors:', handoffResult.errors);

// Test 5: Cash Expense Receipt (Valid)
console.log('\n5. Testing Cash Expense Receipt (Valid):');
const validExpense = {
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

const expenseResult = validateReceipt(validExpense, 'cash_expense');
console.log('✅ Cash expense validation:', expenseResult.valid ? 'PASSED' : 'FAILED');
if (!expenseResult.valid) console.log('   Errors:', expenseResult.errors);

// Test 6: Invalid Receipt (Missing required fields)
console.log('\n6. Testing Invalid Receipt (Missing fields):');
const invalidReceipt = {
  transferId: 'TRANS-000123',
  // Missing required fields
};

const invalidResult = validateReceipt(invalidReceipt, 'cash_transfer');
console.log('✅ Invalid receipt validation:', !invalidResult.valid ? 'PASSED' : 'FAILED');
if (!invalidResult.valid) console.log('   Expected errors:', invalidResult.errors);

// Test 7: Unknown Receipt Type (Should fallback to sales)
console.log('\n7. Testing Unknown Receipt Type (Fallback):');
const unknownTypeResult = validateReceipt(validSalesReceipt, 'unknown_type');
console.log('✅ Unknown type fallback:', unknownTypeResult.valid ? 'PASSED' : 'FAILED');

// Test 8: No Type Specified (Should default to sales)
console.log('\n8. Testing No Type Specified (Default to sales):');
const noTypeResult = validateReceipt(validSalesReceipt);
console.log('✅ No type default:', noTypeResult.valid ? 'PASSED' : 'FAILED');

console.log('\n🎉 All validation tests completed!');
