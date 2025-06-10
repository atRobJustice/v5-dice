# V5 Dice E2E Test Setup

## Prerequisites
1. Install Node.js (https://nodejs.org/)
2. Install npm (comes with Node.js)

## Setup Steps
1. Open terminal in the project directory
2. Run: `npm install`
3. Run: `npx playwright install`

## Running Tests
- Run all tests: `npm test`
- Run with browser visible: `npm run test:headed`
- Debug tests: `npm run test:debug`
- Run specific test: `npx playwright test tests/v5-dice-comprehensive.spec.ts --reporter=line`

## Test Coverage
The comprehensive E2E test covers:

### 1. Dice Rolling - All Combinations
- Regular dice (1-20)
- Hunger dice combinations (1-5)
- Rouse dice combinations (1-3) 
- Remorse dice combinations (1-10)
- Frenzy dice combinations (1-15)
- Complex multi-dice combinations

### 2. Progeny Character Import
- Import sample character from data/progeny_example.json
- Verify character data loads correctly
- Display all attributes and skills with correct values

### 3. Character Updates - All Editable Fields
- Update all 9 attributes (strength, charisma, intelligence, dexterity, manipulation, wits, stamina, composure, resolve)
- Update all 27 skills
- Update basic character info (name, sire, clan, ambition, desire)

### 4. Character Rolls - All Roll Buttons
- Roll attribute combinations
- Roll attribute + skill combinations  
- Roll all discipline powers (Compel, Mesmerize, Sense the Unseen, Cloak of Shadows)
- Roll special checks (Rouse, Remorse, Frenzy)

### 5. Character Persistence and Export
- Save character data to localStorage
- Reload character from localStorage
- Export character as JSON file

### 6. UI State Management
- Toggle special dice visibility
- Clear roll results
- Modal open/close functionality