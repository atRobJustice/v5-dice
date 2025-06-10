# V5 Dice E2E Tests

This directory contains comprehensive End-to-End tests for the V5 Dice Roller application using Playwright.

## Test Structure

### Page Object Model
- `page-objects/v5-dice-page.ts` - Main page object with all locators and methods

### Test Scenarios  
- `v5-dice-comprehensive.spec.ts` - Complete test suite covering all functionality

## Test Coverage

### 1. Dice Rolling - All Combinations ✅
Tests every possible dice combination:
- Regular dice pools (1-20 dice)
- Hunger dice (1-5 dice) 
- Rouse dice (1-3 dice)
- Remorse dice (1-10 dice)
- Frenzy dice (1-15 dice)
- Complex multi-type combinations

### 2. Progeny Character Import ✅
- Import sample character from `data/progeny_example.json`
- Verify character data loads correctly
- Validate all attributes and skills display proper values

### 3. Character Updates - All Editable Fields ✅
Tests updating every editable field:
- **Attributes (9)**: strength, charisma, intelligence, dexterity, manipulation, wits, stamina, composure, resolve
- **Skills (27)**: athletics, brawl, craft, drive, firearms, melee, larceny, stealth, survival, animal ken, etiquette, insight, intimidation, leadership, performance, persuasion, streetwise, subterfuge, academics, awareness, finance, investigation, medicine, occult, politics, science, technology
- **Basic Info**: name, sire, clan, ambition, desire

### 4. Character Rolls - All Roll Buttons ✅
Tests every rollable combination:
- Attribute + Attribute pairs
- Attribute + Skill pairs
- Discipline powers from imported character:
  - Compel (Charisma + Dominate)
  - Mesmerize (Manipulation + Dominate)  
  - Sense the Unseen (Wits/Resolve + Auspex)
  - Cloak of Shadows (Wits + Obfuscate/Stealth)
- Special check rolls (Rouse, Remorse, Frenzy)

### 5. Character Persistence and Export ✅
- Save character to localStorage
- Reload character from localStorage  
- Export character as JSON download

### 6. UI State Management ✅
- Toggle special dice visibility
- Clear roll results
- Modal open/close functionality

## Running Tests

### Prerequisites
1. Node.js installed
2. Dependencies installed: `npm install`
3. Playwright browsers installed: `npx playwright install`

### Commands
```bash
# Run all tests
npm test

# Run with browser visible  
npm run test:headed

# Debug mode
npm run test:debug

# Run specific test file
npx playwright test tests/v5-dice-comprehensive.spec.ts --reporter=line

# Use PowerShell script (Windows)
./run-tests.ps1
```

## Test Data

The tests use the sample character file:
- `data/progeny_example.json` - Malcolm & Marcus Carter (Tremere)

## Assertions

Each test verifies:
- UI elements are visible/hidden as expected
- Dice rolls produce results
- Character data loads and displays correctly
- Updates persist properly
- Export functionality works
- Roll results appear and can be cleared

## Browser Support

Tests run on:
- Chromium (default)
- Can be extended to Firefox, Safari via playwright.config.ts