const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

class PrinterManager {
  constructor(logger) {
    this.logger = logger;
    this.printers = [];
    this.defaultPrinter = null;
    this.cupsAvailable = false;
  }

  async initialize() {
    try {
      // Check if CUPS is available
      await this.checkCupsAvailability();
      
      // Get initial list of printers
      await this.refreshPrinters();
      
      this.logger.info('Printer manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize printer manager:', error);
      throw error;
    }
  }

    async checkCupsAvailability() {
    try {
      // Check if lpstat command is available (part of CUPS)
      await execAsync('which lpstat');
      
      // Force English output so parsing works in any locale
      const { stdout } = await execAsync('LC_ALL=C lpstat -r');
      
      if (stdout.toLowerCase().includes('scheduler is running')) {
        this.cupsAvailable = true;
        this.logger.info('CUPS is available and running');
      } else {
        throw new Error(`Unexpected lpstat output: ${stdout.trim()}`);
      }
    } catch (error) {
      this.cupsAvailable = false;
      this.logger.error('CUPS not available:', error.message);
      throw new Error('CUPS is not installed or not running. Please install CUPS and ensure it\'s running.');
    }
  }

  async refreshPrinters() {
    try {
      if (!this.cupsAvailable) {
        throw new Error('CUPS not available');
      }

      // Get list of all printers - FIXED: Force English output
      const { stdout: printerList } = await execAsync('LC_ALL=C lpstat -p');
      const { stdout: defaultPrinter } = await execAsync('LC_ALL=C lpstat -d').catch(() => ({ stdout: '' }));
      
      // Parse printer list
      this.printers = [];
      const printerLines = printerList.split('\n').filter(line => line.trim());
      
      for (const line of printerLines) {
        const match = line.match(/printer (\S+) (.+)/);
        if (match) {
          const name = match[1];
          const statusText = match[2];
          
          // Get detailed printer info
          const info = await this.getPrinterInfo(name);
          
          const printer = {
            name: name,
            status: this.parsePrinterStatus(statusText),
            isDefault: defaultPrinter.includes(name),
            model: info.model || 'Unknown',
            location: info.location || '',
            description: info.description || ''
          };
          
          this.printers.push(printer);
          
          if (printer.isDefault) {
            this.defaultPrinter = name;
          }
        }
      }

      // If no default printer set, use first available online printer
      if (!this.defaultPrinter && this.printers.length > 0) {
        const onlinePrinter = this.printers.find(p => p.status === 'online');
        if (onlinePrinter) {
          this.defaultPrinter = onlinePrinter.name;
          onlinePrinter.isDefault = true;
        }
      }

      this.logger.info(`Found ${this.printers.length} printers`, {
        printers: this.printers.map(p => ({ name: p.name, status: p.status })),
        defaultPrinter: this.defaultPrinter
      });

    } catch (error) {
      this.logger.error('Failed to refresh printers:', error);
      throw error;
    }
  }

  async getPrinterInfo(printerName) {
    try {
      // FIXED: Force English output
      const { stdout } = await execAsync(`LC_ALL=C lpoptions -p ${printerName} -l`);
      
      // Parse printer options to get model and other info
      const info = {
        model: 'Unknown',
        location: '',
        description: ''
      };

      // Try to get more detailed info from lpstat
      try {
        // FIXED: Force English output
        const { stdout: detailInfo } = await execAsync(`LC_ALL=C lpstat -l -p ${printerName}`);
        const lines = detailInfo.split('\n');
        
        for (const line of lines) {
          if (line.includes('Description:')) {
            info.description = line.replace(/.*Description:\s*/, '').trim();
          }
          if (line.includes('Location:')) {
            info.location = line.replace(/.*Location:\s*/, '').trim();
          }
          if (line.includes('make-and-model')) {
            info.model = line.replace(/.*make-and-model[^:]*:\s*/, '').trim();
          }
        }
      } catch (detailError) {
        // Ignore errors getting detailed info
      }

      return info;
    } catch (error) {
      return { model: 'Unknown', location: '', description: '' };
    }
  }

