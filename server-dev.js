/**
 * Development Server for POS Printer Service
 * 
 * This server works exactly like the production server but simulates printing
 * by displaying visual representations of receipts in the console/logs.
 * Perfect for development and testing without a physical printer.
 */

const express = require('express');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Import our modules
const printerManager = require('./lib/printerManager');
const ReceiptFormatter = require('./lib/receiptFormatter-dev');
const { validateReceipt } = require('./lib/validation');

// Create receipt formatter instance
const receiptFormatter = new ReceiptFormatter();

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Setup logging
const logDir = config.logging.directory || './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pos-printer-service-dev' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined-dev.log'),
      maxsize: config.logging.maxSize || '10MB',
      maxFiles: config.logging.maxFiles || 5
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'error-dev.log'), 
      level: 'error',
      maxsize: config.logging.maxSize || '10MB',
      maxFiles: config.logging.maxFiles || 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
app.use(express.json({ limit: '10mb' }));

// Print queue for development
let printQueue = [];
const maxQueueSize = config.printing?.maxQueueSize || 10;

// Development printer simulation
class DevPrinter {
  constructor() {
    this.name = 'DEV-PRINTER';
    this.status = 'online';
    this.isDefault = true;
    this.model = 'Development Printer Simulator';
  }

  async print(data, jobName = 'dev-job') {
    // Simulate print delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Convert ESC/POS commands to visual representation
    const visualReceipt = this.convertEscPosToVisual(data);
    
    // Log the visual receipt
    logger.info('=== DEVELOPMENT PRINTER OUTPUT ===');
    logger.info(`Job: ${jobName}`);
    logger.info(`Timestamp: ${new Date().toISOString()}`);
    logger.info('Receipt Preview:');
    console.log('\n' + '='.repeat(60));
    console.log('🖨️  DEVELOPMENT PRINTER OUTPUT');
    console.log('='.repeat(60));
    console.log(visualReceipt);
    console.log('='.repeat(60));
    console.log(`📅 Printed at: ${new Date().toLocaleString()}`);
    console.log(`🆔 Job ID: ${jobName}`);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      printerId: this.name,
      jobId: jobName
    };
  }

  convertEscPosToVisual(escPosData) {
    let visual = escPosData;
    
    // Convert common ESC/POS commands to visual representation
    const conversions = {
      // Initialize printer
      '\x1B\x40': '',
      
      // Text formatting
      '\x1B\x45\x01': '**', // Bold on
      '\x1B\x45\x00': '**', // Bold off
      '\x1B\x61\x01': '',   // Center alignment
      '\x1B\x61\x00': '',   // Left alignment
      
      // Font size
      '\x1B\x21\x10': '',   // Double height
      '\x1B\x21\x00': '',   // Normal size
      
      // Line spacing
      '\x1B\x32': '\n',     // Default line spacing
      '\x1B\x33\x18': '\n', // Custom line spacing
      
      // Cut paper
      '\x1D\x56\x00': '\n' + '─'.repeat(48) + '\n', // Full cut
      '\x1D\x56\x01': '\n' + '─'.repeat(48) + '\n', // Partial cut
      
      // Feed lines
      '\x0A': '\n',         // Line feed
      '\x0D': '',           // Carriage return
      
      // Special characters
      '\x1B\x74\x10': '',   // Code page selection
    };
    
    // Apply conversions
    Object.entries(conversions).forEach(([escPos, visual]) => {
      visual = visual.replace(escPos, visual);
    });
    
    // Clean up any remaining control characters
    visual = visual.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    // Format the receipt nicely
    const lines = visual.split('\n');
    const formattedLines = lines.map(line => {
      // Center lines that should be centered
      if (line.includes('**') || line.includes('BUÑUELISIMO') || line.includes('TRANSFER') || 
          line.includes('CIERRE') || line.includes('ENTREGA') || line.includes('GASTO')) {
        const trimmed = line.trim();
        const padding = Math.max(0, Math.floor((48 - trimmed.length) / 2));
        return ' '.repeat(padding) + trimmed;
      }
      return line;
    });
    
    return formattedLines.join('\n');
  }
}

// Create development printer instance
const devPrinter = new DevPrinter();

// Validation function
function validateReceiptData(receipt, type = 'sales') {
  const validation = validateReceipt(receipt, type);
  if (!validation.valid) {
    throw new Error(`Invalid receipt data: ${validation.errors.join(', ')}`);
  }
  return true;
}

