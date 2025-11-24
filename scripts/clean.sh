#!/bin/bash

# Clean script for frametv_v4 monorepo
# Removes all generated files, dependencies, and build artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Cleaning frametv_v4 monorepo...${NC}\n"

# Get the root directory (where this script is located)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Counter for removed items
REMOVED_COUNT=0

# Function to remove directories/files and count them
remove_pattern() {
    local pattern="$1"
    local description="$2"
    
    if [ -n "$(find . -name "$pattern" -type d 2>/dev/null | head -1)" ] || [ -n "$(find . -name "$pattern" -type f 2>/dev/null | head -1)" ]; then
        echo -e "${YELLOW}  Removing $description...${NC}"
        find . -name "$pattern" -type d -prune -exec rm -rf {} + 2>/dev/null || true
        find . -name "$pattern" -type f -delete 2>/dev/null || true
        COUNT=$(find . -name "$pattern" 2>/dev/null | wc -l | tr -d ' ')
        REMOVED_COUNT=$((REMOVED_COUNT + COUNT))
    fi
}

# Node.js dependencies
echo -e "${GREEN}📦 Cleaning Node.js dependencies...${NC}"
remove_pattern "node_modules" "node_modules directories"

# Python virtual environments
echo -e "${GREEN}🐍 Cleaning Python virtual environments...${NC}"
remove_pattern "venv" "venv directories"
remove_pattern ".venv" ".venv directories"
remove_pattern "env" "env directories"
remove_pattern "ENV" "ENV directories"
remove_pattern "env.bak" "env.bak directories"
remove_pattern "venv.bak" "venv.bak directories"

# Python cache files
echo -e "${GREEN}🐍 Cleaning Python cache files...${NC}"
remove_pattern "__pycache__" "__pycache__ directories"
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -prune -exec rm -rf {} + 2>/dev/null || true

# Python build artifacts
echo -e "${GREEN}🐍 Cleaning Python build artifacts...${NC}"
find . -type d -name "dist" -not -path "*/node_modules/*" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "build" -not -path "*/node_modules/*" -prune -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.egg" -not -path "*/node_modules/*" -delete 2>/dev/null || true

# Turbo cache
echo -e "${GREEN}⚡ Cleaning Turbo cache...${NC}"
remove_pattern ".turbo" ".turbo cache directories"

# Next.js build artifacts
echo -e "${GREEN}⚛️  Cleaning Next.js build artifacts...${NC}"
remove_pattern ".next" ".next directories"
remove_pattern "out" "out directories"
remove_pattern ".swc" ".swc directories"

# Test artifacts
echo -e "${GREEN}🧪 Cleaning test artifacts...${NC}"
remove_pattern "test-results" "test-results directories"
remove_pattern "playwright-report" "playwright-report directories"
remove_pattern "coverage" "coverage directories"
remove_pattern ".pytest_cache" ".pytest_cache directories"
remove_pattern ".coverage" ".coverage files"
remove_pattern "htmlcov" "htmlcov directories"
remove_pattern ".nyc_output" ".nyc_output directories"
find . -type f -name "*.lcov" -delete 2>/dev/null || true

# Lock files (optional - uncomment if you want to remove these too)
# echo -e "${GREEN}🔒 Cleaning lock files...${NC}"
# find . -name "package-lock.json" -not -path "*/node_modules/*" -delete 2>/dev/null || true
# find . -name "yarn.lock" -not -path "*/node_modules/*" -delete 2>/dev/null || true
# find . -name "pnpm-lock.yaml" -not -path "*/node_modules/*" -delete 2>/dev/null || true

# Other build artifacts
echo -e "${GREEN}🔨 Cleaning other build artifacts...${NC}"
find . -type f -name "*.tsbuildinfo" -delete 2>/dev/null || true
find . -type f -name "MANIFEST" -not -path "*/node_modules/*" -delete 2>/dev/null || true

# Log files
echo -e "${GREEN}📝 Cleaning log files...${NC}"
find . -type f -name "npm-debug.log*" -delete 2>/dev/null || true
find . -type f -name "yarn-debug.log*" -delete 2>/dev/null || true
find . -type f -name "yarn-error.log*" -delete 2>/dev/null || true
find . -type f -name "lerna-debug.log*" -delete 2>/dev/null || true
find . -type f -name ".pnpm-debug.log*" -delete 2>/dev/null || true

echo -e "\n${GREEN}✅ Cleanup complete!${NC}"
echo -e "${GREEN}💡 Run 'npm install' to reinstall dependencies${NC}"
echo -e "${GREEN}💡 Run 'npm run dev' to start development${NC}\n"

