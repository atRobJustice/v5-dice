# PowerShell script to set up and run V5 Dice E2E tests

Write-Host "V5 Dice E2E Test Runner" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm is not available. Please install npm." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Install Playwright browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
npx playwright install

# Run the comprehensive test
Write-Host "Running V5 Dice comprehensive E2E tests..." -ForegroundColor Yellow
npx playwright test tests/v5-dice-comprehensive.spec.ts --reporter=line

Write-Host "Test execution completed!" -ForegroundColor Green