// Process print job (development version)
async function processPrintJob(receipt, printerName = null, type = 'sales') {
  try {
    logger.info(`Processing ${type} print job`, { type, printerName });
    
    // Format the receipt
    const formattedReceipt = receiptFormatter.formatReceipt(receipt, type);
    
    // Create job name
    const jobName = `${type.toUpperCase()}-${Date.now()}`;
    
    // Simulate printing
    const result = await devPrinter.print(formattedReceipt, jobName);
    
    logger.info(`Print job completed successfully`, { 
      type, 
      printerId: result.printerId, 
      jobId: result.jobId 
    });
    
    return {
      success: true,
      message: `Receipt printed successfully (DEV MODE)`,
      printerId: result.printerId,
      jobId: result.jobId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error(`Print job failed`, { type, error: error.message });
    throw error;
  }
}

// Process queue
async function processQueue() {
  if (printQueue.length === 0) return;
  
  const job = printQueue.shift();
  try {
    await processPrintJob(job.receipt, job.printerName, job.type);
  } catch (error) {
    logger.error(`Queue job failed`, { error: error.message });
  }
}

// API Endpoints

// Root endpoint
app.get('/', (req, res) => {
  const uptime = process.uptime();
  res.json({
    service: 'POS Printer Service (Development Mode)',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    mode: 'development',
    note: 'This is a development server that simulates printing',
    endpoints: {
      print: 'POST /print',
      preview: 'POST /preview',
      testPrint: 'POST /test-print',
      testTransfer: 'POST /test-transfer',
      testShiftClosure: 'POST /test-shift-closure',
      testShiftHandoff: 'POST /test-shift-handoff',
      testCashExpense: 'POST /test-cash-expense',
      status: 'GET /status',
      printers: 'GET /printers'
    }
  });
});

// Service status
app.get('/status', (req, res) => {
  const printers = [{
    name: devPrinter.name,
    status: devPrinter.status,
    isDefault: devPrinter.isDefault,
    model: devPrinter.model
  }];
  
  res.json({
    service: 'online',
    printers: printers,
    lastPrintTime: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    queueLength: printQueue.length,
    maxQueueSize: maxQueueSize,
    mode: 'development',
    timestamp: new Date().toISOString()
  });
});

// List printers
app.get('/printers', (req, res) => {
  res.json({
    printers: [{
      name: devPrinter.name,
      status: devPrinter.status,
      isDefault: devPrinter.isDefault,
      model: devPrinter.model,
      location: 'Development Environment',
      description: 'Simulated printer for development and testing'
    }],
    timestamp: new Date().toISOString()
  });
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    const { receipt, type = 'sales', printerName } = req.body;
    
    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: 'Receipt data is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate receipt data
    validateReceiptData(receipt, type);
    
    // Add to queue if it's full
    if (printQueue.length >= maxQueueSize) {
      return res.status(503).json({
        success: false,
        error: 'Print queue is full',
        timestamp: new Date().toISOString()
      });
    }
    
    // Add to queue
    printQueue.push({ receipt, printerName, type });
    
    // Process immediately (in development mode)
    const result = await processPrintJob(receipt, printerName, type);
    
    res.json(result);
    
  } catch (error) {
    logger.error('Print request failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Preview endpoint
app.post('/preview', async (req, res) => {
  try {
    const { receipt, type = 'sales' } = req.body;
    
    if (!receipt) {
      return res.status(400).json({
        success: false,
        error: 'Receipt data is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate receipt data
    validateReceiptData(receipt, type);
    
    // Generate preview
    const preview = receiptFormatter.previewReceipt(receipt, type);
    
    res.json({
      success: true,
      preview: preview,
      escPosCodes: ['INIT', 'BOLD_ON', 'CENTER_ON'], // Simplified for dev
      rawLength: preview.length,
      type: type,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Preview request failed', { error: error.message });
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoints

// Test sales print
app.post('/test-print', async (req, res) => {
  try {
    const testReceipt = {
      orderNumber: 'DEV-001',
      date: new Date().toISOString(),
      cashier: 'Development User',
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
        }
      ],
      subtotal: 3800,
      tax: 304,
      total: 4104,
      paymentMethod: 'cash',
      tendered: 5000,
      change: 896
    };
    
    const result = await processPrintJob(testReceipt, null, 'sales');
    res.json(result);
    
  } catch (error) {
    logger.error('Test sales print failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test cash transfer print
app.post('/test-transfer', async (req, res) => {
  try {
    const testReceipt = {
      transferId: 'DEV-TRANS-001',
      date: new Date().toISOString(),
      shiftInfo: 'Development Shift',
      senderName: 'Juan Pérez',
      receiverName: 'María García',
      amount: 1250000,
      notes: 'Development transfer for testing',
      locationName: 'Buñuelisimo - Development',
      printTime: new Date().toISOString()
    };
    
    const result = await processPrintJob(testReceipt, null, 'cash_transfer');
    res.json(result);
    
  } catch (error) {
    logger.error('Test cash transfer print failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test shift closure print
app.post('/test-shift-closure', async (req, res) => {
  try {
    const testReceipt = {
      shiftId: 'DEV-SHIFT-001',
      shiftType: 'Development Turno',
      shiftDate: new Date().toISOString().split('T')[0],
      cashierName: 'Ana López',
      startTime: '09:00',
      endTime: '17:00',
      startingCash: 500000,
      endingCashExpected: 1350000,
      endingCashCounted: 1348000,
      variance: -2000,
      shiftSales: 850000,
      transfersOut: 800000,
      locationName: 'Buñuelisimo - Development',
      printTime: new Date().toISOString()
    };
    
    const result = await processPrintJob(testReceipt, null, 'shift_closure');
    res.json(result);
    
  } catch (error) {
    logger.error('Test shift closure print failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test shift handoff print
app.post('/test-shift-handoff', async (req, res) => {
  try {
    const testReceipt = {
      handoffId: 'DEV-HAND-001',
      handoffDate: new Date().toISOString(),
      outgoingCashier: 'Carlos Ruiz',
      incomingCashier: 'Laura Silva',
      handoffAmount: 548000,
      verifiedAmount: 548000,
      variance: 0,
      status: 'VERIFICADO',
      locationName: 'Buñuelisimo - Development',
      printTime: new Date().toISOString()
    };
    
    const result = await processPrintJob(testReceipt, null, 'shift_handoff');
    res.json(result);
    
  } catch (error) {
    logger.error('Test shift handoff print failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test cash expense print
app.post('/test-cash-expense', async (req, res) => {
  try {
    const testReceipt = {
      expenseId: 'DEV-EXP-001',
      cashExpenseId: 'DEV-CASH-001',
      date: new Date().toISOString(),
      cashierName: 'Roberto Díaz',
      category: 'Desarrollo',
      description: 'Gasto de desarrollo para testing',
      amount: 25000,
      shiftInfo: 'Development Shift',
      locationName: 'Buñuelisimo - Development',
      printTime: new Date().toISOString()
    };
    
    const result = await processPrintJob(testReceipt, null, 'cash_expense');
    res.json(result);
    
  } catch (error) {
    logger.error('Test cash expense print failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: {
      'GET /': 'Service info',
      'GET /status': 'Service status',
      'GET /printers': 'List printers',
      'POST /test-print': 'Test sales print',
      'POST /test-transfer': 'Test cash transfer print',
      'POST /test-shift-closure': 'Test shift closure print',
      'POST /test-shift-handoff': 'Test shift handoff print',
      'POST /test-cash-expense': 'Test cash expense print',
      'POST /print': 'Print receipt (with type parameter)',
      'POST /preview': 'Preview receipt (with type parameter)'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
const port = config.server.port || 8080;
const host = config.server.host || '127.0.0.1';

app.listen(port, host, () => {
  logger.info(`Development server started`, { 
    host, 
    port, 
    mode: 'development',
    note: 'This server simulates printing - no physical printer required'
  });
  
  console.log('\n🚀 POS Printer Service - Development Mode');
  console.log('='.repeat(50));
  console.log(`📍 Server running on http://${host}:${port}`);
  console.log('🖨️  Printing is simulated - receipts shown in console');
  console.log('📝 Logs saved to ./logs/combined-dev.log');
  console.log('='.repeat(50));
  console.log('\nAvailable endpoints:');
  console.log('  GET  /                    - Service info');
  console.log('  GET  /status              - Service status');
  console.log('  GET  /printers            - List printers');
  console.log('  POST /print               - Print receipt');
  console.log('  POST /preview             - Preview receipt');
  console.log('  POST /test-print          - Test sales receipt');
  console.log('  POST /test-transfer       - Test cash transfer');
  console.log('  POST /test-shift-closure  - Test shift closure');
  console.log('  POST /test-shift-handoff  - Test shift handoff');
  console.log('  POST /test-cash-expense   - Test cash expense');
  console.log('\n💡 Try: curl http://127.0.0.1:8080/test-print');
  console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Development server shutting down');
  console.log('\n👋 Development server stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Development server shutting down');
  console.log('\n👋 Development server stopped');
  process.exit(0);
});
