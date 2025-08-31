const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ReceiptFormatter {
  constructor(config, logger) {
    this.config = config || {};
    this.logger = logger;
    this.paperWidth = config.paperWidth || 48; // 80mm paper = ~48 characters
    this.logoPath = config.logoPath || './assets/logo.png';
    
    // ESC/POS Commands - trying different font sizes
    this.ESC_POS = {
      INIT: '\x1B@',           // Initialize printer
      NORMAL_TEXT: '\x1B!\x00', // Try completely normal (0x00 instead of 0x38)
      SMALL_TEXT: '\x1B!\x01',  // Small font
      BOLD_ON: '\x1BE\x01',     // Bold on
      BOLD_OFF: '\x1BE\x00',    // Bold off
      CENTER_ON: '\x1Ba\x01',   // Center alignment
      CENTER_OFF: '\x1Ba\x00',  // Left alignment
      CUT_PAPER: '\x1DVA0',     // Partial paper cut
      LINE_FEED: '\n'
    };
  }

  async formatReceipt(receipt) {
    try {
      let output = '';
      
      // Start with printer initialization and set normal font
      output += this.ESC_POS.INIT;
      output += this.ESC_POS.NORMAL_TEXT; // Using 0x00 instead of 0x38
      
      // Add logo if available
      const logoText = await this.processLogo();
      if (logoText) {
        output += logoText + '\n';
      }

      // Header section - make it bold and centered
      output += this.ESC_POS.BOLD_ON + this.ESC_POS.CENTER_ON;
      output += this.createSeparator('=');
      output += (this.config.restaurantName || 'RESTAURANT NAME') + '\n';
      
      if (this.config.address) {
        output += this.config.address + '\n';
      }
      
      if (this.config.phone) {
        output += this.config.phone + '\n';
      }
      
      output += this.createSeparator('=');
      output += this.ESC_POS.BOLD_OFF + this.ESC_POS.CENTER_OFF;

      // Reset to normal text after header
      output += this.ESC_POS.NORMAL_TEXT;

      // Order info section
      output += this.formatLine('Pedido #:', receipt.orderNumber) + '\n';
      output += this.formatLine('Fecha:', this.formatDate(receipt.date)) + '\n';
      
      if (receipt.cashier) {
        output += this.formatLine('Cajero:', receipt.cashier) + '\n';
      }
      
      output += this.createSeparator('-');

      // Items section
      for (const item of receipt.items) {
        const itemName = `${item.name} x${item.quantity}`;
        const itemTotal = this.formatCurrency(item.total);
        output += this.formatLine(itemName, itemTotal) + '\n';
      }

      output += this.createSeparator('-');

      // Totals section
      output += this.formatLine('Subtotal:', this.formatCurrency(receipt.subtotal)) + '\n';
      
      if (receipt.tax && receipt.tax > 0) {
        const taxLabel = this.config.taxLabel || 'IVA:';
        output += this.formatLine(taxLabel, this.formatCurrency(receipt.tax)) + '\n';
      }
      
      // Make total bold
      output += this.ESC_POS.BOLD_ON;
      output += this.formatLine('TOTAL:', this.formatCurrency(receipt.total)) + '\n';
      output += this.ESC_POS.BOLD_OFF;
      
      // Reset to normal text after bold total
      output += this.ESC_POS.NORMAL_TEXT;
      output += this.createSeparator('-');

      // Payment section
      const paymentMethod = this.formatPaymentMethod(receipt.paymentMethod);
      output += this.formatLine('Pago:', paymentMethod) + '\n';

      if (receipt.paymentMethod === 'cash' && receipt.tendered) {
        output += this.formatLine('Recibido:', this.formatCurrency(receipt.tendered)) + '\n';
        if (receipt.change) {
          output += this.formatLine('Devuelta:', this.formatCurrency(receipt.change)) + '\n';
        }
      }

      if (receipt.paymentMethod === 'transfer' && receipt.transferReference) {
        output += this.formatLine('Referencia:', receipt.transferReference) + '\n';
      }

      output += this.createSeparator('=');

      // Footer section - centered
      output += this.ESC_POS.CENTER_ON;
      if (this.config.footerMessage) {
        output += this.config.footerMessage + '\n';
      } else {
        output += 'Disfruta tu buñuelísimo!' + '\n';
      }
      output += this.ESC_POS.CENTER_OFF;
      
      output += this.createSeparator('=');

      // Add extra line feeds before cutting
      output += '\n\n\n';
      
      // Add paper cut command at the end
      output += this.ESC_POS.CUT_PAPER;

      this.logger.info('Receipt formatted successfully', {
        orderNumber: receipt.orderNumber,
        itemCount: receipt.items.length,
        total: receipt.total
      });

      return output;
    } catch (error) {
      this.logger.error('Receipt formatting error:', error);
      throw new Error(`Failed to format receipt: ${error.message}`);
    }
  }

  // NEW: Preview method that removes ESC/POS codes for display
  async previewReceipt(receipt) {
    try {
      // Get the formatted receipt with ESC/POS codes
      const formattedReceipt = await this.formatReceipt(receipt);
      
      // Strip ESC/POS control codes for preview
      const previewText = this.stripEscPosCodes(formattedReceipt);
      
      return {
        raw: formattedReceipt,          // Raw with ESC/POS codes
        preview: previewText,           // Clean text for display
        escPosCodes: this.listEscPosCodes(formattedReceipt) // Show what codes are used
      };
    } catch (error) {
      this.logger.error('Receipt preview error:', error);
      throw error;
    }
  }

  // Strip ESC/POS codes to show clean text
  stripEscPosCodes(text) {
    return text
      .replace(/\x1B@/g, '[INIT]')           // Initialize
      .replace(/\x1B!\x00/g, '[NORMAL]')     // Normal font
      .replace(/\x1B!\x01/g, '[SMALL]')      // Small font  
      .replace(/\x1B!\x38/g, '[NORMAL38]')   // Normal font (0x38)
      .replace(/\x1BE\x01/g, '[BOLD-ON]')    // Bold on
      .replace(/\x1BE\x00/g, '[BOLD-OFF]')   // Bold off
      .replace(/\x1Ba\x01/g, '[CENTER-ON]')  // Center on
      .replace(/\x1Ba\x00/g, '[CENTER-OFF]') // Center off
      .replace(/\x1DVA0/g, '[CUT-PAPER]')    // Paper cut
      .replace(/\r/g, '');                   // Remove carriage returns
  }

  // List what ESC/POS codes are being used
  listEscPosCodes(text) {
    const codes = [];
    if (text.includes('\x1B@')) codes.push('INIT (\\x1B@)');
    if (text.includes('\x1B!\x00')) codes.push('NORMAL_FONT (\\x1B!\\x00)');
    if (text.includes('\x1B!\x01')) codes.push('SMALL_FONT (\\x1B!\\x01)');
    if (text.includes('\x1B!\x38')) codes.push('NORMAL38_FONT (\\x1B!\\x38)');
    if (text.includes('\x1BE\x01')) codes.push('BOLD_ON (\\x1BE\\x01)');
    if (text.includes('\x1BE\x00')) codes.push('BOLD_OFF (\\x1BE\\x00)');
    if (text.includes('\x1Ba\x01')) codes.push('CENTER_ON (\\x1Ba\\x01)');
    if (text.includes('\x1Ba\x00')) codes.push('CENTER_OFF (\\x1Ba\\x00)');
    if (text.includes('\x1DVA0')) codes.push('CUT_PAPER (\\x1DVA0)');
    return codes;
  }

  async processLogo() {
    try {
      // Check if logo file exists
      await fs.access(this.logoPath);
      
      // For now, we'll just indicate where the logo should be
      // In a full implementation, you'd convert this to ESC/POS bitmap commands
      return this.ESC_POS.CENTER_ON + '[LOGO]' + this.ESC_POS.CENTER_OFF;
      
    } catch (error) {
      this.logger.warn('Logo processing failed, skipping logo:', error.message);
      return null;
    }
  }

  formatLine(label, value) {
    const totalLength = this.paperWidth;
    const labelLength = label.length;
    const valueLength = value.toString().length;
    const spacesNeeded = totalLength - labelLength - valueLength;
    
    if (spacesNeeded > 0) {
      return label + ' '.repeat(spacesNeeded) + value;
    } else {
      // If line is too long, truncate label
      const maxLabelLength = totalLength - valueLength - 1;
      const truncatedLabel = label.substring(0, maxLabelLength);
      return truncatedLabel + ' ' + value;
    }
  }

  centerText(text) {
    const textLength = text.length;
    const totalLength = this.paperWidth;
    
    if (textLength >= totalLength) {
      return text.substring(0, totalLength);
    }
    
    const spacesNeeded = Math.floor((totalLength - textLength) / 2);
    return ' '.repeat(spacesNeeded) + text;
  }

  createSeparator(char = '-') {
    return char.repeat(this.paperWidth) + '\n';
  }

  formatCurrency(amount) {
    if (typeof amount !== 'number') {
      return '$0';
    }
    return '$' + amount.toFixed(0);
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const format = this.config.dateFormat || 'default';
      
      switch (format) {
        case 'short':
          return date.toLocaleDateString();
        case 'long':
          return date.toLocaleString();
        case 'custom':
          // Example: "2024-08-09 12:04:43 AM"
          return date.getFullYear() + '-' + 
                 String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(date.getDate()).padStart(2, '0') + ' ' +
                 date.toLocaleTimeString();
        default:
          return date.toLocaleString();
      }
    } catch (error) {
      this.logger.error('Date formatting error:', error);
      return dateString;
    }
  }

  formatPaymentMethod(method) {
    const methods = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'credit': 'Crédito',
      'debit': 'Débito'
    };
    
    return methods[method.toLowerCase()] || method;
  }
}

module.exports = ReceiptFormatter;
