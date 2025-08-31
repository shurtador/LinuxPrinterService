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
    // Enhanced CORS setup with detailed logging
    console.log('Setting up CORS...');
    this.app.use(cors({
      origin: function(origin, callback) {
        console.log('CORS Origin check:', origin || 'undefined');
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          console.log('No origin - allowing request');
          return callback(null, true);
        }
        
        // Log the origin for debugging
        console.log('Request from origin:', origin);
        
        // Allow all origins for now (you can restrict this later)
        callback(null, true);
      },
      credentials: false,
      methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      optionsSuccessStatus: 200 // Some legacy browsers choke on 204
    }));

    // Handle preflight requests explicitly
    this.app.options('*', (req, res) => {
      console.log('=== PREFLIGHT REQUEST ===');
      console.log('Method:', req.method);
      console.log('Origin:', req.headers.origin);
      console.log('Headers:', req.headers);
      console.log('========================');
      
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Max-Age', '86400'); // 24 hours
      res.sendStatus(200);
    });

    this.app.use(helmet({
      crossOriginEmbedderPolicy: false, // Disable for CORS compatibility
      contentSecurityPolicy: false     // Disable for development
    }));
    
    this.app.use(express.json({ limit: '10mb' }));

    // Enhanced request logging
    this.app.use((req, res, next) => {
      console.log('=== INCOMING REQUEST ===');
      console.log('Time:', new Date().toISOString());
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Path:', req.path);
      console.log('Query:', req.query);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Origin:', req.headers.origin || 'No origin');
      console.log('User-Agent:', req.headers['user-agent'] || 'No user agent');
      console.log('Content-Type:', req.headers['content-type'] || 'No content type');
      console.log('Content-Length:', req.headers['content-length'] || 'No content length');
      console.log('IP:', req.ip);
      console.log('IPs:', req.ips);
      console.log('Protocol:', req.protocol);
      console.log('Secure:', req.secure);
      console.log('========================');
      
      // Also log with winston
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
      });
      
      next();
    });

    // Enhanced response logging
    this.app.use((req, res, next) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      res.send = function(body) {
        console.log('=== OUTGOING RESPONSE (send) ===');
        console.log('Status Code:', res.statusCode);
        console.log('Status Message:', res.statusMessage);
        console.log('Headers:', res.getHeaders());
        console.log('Body Length:', Buffer.byteLength(body || '', 'utf8'));
        console.log('Body Preview:', (body || '').toString().substring(0, 200));
        console.log('==============================');
        return originalSend.call(this, body);
      };
      
      res.json = function(body) {
        console.log('=== OUTGOING RESPONSE (json) ===');
        console.log('Status Code:', res.statusCode);
        console.log('Status Message:', res.statusMessage);
        console.log('Headers:', res.getHeaders());
        console.log('JSON Body:', JSON.stringify(body, null, 2));
        console.log('==============================');
        return originalJson.call(this, body);
      };
      
      next();
    });

    // Log when response is finished
    this.app.use((req, res, next) => {
      res.on('finish', () => {
        console.log('=== RESPONSE FINISHED ===');
        console.log('Final Status:', res.statusCode);
        console.log('Response Time:', Date.now() - req.startTime);
        console.log('==========================');
      });
      
      req.startTime = Date.now();
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/status', async (req, res) => {
      try {
        console.log('Status endpoint called');
        const printers = await this.printerManager.getAvailablePrinters();
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        
        const response = {
          service: 'online',
          printers: printers,
          lastPrintTime: this.lastPrintTime,
          uptime: uptime,
          queueLength: this.printQueue.length,
          maxQueueSize: this.maxQueueSize,
          timestamp: new Date().toISOString()
        };
        
        console.log('Sending status response:', response);
        res.json(response);
      } catch (error) {
        console.error('Status endpoint error:', error);
        logger.error('Status endpoint error:', error);
        res.status(500).json({
          service: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // List printers endpoint
    this.app.get('/printers', async (req, res) => {
      try {
        console.log('Printers endpoint called');
        const printers = await this.printerManager.getAvailablePrinters();
        console.log('Available printers:', printers);
        res.json({ printers, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Printers endpoint error:', error);
        logger.error('Printers endpoint error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // NEW: Preview receipt endpoint - see what the receipt looks like without printing
    this.app.post('/preview', async (req, res) => {
      try {
        console.log('Preview endpoint called with body:', req.body);
        const { receipt } = req.body;
        
        // Validate receipt data
        const validation = this.validateReceiptData(receipt);
        if (!validation.valid) {
          console.log('Preview validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            error: `Invalid receipt data: ${validation.errors.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }

        // Get preview of receipt
        const preview = await this.receiptFormatter.previewReceipt(receipt);
        
        console.log('Preview generated successfully');
        res.json({
          success: true,
          preview: preview.preview,     // Clean text for display
          escPosCodes: preview.escPosCodes, // List of ESC/POS commands used
          rawLength: preview.raw.length,    // Size of raw data
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Preview endpoint error:', error);
        logger.error('Preview endpoint error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Test print endpoint - ENHANCED LOGGING
    this.app.post('/test-print', async (req, res) => {
      try {
        console.log('=== TEST-PRINT ENDPOINT CALLED ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Request headers:', JSON.stringify(req.headers, null, 2));
        
        const { printerName } = req.body;
        console.log('Extracted printer name:', printerName);
        
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

        console.log('Generated test receipt:', JSON.stringify(testReceipt, null, 2));
        console.log('Processing print job...');
        
        const result = await this.processPrintJob(testReceipt, printerName);
        console.log('Print job result:', JSON.stringify(result, null, 2));
        
        // Add timestamp to response
        result.timestamp = new Date().toISOString();
        result.endpoint = 'test-print';
        
        console.log('Sending final response:', JSON.stringify(result, null, 2));
        res.json(result);
        
      } catch (error) {
        console.error('=== TEST-PRINT ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('=======================');
        
        logger.error('Test print error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          errorType: error.constructor.name,
          timestamp: new Date().toISOString(),
          endpoint: 'test-print'
        });
      }
    });

    // Main print endpoint
    this.app.post('/print', async (req, res) => {
      try {
        console.log('Print endpoint called with body:', req.body);
        const { receipt } = req.body;
        
        // Validate receipt data
        const validation = this.validateReceiptData(receipt);
        if (!validation.valid) {
          console.log('Print validation failed:', validation.errors);
          return res.status(400).json({
            success: false,
            error: `Invalid receipt data: ${validation.errors.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }

        console.log('Processing print job...');
        const result = await this.processPrintJob(receipt);
        result.timestamp = new Date().toISOString();
        
        console.log('Print job completed:', result);
        res.json(result);
      } catch (error) {
        console.error('Print endpoint error:', error);
        logger.error('Print endpoint error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      console.log('Root endpoint called');
      const response = {
        service: 'POS Printer Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        endpoints: {
          print: 'POST /print',
          preview: 'POST /preview',
          testPrint: 'POST /test-print', 
          status: 'GET /status',
          printers: 'GET /printers'
        }
      };
      
      console.log('Sending root response:', response);
      res.json(response);
    });

    // Catch-all for undefined routes (must be last)
    this.app.all('*', (req, res) => {
      console.log('=== 404 - Route not found ===');
      console.log('Method:', req.method);
      console.log('URL:', req.url);
      console.log('Path:', req.path);
      console.log('============================');
      
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        method: req.method,
        path: req.path,
        availableEndpoints: {
          'GET /': 'Service info',
          'GET /status': 'Service status',
          'GET /printers': 'List printers',
          'POST /test-print': 'Test print',
          'POST /print': 'Print receipt',
          'POST /preview': 'Preview receipt'
        },
        timestamp: new Date().toISOString()
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
      console.log('Processing print job for printer:', printerName);
      
      // Check if printer is available
      const printers = await this.printerManager.getAvailablePrinters();
      console.log('Available printers:', printers.map(p => ({ name: p.name, status: p.status })));
      
      const targetPrinter = printerName ? 
        printers.find(p => p.name === printerName) : 
        printers.find(p => p.isDefault) || printers[0];

      console.log('Target printer:', targetPrinter);

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
      console.log('Formatting receipt...');
      const formattedReceipt = await this.receiptFormatter.formatReceipt(receipt);
      
      console.log('Sending to printer...');
      const printResult = await this.printerManager.print(formattedReceipt, targetPrinter.name);
      
      this.lastPrintTime = new Date().toISOString();
      logger.info('Receipt printed successfully', {
        orderNumber: receipt.orderNumber,
        printer: targetPrinter.name,
        timestamp: this.lastPrintTime
      });

      console.log('Print successful, checking queue...');
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
      console.error('Print job failed:', error);
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
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('=== UNHANDLED ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Request URL:', req.url);
      console.error('Request method:', req.method);
      console.error('Request headers:', req.headers);
      console.error('======================');
      
      logger.error('Unhandled error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      });
    });
  }

  async start() {
    try {
      console.log('Starting POS Printer Service...');
      
      // Create logs directory if it doesn't exist
      const logDir = config.logging.directory || './logs';
      await fs.mkdir(logDir, { recursive: true });
      console.log('Logs directory ready:', logDir);

      // Initialize printer manager
      console.log('Initializing printer manager...');
      await this.printerManager.initialize();
      console.log('Printer manager initialized');

      // Start server
      const port = config.server.port || 8080;
      const host = process.env.HOST || config.server.host || '127.0.0.1';

      this.server = this.app.listen(port, host, () => {
        console.log('=== SERVER STARTED SUCCESSFULLY ===');
        console.log(`Host: ${host}`);
        console.log(`Port: ${port}`);
        console.log(`URL: http://${host}:${port}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log(`PID: ${process.pid}`);
        console.log('Available endpoints:');
        console.log('  GET  / - Service info');
        console.log('  GET  /status - Service status');
        console.log('  GET  /printers - List printers');
        console.log('  POST /test-print - Test print');
        console.log('  POST /print - Print receipt');
        console.log('  POST /preview - Preview receipt');
        console.log('====================================');
        
        logger.info(`POS Printer Service started on ${host}:${port}`);
      });

      // Log server errors
      this.server.on('error', (error) => {
        console.error('=== SERVER ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('===================');
        logger.error('Server error:', error);
      });

      // Start periodic printer detection
      this.startPrinterDetection();

    } catch (error) {
      console.error('=== FAILED TO START SERVICE ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('==============================');
      
      logger.error('Failed to start service:', error);
      process.exit(1);
    }
  }

  startPrinterDetection() {
    console.log('Starting periodic printer detection...');
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
    console.log('Stopping POS Printer Service...');
    if (this.server) {
      this.server.close();
      logger.info('POS Printer Service stopped');
      console.log('POS Printer Service stopped');
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  logger.info('Received SIGTERM, shutting down gracefully');
  if (global.printerService) {
    await global.printerService.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  logger.info('Received SIGINT, shutting down gracefully');
  if (global.printerService) {
    await global.printerService.stop();
  }
  process.exit(0);
});

// Log unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED PROMISE REJECTION ===');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  console.error('=================================');
  logger.error('Unhandled promise rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error type:', error.constructor.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  console.error('=========================');
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the service
if (require.main === module) {
  console.log('Starting service as main module...');
  global.printerService = new POSPrinterService();
  global.printerService.start();
}

module.exports = POSPrinterService;
