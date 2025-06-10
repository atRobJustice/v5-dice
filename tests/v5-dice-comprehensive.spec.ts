import { test, expect } from '@playwright/test';
import { V5DicePage } from './page-objects/v5-dice-page';
import path from 'path';

test.describe('V5 Dice Comprehensive E2E Tests', () => {
  let dicePage: V5DicePage;

  test.beforeEach(async ({ page }) => {
    dicePage = new V5DicePage(page);
    await dicePage.goto();
  });

  test.describe('Dice Rolling - All Combinations', () => {
    test('should roll regular dice only - various pool sizes', async () => {
      const poolSizes = [1, 5, 10, 15, 20];
      
      for (const poolSize of poolSizes) {
        await dicePage.setDicePool(poolSize);
        await dicePage.verifyDiceInfoDisplay(poolSize);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });

    test('should roll hunger dice combinations', async () => {
      const combinations = [
        { regular: 5, hunger: 1 },
        { regular: 8, hunger: 2 },
        { regular: 10, hunger: 3 },
        { regular: 15, hunger: 4 },
        { regular: 20, hunger: 5 }
      ];
      
      for (const combo of combinations) {
        await dicePage.setDicePool(combo.regular, combo.hunger);
        await dicePage.verifyDiceInfoDisplay(combo.regular, combo.hunger);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });

    test('should roll rouse dice combinations', async () => {
      const combinations = [
        { regular: 3, rouse: 1 },
        { regular: 6, rouse: 2 },
        { regular: 10, rouse: 3 }
      ];
      
      for (const combo of combinations) {
        await dicePage.setDicePool(combo.regular, undefined, combo.rouse);
        await dicePage.verifyDiceInfoDisplay(combo.regular, undefined, combo.rouse);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });

    test('should roll remorse dice combinations', async () => {
      const combinations = [
        { regular: 5, remorse: 2 },
        { regular: 8, remorse: 5 },
        { regular: 12, remorse: 10 }
      ];
      
      for (const combo of combinations) {
        await dicePage.setDicePool(combo.regular, undefined, undefined, combo.remorse);
        await dicePage.verifyDiceInfoDisplay(combo.regular, undefined, undefined, combo.remorse);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });

    test('should roll frenzy dice combinations', async () => {
      const combinations = [
        { regular: 8, frenzy: 3 },
        { regular: 12, frenzy: 8 },
        { regular: 18, frenzy: 15 }
      ];
      
      for (const combo of combinations) {
        await dicePage.setDicePool(combo.regular, undefined, undefined, undefined, combo.frenzy);
        await dicePage.verifyDiceInfoDisplay(combo.regular, undefined, undefined, undefined, combo.frenzy);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });

    test('should roll complex multi-dice combinations', async () => {
      const complexCombinations = [
        { regular: 10, hunger: 2, rouse: 1 },
        { regular: 15, hunger: 3, remorse: 5 },
        { regular: 12, hunger: 2, frenzy: 4 },
        { regular: 20, hunger: 5, rouse: 3, remorse: 8, frenzy: 10 }
      ];
      
      for (const combo of complexCombinations) {
        await dicePage.setDicePool(combo.regular, combo.hunger, combo.rouse, combo.remorse, combo.frenzy);
        await dicePage.verifyDiceInfoDisplay(combo.regular, combo.hunger, combo.rouse, combo.remorse, combo.frenzy);
        await dicePage.rollDice();
        await dicePage.clearRoll();
      }
    });
  });

  test.describe('Progeny Character Import and Management', () => {
    const characterPath = path.resolve('data/progeny_example.json');

    test('should import sample Progeny character successfully', async () => {
      await dicePage.importProgenyCharacter(characterPath);
      await dicePage.expectCharacterDataLoaded();
      
      // Verify character name is displayed
      await expect(dicePage.page.locator('.character-name')).toContainText('Malcolm & Marcus Carter');
    });

    test('should display all character attributes correctly', async () => {
      await dicePage.importProgenyCharacter(characterPath);
      
      // Verify specific attribute values from the sample character
      const expectedAttributes = {
        'strength': '2',
        'charisma': '4', 
        'intelligence': '3',
        'dexterity': '2',
        'manipulation': '3',
        'wits': '3',
        'stamina': '2',
        'composure': '1',
        'resolve': '2'
      };
      
      for (const [attr, value] of Object.entries(expectedAttributes)) {
        const statDisplay = dicePage.page.locator(`[data-stat="${attr}"]`).first().locator('..');
        await expect(statDisplay).toContainText(value);
      }
    });

    test('should display all character skills correctly', async () => {
      await dicePage.importProgenyCharacter(characterPath);
      
      // Verify some key skill values from the sample character
      const expectedSkills = {
        'athletics': '1',
        'firearms': '2',
        'intimidation': '3',
        'subterfuge': '2',
        'investigation': '2'
      };
      
      for (const [skill, value] of Object.entries(expectedSkills)) {
        const statDisplay = dicePage.page.locator(`[data-stat="${skill}"]`).first().locator('..');
        await expect(statDisplay).toContainText(value);
      }
    });
  });

  test.describe('Character Updates - All Editable Fields', () => {
    const characterPath = path.resolve('data/progeny_example.json');

    test.beforeEach(async () => {
      await dicePage.importProgenyCharacter(characterPath);
    });

    test('should update all attributes', async () => {
      const attributes = await dicePage.getAllAttributes();
      
      for (const attribute of attributes) {
        const newValue = '4';
        await dicePage.editStat(attribute, newValue);
        
        // Verify the value was updated
        const statDisplay = dicePage.page.locator(`[data-stat="${attribute}"]`).first().locator('..');
        await expect(statDisplay).toContainText(newValue);
      }
    });

    test('should update all skills', async () => {
      const skills = await dicePage.getAllSkills();
      
      // Update a subset of skills to avoid test being too long
      const skillsToTest = skills.slice(0, 10);
      
      for (const skill of skillsToTest) {
        const newValue = '3';
        await dicePage.editStat(skill, newValue);
        
        // Verify the value was updated
        const statDisplay = dicePage.page.locator(`[data-stat="${skill}"]`).first().locator('..');
        await expect(statDisplay).toContainText(newValue);
      }
    });

    test('should update character basic info fields', async () => {
      // Test editable text fields
      const basicFields = [
        { field: 'name', newValue: 'Updated Character Name' },
        { field: 'sire', newValue: 'Updated Sire' },
        { field: 'clan', newValue: 'Updated Clan' },
        { field: 'ambition', newValue: 'Updated Ambition' },
        { field: 'desire', newValue: 'Updated Desire' }
      ];
      
      for (const fieldInfo of basicFields) {
        const editButton = dicePage.page.locator(`[data-field="${fieldInfo.field}"] .edit-button`);
        await editButton.click();
        
        const input = dicePage.page.locator('.stat-input');
        await input.fill(fieldInfo.newValue);
        await input.press('Enter');
        
        // Verify the value was updated
        const valueDisplay = dicePage.page.locator(`[data-field="${fieldInfo.field}"] .editable-value`);
        await expect(valueDisplay).toContainText(fieldInfo.newValue);
      }
    });
  });

  test.describe('Character Rolls - All Roll Buttons', () => {
    const characterPath = path.resolve('data/progeny_example.json');

    test.beforeEach(async () => {
      await dicePage.importProgenyCharacter(characterPath);
    });

    test('should roll all attribute combinations', async () => {
      const attributes = await dicePage.getAllAttributes();
      
      // Test a subset of attribute + attribute combinations
      const attributePairs = [
        ['strength', 'dexterity'],
        ['charisma', 'manipulation'],
        ['intelligence', 'wits'],
        ['stamina', 'composure']
      ];
      
      for (const [attr1, attr2] of attributePairs) {
        await dicePage.selectStat(attr1);
        await dicePage.selectStat(attr2);
        await dicePage.rollSelectedStats();
        await dicePage.clearRoll();
      }
    });

    test('should roll all attribute + skill combinations', async () => {
      const attributeSkillPairs = [
        ['strength', 'athletics'],
        ['dexterity', 'firearms'],
        ['charisma', 'persuasion'],
        ['manipulation', 'subterfuge'],
        ['intelligence', 'investigation'],
        ['wits', 'awareness']
      ];
      
      for (const [attr, skill] of attributeSkillPairs) {
        await dicePage.selectStat(attr);
        await dicePage.selectStat(skill);
        await dicePage.rollSelectedStats();
        await dicePage.clearRoll();
      }
    });

    test('should roll all discipline powers', async () => {
      // Test rolling discipline powers from the sample character
      const expectedDisciplines = [
        'Compel',
        'Mesmerize', 
        'Sense the Unseen',
        'Cloak of Shadows'
      ];
      
      for (const powerName of expectedDisciplines) {
        const powerRollButton = dicePage.page.locator('.roll-power').filter({ hasText: 'Roll' }).first();
        
        // Find the specific power and click its roll button
        const powerSection = dicePage.page.locator('.discipline-power').filter({ hasText: powerName });
        const rollButton = powerSection.locator('.roll-power');
        
        if (await rollButton.isVisible()) {
          await rollButton.click();
          await expect(dicePage.latestRoll).not.toBeEmpty({ timeout: 5000 });
          await dicePage.clearRoll();
        }
      }
    });

    test('should roll special check buttons', async () => {
      // Test Rouse, Remorse, and Frenzy check buttons
      const specialChecks = [
        '.rouse-roll-btn',
        '.remorse-roll-btn', 
        '.frenzy-roll-btn'
      ];
      
      for (const checkButton of specialChecks) {
        const button = dicePage.page.locator(checkButton);
        if (await button.isVisible()) {
          await button.click();
          await expect(dicePage.latestRoll).not.toBeEmpty({ timeout: 5000 });
          await dicePage.clearRoll();
        }
      }
    });
  });

  test.describe('Character Persistence and Export', () => {
    const characterPath = path.resolve('data/progeny_example.json');

    test('should save and reload character data', async () => {
      await dicePage.importProgenyCharacter(characterPath);
      
      // Save the character
      await dicePage.progenyMenuTrigger.click();
      await dicePage.progenySaveButton.click();
      
      // Clear and reload
      await dicePage.clearCharacter();
      
      // Reload page
      await dicePage.goto();
      await dicePage.openProgenyModal();
      
      // Character should be automatically loaded from localStorage
      await dicePage.expectCharacterDataLoaded();
    });

    test('should export character data', async () => {
      await dicePage.importProgenyCharacter(characterPath);
      
      // Set up download handler
      const downloadPromise = dicePage.page.waitForEvent('download');
      
      await dicePage.progenyMenuTrigger.click();
      await dicePage.progenyExportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.json');
    });
  });

  test.describe('UI State Management', () => {
    test('should toggle special dice visibility correctly', async () => {
      // Initially, special dice should be hidden
      await expect(dicePage.hungerDiceSlider).not.toBeVisible();
      await expect(dicePage.rouseDiceSlider).not.toBeVisible();
      await expect(dicePage.remorseDiceSlider).not.toBeVisible();
      await expect(dicePage.frenzyDiceSlider).not.toBeVisible();
      
      // Enable each special dice type
      await dicePage.hungerToggle.click();
      await expect(dicePage.hungerDiceSlider).toBeVisible();
      
      await dicePage.rouseToggle.click();
      await expect(dicePage.rouseDiceSlider).toBeVisible();
      
      await dicePage.remorseToggle.click();
      await expect(dicePage.remorseDiceSlider).toBeVisible();
      
      await dicePage.frenzyToggle.click();
      await expect(dicePage.frenzyDiceSlider).toBeVisible();
      
      // Disable them
      await dicePage.hungerToggle.click();
      await expect(dicePage.hungerDiceSlider).not.toBeVisible();
    });

    test('should clear roll results properly', async () => {
      await dicePage.setDicePool(5);
      await dicePage.rollDice();
      
      // Result should be visible
      await expect(dicePage.latestRoll).not.toBeEmpty();
      
      // Clear the result
      await dicePage.clearRoll();
      
      // Result should be empty
      await expect(dicePage.latestRoll).toBeEmpty();
    });
  });
});