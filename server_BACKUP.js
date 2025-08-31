const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const ReceiptFormatter = require('./lib/receiptFormatter');
const PrinterManager = require('./lib/printerManager');
const config = require('./config.json');

const execAsync = promisify(exec);

// Initialize logger
const logger = winston.createLogger({
  level: config.logging.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'pos-printer-service' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(config.logging.directory || './logs', 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join(config.logging.directory || './logs', 'combined.log'),
      maxsize: 10485760,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class POSPrinterService {
  constructor() {
    this.app = express();
    this.printQueue = [];
    this.maxQueueSize = 10;
    this.isProcessingQueue = false;
    this.startTime = Date.now();
    this.lastPrintTime = null;
    this.printerManager = new PrinterManager(logger);
    this.receiptFormatter = new ReceiptFormatter(config.receipt, logger);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/status', async (req, res) => {
      try {
        const printers = await this.printerManager.getAvailablePrinters();
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        
        res.json({
          service: 'online',
          printers: printers,
          lastPrintTime: this.lastPrintTime,
          uptime: uptime,
          queueLength: this.printQueue.length,
          maxQueueSize: this.maxQueueSize
        });
      } catch (error) {
        logger.error('Status endpoint error:', error);
        res.status(500).json({
          service: 'error',
          error: error.message
        });
      }
    });

    // List printers endpoint
    this.app.get('/printers', async (req, res) => {
      try {
        const printers = await this.printerManager.getAvailablePrinters();
        res.json({ printers });
      } catch (error) {
        logger.error('Printers endpoint error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Test print endpoint
    this.app.post('/test-print', async (req, res) => {
      try {
        const { printerName } = req.body;
        
        const testReceipt = {
          orderNumber: 'TEST-001',
          date: new Date().toISOString(),
          cashier: 'Test Cashier',
          items: [
            {
              name: 'Test Item 1',
              quantity: 2,
              price: 10.00,
              total: 20.00
            },
            {
              name: 'Test Item 2',
              quantity: 1,
              price: 5.50,
              total: 5.50
            }
          ],
          subtotal: 25.50,
          tax: 2.17,
          total: 27.67,
          paymentMethod: 'cash',
          tendered: 30.00,
          change: 2.33
        };

        const result = await this.processPrintJob(testReceipt, printerName);
        res.json(result);
      } catch (error) {
        logger.error('Test print error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Main print endpoint
    this.app.post('/print', async (req, res) => {
      try {
        const { receipt } = req.body;
        
        // Validate receipt data
        const validation = this.validateReceiptData(receipt);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: `Invalid receipt data: ${validation.errors.join(', ')}`
          });
        }

        const result = await this.processPrintJob(receipt);
        res.json(result);
      } catch (error) {
        logger.error('Print endpoint error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'POS Printer Service',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          print: 'POST /print',
          testPrint: 'POST /test-print', 
          status: 'GET /status',
          printers: 'GET /printers'
        }
      });
    });
  }

  validateReceiptData(receipt) {
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

  async processPrintJob(receipt, printerName = null) {
    try {
      // Check if printer is available
      const printers = await this.printerManager.getAvailablePrinters();
      const targetPrinter = printerName ? 
        printers.find(p => p.name === printerName) : 
        printers.find(p => p.isDefault) || printers[0];

      if (!targetPrinter) {
        throw new Error('No printers available');
      }

      if (targetPrinter.status !== 'online') {
        // Add to queue if printer is offline
        if (this.printQueue.length < this.maxQueueSize) {
          this.printQueue.push({ receipt, printerName, timestamp: Date.now() });
          logger.warn(`Printer offline, added to queue. Queue length: ${this.printQueue.length}`);
          
          return {
            success: false,
            message: `Printer offline, queued for printing. Queue position: ${this.printQueue.length}`,
            printerId: targetPrinter.name,
            queued: true
          };
        } else {
          throw new Error('Printer offline and queue is full');
        }
      }

      // Format and print receipt
      const formattedReceipt = await this.receiptFormatter.formatReceipt(receipt);
      const printResult = await this.printerManager.print(formattedReceipt, targetPrinter.name);
      
      this.lastPrintTime = new Date().toISOString();
      logger.info('Receipt printed successfully', {
        orderNumber: receipt.orderNumber,
        printer: targetPrinter.name,
        timestamp: this.lastPrintTime
      });

      // Process queue if printer came back online
      if (!this.isProcessingQueue) {
        this.processQueue();
      }

      return {
        success: true,
        message: 'Receipt printed successfully',
        printerId: targetPrinter.name,
        timestamp: this.lastPrintTime
      };

    } catch (error) {
      logger.error('Print job failed:', error);
      throw error;
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.printQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    logger.info(`Processing print queue, ${this.printQueue.length} items`);

    while (this.printQueue.length > 0) {
      try {
        const job = this.printQueue.shift();
        const result = await this.processPrintJob(job.receipt, job.printerName);
        
        if (!result.success && result.queued) {
          // If it got queued again, put it back and stop processing
          this.printQueue.unshift(job);
          break;
        }
        
        logger.info('Queued job printed successfully', { orderNumber: job.receipt.orderNumber });
      } catch (error) {
        logger.error('Failed to print queued job:', error);
        // Continue processing other jobs
      }
    }

    this.isProcessingQueue = false;
  }

  setupErrorHandling() {
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    });

    // Handle 404
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found'
      });
    });
  }

  async start() {
    try {
      // Create logs directory if it doesn't exist
      const logDir = config.logging.directory || './logs';
      await fs.mkdir(logDir, { recursive: true });

      // Initialize printer manager
      await this.printerManager.initialize();

      // Start server
      const port = config.server.port || 8080;
      const host = config.server.host || '127.0.0.1';

      this.server = this.app.listen(port, host, () => {
        logger.info(`POS Printer Service started on ${host}:${port}`);
        console.log(`🖨️  POS Printer Service running on http://${host}:${port}`);
      });

      // Start periodic printer detection
      this.startPrinterDetection();

    } catch (error) {
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  startPrinterDetection() {
    // Check for new printers every 30 seconds
    setInterval(async () => {
      try {
        await this.printerManager.refreshPrinters();
        
        // Try to process queue in case printers came back online
        if (this.printQueue.length > 0) {
          this.processQueue();
        }
      } catch (error) {
        logger.error('Printer detection error:', error);
      }
    }, 30000);
  }

  async stop() {
    if (this.server) {
      this.server.close();
      logger.info('POS Printer Service stopped');
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  if (global.printerService) {
    await global.printerService.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  if (global.printerService) {
    await global.printerService.stop();
  }
  process.exit(0);
});

// Start the service
if (require.main === module) {
  global.printerService = new POSPrinterService();
  global.printerService.start();
}

module.exports = POSPrinterService;