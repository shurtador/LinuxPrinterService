#!/bin/bash

# Quick test script for POS Printer Service
# This script tests all the main endpoints

BASE_URL="http://localhost:8080"

print_header() {
    echo "=================================================="
    echo "  POS Printer Service - API Test"
    echo "=================================================="
    echo ""
}

test_status() {
    echo "🔍 Testing service status..."
    response=$(curl -s -w "%{http_code}" "$BASE_URL/status" -o /tmp/status_response.json)
    
    if [ "$response" = "200" ]; then
        echo "✅ Status endpoint working"
        echo "Response:"
        cat /tmp/status_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/status_response.json
        echo ""
    else
        echo "❌ Status endpoint failed (HTTP $response)"
        return 1
    fi
}

test_printers() {
    echo "🖨️  Testing printers endpoint..."
    response=$(curl -s -w "%{http_code}" "$BASE_URL/printers" -o /tmp/printers_response.json)
    
    if [ "$response" = "200" ]; then
        echo "✅ Printers endpoint working"
        echo "Response:"
        cat /tmp/printers_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/printers_response.json
        echo ""
    else
        echo "❌ Printers endpoint failed (HTTP $response)"
        return 1
    fi
}

test_print() {
    echo "📄 Testing print endpoint..."
    
    # Test receipt data
    receipt_data='{
      "receipt": {
        "orderNumber": "TEST-001",
        "date": "'$(date -Iseconds)'",
        "cashier": "Test Cashier",
        "items": [
          {
            "name": "Test Burger",
            "quantity": 1,
            "price": 12.99,
            "total": 12.99
          },
          {
            "name": "Test Fries",
            "quantity": 1,
            "price": 3.99,
            "total": 3.99
          }
        ],
        "subtotal": 16.98,
        "tax": 1.44,
        "total": 18.42,
        "paymentMethod": "cash",
        "tendered": 20.00,
        "change": 1.58
      }
    }'
    
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$receipt_data" \
        "$BASE_URL/print" \
        -o /tmp/print_response.json)
    
    if [ "$response" = "200" ]; then
        echo "✅ Print endpoint working"
        echo "Response:"
        cat /tmp/print_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/print_response.json
        echo ""
    else
        echo "❌ Print endpoint failed (HTTP $response)"
        echo "Response:"
        cat /tmp/print_response.json
        echo ""
        return 1
    fi
}

test_print_test() {
    echo "🧪 Testing test-print endpoint..."
    
    response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$BASE_URL/test-print" \
        -o /tmp/test_print_response.json)
    
    if [ "$response" = "200" ]; then
        echo "✅ Test-print endpoint working"
        echo "Response:"
        cat /tmp/test_print_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/test_print_response.json
        echo ""
    else
        echo "❌ Test-print endpoint failed (HTTP $response)"
        echo "Response:"
        cat /tmp/test_print_response.json
        echo ""
        return 1
    fi
}

cleanup() {
    rm -f /tmp/status_response.json
    rm -f /tmp/printers_response.json
    rm -f /tmp/print_response.json
    rm -f /tmp/test_print_response.json
}

main() {
    print_header
    
    # Check if service is running
    if ! curl -s "$BASE_URL" > /dev/null; then
        echo "❌ Service is not running or not accessible at $BASE_URL"
        echo ""
        echo "Please check:"
        echo "- Is the service running? sudo systemctl status pos-printer-service"
        echo "- Is it listening on the right port? netstat -tlnp | grep 8080"
        echo "- Are there any errors in logs? sudo journalctl -u pos-printer-service -n 20"
        exit 1
    fi
    
    echo "🚀 Service is running, starting tests..."
    echo ""
    
    # Run tests
    test_status || echo "⚠️  Status test failed, continuing..."
    test_printers || echo "⚠️  Printers test failed, continuing..."
    test_print_test || echo "⚠️  Test-print failed, continuing..."
    test_print || echo "⚠️  Print test failed, continuing..."
    
    echo "=================================================="
    echo "  Test completed!"
    echo "=================================================="
    echo ""
    echo "If you saw any ❌ errors above, check:"
    echo "- Service logs: sudo journalctl -u pos-printer-service -f"
    echo "- Printer status: lpstat -p"
    echo "- CUPS status: sudo systemctl status cups"
    
    cleanup
}

# Run tests
main "$@"