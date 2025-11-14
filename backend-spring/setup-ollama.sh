#!/bin/bash

# Script to setup Ollama with Llama model for LMS AI Service

echo "=========================================="
echo "LMS AI Service - Ollama Setup"
echo "=========================================="
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed."
    echo ""
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh

    if [ $? -eq 0 ]; then
        echo "✅ Ollama installed successfully!"
    else
        echo "❌ Failed to install Ollama"
        exit 1
    fi
else
    echo "✅ Ollama is already installed"
fi

echo ""
echo "Starting Ollama service..."

# Start Ollama in background
ollama serve > /dev/null 2>&1 &
OLLAMA_PID=$!

echo "Waiting for Ollama to start..."
sleep 5

# Check if Ollama is running
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama is running"
else
    echo "❌ Ollama failed to start"
    exit 1
fi

echo ""
echo "Checking for Llama 3.1 model..."

# Check if model exists
if ollama list | grep -q "llama3.1"; then
    echo "✅ Llama 3.1 model is already installed"
else
    echo "📥 Downloading Llama 3.1 model (this may take a while)..."
    ollama pull llama3.1

    if [ $? -eq 0 ]; then
        echo "✅ Llama 3.1 model downloaded successfully!"
    else
        echo "❌ Failed to download Llama 3.1 model"
        exit 1
    fi
fi

echo ""
echo "Testing Llama model..."
echo "Prompt: Hello, how are you?"

# Test the model
RESPONSE=$(ollama run llama3.1 "Say hello in one sentence" 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Model test successful!"
    echo "Response: $RESPONSE"
else
    echo "❌ Model test failed"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "Ollama is running on: http://localhost:11434"
echo "PID: $OLLAMA_PID"
echo ""
echo "To stop Ollama, run: kill $OLLAMA_PID"
echo ""
echo "Available models:"
ollama list
echo ""
echo "You can now start the AI Service:"
echo "  cd lms-ai-service && mvn spring-boot:run"
echo ""

