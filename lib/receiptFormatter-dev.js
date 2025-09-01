/**
 * Receipt Formatter - Development Version
 * 
 * This is a development version that doesn't use the sharp module
 * to avoid native dependency issues during development.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

class ReceiptFormatter {
  constructor() {
    this.config = config.receipt;
    this.paperWidth = this.config.paperWidth || 48;
  }

  // Helper method to center text
  centerText(text) {
    const padding = Math.max(0, Math.floor((this.paperWidth - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  // Helper method to right-align text
  rightAlignText(text) {
    const padding = Math.max(0, this.paperWidth - text.length);
    return ' '.repeat(padding) + text;
  }

  // Helper method to format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Helper method to format date
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Get receipt type header from config
  getReceiptTypeHeader(type) {
    return this.config.receiptTypes?.[type]?.header || this.getDefaultHeader(type);
  }

  // Get receipt type footer from config
  getReceiptTypeFooter(type) {
    return this.config.receiptTypes?.[type]?.footer || this.getDefaultFooter(type);
  }

  // Get default header for receipt type
  getDefaultHeader(type) {
    const headers = {
      'cash_transfer': 'TRANSFER DE EFECTIVO',
      'shift_closure': 'CIERRE DE TURNO',
      'shift_handoff': 'ENTREGA DE TURNO',
      'cash_expense': 'GASTO DE CAJA'
    };
    return headers[type] || '';
  }

  // Get default footer for receipt type
  getDefaultFooter(type) {
    const footers = {
      'cash_transfer': 'CONSERVAR PARA AUDITORIA',
      'shift_closure': 'CIERRE COMPLETADO',
      'shift_handoff': 'CONSERVAR PARA AUDITORIA',
      'cash_expense': 'CONSERVAR PARA AUDITORIA'
    };
    return footers[type] || this.config.footerMessage || '';
  }

  // Process logo (development version - just returns empty string)
  async processLogo() {
    // In development mode, we skip logo processing
    return '';
  }

  // Format sales receipt
  formatSalesReceipt(receipt) {
    let output = '';

    // Initialize printer
    output += '\x1B\x40'; // Initialize printer
    output += '\x1B\x61\x01'; // Center alignment

    // Logo placeholder (would be processed in production)
    output += '\x0A';

    // Restaurant name
    output += '\x1B\x45\x01'; // Bold on
    output += this.centerText(this.config.restaurantName) + '\x0A';
    output += '\x1B\x45\x00'; // Bold off

    // Address and phone
    output += this.centerText(this.config.address) + '\x0A';
    output += this.centerText(this.config.phone) + '\x0A\x0A';

    // Order details
    output += '\x1B\x61\x00'; // Left alignment
    output += `Order: ${receipt.orderNumber}\x0A`;
    output += `Date: ${this.formatDate(receipt.date)}\x0A`;
    output += `Cashier: ${receipt.cashier}\x0A\x0A`;

    // Items
    output += '─'.repeat(this.paperWidth) + '\x0A';
    receipt.items.forEach(item => {
      output += `${item.name}\x0A`;
      output += `${item.quantity} x ${this.formatCurrency(item.price)} = ${this.formatCurrency(item.total)}\x0A`;
    });
    output += '─'.repeat(this.paperWidth) + '\x0A';

    // Totals
    output += `Subtotal: ${this.rightAlignText(this.formatCurrency(receipt.subtotal))}\x0A`;
    output += `${this.config.taxLabel || 'Tax:'} ${this.rightAlignText(this.formatCurrency(receipt.tax))}\x0A`;
    output += '\x1B\x45\x01'; // Bold on
    output += `Total: ${this.rightAlignText(this.formatCurrency(receipt.total))}\x0A`;
    output += '\x1B\x45\x00'; // Bold off

    // Payment method
    output += `Payment: ${receipt.paymentMethod.toUpperCase()}\x0A`;

    if (receipt.tendered && receipt.change) {
      output += `Tendered: ${this.formatCurrency(receipt.tendered)}\x0A`;
      output += `Change: ${this.formatCurrency(receipt.change)}\x0A`;
    }

    output += '\x0A';

    // Footer
    output += '\x1B\x61\x01'; // Center alignment
    output += this.centerText(this.config.footerMessage) + '\x0A\x0A';

    // Cut paper
    output += '\x1D\x56\x00'; // Full cut

    return output;
  }

  // Format cash transfer receipt
  formatCashTransferReceipt(receipt) {
    let output = '';

    // Initialize printer
    output += '\x1B\x40'; // Initialize printer
    output += '\x1B\x61\x01'; // Center alignment

    // Header
    output += '\x1B\x45\x01'; // Bold on
    output += this.centerText(this.getReceiptTypeHeader('cash_transfer')) + '\x0A\x0A';
    output += '\x1B\x45\x00'; // Bold off

    // Transfer details
    output += '\x1B\x61\x00'; // Left alignment
    output += `Transfer ID: ${receipt.transferId}\x0A`;
    output += `Date: ${receipt.date}\x0A`;
    if (receipt.shiftInfo) {
      output += `Shift: ${receipt.shiftInfo}\x0A`;
    }
    output += '\x0A';

    // Transfer information
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `From: ${receipt.senderName}\x0A`;
    output += `To: ${receipt.receiverName}\x0A`;
    output += `Amount: ${this.formatCurrency(receipt.amount)}\x0A`;
    if (receipt.notes) {
      output += `Notes: ${receipt.notes}\x0A`;
    }
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Location
    output += `Location: ${receipt.locationName}\x0A\x0A`;

    // Signature lines
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Sender: ${receipt.senderName}\x0A`;
    output += 'Signature: _________________\x0A\x0A';
    output += `Receiver: ${receipt.receiverName}\x0A`;
    output += 'Signature: _________________\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Footer
    output += '\x1B\x61\x01'; // Center alignment
    output += this.centerText(this.getReceiptTypeFooter('cash_transfer')) + '\x0A\x0A';

    // Cut paper
    output += '\x1D\x56\x00'; // Full cut

    return output;
  }

  // Format shift closure receipt
  formatShiftClosureReceipt(receipt) {
    let output = '';

    // Initialize printer
    output += '\x1B\x40'; // Initialize printer
    output += '\x1B\x61\x01'; // Center alignment

    // Header
    output += '\x1B\x45\x01'; // Bold on
    output += this.centerText(this.getReceiptTypeHeader('shift_closure')) + '\x0A\x0A';
    output += '\x1B\x45\x00'; // Bold off

    // Shift details
    output += '\x1B\x61\x00'; // Left alignment
    output += `Shift ID: ${receipt.shiftId}\x0A`;
    output += `Shift Type: ${receipt.shiftType}\x0A`;
    output += `Date: ${receipt.shiftDate}\x0A`;
    output += `Cashier: ${receipt.cashierName}\x0A`;
    output += `Start Time: ${receipt.startTime}\x0A`;
    output += `End Time: ${receipt.endTime}\x0A\x0A`;

    // Cash counts
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += 'CASH COUNT SUMMARY\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Starting Cash: ${this.rightAlignText(this.formatCurrency(receipt.startingCash))}\x0A`;
    output += `Ending Cash Expected: ${this.rightAlignText(this.formatCurrency(receipt.endingCashExpected))}\x0A`;
    output += `Ending Cash Counted: ${this.rightAlignText(this.formatCurrency(receipt.endingCashCounted))}\x0A`;
    output += `Variance: ${this.rightAlignText(this.formatCurrency(receipt.variance))}\x0A\x0A`;

    // Sales summary
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += 'SALES SUMMARY\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Shift Sales: ${this.rightAlignText(this.formatCurrency(receipt.shiftSales))}\x0A`;
    output += `Transfers Out: ${this.rightAlignText(this.formatCurrency(receipt.transfersOut))}\x0A`;
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Location
    output += `Location: ${receipt.locationName}\x0A\x0A`;

    // Signature
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Cashier: ${receipt.cashierName}\x0A`;
    output += 'Signature: _________________\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Footer
    output += '\x1B\x61\x01'; // Center alignment
    output += this.centerText(this.getReceiptTypeFooter('shift_closure')) + '\x0A\x0A';

    // Cut paper
    output += '\x1D\x56\x00'; // Full cut

    return output;
  }

  // Format shift handoff receipt
  formatShiftHandoffReceipt(receipt) {
    let output = '';

    // Initialize printer
    output += '\x1B\x40'; // Initialize printer
    output += '\x1B\x61\x01'; // Center alignment

    // Header
    output += '\x1B\x45\x01'; // Bold on
    output += this.centerText(this.getReceiptTypeHeader('shift_handoff')) + '\x0A\x0A';
    output += '\x1B\x45\x00'; // Bold off

    // Handoff details
    output += '\x1B\x61\x00'; // Left alignment
    output += `Handoff ID: ${receipt.handoffId}\x0A`;
    output += `Date: ${receipt.handoffDate}\x0A\x0A`;

    // Handoff information
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Outgoing Cashier: ${receipt.outgoingCashier}\x0A`;
    output += `Incoming Cashier: ${receipt.incomingCashier}\x0A`;
    output += `Handoff Amount: ${this.formatCurrency(receipt.handoffAmount)}\x0A`;
    output += `Verified Amount: ${this.formatCurrency(receipt.verifiedAmount)}\x0A`;
    output += `Variance: ${this.formatCurrency(receipt.variance)}\x0A`;
    output += `Status: ${receipt.status}\x0A`;
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Location
    output += `Location: ${receipt.locationName}\x0A\x0A`;

    // Signatures
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Outgoing Cashier: ${receipt.outgoingCashier}\x0A`;
    output += 'Signature: _________________\x0A\x0A';
    output += `Incoming Cashier: ${receipt.incomingCashier}\x0A`;
    output += 'Signature: _________________\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Footer
    output += '\x1B\x61\x01'; // Center alignment
    output += this.centerText(this.getReceiptTypeFooter('shift_handoff')) + '\x0A\x0A';

    // Cut paper
    output += '\x1D\x56\x00'; // Full cut

    return output;
  }

  // Format cash expense receipt
  formatCashExpenseReceipt(receipt) {
    let output = '';

    // Initialize printer
    output += '\x1B\x40'; // Initialize printer
    output += '\x1B\x61\x01'; // Center alignment

    // Header
    output += '\x1B\x45\x01'; // Bold on
    output += this.centerText(this.getReceiptTypeHeader('cash_expense')) + '\x0A\x0A';
    output += '\x1B\x45\x00'; // Bold off

    // Expense details
    output += '\x1B\x61\x00'; // Left alignment
    output += `Expense ID: ${receipt.expenseId}\x0A`;
    output += `Cash Expense ID: ${receipt.cashExpenseId}\x0A`;
    output += `Date: ${receipt.date}\x0A`;
    output += `Cashier: ${receipt.cashierName}\x0A`;
    output += `Category: ${receipt.category}\x0A`;
    output += `Shift: ${receipt.shiftInfo}\x0A\x0A`;

    // Expense information
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Description: ${receipt.description}\x0A`;
    output += `Amount: ${this.formatCurrency(receipt.amount)}\x0A`;
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Location
    output += `Location: ${receipt.locationName}\x0A\x0A`;

    // Signature
    output += '─'.repeat(this.paperWidth) + '\x0A';
    output += `Cashier: ${receipt.cashierName}\x0A`;
    output += 'Signature: _________________\x0A';
    output += '─'.repeat(this.paperWidth) + '\x0A\x0A';

    // Footer
    output += '\x1B\x61\x01'; // Center alignment
    output += this.centerText(this.getReceiptTypeFooter('cash_expense')) + '\x0A\x0A';

    // Cut paper
    output += '\x1D\x56\x00'; // Full cut

    return output;
  }

  // Main format method
  formatReceipt(receipt, type = 'sales') {
    switch (type.toLowerCase()) {
      case 'sales':
        return this.formatSalesReceipt(receipt);
      case 'cash_transfer':
        return this.formatCashTransferReceipt(receipt);
      case 'shift_closure':
        return this.formatShiftClosureReceipt(receipt);
      case 'shift_handoff':
        return this.formatShiftHandoffReceipt(receipt);
      case 'cash_expense':
        return this.formatCashExpenseReceipt(receipt);
      default:
        // Fallback to sales format for unknown types
        console.warn(`Unknown receipt type: ${type}, falling back to sales format`);
        return this.formatSalesReceipt(receipt);
    }
  }

  // Preview method (returns formatted text without ESC/POS codes)
  previewReceipt(receipt, type = 'sales') {
    const formatted = this.formatReceipt(receipt, type);
    
    // Remove ESC/POS control codes for preview
    let preview = formatted
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // Remove ESC sequences
      .replace(/\x1D[0-9;]*[a-zA-Z]/g, '')   // Remove GS sequences
      .replace(/\x0A/g, '\n')                 // Convert line feeds to newlines
      .replace(/\x0D/g, '')                   // Remove carriage returns
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove other control characters
    
    return preview;
  }
}

module.exports = ReceiptFormatter;
