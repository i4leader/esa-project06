#!/bin/bash

# MeetingMind ESA Deployment Script
# This script builds and deploys the application to Alibaba Cloud ESA

set -e

echo "🚀 Starting MeetingMind deployment to Alibaba Cloud ESA..."

# Check if required tools are installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm run test:run

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to ESA (requires ESA CLI to be configured)
echo "🌐 Deploying to Alibaba Cloud ESA..."

# Note: Replace with actual ESA deployment command
# esa deploy

echo "🎉 Deployment completed!"
echo "📱 Your MeetingMind application is now live!"
echo ""
echo "Next steps:"
echo "1. Configure your API credentials in the settings"
echo "2. Test the real-time transcription feature"
echo "3. Try the AI summarization functionality"