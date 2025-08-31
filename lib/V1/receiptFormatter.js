const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ReceiptFormatter {
  constructor(config, logger) {
    this.config = config || {};
    this.logger = logger;
    this.paperWidth = config.paperWidth || 48; // 80mm paper = ~48 characters
    this.logoPath = config.logoPath || './assets/logo.png';
  }

  async formatReceipt(receipt) {
    try {
      let output = '';
      
      // Add logo if available
      const logoText = await this.processLogo();
      if (logoText) {
        output += logoText + '\n';
      }

      // Header section
      output += this.createSeparator('=');
      output += this.centerText(this.config.restaurantName || 'RESTAURANT NAME') + '\n';
      
      if (this.config.address) {
        output += this.centerText(this.config.address) + '\n';
      }
      
      if (this.config.phone) {
        output += this.centerText(this.config.phone) + '\n';
      }
      
      output += this.createSeparator('=');

      // Order info section
      output += this.formatLine('Order #:', receipt.orderNumber) + '\n';
      output += this.formatLine('Date:', this.formatDate(receipt.date)) + '\n';
      
      if (receipt.cashier) {
        output += this.formatLine('Cashier:', receipt.cashier) + '\n';
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
        const taxLabel = this.config.taxLabel || 'Tax:';
        output += this.formatLine(taxLabel, this.formatCurrency(receipt.tax)) + '\n';
      }
      
      output += this.formatLine('Total:', this.formatCurrency(receipt.total)) + '\n';
      output += this.createSeparator('-');

      // Payment section
      const paymentMethod = this.formatPaymentMethod(receipt.paymentMethod);
      output += this.formatLine('Payment:', paymentMethod) + '\n';

      if (receipt.paymentMethod === 'cash' && receipt.tendered) {
        output += this.formatLine('Tendered:', this.formatCurrency(receipt.tendered)) + '\n';
        if (receipt.change) {
          output += this.formatLine('Change:', this.formatCurrency(receipt.change)) + '\n';
        }
      }

      if (receipt.paymentMethod === 'transfer' && receipt.transferReference) {
        output += this.formatLine('Reference:', receipt.transferReference) + '\n';
      }

      output += this.createSeparator('=');

      // Footer section
      if (this.config.footerMessage) {
        output += this.centerText(this.config.footerMessage) + '\n';
      } else {
        output += this.centerText('Thank you for your visit!') + '\n';
      }
      
      output += this.createSeparator('=');

      // Add extra line feeds for paper cutting
      output += '\n\n\n';

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

  async processLogo() {
    try {
      // Check if logo file exists
      await fs.access(this.logoPath);
      
      // For thermal printers, we need to convert the logo to ESC/POS bitmap commands
      // This is a simplified version - in production you might want to use a library like 'escpos'
      const logoBuffer = await fs.readFile(this.logoPath);
      
      // Convert to grayscale and resize for thermal printer
      const processedImage = await sharp(logoBuffer)
        .grayscale()
        .resize({ width: Math.floor(this.paperWidth * 8) }) // 8 pixels per character roughly
        .png()
        .toBuffer();

      // For now, we'll just indicate where the logo should be
      // In a full implementation, you'd convert this to ESC/POS bitmap commands
      return this.centerText('[LOGO]');
      
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
      return '$0.00';
    }
    return '$' + amount.toFixed(2);
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
      'cash': 'Cash',
      'card': 'Card',
      'transfer': 'Bank Transfer',
      'credit': 'Credit Card',
      'debit': 'Debit Card'
    };
    
    return methods[method.toLowerCase()] || method;
  }

  // Method to validate and preview receipt formatting
  previewReceipt(receipt) {
    return this.formatReceipt(receipt);
  }
}

module.exports = ReceiptFormatter;