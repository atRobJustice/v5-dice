import { expect, Locator, Page } from '@playwright/test';

export class V5DicePage {
  readonly page: Page;
  
  // Main dice controls
  readonly regularDiceSlider: Locator;
  readonly hungerDiceSlider: Locator;
  readonly rouseDiceSlider: Locator;
  readonly remorseDiceSlider: Locator;
  readonly frenzyDiceSlider: Locator;
  
  // Special dice toggles
  readonly hungerToggle: Locator;
  readonly rouseToggle: Locator;
  readonly remorseToggle: Locator;
  readonly frenzyToggle: Locator;
  
  // Main roll button
  readonly rollButton: Locator;
  
  // Result display
  readonly latestRoll: Locator;
  readonly clearRollButton: Locator;
  
  // Modal toggles
  readonly progenyToggle: Locator;
  readonly discordToggle: Locator;
  readonly legendToggle: Locator;
  
  // Progeny modal
  readonly progenyModal: Locator;
  readonly progenyFileInput: Locator;
  readonly progenyFileLabel: Locator;
  readonly characterStats: Locator;
  readonly progenyCloseButton: Locator;
  readonly progenyImportButton: Locator;
  readonly progenyClearButton: Locator;
  readonly progenyExportButton: Locator;
  readonly progenySaveButton: Locator;
  readonly progenyMenuTrigger: Locator;
  
  // Dice info displays
  readonly regularInfo: Locator;
  readonly hungerInfo: Locator;
  readonly rouseInfo: Locator;
  readonly remorseInfo: Locator;
  readonly frenzyInfo: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Main dice controls
    this.regularDiceSlider = page.locator('#regular_pool');
    this.hungerDiceSlider = page.locator('#hunger_pool');
    this.rouseDiceSlider = page.locator('#rouse_pool');
    this.remorseDiceSlider = page.locator('#remorse_pool');
    this.frenzyDiceSlider = page.locator('#frenzy_pool');
    
    // Special dice toggles
    this.hungerToggle = page.locator('[data-target="hunger"]');
    this.rouseToggle = page.locator('[data-target="rouse"]');
    this.remorseToggle = page.locator('[data-target="remorse"]');
    this.frenzyToggle = page.locator('[data-target="frenzy"]');
    
    // Main roll button
    this.rollButton = page.locator('#throw');
    
    // Result display
    this.latestRoll = page.locator('#latest-roll');
    this.clearRollButton = page.locator('#clear-roll');
    
    // Modal toggles
    this.progenyToggle = page.locator('#toggle-progeny');
    this.discordToggle = page.locator('#toggle-discord');
    this.legendToggle = page.locator('#toggle-legend');
    
    // Progeny modal
    this.progenyModal = page.locator('#progeny-modal');
    this.progenyFileInput = page.locator('#progeny-file');
    this.progenyFileLabel = page.locator('label[for="progeny-file"]');
    this.characterStats = page.locator('#character-stats');
    this.progenyCloseButton = page.locator('#close-progeny');
    this.progenyImportButton = page.locator('#import-progeny');
    this.progenyClearButton = page.locator('#clear-progeny');
    this.progenyExportButton = page.locator('#export-progeny');
    this.progenySaveButton = page.locator('#save-progeny');
    this.progenyMenuTrigger = page.locator('#menu-trigger');
    
