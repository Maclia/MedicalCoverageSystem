#!/bin/bash

# Health check script for Claims Service

SERVICE_URL=${1:-http://localhost:3005}

echo "Checking Claims Service health at $SERVICE_URL..."

# Check if service is responding
if curl -s --fail "$SERVICE_URL/health" > /dev/null; then
  echo "✅ Claims Service is UP"
  
  # Get detailed health info
  echo "Service Details:"
  curl -s "$SERVICE_URL/health" | jq '.' 2>/dev/null || echo "Service responded but response is not valid JSON"
else
  echo "❌ Claims Service is DOWN"
  exit 1
fi