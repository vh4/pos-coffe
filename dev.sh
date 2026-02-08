#!/bin/bash

# Script to fix permission issues and start the dev server

echo "🔧 Fixing permissions and cleaning up..."

# Fix ownership of .next directory if it exists
if [ -d ".next" ]; then
    echo "📁 Fixing .next directory ownership..."
    sudo chown -R $USER:$USER .next 2>/dev/null || true
    echo "🗑️  Removing .next directory..."
    rm -rf .next
fi

# Fix ownership of node_modules if needed
if [ -d "node_modules" ]; then
    echo "📦 Checking node_modules ownership..."
    sudo chown -R $USER:$USER node_modules 2>/dev/null || true
fi

echo "✨ Cleanup complete!"
echo "🚀 Starting development server..."
echo ""

# Start the dev server
npm run dev