    // Dice info displays
    this.regularInfo = page.locator('#regular-info');
    this.hungerInfo = page.locator('#hunger-info');
    this.rouseInfo = page.locator('#rouse-info');
    this.remorseInfo = page.locator('#remorse-info');
    this.frenzyInfo = page.locator('#frenzy-info');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    // Wait for dice initialization
    await this.page.waitForFunction(() => window.diceInitialized === true, { timeout: 10000 });
  }

  async setDicePool(regular: number, hunger?: number, rouse?: number, remorse?: number, frenzy?: number) {
    await this.regularDiceSlider.fill(regular.toString());
    
    if (hunger !== undefined) {
      await this.enableSpecialDice('hunger');
      await this.hungerDiceSlider.fill(hunger.toString());
    }
    
    if (rouse !== undefined) {
      await this.enableSpecialDice('rouse');
      await this.rouseDiceSlider.fill(rouse.toString());
    }
    
    if (remorse !== undefined) {
      await this.enableSpecialDice('remorse');
      await this.remorseDiceSlider.fill(remorse.toString());
    }
    
    if (frenzy !== undefined) {
      await this.enableSpecialDice('frenzy');
      await this.frenzyDiceSlider.fill(frenzy.toString());
    }
  }

  async enableSpecialDice(type: 'hunger' | 'rouse' | 'remorse' | 'frenzy') {
    const toggle = this.page.locator(`[data-target="${type}"]`);
    const isVisible = await this.page.locator(`#${type}_pool`).isVisible();
    
    if (!isVisible) {
      await toggle.click();
      await this.page.locator(`#${type}_pool`).waitFor({ state: 'visible' });
    }
  }

  async rollDice() {
    await this.rollButton.click();
    // Wait for roll result to appear
    await expect(this.latestRoll).not.toBeEmpty({ timeout: 5000 });
  }

  async clearRoll() {
    await this.clearRollButton.click();
    await expect(this.latestRoll).toBeEmpty();
  }

  async openProgenyModal() {
    await this.progenyToggle.click();
    await expect(this.progenyModal).not.toHaveClass(/hidden/);
  }

  async closeProgenyModal() {
    await this.progenyCloseButton.click();
    await expect(this.progenyModal).toHaveClass(/hidden/);
  }

  async importProgenyCharacter(filePath: string) {
    await this.openProgenyModal();
    
    // Open the menu first
    await this.progenyMenuTrigger.click();
    await this.progenyImportButton.click();
    
    // Upload file
    await this.progenyFileInput.setInputFiles(filePath);
    
    // Wait for character stats to be visible
    await expect(this.characterStats).not.toHaveClass(/hidden/);
  }

  async getStatButton(statName: string): Promise<Locator> {
    return this.page.locator(`.select-button[data-stat="${statName}"]`);
  }

  async getEditButton(statName: string): Promise<Locator> {
    return this.page.locator(`.edit-button[data-stat="${statName}"]`);
  }

  async selectStat(statName: string) {
    const button = await this.getStatButton(statName);
    await button.click();
  }

  async editStat(statName: string, newValue: string) {
    const editButton = await this.getEditButton(statName);
    await editButton.click();
    
    const input = this.page.locator('.stat-input');
    await input.fill(newValue);
    await input.press('Enter');
  }

  async rollSelectedStats() {
    const rollButton = this.page.locator('.paired-roll-button');
    await rollButton.click();
    await expect(this.latestRoll).not.toBeEmpty({ timeout: 5000 });
  }

  async rollDisciplinePower(disciplineName: string, powerName: string) {
    const powerButton = this.page.locator(`.roll-power`).filter({ hasText: powerName });
    await powerButton.click();
    await expect(this.latestRoll).not.toBeEmpty({ timeout: 5000 });
  }

  async getAllAttributes(): Promise<string[]> {
    const attributes = ['strength', 'charisma', 'intelligence', 'dexterity', 'manipulation', 'wits', 'stamina', 'composure', 'resolve'];
    return attributes;
  }

  async getAllSkills(): Promise<string[]> {
    const skills = [
      'athletics', 'brawl', 'craft', 'drive', 'firearms', 'melee', 'larceny', 'stealth', 'survival',
      'animal ken', 'etiquette', 'insight', 'intimidation', 'leadership', 'performance', 'persuasion', 'streetwise', 'subterfuge',
      'academics', 'awareness', 'finance', 'investigation', 'medicine', 'occult', 'politics', 'science', 'technology'
    ];
    return skills;
  }

  async verifyDiceInfoDisplay(regular: number, hunger?: number, rouse?: number, remorse?: number, frenzy?: number) {
    await expect(this.regularInfo).toHaveText(`${regular} Regular Dice`);
    
    if (hunger !== undefined) {
      await expect(this.hungerInfo).toHaveText(`${hunger} Hunger Dice`);
    }
    
    if (rouse !== undefined) {
      await expect(this.rouseInfo).toHaveText(`${rouse} Rouse Dice`);
    }
    
    if (remorse !== undefined) {
      await expect(this.remorseInfo).toHaveText(`${remorse} Remorse Dice`);
    }
    
    if (frenzy !== undefined) {
      await expect(this.frenzyInfo).toHaveText(`${frenzy} Frenzy Dice`);
    }
  }

  async expectCharacterDataLoaded() {
    await expect(this.characterStats).not.toHaveClass(/hidden/);
    await expect(this.page.locator('.character-name')).toBeVisible();
  }

  async clearCharacter() {
    await this.progenyMenuTrigger.click();
    await this.progenyClearButton.click();
    
    // Handle confirmation dialog
    this.page.on('dialog', dialog => dialog.accept());
    
    await expect(this.characterStats).toHaveClass(/hidden/);
  }
}