  parsePrinterStatus(statusText) {
    const lowerStatus = statusText.toLowerCase();
    
    if (lowerStatus.includes('idle') || lowerStatus.includes('ready')) {
      return 'online';
    } else if (lowerStatus.includes('disabled') || lowerStatus.includes('stopped')) {
      return 'offline';
    } else if (lowerStatus.includes('busy') || lowerStatus.includes('printing')) {
      return 'online'; // Busy but available
    } else {
      return 'error';
    }
  }

  async getAvailablePrinters() {
    await this.refreshPrinters();
    return this.printers;
  }

  async print(receiptText, printerName = null) {
    try {
      if (!this.cupsAvailable) {
        throw new Error('CUPS not available');
      }

      const targetPrinter = printerName || this.defaultPrinter;
      
      if (!targetPrinter) {
        throw new Error('No printer specified and no default printer available');
      }

      // Verify printer exists and is online
      const printer = this.printers.find(p => p.name === targetPrinter);
      if (!printer) {
        throw new Error(`Printer '${targetPrinter}' not found`);
      }

      if (printer.status !== 'online') {
        throw new Error(`Printer '${targetPrinter}' is ${printer.status}`);
      }

      // Create temporary file for receipt text
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `receipt_${Date.now()}.txt`);
      
      await fs.writeFile(tempFile, receiptText, 'utf8');

      try {
        // Print using lp command with options for thermal printer - FIXED: Force English output
        const printCommand = `LC_ALL=C lp -d ${targetPrinter} -o raw -o cpi=17 -o lpi=8 "${tempFile}"`;
        const { stdout, stderr } = await execAsync(printCommand);
        
        if (stderr && !stderr.includes('request id')) {
          throw new Error(`Print command failed: ${stderr}`);
        }

        // Extract job ID from output
        const jobIdMatch = stdout.match(/request id is [^-]+-(\d+)/);
        const jobId = jobIdMatch ? jobIdMatch[1] : 'unknown';

        this.logger.info('Print job submitted successfully', {
          printer: targetPrinter,
          jobId: jobId,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          printer: targetPrinter,
          jobId: jobId
        };

      } finally {
        // Clean up temporary file
        try {
          await fs.unlink(tempFile);
        } catch (unlinkError) {
          this.logger.warn('Failed to clean up temporary file:', unlinkError);
        }
      }

    } catch (error) {
      this.logger.error('Print operation failed:', error);
      throw error;
    }
  }

  async getPrintJobStatus(jobId) {
    try {
      // FIXED: Force English output
      const { stdout } = await execAsync(`LC_ALL=C lpq -a`);
      const jobs = stdout.split('\n').filter(line => line.includes(jobId));
      
      if (jobs.length === 0) {
        return 'completed';
      }
      
      const jobLine = jobs[0];
      if (jobLine.includes('active')) {
        return 'printing';
      } else {
        return 'queued';
      }
    } catch (error) {
      this.logger.error('Failed to get print job status:', error);
      return 'unknown';
    }
  }

  async cancelPrintJob(jobId) {
    try {
      // FIXED: Force English output
      await execAsync(`LC_ALL=C cancel ${jobId}`);
      this.logger.info('Print job cancelled:', { jobId });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel print job:', error);
      return false;
    }
  }

  // Test if a printer is working properly
  async testPrinter(printerName) {
    try {
      const testText = `
================================
        PRINTER TEST
================================
Date: ${new Date().toLocaleString()}
Printer: ${printerName}

This is a test print to verify
that your thermal printer is
working correctly.

If you can read this message,
your printer is functioning
properly!
================================
      TEST COMPLETED
================================



`;

      const result = await this.print(testText, printerName);
      return {
        success: true,
        message: 'Test print sent successfully',
        jobId: result.jobId
      };
    } catch (error) {
      this.logger.error('Printer test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get printer capabilities and supported options
  async getPrinterOptions(printerName) {
    try {
      // FIXED: Force English output
      const { stdout } = await execAsync(`LC_ALL=C lpoptions -p ${printerName} -l`);
      
      const options = {};
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/([^:]+):\s*(.+)/);
        if (match) {
          const option = match[1].trim();
          const values = match[2].split(' ').map(v => v.replace(/\*/g, ''));
          options[option] = values;
        }
      }

      return options;
    } catch (error) {
      this.logger.error('Failed to get printer options:', error);
      return {};
    }
  }
}

module.exports = PrinterManager;
