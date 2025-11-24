#!/bin/bash

# Install script for frametv_v4 monorepo
# Installs Node.js dependencies and sets up Python virtual environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Installing frametv_v4 monorepo dependencies...${NC}\n"

# Get the root directory (where this script is located)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Function to check if Python 3.12+ is available
check_python() {
    if command -v python3.12 &> /dev/null; then
        PYTHON_CMD="python3.12"
    elif command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 12 ]; then
            PYTHON_CMD="python3"
        else
            echo -e "${RED}❌ Python 3.12+ is required but found Python $PYTHON_VERSION${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Python 3.12+ is required but not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Found Python: $($PYTHON_CMD --version)${NC}"
}

# Function to setup Python virtual environment
setup_python_venv() {
    local project_dir="$1"
    local project_name="$2"
    local install_cmd="$3"
    
    echo -e "\n${YELLOW}🐍 Setting up Python environment for $project_name...${NC}"
    
    cd "$project_dir"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d ".venv" ]; then
        echo -e "${BLUE}  Creating virtual environment...${NC}"
        $PYTHON_CMD -m venv .venv
    else
        echo -e "${GREEN}  Virtual environment already exists${NC}"
    fi
    
    # Activate virtual environment and install dependencies
    echo -e "${BLUE}  Installing dependencies...${NC}"
    source .venv/bin/activate
    
    # Upgrade pip first
    pip install --upgrade pip --quiet
    
    # Install project dependencies
    eval "$install_cmd"
    
    deactivate
    
    echo -e "${GREEN}✓ $project_name setup complete${NC}"
    cd "$ROOT_DIR"
}

# Check Python version
check_python

# Install Node.js dependencies
echo -e "\n${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Node.js dependencies installed${NC}"

# Setup Python projects
setup_python_venv \
    "$ROOT_DIR/apps/sync-service" \
    "sync-service" \
    "pip install -e ."

setup_python_venv \
    "$ROOT_DIR/apps/database-service" \
    "database-service" \
    "pip install -e ."

setup_python_venv \
    "$ROOT_DIR/apps/tvtest" \
    "tvtest" \
    "pip install -r requirements.txt"

echo -e "\n${GREEN}✅ Installation complete!${NC}"
echo -e "${GREEN}💡 Run 'npm run dev' to start all services${NC}\n"

