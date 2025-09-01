#!/bin/bash

# Development Server Startup Script
# This script starts the POS Printer Service in development mode

echo "🚀 Starting POS Printer Service - Development Mode"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if config.json exists
if [ ! -f "config.json" ]; then
    echo "❌ config.json not found. Please ensure the configuration file exists."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo "✅ Dependencies checked"
echo "✅ Configuration loaded"
echo "✅ Logs directory ready"
echo ""
echo "🖨️  Starting development server..."
echo "📝 Receipts will be displayed in the console (no physical printer needed)"
echo ""

# Start the development server
node server-dev.js
