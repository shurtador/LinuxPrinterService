/**
 * Validation functions for different receipt types
 * Each function validates the specific fields required for its receipt type
 */

/**
 * Validates sales receipt data (existing format for backward compatibility)
 * @param {Object} receipt - The receipt data to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateSalesReceipt(receipt) {
  const errors = [];
  
  if (!receipt) {
    errors.push('Receipt data is required');
    return { valid: false, errors };
  }

  if (!receipt.orderNumber) errors.push('Order number is required');
  if (!receipt.date) errors.push('Date is required');
  if (!receipt.items || !Array.isArray(receipt.items) || receipt.items.length === 0) {
    errors.push('Items array is required and must not be empty');
  }
  if (typeof receipt.subtotal !== 'number') errors.push('Subtotal must be a number');
  if (typeof receipt.tax !== 'number') errors.push('Tax must be a number');
  if (typeof receipt.total !== 'number') errors.push('Total must be a number');
  if (!receipt.paymentMethod) errors.push('Payment method is required');

  // Validate items
  if (receipt.items) {
    receipt.items.forEach((item, index) => {
      if (!item.name) errors.push(`Item ${index + 1}: name is required`);
      if (typeof item.quantity !== 'number') errors.push(`Item ${index + 1}: quantity must be a number`);
      if (typeof item.price !== 'number') errors.push(`Item ${index + 1}: price must be a number`);
      if (typeof item.total !== 'number') errors.push(`Item ${index + 1}: total must be a number`);
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates cash transfer receipt data
 * @param {Object} receipt - The receipt data to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateCashTransferReceipt(receipt) {
  const errors = [];
  
  if (!receipt) {
    errors.push('Receipt data is required');
    return { valid: false, errors };
  }

  if (!receipt.transferId) errors.push('Transfer ID is required');
  if (!receipt.date) errors.push('Date is required');
  if (!receipt.senderName) errors.push('Sender name is required');
  if (!receipt.receiverName) errors.push('Receiver name is required');
  if (typeof receipt.amount !== 'number' || receipt.amount <= 0) {
    errors.push('Amount must be a positive number');
  }
  if (!receipt.locationName) errors.push('Location name is required');
  if (!receipt.printTime) errors.push('Print time is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Validates shift closure receipt data
 * @param {Object} receipt - The receipt data to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateShiftClosureReceipt(receipt) {
  const errors = [];
  
  if (!receipt) {
    errors.push('Receipt data is required');
    return { valid: false, errors };
  }

  if (!receipt.shiftId) errors.push('Shift ID is required');
  if (!receipt.shiftType) errors.push('Shift type is required');
  if (!receipt.shiftDate) errors.push('Shift date is required');
  if (!receipt.cashierName) errors.push('Cashier name is required');
  if (!receipt.startTime) errors.push('Start time is required');
  if (!receipt.endTime) errors.push('End time is required');
  if (typeof receipt.startingCash !== 'number') errors.push('Starting cash must be a number');
  if (typeof receipt.endingCashExpected !== 'number') errors.push('Ending cash expected must be a number');
  if (typeof receipt.endingCashCounted !== 'number') errors.push('Ending cash counted must be a number');
  if (typeof receipt.variance !== 'number') errors.push('Variance must be a number');
  if (typeof receipt.shiftSales !== 'number') errors.push('Shift sales must be a number');
  if (typeof receipt.transfersOut !== 'number') errors.push('Transfers out must be a number');
  if (!receipt.locationName) errors.push('Location name is required');
  if (!receipt.printTime) errors.push('Print time is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Validates shift handoff receipt data
 * @param {Object} receipt - The receipt data to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateShiftHandoffReceipt(receipt) {
  const errors = [];
  
  if (!receipt) {
    errors.push('Receipt data is required');
    return { valid: false, errors };
  }

  if (!receipt.handoffId) errors.push('Handoff ID is required');
  if (!receipt.handoffDate) errors.push('Handoff date is required');
  if (!receipt.outgoingCashier) errors.push('Outgoing cashier is required');
  if (!receipt.incomingCashier) errors.push('Incoming cashier is required');
  if (typeof receipt.handoffAmount !== 'number' || receipt.handoffAmount < 0) {
    errors.push('Handoff amount must be a non-negative number');
  }
  if (typeof receipt.verifiedAmount !== 'number' || receipt.verifiedAmount < 0) {
    errors.push('Verified amount must be a non-negative number');
  }
  if (typeof receipt.variance !== 'number') errors.push('Variance must be a number');
  if (!receipt.status) errors.push('Status is required');
  if (!receipt.locationName) errors.push('Location name is required');
  if (!receipt.printTime) errors.push('Print time is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Validates cash expense receipt data
 * @param {Object} receipt - The receipt data to validate
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateCashExpenseReceipt(receipt) {
  const errors = [];
  
  if (!receipt) {
    errors.push('Receipt data is required');
    return { valid: false, errors };
  }

  if (!receipt.expenseId) errors.push('Expense ID is required');
  if (!receipt.cashExpenseId) errors.push('Cash expense ID is required');
  if (!receipt.date) errors.push('Date is required');
  if (!receipt.cashierName) errors.push('Cashier name is required');
  if (!receipt.category) errors.push('Category is required');
  if (!receipt.description) errors.push('Description is required');
  if (typeof receipt.amount !== 'number' || receipt.amount <= 0) {
    errors.push('Amount must be a positive number');
  }
  if (!receipt.shiftInfo) errors.push('Shift info is required');
  if (!receipt.locationName) errors.push('Location name is required');
  if (!receipt.printTime) errors.push('Print time is required');

  return { valid: errors.length === 0, errors };
}

/**
 * Main validation function that routes to the appropriate validator based on receipt type
 * @param {Object} receipt - The receipt data to validate
 * @param {string} type - The receipt type (optional, defaults to 'sales')
 * @returns {Object} Validation result with valid boolean and errors array
 */
function validateReceipt(receipt, type = 'sales') {
  switch (type.toLowerCase()) {
    case 'sales':
      return validateSalesReceipt(receipt);
    case 'cash_transfer':
      return validateCashTransferReceipt(receipt);
    case 'shift_closure':
      return validateShiftClosureReceipt(receipt);
    case 'shift_handoff':
      return validateShiftHandoffReceipt(receipt);
    case 'cash_expense':
      return validateCashExpenseReceipt(receipt);
    default:
      // For unknown types, fall back to sales validation and log a warning
      console.warn(`Unknown receipt type: ${type}, falling back to sales validation`);
      return validateSalesReceipt(receipt);
  }
}

module.exports = {
  validateReceipt,
  validateSalesReceipt,
  validateCashTransferReceipt,
  validateShiftClosureReceipt,
  validateShiftHandoffReceipt,
  validateCashExpenseReceipt
};
