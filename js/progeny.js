class ProgenyManager {
    constructor() {
        this.character = null;
        this.originalJson = null;  // Store the original JSON
        this.selectedStat = null;
        this.secondStat = null;
        this.initializeEventListeners();
        this.createNotificationElement();
        this.loadSavedCharacter(); // Load saved character on initialization
    }
    
    // Helper method to capitalize the first letter of a string
    capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    initializeEventListeners() {
        const fileInput = document.getElementById('progeny-file');
        const importButton = document.getElementById('import-progeny');
        const clearButton = document.getElementById('clear-progeny');
        const toggleButton = document.getElementById('toggle-progeny');
        const closeButton = document.getElementById('close-progeny');
        const exportButton = document.getElementById('export-progeny');
        const saveButton = document.getElementById('save-progeny');
        const menuTrigger = document.getElementById('menu-trigger');

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            const menu = document.querySelector('.context-menu');
            if (!menu.contains(e.target)) {
                menu.classList.remove('active');
            }
        });

        menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.querySelector('.context-menu');
            menu.classList.toggle('active');
        });

        importButton.addEventListener('click', () => {
            fileInput.click();
            const menu = document.querySelector('.context-menu');
            menu.classList.remove('active');
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const fileNameElement = document.getElementById('file-name');
                if (fileNameElement) {
                    fileNameElement.textContent = file.name;
                }
                
                // Automatically import the file when selected
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        this.character = this.parseProgenyData(event.target.result);
                        this.originalJson = JSON.parse(event.target.result);
                        
                        // Update health and willpower based on current attributes
                        this.updateDerivedStats();
                        
                        // Make sure modal is visible and has the right class
                        const modal = document.getElementById('progeny-modal');
                        const modalContent = modal.querySelector('.modal-content');
                        if (modal && modalContent) {
                            modal.classList.remove('hidden');
                            modalContent.classList.add('has-character');
                        }
                        
                        this.displayCharacterStats();
                        this.saveCharacter(); // Save character after successful import
                        this.showNotification('Character imported successfully');
                    } catch (error) {
                        this.showNotification('Error importing character: ' + error.message);
                        this.clearCharacter();
                    }
                };
                reader.readAsText(file);
            }
        });

        clearButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the character sheet?')) {
                this.clearCharacter();
                const menu = document.querySelector('.context-menu');
                menu.classList.remove('active');
            }
        });

        exportButton.addEventListener('click', () => {
            this.exportCharacter();
            const menu = document.querySelector('.context-menu');
            menu.classList.remove('active');
        });

        saveButton.addEventListener('click', () => {
            this.saveCharacter();
            const menu = document.querySelector('.context-menu');
            menu.classList.remove('active');
        });

        toggleButton.addEventListener('click', () => {
            this.toggleModal();
        });

        closeButton.addEventListener('click', () => {
            const modal = document.getElementById('progeny-modal');
            modal.classList.add('hidden');
        });

        document.getElementById('close-progeny-menu').addEventListener('click', () => {
            const modal = document.getElementById('progeny-modal');
            modal.classList.add('hidden');
            const menu = document.querySelector('.context-menu');
            menu.classList.remove('active');
        });

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('progeny-modal');
            if (event.target === modal) {
                this.toggleModal();
            }
        });
    }

    createNotificationElement() {
        this.notification = document.createElement('div');
        this.notification.className = 'notification';
        document.body.appendChild(this.notification);
    }

    showNotification(message, duration = 2000) {
        this.notification.textContent = message;
        this.notification.classList.add('show');
        
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, duration);
    }

    toggleModal() {
        const modal = document.getElementById('progeny-modal');
        modal.classList.toggle('hidden');
        
        // Toggle body class for scrolling
        if (!modal.classList.contains('hidden')) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }

    async importCharacter(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.originalJson = data; // Store the original JSON for export

                // Basic character info
                this.character.name = data.name || '';
                this.character.clan = data.clan || '';
                this.character.sire = data.sire || '';
                this.character.ambition = data.ambition || '';
                this.character.desire = data.desire || '';
                this.character.generation = data.generation || 13;
                this.character.bloodPotency = data.bloodPotency || 1;
                this.character.hunger = data.hunger || 0;

                // Attributes and Skills
                this.character.attributes = this.convertToCapitalized(data.attributes || this.getDefaultAttributes());
                this.character.skills = this.convertToCapitalized(data.skills || this.getDefaultSkills());

                // Disciplines
                this.character.disciplines = this.convertDisciplinesToObject(data.disciplines || []);

                // Merits and Flaws
                this.character.merits = (data.merits || []).map(merit => ({
                    name: merit.name,
                    level: merit.level,
                    summary: merit.summary || ""
                }));
                this.character.flaws = (data.flaws || []).map(flaw => ({
                    name: flaw.name,
                    level: flaw.level,
                    summary: flaw.summary || ""
                }));

                // Skill Specialties
                this.character.skillSpecialties = (data.skillSpecialties || [])
                    .filter(specialty => specialty.name && specialty.name.trim() !== '')
                    .map(specialty => ({
                        skill: this.capitalizeFirstLetter(specialty.skill),
                        name: this.capitalizeFirstLetter(specialty.name)
                    }));

                // Health and Willpower
                this.character.health = data.health || 5;
                this.character.willpower = data.willpower || 5;
                this.character.humanity = data.humanity || 7;

                // Damage Trackers
                this.character.healthDamage = data.healthDamage || { superficial: 0, aggravated: 0 };
                this.character.willpowerDamage = data.willpowerDamage || { superficial: 0, aggravated: 0 };
                this.character.humanityStains = data.humanityStains || 0;

                // Resonance and Temperament
                // Handle the case where "Empty" might be stored with quotes
                if (data.resonance === '"Empty"') {
                    this.character.resonance = 'Empty';
                } else {
                    this.character.resonance = data.resonance || 'None';
                }
                this.character.temperament = data.temperament || 'None';
                
                // Dyscrasia details if present
                if (data.dyscrasia && data.temperament === 'Acute') {
                    this.character.dyscrasia = data.dyscrasia;
                } else {
                    this.character.dyscrasia = 'None';
                }
                
                // Handle legacy data that might have Dyscrasia as a temperament
                if (this.character.temperament === 'Dyscrasia') {
                    this.character.temperament = 'Acute';
                }
                
                // Ensure "Empty" or "Animal Blood" can't have Acute temperament (since they can't have Dyscrasia)
                if ((this.character.resonance === 'Empty' || this.character.resonance === 'Animal Blood') && 
                    this.character.temperament === 'Acute') {
                    this.character.temperament = 'None';
                    this.character.dyscrasia = 'None';
                }

                // Update all displays
                this.displayCharacterStats();
                this.displayAttributes();
                this.displaySkills();
                this.displayDisciplines();
            } catch (error) {
                console.error('Error importing character:', error);
                alert('Error importing character file. Please make sure it\'s a valid character file.');
            }
        };
        reader.readAsText(file);
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    parseProgenyData(data) {
        try {
            const character = JSON.parse(data);
            this.originalJson = character;  // Store the original JSON
            
            // Format attributes and skills to be more readable
            const formatName = (name) => {
                return name.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            };

            // Process attributes
            const attributes = {};
            Object.entries(character.attributes).forEach(([key, value]) => {
                attributes[formatName(key)] = value;
            });

            // Process skills
            const skills = {};
            Object.entries(character.skills).forEach(([key, value]) => {
                skills[formatName(key)] = value;
            });

            // Process disciplines
            const disciplines = {};
            character.disciplines.forEach(discipline => {
                if (!disciplines[discipline.discipline]) {
                    disciplines[discipline.discipline] = [];
                }
                disciplines[discipline.discipline].push({
                    name: discipline.name,
                    level: discipline.level,
                    dicePool: discipline.dicePool,
                    summary: discipline.summary,
                    rouseChecks: discipline.rouseChecks || 0
                });
            });

            // Process merits and flaws
            let merits = character.merits || [];
            let flaws = character.flaws || [];

            // Add merits and flaws from predatorType if they exist
            if (character.predatorType && character.predatorType.pickedMeritsAndFlaws) {
                character.predatorType.pickedMeritsAndFlaws.forEach(item => {
                    const formattedName = formatName(item.name);
                    
                    if (item.type === 'merit') {
                        // Check if merit already exists
                        const existingMerit = merits.find(m => formatName(m.name) === formattedName);
                        if (existingMerit) {
                            // Add the levels together
                            existingMerit.level += item.level;
                        } else {
                            // Add new merit
                            merits.push({
                                name: item.name,
                                level: item.level,
                                summary: item.summary
                            });
                        }
                    } else if (item.type === 'flaw') {
                        // Check if flaw already exists
                        const existingFlaw = flaws.find(f => formatName(f.name) === formattedName);
                        if (existingFlaw) {
                            // Add the levels together
                            existingFlaw.level += item.level;
                        } else {
                            // Add new flaw
                            flaws.push({
                                name: item.name,
                                level: item.level,
                                summary: item.summary
                            });
                        }
                    }
                });
            }

            // Process specialties
            let skillSpecialties = [];
            
            // Add specialties from skillSpecialties
            if (character.skillSpecialties) {
                skillSpecialties = character.skillSpecialties
                    .filter(specialty => specialty.name && specialty.name.trim() !== '') // Filter out empty names
                    .map(specialty => ({
                        skill: formatName(specialty.skill),
                        name: formatName(specialty.name)
                    }));
            }

            // Add specialties from pickedSpecialties in predatorType
            if (character.predatorType && character.predatorType.pickedSpecialties) {
                character.predatorType.pickedSpecialties
                    .filter(specialty => specialty.name && specialty.name.trim() !== '') // Filter out empty names
                    .forEach(specialty => {
                        // Check if this specialty already exists
                        const existingSpecialty = skillSpecialties.find(s => 
                            s.skill.toLowerCase() === specialty.skill.toLowerCase() && 
                            s.name.toLowerCase() === specialty.name.toLowerCase()
                        );
                        
                        if (!existingSpecialty) {
                            skillSpecialties.push({
                                skill: formatName(specialty.skill),
                                name: formatName(specialty.name)
                            });
                        }
                    });
            }

            // Calculate derived stats based on rules
            const generation = character.generation;
            
            // Blood Potency based on Generation
            let bloodPotency;
            if (generation >= 12) {
                bloodPotency = 1;
            } else if (generation >= 10) {
                bloodPotency = 2;
            } else {
                bloodPotency = character.bloodPotency ?? 1; // Fallback to stored value or 1
            }

            // Humanity starts at 7, -1 for 10th and 11th Generation
            let humanity = 7; // Start with base value
            if (generation >= 10 && generation <= 11) {
                humanity -= 1; // Apply generation penalty
            }
            // Only override with stored value if it's a valid number (0 or greater)
            if (typeof character.humanity === 'number' && !isNaN(character.humanity) && character.humanity >= 0) {
                humanity = character.humanity;
            }

            // Health is Stamina + 3
            const health = (attributes['Stamina'] || 0) + 3;

            // Willpower is Resolve + Composure
            const willpower = (attributes['Resolve'] || 0) + (attributes['Composure'] || 0);

            // Initialize damage tracking if not present
            const healthDamage = character.healthDamage || { superficial: 0, aggravated: 0 };
            const willpowerDamage = character.willpowerDamage || { superficial: 0, aggravated: 0 };
            const humanityStains = character.humanityStains || 0;

            const processedCharacter = {
                name: character.name,
                clan: character.clan,
                sire: character.sire || '',
                ambition: character.ambition || '',
                desire: character.desire || '',
                predatorType: character.predatorType ? { name: character.predatorType.name } : null,
                attributes,
                skills,
                disciplines,
                merits,
                flaws,
                bloodPotency,
                generation,
                willpower,
                humanity,
                health,
                hunger: character.hunger || 1,
                skillSpecialties: character.skillSpecialties || [],
                healthDamage,
                willpowerDamage,
                humanityStains,
                resonance: character.resonance,
                temperament: character.temperament
            };

            // Update character name in Discord settings
            const characterNameInput = document.getElementById('character-name');
            if (characterNameInput) {
                characterNameInput.value = character.name;
                characterNameInput.style.display = 'none';
                localStorage.setItem('characterName', character.name);
            }

            return processedCharacter;
        } catch (error) {
            throw new Error('Invalid character data format');
        }
    }

    showAddDisciplineDialog() {
        const discipline = prompt('Enter discipline name:');
        if (!discipline) return;

        const formattedDiscipline = this.formatName(discipline);
        if (!this.character.disciplines[formattedDiscipline]) {
            this.character.disciplines[formattedDiscipline] = [];
        }
        this.displayCharacterStats();
        this.showNotification(`Added ${formattedDiscipline} discipline`);
    }

    removeDiscipline(discipline) {
        if (confirm(`Are you sure you want to remove the ${discipline} discipline?`)) {
            delete this.character.disciplines[discipline];
            this.displayCharacterStats();
            this.showNotification(`Removed ${discipline} discipline`);
        }
    }

    addPower(discipline) {
        this.createPowerModal(discipline, (power) => {
            if (!power) return; // User cancelled
            
            this.character.disciplines[discipline].push(power);
            this.displayCharacterStats();
            this.showNotification(`Added ${power.name} power to ${discipline}`);
        });
    }
    
    createPowerModal(discipline, callback) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'power-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'power-modal-content';
        content.style.backgroundColor = '#242424';
        content.style.padding = '20px';
        content.style.borderRadius = '5px';
        content.style.maxWidth = '500px';
        content.style.width = '90%';
        content.style.maxHeight = '80vh';
        content.style.overflowY = 'auto';
        
        // Header
        const header = document.createElement('h3');
        header.textContent = `Add Power to ${this.formatName(discipline)}`;
        header.style.marginTop = '0';
        content.appendChild(header);
        
        // Power Name
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Power Name:';
        nameLabel.style.display = 'block';
        nameLabel.style.marginBottom = '5px';
        nameLabel.style.fontWeight = 'bold';
        content.appendChild(nameLabel);
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.style.width = '100%';
        nameInput.style.padding = '8px';
        nameInput.style.marginBottom = '15px';
        nameInput.style.backgroundColor = '#333';
        nameInput.style.color = '#fff';
        nameInput.style.border = '1px solid #555';
        nameInput.style.borderRadius = '3px';
        content.appendChild(nameInput);
        
        // Power Level
        const levelLabel = document.createElement('label');
        levelLabel.textContent = 'Power Level (1-5):';
        levelLabel.style.display = 'block';
        levelLabel.style.marginBottom = '5px';
        levelLabel.style.fontWeight = 'bold';
        content.appendChild(levelLabel);
        
        const levelSelect = document.createElement('select');
        levelSelect.style.width = '100%';
        levelSelect.style.padding = '8px';
        levelSelect.style.marginBottom = '15px';
        levelSelect.style.backgroundColor = '#333';
        levelSelect.style.color = '#fff';
        levelSelect.style.border = '1px solid #555';
        levelSelect.style.borderRadius = '3px';
        
        for (let i = 1; i <= 5; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            levelSelect.appendChild(option);
        }
        
        content.appendChild(levelSelect);
        
        // Rouse Checks
        const rouseLabel = document.createElement('label');
        rouseLabel.textContent = 'Rouse Checks (0-3):';
        rouseLabel.style.display = 'block';
        rouseLabel.style.marginBottom = '5px';
        rouseLabel.style.fontWeight = 'bold';
        content.appendChild(rouseLabel);
        
        const rouseSelect = document.createElement('select');
        rouseSelect.style.width = '100%';
        rouseSelect.style.padding = '8px';
        rouseSelect.style.marginBottom = '15px';
        rouseSelect.style.backgroundColor = '#333';
        rouseSelect.style.color = '#fff';
        rouseSelect.style.border = '1px solid #555';
        rouseSelect.style.borderRadius = '3px';
        
        for (let i = 0; i <= 3; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            rouseSelect.appendChild(option);
        }
        
        content.appendChild(rouseSelect);
        
        // Dice Pool Section
        const dicePoolLabel = document.createElement('h4');
        dicePoolLabel.textContent = 'Dice Pool';
        dicePoolLabel.style.marginTop = '20px';
        dicePoolLabel.style.marginBottom = '10px';
        content.appendChild(dicePoolLabel);
        
        // Define options
        const attributes = ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Composure', 'Intelligence', 'Wits', 'Resolve'];
        const skills = ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Melee', 'Larceny', 'Stealth', 'Survival', 
                        'Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge',
                        'Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'];
        const disciplines = ['Animalism', 'Auspex', 'Blood Sorcery', 'Celerity', 'Dominate', 'Fortitude', 'Obfuscate', 'Oblivion', 'Potence', 
                             'Presence', 'Protean', 'Thin-Blood Alchemy'];
        
        // First die section (always attribute)
        const firstDieLabel = document.createElement('label');
        firstDieLabel.textContent = 'Primary Attribute:';
        firstDieLabel.style.display = 'block';
        firstDieLabel.style.marginBottom = '5px';
        firstDieLabel.style.fontWeight = 'bold';
        content.appendChild(firstDieLabel);
        
        const firstDieSelect = document.createElement('select');
        firstDieSelect.id = 'first-die';
        firstDieSelect.style.width = '100%';
        firstDieSelect.style.padding = '8px';
        firstDieSelect.style.marginBottom = '15px';
        firstDieSelect.style.backgroundColor = '#333';
        firstDieSelect.style.color = '#fff';
        firstDieSelect.style.border = '1px solid #555';
        firstDieSelect.style.borderRadius = '3px';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Select Attribute --';
        firstDieSelect.appendChild(emptyOption);
        
        // Add attribute options
        attributes.forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            firstDieSelect.appendChild(option);
        });
        
        content.appendChild(firstDieSelect);
        
        // Secondary first die (optional)
        const secondaryFirstLabel = document.createElement('label');
        secondaryFirstLabel.textContent = 'Secondary Attribute (Optional):';
        secondaryFirstLabel.style.display = 'block';
        secondaryFirstLabel.style.marginBottom = '5px';
        secondaryFirstLabel.style.fontWeight = 'bold';
        content.appendChild(secondaryFirstLabel);
        
        const secondaryFirstSelect = document.createElement('select');
        secondaryFirstSelect.id = 'secondary-first-die';
        secondaryFirstSelect.style.width = '100%';
        secondaryFirstSelect.style.padding = '8px';
        secondaryFirstSelect.style.marginBottom = '15px';
        secondaryFirstSelect.style.backgroundColor = '#333';
        secondaryFirstSelect.style.color = '#fff';
        secondaryFirstSelect.style.border = '1px solid #555';
        secondaryFirstSelect.style.borderRadius = '3px';
        
        // Add empty option for "None"
        const emptySecondaryOption = document.createElement('option');
        emptySecondaryOption.value = '';
        emptySecondaryOption.textContent = '-- None --';
        secondaryFirstSelect.appendChild(emptySecondaryOption);
        
        // Add attribute options
        attributes.forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            secondaryFirstSelect.appendChild(option);
        });
        
        content.appendChild(secondaryFirstSelect);
        
        // Second die section (attribute, skill, or discipline)
        const secondDieLabel = document.createElement('label');
        secondDieLabel.textContent = 'Second Die Type:';
        secondDieLabel.style.display = 'block';
        secondDieLabel.style.marginBottom = '5px';
        secondDieLabel.style.fontWeight = 'bold';
        content.appendChild(secondDieLabel);
        
        const secondDieTypeSelect = document.createElement('select');
        secondDieTypeSelect.id = 'second-die-type';
        secondDieTypeSelect.style.width = '100%';
        secondDieTypeSelect.style.padding = '8px';
        secondDieTypeSelect.style.marginBottom = '15px';
        secondDieTypeSelect.style.backgroundColor = '#333';
        secondDieTypeSelect.style.color = '#fff';
        secondDieTypeSelect.style.border = '1px solid #555';
        secondDieTypeSelect.style.borderRadius = '3px';
        
        // Add options for second die type
        const typeOptions = [
            { value: '', text: '-- None --' },
            { value: 'attribute', text: 'Attribute' },
            { value: 'skill', text: 'Skill' },
            { value: 'discipline', text: 'Discipline' }
        ];
        
        typeOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            secondDieTypeSelect.appendChild(option);
        });
        
        content.appendChild(secondDieTypeSelect);
        
        // Container for second die options (will be populated based on type selection)
        const secondDieOptionsContainer = document.createElement('div');
        secondDieOptionsContainer.id = 'second-die-options';
        content.appendChild(secondDieOptionsContainer);
        
        // Power Summary
        const summaryLabel = document.createElement('label');
        summaryLabel.textContent = 'Power Summary:';
        summaryLabel.style.display = 'block';
        summaryLabel.style.marginTop = '20px';
        summaryLabel.style.marginBottom = '5px';
        summaryLabel.style.fontWeight = 'bold';
        content.appendChild(summaryLabel);
        
        const summaryTextarea = document.createElement('textarea');
        summaryTextarea.style.width = '100%';
        summaryTextarea.style.height = '100px';
        summaryTextarea.style.padding = '8px';
        summaryTextarea.style.marginBottom = '20px';
        summaryTextarea.style.backgroundColor = '#333';
        summaryTextarea.style.color = '#fff';
        summaryTextarea.style.border = '1px solid #555';
        summaryTextarea.style.borderRadius = '3px';
        summaryTextarea.style.resize = 'vertical';
        content.appendChild(summaryTextarea);
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'progeny-button';
        cancelButton.style.padding = '8px 15px';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(null);
        });
        buttonContainer.appendChild(cancelButton);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Power';
        saveButton.className = 'progeny-button';
        saveButton.style.padding = '8px 15px';
        saveButton.addEventListener('click', () => {
            // Validate required fields
            const name = nameInput.value.trim();
            if (!name) {
                alert('Power name is required');
                return;
            }
            
            const level = parseInt(levelSelect.value);
            const rouseChecks = parseInt(rouseSelect.value);
            const summary = summaryTextarea.value.trim();
            
            if (!summary) {
                alert('Power summary is required');
                return;
            }
            
            // Build the dice pool string
            const firstDie = firstDieSelect.value;
            const secondaryFirst = secondaryFirstSelect.value;
            const secondDieType = secondDieTypeSelect.value;
            let secondDie = '';
            let secondarySecond = '';
            
            // Get second die value based on the selected type
            if (secondDieType) {
                const secondDieSelect = document.getElementById('second-die-value');
                secondDie = secondDieSelect ? secondDieSelect.value : '';
                
                const secondarySecondSelect = document.getElementById('secondary-second-die');
                secondarySecond = secondarySecondSelect ? secondarySecondSelect.value : '';
            }
            
            // Build the dice pool string
            let dicePool = '';
            
            // First die part
            if (firstDie) {
                dicePool += firstDie;
                if (secondaryFirst) {
                    dicePool += ' / ' + secondaryFirst;
                }
            }
            
            // Second die part
            if (secondDie) {
                dicePool += ' + ' + secondDie;
                if (secondarySecond) {
                    dicePool += ' / ' + secondarySecond;
                }
            }
            
            const power = {
                name,
                level,
                dicePool,
                summary,
                rouseChecks,
                description: ''
            };
            
            document.body.removeChild(modal);
            callback(power);
        });
        buttonContainer.appendChild(saveButton);
        
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Focus the name input
        nameInput.focus();
        
        // Event listener for second die type selection
        secondDieTypeSelect.addEventListener('change', () => {
            const container = document.getElementById('second-die-options');
            container.innerHTML = ''; // Clear existing options
            
            const selectedType = secondDieTypeSelect.value;
            if (!selectedType) return; // No type selected
            
            // Create selection for the second die
            const secondDieLabel = document.createElement('label');
            secondDieLabel.textContent = `Select ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}:`;
            secondDieLabel.style.display = 'block';
            secondDieLabel.style.marginBottom = '5px';
            secondDieLabel.style.fontWeight = 'bold';
            container.appendChild(secondDieLabel);
            
            const secondDieSelect = document.createElement('select');
            secondDieSelect.id = 'second-die-value';
            secondDieSelect.style.width = '100%';
            secondDieSelect.style.padding = '8px';
            secondDieSelect.style.marginBottom = '15px';
            secondDieSelect.style.backgroundColor = '#333';
            secondDieSelect.style.color = '#fff';
            secondDieSelect.style.border = '1px solid #555';
            secondDieSelect.style.borderRadius = '3px';
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = `-- Select ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} --`;
            secondDieSelect.appendChild(emptyOption);
            
            // Add options based on selected type
            let options = [];
            if (selectedType === 'attribute') options = attributes;
            else if (selectedType === 'skill') options = skills;
            else if (selectedType === 'discipline') options = disciplines;
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                secondDieSelect.appendChild(option);
            });
            
            container.appendChild(secondDieSelect);
            
            // Add secondary option (if attribute or discipline)
            if (selectedType === 'attribute' || selectedType === 'skill' || selectedType === 'discipline') {
                const secondaryLabel = document.createElement('label');
                secondaryLabel.textContent = `Secondary ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} (Optional):`;
                secondaryLabel.style.display = 'block';
                secondaryLabel.style.marginBottom = '5px';
                secondaryLabel.style.fontWeight = 'bold';
                container.appendChild(secondaryLabel);
                
                const secondarySelect = document.createElement('select');
                secondarySelect.id = 'secondary-second-die';
                secondarySelect.style.width = '100%';
                secondarySelect.style.padding = '8px';
                secondarySelect.style.backgroundColor = '#333';
                secondarySelect.style.color = '#fff';
                secondarySelect.style.border = '1px solid #555';
                secondarySelect.style.borderRadius = '3px';
                
                // Add empty option for "None"
                const emptySecondaryOption = document.createElement('option');
                emptySecondaryOption.value = '';
                emptySecondaryOption.textContent = '-- None --';
                secondarySelect.appendChild(emptySecondaryOption);
                
                // Add options
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    secondarySelect.appendChild(option);
                });
                
                container.appendChild(secondarySelect);
            }
        });
    }
    
    rollDisciplinePower(discipline, power) {
        if (!power.dicePool) {
            this.showNotification("This power doesn't have a dice pool defined");
            return;
        }
        
        // Parse the dice pool string
        this.parseDicePool(power.dicePool, (dicePoolComponents) => {
            if (!dicePoolComponents) return; // User cancelled
            
            // Temporarily set selectedStat and secondStat to the dice pool components
            const savedSelectedStat = this.selectedStat;
            const savedSecondStat = this.secondStat;
            
            // Set the first die component
            this.selectedStat = dicePoolComponents.firstDie;
            
            // Set the second die component (if any)
            this.secondStat = dicePoolComponents.secondDie || null;
            
            // Calculate the dice pool manually to ensure correct values
            let totalRegularDice = 0;
            let firstDiceValue = 0;
            let secondDiceValue = 0;
            
            // Add debug info
            console.log('Dice Pool Components:', dicePoolComponents);
            
            // First die (attribute)
            if (dicePoolComponents.firstDie && this.character.attributes[dicePoolComponents.firstDie] !== undefined) {
                firstDiceValue = this.character.attributes[dicePoolComponents.firstDie];
                totalRegularDice += firstDiceValue;
                console.log(`First die (${dicePoolComponents.firstDie}): ${firstDiceValue}`);
            }
            
            // Second die (attribute, skill, or discipline)
            if (dicePoolComponents.secondDie) {
                // Check if second die is an attribute
                if (this.character.attributes[dicePoolComponents.secondDie] !== undefined) {
                    secondDiceValue = this.character.attributes[dicePoolComponents.secondDie];
                    console.log(`Second die (${dicePoolComponents.secondDie} - attribute): ${secondDiceValue}`);
                }
                // Check if second die is a skill
                else if (this.character.skills[dicePoolComponents.secondDie] !== undefined) {
                    secondDiceValue = this.character.skills[dicePoolComponents.secondDie];
                    console.log(`Second die (${dicePoolComponents.secondDie} - skill): ${secondDiceValue}`);
                    
                    // Check for specialty bonus
                    if (this.character.skillSpecialties) {
                        const hasSpecialty = this.character.skillSpecialties.some(
                            specialty => specialty.skill === dicePoolComponents.secondDie
                        );
                        
                        if (hasSpecialty) {
                            console.log(`Adding specialty bonus for ${dicePoolComponents.secondDie}`);
                            secondDiceValue += 1; // Add +1 for specialty
                        }
                    }
                }
                // Check if second die is a discipline
                else {
                    // Debug: Log all available disciplines
                    console.log('Available disciplines:', Object.keys(this.character.disciplines));
                    console.log('Looking for discipline:', dicePoolComponents.secondDie);
                    
                    // Map standard discipline names to ensure consistent matching
                    const disciplineMap = {
                        'animalism': 'Animalism',
                        'auspex': 'Auspex',
                        'celerity': 'Celerity',
                        'dominate': 'Dominate',
                        'fortitude': 'Fortitude',
                        'obfuscate': 'Obfuscate',
                        'potence': 'Potence', 
                        'presence': 'Presence',
                        'protean': 'Protean',
                        'blood sorcery': 'Blood Sorcery',
                        'thin-blood alchemy': 'Thin-Blood Alchemy'
                    };
                    
                    // Check if we have a standard discipline name
                    const standardName = disciplineMap[dicePoolComponents.secondDie.toLowerCase()];
                    if (standardName && this.character.disciplines[standardName]) {
                        console.log(`Matched standard discipline name: ${standardName}`);
                        dicePoolComponents.secondDie = standardName;
                        
                        // Check for resonance bonus when using standard discipline names
                        const resonanceBonus = this.checkDisciplineResonanceBonus(standardName);
                        if (resonanceBonus > 0) {
                            console.log(`Will add +${resonanceBonus} dice from resonance bonus for standardized ${standardName}`);
                        }
                    }
                    
                    // Try case-insensitive matching for disciplines
                    const disciplineKey = Object.keys(this.character.disciplines).find(
                        d => d.toLowerCase() === dicePoolComponents.secondDie.toLowerCase()
                    );
                    
                    if (disciplineKey) {
                        console.log(`Found discipline match: ${disciplineKey}`);
                        const powers = this.character.disciplines[disciplineKey];
                        if (powers && powers.length > 0) {
                            // Log all power details to debug
                            console.log('Powers:', powers);
                            
                            // Count the number of powers in the discipline
                            secondDiceValue = powers.length;
                            console.log(`Second die (${disciplineKey} - discipline): ${secondDiceValue} (count of powers)`)
                            
                            // Check for resonance bonus for disciplines
                            const resonanceBonus = this.checkDisciplineResonanceBonus(disciplineKey);
                            if (resonanceBonus > 0) {
                                secondDiceValue += resonanceBonus;
                                console.log(`Adding +${resonanceBonus} dice from resonance bonus for ${disciplineKey}`);
                            }
                        }
                    } else {
                        console.log(`Discipline not found: ${dicePoolComponents.secondDie}`);
                        // Try a more flexible approach - look for any discipline containing the name
                        const partialMatch = Object.keys(this.character.disciplines).find(
                            d => d.toLowerCase().includes(dicePoolComponents.secondDie.toLowerCase()) ||
                                 dicePoolComponents.secondDie.toLowerCase().includes(d.toLowerCase())
                        );
                        
                        if (partialMatch) {
                            console.log(`Found partial discipline match: ${partialMatch}`);
                            const powers = this.character.disciplines[partialMatch];
                            if (powers && powers.length > 0) {
                                // Count the number of powers in the discipline
                                secondDiceValue = powers.length;
                                console.log(`Second die (${partialMatch} - discipline, partial match): ${secondDiceValue} (count of powers)`)
                                
                                // Check for resonance bonus for disciplines
                                const resonanceBonus = this.checkDisciplineResonanceBonus(partialMatch);
                                if (resonanceBonus > 0) {
                                    secondDiceValue += resonanceBonus;
                                    console.log(`Adding +${resonanceBonus} dice from resonance bonus for ${partialMatch}`);
                                }
                            }
                        }
                    }
                }
                
                totalRegularDice += secondDiceValue;
            }
            
            console.log(`Total dice: ${firstDiceValue} + ${secondDiceValue} = ${totalRegularDice}`);
            
            // Calculate hunger dice
            const hungerDice = Math.min(totalRegularDice, this.character.hunger || 0);
            
            // Calculate final dice pools (hunger dice replace regular dice)
            const finalRegularDice = Math.max(0, totalRegularDice - hungerDice);
            
            // Get rouse checks
            const rouseChecks = power.rouseChecks || 0;
            
            // Update the hidden input fields used by the 3D dice roller
            document.getElementById('regular_pool').value = finalRegularDice;
            document.getElementById('hunger_pool').value = hungerDice;
            
            // Handle rouse slider
            const rouseSlider = document.getElementById('rouse_pool');
            if (rouseSlider) {
                rouseSlider.value = rouseChecks;
            }
            
            // Update display text if needed
            const regularInfo = document.getElementById('regular-info');
            const hungerInfo = document.getElementById('hunger-info');
            if (regularInfo && hungerInfo) {
                regularInfo.textContent = `${finalRegularDice} Regular Dice`;
                hungerInfo.textContent = `${hungerDice} Hunger Dice`;
            }
                       
            // Close the modal
            const modal = document.getElementById('progeny-modal');
            if (modal) {
                modal.classList.add('hidden');
            }
            
            // Store the current discipline power so we can refer to it after roll
            this._currentPower = {
                discipline,
                power,
                rouseChecks
            };
            
            // Get the dice box instance from the global window object
            let box = window.box;
            
            // If the box doesn't exist or has been disposed, we need to reinitialize it
            if (!box || !box.renderer) {
                console.log('Reinitializing dice box for power roll');
                // Reinitialize the dice box - this assumes the main.js initialization pattern
                if (typeof $t !== 'undefined' && $t.dice) {
                    const canvas = document.getElementById('canvas');
                    box = new $t.dice.dice_box(canvas, { 
                        w: canvas.offsetWidth || window.innerWidth, 
                        h: canvas.offsetHeight || window.innerHeight - document.querySelector('.control_panel').offsetHeight
                    });
                    box.init();
                    window.box = box;
                }
            }
            
            if (box && box.start_throw) {
                // Call start_throw with all the dice pools
                try {
                    box.start_throw(
                        function() {
                            const rouseValue = parseInt(document.getElementById('rouse_pool').value) || 0;
                            return $t.dice.parse_notation(
                                parseInt(document.getElementById('regular_pool').value) || 0,
                                parseInt(document.getElementById('hunger_pool').value) || 0,
                                rouseValue,
                                0, // No remorse dice
                                0  // No frenzy dice
                            );
                        },
                        window.before_roll,
                        window.after_roll
                    );
                } catch (error) {
                    console.error('Error starting power dice throw:', error);
                }
            } else {
                console.error('Dice box not available for power rolling');
            }
            
            // Restore the original selected stats
            this.selectedStat = savedSelectedStat;
            this.secondStat = savedSecondStat;
        });
    }
    
    parseDicePool(dicePoolString, callback) {
        // If no dice pool, return empty components
        if (!dicePoolString || dicePoolString.trim() === '') {
            callback(null);
            return;
        }
        
        // Normalize the dice pool string (remove extra spaces, standardize +)
        const normalizedString = dicePoolString
            .replace(/\s+/g, ' ')           // Standardize spaces
            .replace(/\s*\+\s*/g, '+')      // Remove spaces around '+'
            .trim();
            
        console.log('Normalized dice pool string:', normalizedString);
        
        // Simple case: no choices needed
        if (!normalizedString.includes('/')) {
            // Parse the standard format: "Attribute + Skill"
            const parts = normalizedString.split('+').map(p => p.trim());
            const firstDie = this.formatStatName(parts[0]);
            const secondDie = parts.length > 1 ? this.formatStatName(parts[1]) : null;
            
            console.log('Parsed dice pool components:', { firstDie, secondDie });
            
            callback({
                firstDie,
                secondDie
            });
            return;
        }
        
        // Complex case: choices needed
        // Parse the string to find all choices
        const dicePoolParts = normalizedString.split('+').map(p => p.trim());
        
        // Parse first die choices
        const firstDiePart = dicePoolParts[0];
        const firstDieChoices = firstDiePart.split('/').map(p => this.formatStatName(p.trim()));
        
        // Parse second die choices (if any)
        let secondDieChoices = [];
        if (dicePoolParts.length > 1) {
            const secondDiePart = dicePoolParts[1];
            secondDieChoices = secondDiePart.split('/').map(p => this.formatStatName(p.trim()));
        }
        
        console.log('Choices:', { firstDieChoices, secondDieChoices });
        
        // If we have choices, show a modal to select
        this.showDicePoolChoicesModal(firstDieChoices, secondDieChoices, callback);
    }
    
    formatStatName(name) {
        if (!name) return name;
        
        // Capitalize first letter of each word
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    showDicePoolChoicesModal(firstDieChoices, secondDieChoices, callback) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'dice-pool-choices-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'dice-pool-choices-content';
        content.style.backgroundColor = '#242424';
        content.style.padding = '20px';
        content.style.borderRadius = '5px';
        content.style.maxWidth = '400px';
        content.style.width = '90%';
        
        // Header
        const header = document.createElement('h3');
        header.textContent = 'Select Dice Pool Components';
        header.style.marginTop = '0';
        content.appendChild(header);
        
        // First die selection
        if (firstDieChoices.length > 1) {
            const firstDieLabel = document.createElement('label');
            firstDieLabel.textContent = 'Select First Component:';
            firstDieLabel.style.display = 'block';
            firstDieLabel.style.marginBottom = '5px';
            firstDieLabel.style.fontWeight = 'bold';
            content.appendChild(firstDieLabel);
            
            const firstDieSelect = document.createElement('select');
            firstDieSelect.id = 'first-die-choice';
            firstDieSelect.style.width = '100%';
            firstDieSelect.style.padding = '8px';
            firstDieSelect.style.marginBottom = '15px';
            firstDieSelect.style.backgroundColor = '#333';
            firstDieSelect.style.color = '#fff';
            firstDieSelect.style.border = '1px solid #555';
            
            firstDieChoices.forEach(choice => {
                const option = document.createElement('option');
                option.value = choice;
                option.textContent = choice;
                firstDieSelect.appendChild(option);
            });
            
            content.appendChild(firstDieSelect);
        }
        
        // Second die selection
        if (secondDieChoices.length > 1) {
            const secondDieLabel = document.createElement('label');
            secondDieLabel.textContent = 'Select Second Component:';
            secondDieLabel.style.display = 'block';
            secondDieLabel.style.marginBottom = '5px';
            secondDieLabel.style.fontWeight = 'bold';
            content.appendChild(secondDieLabel);
            
            const secondDieSelect = document.createElement('select');
            secondDieSelect.id = 'second-die-choice';
            secondDieSelect.style.width = '100%';
            secondDieSelect.style.padding = '8px';
            secondDieSelect.style.marginBottom = '15px';
            secondDieSelect.style.backgroundColor = '#333';
            secondDieSelect.style.color = '#fff';
            secondDieSelect.style.border = '1px solid #555';
            
            secondDieChoices.forEach(choice => {
                const option = document.createElement('option');
                option.value = choice;
                option.textContent = choice;
                secondDieSelect.appendChild(option);
            });
            
            content.appendChild(secondDieSelect);
        }
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'progeny-button';
        cancelButton.style.padding = '8px 15px';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(null);
        });
        buttonContainer.appendChild(cancelButton);
        
        const rollButton = document.createElement('button');
        rollButton.textContent = 'Roll';
        rollButton.className = 'progeny-button';
        rollButton.style.padding = '8px 15px';
        rollButton.addEventListener('click', () => {
            // Get selected values
            const firstDie = firstDieChoices.length > 1 
                ? document.getElementById('first-die-choice').value 
                : firstDieChoices[0];
                
            const secondDie = secondDieChoices.length > 1 
                ? document.getElementById('second-die-choice').value 
                : secondDieChoices[0] || null;
            
            document.body.removeChild(modal);
            callback({
                firstDie,
                secondDie
            });
        });
        buttonContainer.appendChild(rollButton);
        
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }
    
    // This method should be called from main.js after dice are rolled
    handleRouseResults(results) {
        // Only process if we have a current power with rouse checks
        if (!this._currentPower || this._currentPower.rouseChecks <= 0) return;
        
        // If results isn't an array, make it one
        if (!Array.isArray(results)) {
            results = [results];
        }
        
        // Count failures (below 6) and successes
        const failures = results.filter(result => result < 6).length;
        const successes = results.filter(result => result >= 6).length;
        
        // Build a readable list of results
        const resultList = results.map(r => r < 6 ? `<strong style="color:red">${r}</strong>` : `<strong style="color:green">${r}</strong>`).join(', ');
        
        if (failures > 0) {
            // Increase hunger
            this.character.hunger = Math.min(5, (this.character.hunger || 0) + failures);
            this.displayCharacterStats();
            this.saveCharacter();
        }
        
        // Clear the current power
        this._currentPower = null;
    }
    
    // Legacy method name for compatibility
    handleRouseResult(result) {
        this.handleRouseResults(result);
    }
    
    createDicePoolSelector(callback) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'dice-pool-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '1000';

        // Create modal content
        const content = document.createElement('div');
        content.className = 'dice-pool-content';
        content.style.backgroundColor = '#242424';
        content.style.padding = '20px';
        content.style.borderRadius = '5px';
        content.style.maxWidth = '500px';
        content.style.width = '90%';
        
        // Header
        const header = document.createElement('h3');
        header.textContent = 'Build Dice Pool';
        header.style.marginTop = '0';
        content.appendChild(header);
        
        // Define options
        const attributes = ['Strength', 'Dexterity', 'Stamina', 'Charisma', 'Manipulation', 'Composure', 'Intelligence', 'Wits', 'Resolve'];
        const skills = ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Melee', 'Larceny', 'Stealth', 'Survival', 
                        'Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge',
                        'Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'];
        const disciplines = ['Animalism', 'Auspex', 'Blood Sorcery', 'Celerity', 'Dominate', 'Fortitude', 'Obfuscate', 'Oblivion', 'Potence', 
                             'Presence', 'Protean', 'Thin-Blood Alchemy'];
        
        // First die section (always attribute)
        const firstDieSection = document.createElement('div');
        firstDieSection.style.marginBottom = '15px';
        
        const firstDieLabel = document.createElement('label');
        firstDieLabel.textContent = 'Primary Attribute: ';
        firstDieLabel.style.display = 'block';
        firstDieLabel.style.marginBottom = '5px';
        firstDieSection.appendChild(firstDieLabel);
        
        const firstDieSelect = document.createElement('select');
        firstDieSelect.id = 'first-die';
        firstDieSelect.style.width = '100%';
        firstDieSelect.style.padding = '5px';
        firstDieSelect.style.marginBottom = '10px';
        firstDieSelect.style.backgroundColor = '#333';
        firstDieSelect.style.color = '#fff';
        firstDieSelect.style.border = '1px solid #555';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Select Attribute --';
        firstDieSelect.appendChild(emptyOption);
        
        // Add attribute options
        attributes.forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            firstDieSelect.appendChild(option);
        });
        
        firstDieSection.appendChild(firstDieSelect);
        
        // Secondary first die (optional)
        const secondaryFirstLabel = document.createElement('label');
        secondaryFirstLabel.textContent = 'Secondary Attribute (Optional): ';
        secondaryFirstLabel.style.display = 'block';
        secondaryFirstLabel.style.marginBottom = '5px';
        firstDieSection.appendChild(secondaryFirstLabel);
        
        const secondaryFirstSelect = document.createElement('select');
        secondaryFirstSelect.id = 'secondary-first-die';
        secondaryFirstSelect.style.width = '100%';
        secondaryFirstSelect.style.padding = '5px';
        secondaryFirstSelect.style.backgroundColor = '#333';
        secondaryFirstSelect.style.color = '#fff';
        secondaryFirstSelect.style.border = '1px solid #555';
        
        // Add empty option for "None"
        const emptySecondaryOption = document.createElement('option');
        emptySecondaryOption.value = '';
        emptySecondaryOption.textContent = '-- None --';
        secondaryFirstSelect.appendChild(emptySecondaryOption);
        
        // Add attribute options
        attributes.forEach(attr => {
            const option = document.createElement('option');
            option.value = attr;
            option.textContent = attr;
            secondaryFirstSelect.appendChild(option);
        });
        
        firstDieSection.appendChild(secondaryFirstSelect);
        content.appendChild(firstDieSection);
        
        // Second die section (attribute, skill, or discipline)
        const secondDieSection = document.createElement('div');
        secondDieSection.style.marginBottom = '15px';
        
        const secondDieLabel = document.createElement('label');
        secondDieLabel.textContent = 'Second Die Type: ';
        secondDieLabel.style.display = 'block';
        secondDieLabel.style.marginBottom = '5px';
        secondDieSection.appendChild(secondDieLabel);
        
        const secondDieTypeSelect = document.createElement('select');
        secondDieTypeSelect.id = 'second-die-type';
        secondDieTypeSelect.style.width = '100%';
        secondDieTypeSelect.style.padding = '5px';
        secondDieTypeSelect.style.marginBottom = '10px';
        secondDieTypeSelect.style.backgroundColor = '#333';
        secondDieTypeSelect.style.color = '#fff';
        secondDieTypeSelect.style.border = '1px solid #555';
        
        // Add options for second die type
        const typeOptions = [
            { value: '', text: '-- None --' },
            { value: 'attribute', text: 'Attribute' },
            { value: 'skill', text: 'Skill' },
            { value: 'discipline', text: 'Discipline' }
        ];
        
        typeOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            secondDieTypeSelect.appendChild(option);
        });
        
        secondDieSection.appendChild(secondDieTypeSelect);
        
        // Container for second die options (will be populated based on type selection)
        const secondDieOptionsContainer = document.createElement('div');
        secondDieOptionsContainer.id = 'second-die-options';
        secondDieSection.appendChild(secondDieOptionsContainer);
        
        content.appendChild(secondDieSection);
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'space-between';
        buttonContainer.style.marginTop = '20px';
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.className = 'progeny-button';
        cancelButton.style.padding = '8px 15px';
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
            callback(''); // Return empty dice pool
        });
        buttonContainer.appendChild(cancelButton);
        
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.className = 'progeny-button';
        saveButton.style.padding = '8px 15px';
        saveButton.addEventListener('click', () => {
            // Build the dice pool string
            const firstDie = firstDieSelect.value;
            const secondaryFirst = secondaryFirstSelect.value;
            const secondDieType = secondDieTypeSelect.value;
            let secondDie = '';
            let secondarySecond = '';
            
            // Get second die value based on the selected type
            if (secondDieType) {
                const secondDieSelect = document.getElementById('second-die-value');
                secondDie = secondDieSelect ? secondDieSelect.value : '';
                
                const secondarySecondSelect = document.getElementById('secondary-second-die');
                secondarySecond = secondarySecondSelect ? secondarySecondSelect.value : '';
            }
            
            // Build the dice pool string
            let dicePool = '';
            
            // First die part
            if (firstDie) {
                dicePool += firstDie;
                if (secondaryFirst) {
                    dicePool += ' / ' + secondaryFirst;
                }
            }
            
            // Second die part
            if (secondDie) {
                dicePool += ' + ' + secondDie;
                if (secondarySecond) {
                    dicePool += ' / ' + secondarySecond;
                }
            }
            
            document.body.removeChild(modal);
            callback(dicePool);
        });
        buttonContainer.appendChild(saveButton);
        
        content.appendChild(buttonContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Event listener for second die type selection
        secondDieTypeSelect.addEventListener('change', () => {
            const container = document.getElementById('second-die-options');
            container.innerHTML = ''; // Clear existing options
            
            const selectedType = secondDieTypeSelect.value;
            if (!selectedType) return; // No type selected
            
            // Create selection for the second die
            const secondDieLabel = document.createElement('label');
            secondDieLabel.textContent = `Select ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}: `;
            secondDieLabel.style.display = 'block';
            secondDieLabel.style.marginBottom = '5px';
            container.appendChild(secondDieLabel);
            
            const secondDieSelect = document.createElement('select');
            secondDieSelect.id = 'second-die-value';
            secondDieSelect.style.width = '100%';
            secondDieSelect.style.padding = '5px';
            secondDieSelect.style.marginBottom = '10px';
            secondDieSelect.style.backgroundColor = '#333';
            secondDieSelect.style.color = '#fff';
            secondDieSelect.style.border = '1px solid #555';
            
            // Add empty option
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = `-- Select ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} --`;
            secondDieSelect.appendChild(emptyOption);
            
            // Add options based on selected type
            let options = [];
            if (selectedType === 'attribute') options = attributes;
            else if (selectedType === 'skill') options = skills;
            else if (selectedType === 'discipline') options = disciplines;
            
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                secondDieSelect.appendChild(option);
            });
            
            container.appendChild(secondDieSelect);
            
            // Add secondary option (if attribute or discipline)
            if (selectedType === 'attribute' || selectedType === 'skill' || selectedType === 'discipline') {
                const secondaryLabel = document.createElement('label');
                secondaryLabel.textContent = `Secondary ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} (Optional): `;
                secondaryLabel.style.display = 'block';
                secondaryLabel.style.marginBottom = '5px';
                container.appendChild(secondaryLabel);
                
                const secondarySelect = document.createElement('select');
                secondarySelect.id = 'secondary-second-die';
                secondarySelect.style.width = '100%';
                secondarySelect.style.padding = '5px';
                secondarySelect.style.backgroundColor = '#333';
                secondarySelect.style.color = '#fff';
                secondarySelect.style.border = '1px solid #555';
                
                // Add empty option for "None"
                const emptySecondaryOption = document.createElement('option');
                emptySecondaryOption.value = '';
                emptySecondaryOption.textContent = '-- None --';
                secondarySelect.appendChild(emptySecondaryOption);
                
                // Add options
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    secondarySelect.appendChild(option);
                });
                
                container.appendChild(secondarySelect);
            }
        });
    }

    removePower(discipline, powerName) {
        if (confirm(`Are you sure you want to remove the ${powerName} power?`)) {
            this.character.disciplines[discipline] = this.character.disciplines[discipline].filter(
                power => power.name !== powerName
            );
            this.displayCharacterStats();
            this.showNotification(`Removed ${powerName} power`);
        }
    }

    displayCharacterStats() {
        const statsContainer = document.getElementById('character-stats');
        if (!statsContainer) return;
        
        statsContainer.classList.remove('hidden');
        
        // Add has-character class to modal content
        const modalContent = document.querySelector('.progeny-modal-content');
        if (modalContent) {
            modalContent.classList.add('has-character');
        }
        
        // Clear existing content
        statsContainer.innerHTML = '';

        // Create character info section
        const characterInfo = document.createElement('div');
        characterInfo.className = 'character-info';
        characterInfo.innerHTML = `
            <h4>${this.character.name}</h4>
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-stat-row">
                        <span class="stat-label">Clan</span>
                        <div class="editable-value info-value">
                            <span>${this.character.clan || ''}</span>
                        </div>
                        <button class="edit-button" data-field="clan" data-type="text">✎</button>
                    </div>
                    <div class="info-stat-row">
                        <span class="stat-label">Ambition</span>
                        <div class="editable-value info-value">
                            <span>${this.character.ambition || ''}</span>
                        </div>
                        <button class="edit-button" data-field="ambition" data-type="text">✎</button>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-stat-row">
                        <span class="stat-label">Sire</span>
                        <div class="editable-value info-value">
                            <span>${this.character.sire || ''}</span>
                        </div>
                        <button class="edit-button" data-field="sire" data-type="text">✎</button>
                    </div>
                    <div class="info-stat-row">
                        <span class="stat-label">Desire</span>
                        <div class="editable-value info-value">
                            <span>${this.character.desire || ''}</span>
                        </div>
                        <button class="edit-button" data-field="desire" data-type="text">✎</button>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-stat-row">
                        <span class="stat-label">Generation</span>
                        <div class="editable-value info-value">
                            <span>${this.character.generation || 0}</span>
                        </div>
                        <button class="edit-button" data-field="generation" data-type="number" data-min="1" data-max="15">✎</button>
                    </div>
                    <div class="info-stat-row">
                        <span class="stat-label">Predator</span>
                        <div class="editable-value info-value">
                            <span>${this.character.predatorType?.name || ''}</span>
                        </div>
                        <button class="edit-button" data-field="predatorType" data-type="text">✎</button>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-stat-row">
                        <span class="stat-label">Blood Potency</span>
                        <div class="editable-value info-value">
                            <span>${this.character.bloodPotency || 0}</span>
                        </div>
                        <button class="edit-button" data-field="bloodPotency" data-type="number">✎</button>
                    </div>
                    <div class="info-stat-row">
                        <span class="stat-label">Hunger</span>
                        <div class="editable-value info-value">
                            <span>${this.character.hunger || 1}</span>
                        </div>
                        <button class="edit-button" data-field="hunger" data-type="number" data-min="0" data-max="5">✎</button>
                    </div>
                </div>
            </div>
        `;

        // Create trackers container
        const trackersContainer = document.createElement('div');
        trackersContainer.className = 'trackers-container';
        
        // Add all trackers in the correct order
        trackersContainer.appendChild(this.createDamageTracker('Health', this.character.health, this.character.healthDamage));
        trackersContainer.appendChild(this.createDamageTracker('Willpower', this.character.willpower, this.character.willpowerDamage));
        trackersContainer.appendChild(this.createHumanityTracker(this.character.humanity, this.character.humanityStains));
        trackersContainer.appendChild(this.createResonanceTracker());
        trackersContainer.appendChild(this.createRemorseCheckButton());
        trackersContainer.appendChild(this.createFrenzyCheckButton());
        trackersContainer.appendChild(this.createRouseCheckButton());
        
        characterInfo.appendChild(trackersContainer);

        // Add edit functionality to character info
        characterInfo.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => {
                const field = button.dataset.field;
                const type = button.dataset.type;
                const editableValue = button.parentElement.querySelector('.editable-value');
                const currentValue = editableValue.querySelector('span').textContent;
                
                // Create input field
                const input = document.createElement('input');
                input.type = type;
                input.value = currentValue;
                input.className = 'stat-input';
                
                // Add min/max for number inputs
                if (type === 'number') {
                    if (field === 'generation') {
                        input.min = '1';
                        input.max = '15';
                    } else if (field === 'hunger') {
                        input.min = '0';
                        input.max = '5';
                    } else {
                        input.min = '0';
                        input.max = '10';
                    }
                }
                
                // Replace span with input
                editableValue.innerHTML = '';
                editableValue.appendChild(input);
                input.focus();
                
                // Handle input completion
                const handleInputComplete = () => {
                    let newValue = input.value;
                    
                    // Convert to number for number fields
                    if (type === 'number') {
                        newValue = parseInt(newValue) || 0;
                        // Ensure values stay within bounds
                        if (field === 'generation') {
                            newValue = Math.max(1, Math.min(15, newValue));
                        } else if (field === 'hunger') {
                            newValue = Math.max(0, Math.min(5, newValue));
                        }
                    }
                    
                    editableValue.innerHTML = `<span>${newValue}</span>`;
                    
                    // Update character data
                    if (field === 'predatorType') {
                        this.character.predatorType = { name: newValue };
                    } else {
                        this.character[field] = newValue;
                    }
                };
                
                input.addEventListener('blur', handleInputComplete);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleInputComplete();
                    }
                });
            });
        });

        statsContainer.appendChild(characterInfo);

        // Create stats grid
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        statsGrid.innerHTML = `
            <div class="attributes">
                <h5>Attributes</h5>
                <div class="attribute-groups">
                    <div class="attribute-group">
                        <h6>Physical</h6>
                        <div id="physical-attributes"></div>
                    </div>
                    <div class="attribute-group">
                        <h6>Mental</h6>
                        <div id="mental-attributes"></div>
                    </div>
                    <div class="attribute-group">
                        <h6>Social</h6>
                        <div id="social-attributes"></div>
                    </div>
                </div>
            </div>
            <div class="skills">
                <h5>Skills</h5>
                <div class="skill-groups">
                    <div class="skill-group">
                        <h6>Physical</h6>
                        <div id="physical-skills"></div>
                    </div>
                    <div class="skill-group">
                        <h6>Mental</h6>
                        <div id="mental-skills"></div>
                    </div>
                    <div class="skill-group">
                        <h6>Social</h6>
                        <div id="social-skills"></div>
                    </div>
                </div>
            </div>
            <div class="disciplines-merits-container">
                <div class="disciplines">
                    <h5>Disciplines</h5>
                    <div id="disciplines-list"></div>
                    <div class="discipline-controls"></div>
                </div>
                <div class="merits-flaws">
                    <h5>Merits & Flaws</h5>
                    <div id="merits-flaws-list"></div>
                </div>
            </div>
        `;
        statsContainer.appendChild(statsGrid);

        // Add the Add Discipline button only if a character is loaded
        if (this.character) {
            const disciplineControls = statsGrid.querySelector('.discipline-controls');
            const addDisciplineBtn = document.createElement('button');
            addDisciplineBtn.id = 'add-discipline';
            addDisciplineBtn.className = 'progeny-button';
            addDisciplineBtn.textContent = 'Add Discipline';
            addDisciplineBtn.addEventListener('click', () => this.showAddDisciplineDialog());
            disciplineControls.appendChild(addDisciplineBtn);
        }

        // Create and populate attributes list
        const physicalAttributes = ['Strength', 'Dexterity', 'Stamina'];
        const mentalAttributes = ['Intelligence', 'Wits', 'Resolve'];
        const socialAttributes = ['Charisma', 'Manipulation', 'Composure'];

        const physicalList = statsGrid.querySelector('#physical-attributes');
        const mentalList = statsGrid.querySelector('#mental-attributes');
        const socialList = statsGrid.querySelector('#social-attributes');

        physicalAttributes.forEach(name => {
            if (this.character.attributes[name]) {
                physicalList.appendChild(this.createStatItem(name, this.character.attributes[name]));
            }
        });

        mentalAttributes.forEach(name => {
            if (this.character.attributes[name]) {
                mentalList.appendChild(this.createStatItem(name, this.character.attributes[name]));
            }
        });

        socialAttributes.forEach(name => {
            if (this.character.attributes[name]) {
                socialList.appendChild(this.createStatItem(name, this.character.attributes[name]));
            }
        });

        // Create and populate skills list
        const physicalSkills = ['Athletics', 'Brawl', 'Craft', 'Drive', 'Firearms', 'Larceny', 'Melee', 'Stealth', 'Survival'];
        const mentalSkills = ['Academics', 'Awareness', 'Finance', 'Investigation', 'Medicine', 'Occult', 'Politics', 'Science', 'Technology'];
        const socialSkills = ['Animal Ken', 'Etiquette', 'Insight', 'Intimidation', 'Leadership', 'Performance', 'Persuasion', 'Streetwise', 'Subterfuge'];

        const physicalSkillsList = statsGrid.querySelector('#physical-skills');
        const mentalSkillsList = statsGrid.querySelector('#mental-skills');
        const socialSkillsList = statsGrid.querySelector('#social-skills');

        physicalSkills.forEach(name => {
            const value = this.character.skills[name] || 0;
            physicalSkillsList.appendChild(this.createStatItem(name, value));
        });

        mentalSkills.forEach(name => {
            const value = this.character.skills[name] || 0;
            mentalSkillsList.appendChild(this.createStatItem(name, value));
        });

        socialSkills.forEach(name => {
            const value = this.character.skills[name] || 0;
            socialSkillsList.appendChild(this.createStatItem(name, value));
        });

        // Create and populate disciplines list
        const disciplinesList = statsGrid.querySelector('#disciplines-list');
        Object.entries(this.character.disciplines).forEach(([discipline, powers]) => {
            const div = document.createElement('div');
            div.className = 'discipline-group';
            div.innerHTML = `
                <h6>${this.formatName(discipline)}</h6>
                <button class="remove-discipline" title="Remove Discipline">×</button>
                <button class="add-power progeny-button" title="Add Power">Add Power</button>
                <button class="select-button" data-stat="${discipline}" title="Select ${this.formatName(discipline)}">✓</button>
                ${powers.map(power => `
                    <div class="power-item">
                        <span class="power-level">Level ${power.level}</span>
                        <span class="power-name">${power.name}</span>
                        <button class="remove-power" title="Remove Power">×</button>
                        <div class="power-controls">
                            ${power.dicePool ? `<button class="roll-power progeny-button" title="Roll ${power.name}">Roll</button>` : ''}
                        </div>
                        <div class="power-details">
                            <div class="power-dice-pool">${power.dicePool}</div>
                            <div class="power-rouse">Rouse Cost: ${power.rouseChecks || 0}</div>
                            <div class="power-summary">${power.summary}</div>
                        </div>
                    </div>
                `).join('')}
            `;

            // Add event listeners for discipline controls
            const removeDisciplineBtn = div.querySelector('.remove-discipline');
            removeDisciplineBtn.addEventListener('click', () => this.removeDiscipline(discipline));

            const addPowerBtn = div.querySelector('.add-power');
            addPowerBtn.addEventListener('click', () => this.addPower(discipline));

            const selectButton = div.querySelector('.select-button');
            selectButton.addEventListener('click', () => this.selectStat(discipline));

            // Add event listeners for power controls
            const removePowerBtns = div.querySelectorAll('.remove-power');
            removePowerBtns.forEach(btn => {
                const powerItem = btn.closest('.power-item');
                const powerName = powerItem.querySelector('.power-name').textContent;
                btn.addEventListener('click', () => this.removePower(discipline, powerName));
            });
            
            // Add event listeners for roll buttons
            const rollPowerBtns = div.querySelectorAll('.roll-power');
            rollPowerBtns.forEach(btn => {
                const powerItem = btn.closest('.power-item');
                const powerName = powerItem.querySelector('.power-name').textContent;
                const power = this.character.disciplines[discipline].find(p => p.name === powerName);
                if (power) {
                    btn.addEventListener('click', () => this.rollDisciplinePower(discipline, power));
                }
            });

            disciplinesList.appendChild(div);
        });

        // Create and populate merits-flaws list
        const meritsFlawsList = statsGrid.querySelector('#merits-flaws-list');
        
        // Add Merits section
        const meritsDiv = document.createElement('div');
        meritsDiv.className = 'merits-group';
        meritsDiv.innerHTML = `
            <h6>Merits</h6>
            <button class="add-merit progeny-button" title="Add Merit">Add Merit</button>
            ${this.character.merits.map(merit => `
                <div class="merit-item">
                    <span class="merit-level">Level ${merit.level}</span>
                    <span class="merit-name">${this.formatName(merit.name)}</span>
                    <button class="remove-merit" title="Remove Merit">×</button>
                    <div class="merit-details">
                        <div class="merit-summary">${merit.summary}</div>
                    </div>
                </div>
            `).join('')}
        `;

        // Add event listeners for merit controls
        const addMeritBtn = meritsDiv.querySelector('.add-merit');
        addMeritBtn.addEventListener('click', () => this.addMerit());

        const removeMeritBtns = meritsDiv.querySelectorAll('.remove-merit');
        removeMeritBtns.forEach(btn => {
            const meritItem = btn.closest('.merit-item');
            const meritName = meritItem.querySelector('.merit-name').textContent;
            btn.addEventListener('click', () => this.removeMerit(meritName));
        });

        meritsFlawsList.appendChild(meritsDiv);

        // Add Flaws section
        const flawsDiv = document.createElement('div');
        flawsDiv.className = 'flaws-group';
        flawsDiv.innerHTML = `
            <h6>Flaws</h6>
            <button class="add-flaw progeny-button" title="Add Flaw">Add Flaw</button>
            ${this.character.flaws.map(flaw => `
                <div class="flaw-item">
                    <span class="flaw-level">Level ${flaw.level}</span>
                    <span class="flaw-name">${this.formatName(flaw.name)}</span>
                    <button class="remove-flaw" title="Remove Flaw">×</button>
                    <div class="flaw-details">
                        <div class="flaw-summary">${flaw.summary}</div>
                    </div>
                </div>
            `).join('')}
        `;

        // Add event listeners for flaw controls
        const addFlawBtn = flawsDiv.querySelector('.add-flaw');
        addFlawBtn.addEventListener('click', () => this.addFlaw());

        const removeFlawBtns = flawsDiv.querySelectorAll('.remove-flaw');
        removeFlawBtns.forEach(btn => {
            const flawItem = btn.closest('.flaw-item');
            const flawName = flawItem.querySelector('.flaw-name').textContent;
            btn.addEventListener('click', () => this.removeFlaw(flawName));
        });

        meritsFlawsList.appendChild(flawsDiv);
    }

    formatName(name) {
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    createStatItem(name, value) {
        const div = document.createElement('div');
        div.className = 'stat-row';
        
        // Check if this is a skill and has specialties
        let specialtyHtml = '';
        if (this.character.skills[name] !== undefined) {
            const specialties = this.character.skillSpecialties ? 
                this.character.skillSpecialties.filter(s => s.skill.toLowerCase() === name.toLowerCase()) : [];
            
            specialtyHtml = `<div class="skill-specialties">
                ${specialties.map(s => `
                    <span class="specialty-tag" title="Specialty: ${s.name}" data-skill="${name}" data-specialty="${s.name}">${s.name || '...'}</span>
                `).join('')}
                <button class="add-specialty" data-skill="${name}" title="Add Specialty">+</button>
            </div>`;
        }

        div.innerHTML = `
            <div class="stat-main">
                <span class="stat-name">${this.formatName(name)}</span>
                <div class="editable-value">
                    <span class="stat-value">${value}</span>
                </div>
                <button class="edit-button" data-stat="${name}">✎</button>
                <button class="select-button" data-stat="${name}" title="Select ${this.formatName(name)}">✓</button>
            </div>
            ${specialtyHtml}
        `;

        // Add edit functionality
        const editButton = div.querySelector('.edit-button');
        editButton.addEventListener('click', (e) => {
            const stat = e.target.dataset.stat;
            const valueSpan = div.querySelector('.stat-value');
            const editableValue = div.querySelector('.editable-value');
            const currentValue = this.character.attributes[stat] !== undefined ? 
                this.character.attributes[stat] : 
                this.character.skills[stat];
            
            // Create input field
            const input = document.createElement('input');
            input.type = 'number';
            input.value = String(currentValue);
            input.min = 0;
            input.max = 5;
            input.className = 'stat-input';
            
            // Replace value span with input
            editableValue.innerHTML = '';
            editableValue.appendChild(input);
            input.focus();
            
            // Handle input completion
            const finishEdit = () => {
                const newValue = parseInt(input.value);
                if (!isNaN(newValue) && newValue >= 0 && newValue <= 5) {
                    if (this.character.attributes[stat] !== undefined) {
                        this.character.attributes[stat] = newValue;
                        
                        // Update derived stats if Stamina, Resolve, or Composure changed
                        if (stat === 'Stamina' || stat === 'Resolve' || stat === 'Composure') {
                            this.updateDerivedStats();
                            // Refresh display to show updated health/willpower
                            this.displayCharacterStats();
                        }
                    } else if (this.character.skills[stat] !== undefined) {
                        this.character.skills[stat] = newValue;
                    }
                    editableValue.innerHTML = `<span class="stat-value">${newValue}</span>`;
                } else {
                    editableValue.innerHTML = `<span class="stat-value">${currentValue}</span>`;
                }
            };
            
            input.addEventListener('blur', finishEdit);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    finishEdit();
                }
            });
        });

        // Add select functionality
        const selectButton = div.querySelector('.select-button');
        selectButton.addEventListener('click', (e) => {
            const stat = e.target.dataset.stat;
            this.selectStat(stat);
        });

        // Add specialty functionality
        const addSpecialtyButton = div.querySelector('.add-specialty');
        if (addSpecialtyButton) {
            addSpecialtyButton.addEventListener('click', (e) => {
                const skill = e.target.dataset.skill;
                this.addSpecialty(skill);
            });
        }

        // Add edit specialty functionality
        const specialtyTags = div.querySelectorAll('.specialty-tag');
        specialtyTags.forEach(tag => {
            // Add click handler for toggling selection
            tag.addEventListener('click', (e) => {
                // If right-click or ctrl+click, edit the specialty
                if (e.ctrlKey || e.button === 2) {
                    const skill = e.target.dataset.skill;
                    const specialtyName = e.target.dataset.specialty;
                    this.editSpecialty(skill, specialtyName);
                } else {
                    // Remove selected class from all specialty tags
                    document.querySelectorAll('.specialty-tag').forEach(t => {
                        t.classList.remove('selected');
                    });
                    // Add selected class to clicked tag
                    tag.classList.add('selected');
                    this.updateRollButton();
                }
            });

            // Add context menu handler
            tag.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const skill = e.target.dataset.skill;
                const specialtyName = e.target.dataset.specialty;
                this.editSpecialty(skill, specialtyName);
            });
        });

        return div;
    }

    updateButtonStates() {
        // Clear all button states first
        document.querySelectorAll('.select-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Set selected states for current selections
        if (this.selectedStat) {
            const firstButton = document.querySelector(`.select-button[data-stat="${this.selectedStat}"]`);
            if (firstButton) {
                firstButton.classList.add('selected');
            }
        }
        if (this.secondStat) {
            const secondButton = document.querySelector(`.select-button[data-stat="${this.secondStat}"]`);
            if (secondButton) {
                secondButton.classList.add('selected');
            }
        }
    }

    selectStat(stat) {
        const selectedButton = document.querySelector(`.select-button[data-stat="${stat}"]`);
        
        // If clicking the same stat that's already selected, deselect it
        if (this.selectedStat === stat) {
            selectedButton.classList.remove('selected');
            this.selectedStat = null;
            this.updateRollButton();
            this.updateButtonStates();
            return;
        }
        if (this.secondStat === stat) {
            selectedButton.classList.remove('selected');
            this.secondStat = null;
            this.updateRollButton();
            this.updateButtonStates();
            return;
        }

        // Check if this is a skill selection
        const isSkill = this.character.skills[stat] !== undefined;
        const isAttribute = this.character.attributes[stat] !== undefined;
        const isDiscipline = this.character.disciplines[stat] !== undefined;

        // If selecting a skill or discipline, it can only be the second stat
        if (isSkill || isDiscipline) {
            if (!this.selectedStat) {
                this.showNotification('Please select an Attribute first');
                return;
            }
            // Replace any existing second stat with the new one
            this.secondStat = stat;
            this.updateButtonStates();
            this.updateRollButton();
            return;
        }

        // If selecting an attribute
        if (isAttribute) {
            // If we already have two attributes selected, replace the first one
            if (this.selectedStat && this.character.attributes[this.selectedStat] !== undefined && 
                this.secondStat && this.character.attributes[this.secondStat] !== undefined) {
                this.selectedStat = this.secondStat;
                this.secondStat = null;
            }
            // If we have a skill or discipline as second stat, replace the current attribute
            else if (this.secondStat && (this.character.skills[this.secondStat] !== undefined || 
                     this.character.disciplines[this.secondStat] !== undefined)) {
                this.selectedStat = stat;
                this.updateRollButton();
                this.updateButtonStates();
                return;
            }
        }

        // If this is the first selection
        if (!this.selectedStat) {
            // Store the first selected stat
            this.selectedStat = stat;
        } 
        // If this is the second selection
        else if (this.selectedStat !== stat) {
            // Store the second selected stat
            this.secondStat = stat;
        }

        // Update all button states
        this.updateButtonStates();
        // Show the roll button if we have a valid pair
        this.updateRollButton();
    }

    updateRollButton() {
        // Remove existing roll button if any
        const existingRollBtn = document.querySelector('.paired-roll-button');
        if (existingRollBtn) {
            existingRollBtn.remove();
        }

        // If we have two selected stats, show the roll button
        if (this.selectedStat && this.secondStat) {
            const rollBtn = document.createElement('button');
            rollBtn.className = 'paired-roll-button progeny-button';
            rollBtn.textContent = `Roll ${this.formatName(this.selectedStat)} + ${this.formatName(this.secondStat)}`;
            rollBtn.addEventListener('click', () => this.rollDice());
            
            // Add it to the modal header
            const modalHeader = document.querySelector('#progeny-modal .modal-header');
            if (modalHeader) {
                // Create a container for the roll button if it doesn't exist
                let rollButtonContainer = modalHeader.querySelector('.roll-button-container');
                if (!rollButtonContainer) {
                    rollButtonContainer = document.createElement('div');
                    rollButtonContainer.className = 'roll-button-container';
                    modalHeader.insertBefore(rollButtonContainer, modalHeader.querySelector('.close-button'));
                }
                rollButtonContainer.appendChild(rollBtn);
            }
        }
    }

    rollDice() {
        if (!this.selectedStat) return;

        // Get dice pools for both stats
        const firstPool = this.getDicePool(this.selectedStat);
        const secondPool = this.secondStat ? this.getDicePool(this.secondStat) : null;

        if (!firstPool) return;

        // Calculate total regular dice
        const totalRegularDice = firstPool.regular + (secondPool ? secondPool.regular : 0);
        const hungerDice = firstPool.hunger;

        // Calculate final dice pools (hunger dice replace regular dice)
        const finalRegularDice = Math.max(0, totalRegularDice - hungerDice);

        // Update the display values
        document.getElementById('regular_pool').value = finalRegularDice;
        document.getElementById('hunger_pool').value = hungerDice;

        // Update the display text
        const regularInfo = document.getElementById('regular-info');
        const hungerInfo = document.getElementById('hunger-info');
        if (regularInfo && hungerInfo) {
            regularInfo.textContent = `${finalRegularDice} Regular Dice`;
            hungerInfo.textContent = `${hungerDice} Hunger Dice`;
        }

        // Close the modal
        const modal = document.getElementById('progeny-modal');
        if (modal) {
            modal.classList.add('hidden');
        }

        // Get the dice box instance from the global window object
        let box = window.box;
        
        // If the box doesn't exist or has been disposed, we need to reinitialize it
        if (!box || !box.renderer) {
            console.log('Reinitializing dice box for progeny roll');
            // Reinitialize the dice box - this assumes the main.js initialization pattern
            if (typeof $t !== 'undefined' && $t.dice) {
                box = new $t.dice.dice_box(document.getElementById('canvas'), { w: window.innerWidth, h: window.innerHeight });
                box.init();
                window.box = box;
            }
        }
        
        if (box && box.start_throw) {
            // Call start_throw with the proper notation getter
            try {
                box.start_throw(
                    function() {
                        return $t.dice.parse_notation(
                            document.getElementById('regular_pool').value,
                            document.getElementById('hunger_pool').value
                        );
                    },
                    window.before_roll,
                    window.after_roll
                );
            } catch (error) {
                console.error('Error starting dice throw:', error);
            }
        } else {
            console.error('Dice box not available for rolling');
        }
    }

    getDicePool(stat) {
        let regularDice = 0;
        let hungerDice = 0;
        let specialtyBonus = 0;
        let resonanceBonus = 0;

        console.log('Getting dice pool for stat:', stat);
        console.log('Stat type:', {
            isAttribute: this.character.attributes[stat] !== undefined,
            isSkill: this.character.skills[stat] !== undefined,
            isDiscipline: this.character.disciplines[stat] !== undefined
        });

        // Check if the stat exists in attributes
        if (this.character.attributes[stat] !== undefined) {
            regularDice += this.character.attributes[stat];
            hungerDice = this.character.hunger || 1;
        }

        // Check if the stat exists in skills
        if (this.character.skills[stat] !== undefined) {
            regularDice += this.character.skills[stat];
            
            // Only check for specialties if this is a skill roll
            const selectedSpecialty = document.querySelector(`.specialty-tag.selected[data-skill="${stat}"]`);
            console.log('Selected specialty for', stat, ':', selectedSpecialty);
            if (selectedSpecialty) {
                console.log('Adding specialty bonus for', stat);
                specialtyBonus = 1; // Add +1 for the selected specialty
            }
        }

        // Disciplines might be accessed with different cases, so let's check case-insensitively
        const disciplineKey = Object.keys(this.character.disciplines || {}).find(
            key => key.toLowerCase() === stat.toLowerCase()
        );
        
        // Check if the stat exists in disciplines
        if (disciplineKey && this.character.disciplines[disciplineKey]) {
            // Count the number of powers in the discipline
            const powers = this.character.disciplines[disciplineKey];
            if (powers && powers.length > 0) {
                regularDice += powers.length; // Use count of powers instead of highest level
                
                // Check if the discipline matches character's resonance and if resonance is Acute or Dyscrasia
                const resonance = this.character.resonance;
                const temperament = this.character.temperament || '';
                
                console.log(`Checking resonance bonus for discipline ${disciplineKey}`);
                console.log(`Character resonance: ${resonance}, temperament: ${temperament}`);
                
                // Define the mapping of resonance types to disciplines
                const resonanceToDisciplines = {
                    'Choleric': ['Celerity', 'Potence'],
                    'Melancholic': ['Fortitude', 'Obfuscate'],
                    'Phlegmatic': ['Auspex', 'Dominate'],
                    'Sanguine': ['Blood Sorcery', 'Presence'],
                    '"Empty"': ['Oblivion'],
                    'Animal Blood': ['Animalism', 'Protean']
                };
                
                // Support both spellings of "Melancholy/Melancholic"
                if (!resonanceToDisciplines[resonance] && resonance === 'Melancholy') {
                    resonance = 'Melancholic';
                }
                
                // Check if the character has a resonance and it's either Acute or Dyscrasia
                if (resonance && resonanceToDisciplines[resonance] && 
                    (temperament === 'Acute' || temperament === 'Dyscrasia')) {
                    
                    // Get proper discipline name (with correct capitalization)
                    const disciplineName = this.capitalizeFirstLetter(disciplineKey);
                    
                    // Check each resonance discipline with case-insensitive comparison
                    const matchesDiscipline = resonanceToDisciplines[resonance].some(
                        d => d.toLowerCase() === disciplineName.toLowerCase()
                    );
                    
                    console.log(`Checking if ${disciplineName} matches any of: ${JSON.stringify(resonanceToDisciplines[resonance])}`);
                    
                    if (matchesDiscipline) {
                        console.log(`✓ Adding +1 dice for ${resonance} ${temperament} with ${disciplineName} discipline`);
                        resonanceBonus = 1;
                    } else {
                        console.log(`✗ No resonance bonus for ${disciplineName} - doesn't match ${resonance} disciplines`);
                    }
                } else {
                    console.log(`No resonance bonus available: resonance=${resonance}, temperament=${temperament}`);
                }
            }
        }

        // Add specialty and resonance bonuses to regular dice
        regularDice += specialtyBonus + resonanceBonus;
        console.log('Final dice pool:', { 
            regular: regularDice, 
            hunger: hungerDice, 
            specialtyBonus,
            resonanceBonus 
        });
        
        return regularDice > 0 ? { regular: regularDice, hunger: hungerDice } : null;
    }

    clearCharacter() {
        this.character = null;
        this.originalJson = null;  // Clear the original JSON
        localStorage.removeItem('progenyCharacter'); // Remove saved character
        document.getElementById('progeny-file').value = '';
        const fileNameElement = document.getElementById('file-name');
        if (fileNameElement) {
            fileNameElement.textContent = '';
        }
        const statsContainer = document.getElementById('character-stats');
        if (statsContainer) {
            statsContainer.classList.add('hidden');
            statsContainer.innerHTML = '';
        }
        
        // Remove has-character class from modal content
        const modal = document.getElementById('progeny-modal');
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('has-character');
        }

        // Update character name field in Discord settings
        const characterNameInput = document.getElementById('character-name');
        if (characterNameInput) {
            characterNameInput.style.display = 'block';
            characterNameInput.value = '';
            localStorage.removeItem('characterName');
        }
    }

    removeMerit(meritName) {
        if (confirm(`Are you sure you want to remove the ${meritName} merit?`)) {
            this.character.merits = this.character.merits.filter(merit => merit.name !== meritName);
            this.displayCharacterStats();
            this.showNotification(`Removed ${meritName} merit`);
        }
    }

    removeFlaw(flawName) {
        if (confirm(`Are you sure you want to remove the ${flawName} flaw?`)) {
            this.character.flaws = this.character.flaws.filter(flaw => flaw.name !== flawName);
            this.displayCharacterStats();
            this.showNotification(`Removed ${flawName} flaw`);
        }
    }

    addMerit() {
        const name = prompt('Enter merit name:');
        if (!name) return;

        const level = parseInt(prompt('Enter merit level (1-5):'));
        if (isNaN(level) || level < 1 || level > 5) {
            alert('Invalid level. Please enter a number between 1 and 5.');
            return;
        }

        const summary = prompt('Enter merit summary:');
        if (!summary) return;

        const merit = {
            name,
            level,
            summary,
            type: 'merit'
        };

        this.character.merits.push(merit);
        this.displayCharacterStats();
        this.showNotification(`Added ${name} merit`);
    }

    addFlaw() {
        const name = prompt('Enter flaw name:');
        if (!name) return;

        const level = parseInt(prompt('Enter flaw level (1-5):'));
        if (isNaN(level) || level < 1 || level > 5) {
            alert('Invalid level. Please enter a number between 1 and 5.');
            return;
        }

        const summary = prompt('Enter flaw summary:');
        if (!summary) return;

        const flaw = {
            name,
            level,
            summary,
            type: 'flaw'
        };

        this.character.flaws.push(flaw);
        this.displayCharacterStats();
        this.showNotification(`Added ${name} flaw`);
    }

    exportCharacter() {
        if (!this.originalJson) {
            this.showNotification('No character data to export');
            return;
        }

        // Create a copy of the original JSON
        const exportData = JSON.parse(JSON.stringify(this.originalJson));

        // Helper function to convert capitalized names back to lowercase
        const toLowercase = (obj) => {
            const result = {};
            Object.entries(obj).forEach(([key, value]) => {
                result[key.toLowerCase()] = value;
            });
            return result;
        };

        // Helper function to convert disciplines object to array
        const disciplinesToArray = (disciplines) => {
            const result = [];
            Object.entries(disciplines).forEach(([discipline, powers]) => {
                powers.forEach(power => {
                    result.push({
                        name: power.name,
                        description: power.description || "",
                        rouseChecks: power.rouseChecks || 0,
                        amalgamPrerequisites: power.amalgamPrerequisites || [],
                        summary: power.summary || "",
                        dicePool: power.dicePool || "",
                        level: power.level,
                        discipline: discipline.toLowerCase()
                    });
                });
            });
            return result;
        };

        // Update the values that might have changed, maintaining original format
        exportData.name = this.character.name;
        exportData.clan = this.character.clan;
        exportData.sire = this.character.sire;
        exportData.ambition = this.character.ambition;
        exportData.desire = this.character.desire;
        exportData.attributes = toLowercase(this.character.attributes);
        exportData.skills = toLowercase(this.character.skills);
        exportData.disciplines = disciplinesToArray(this.character.disciplines);
        exportData.merits = this.character.merits.map(merit => ({
            name: merit.name,
            level: merit.level,
            type: "merit",
            summary: merit.summary || ""
        }));
        exportData.flaws = this.character.flaws.map(flaw => ({
            name: flaw.name,
            level: flaw.level,
            type: "flaw",
            summary: flaw.summary || ""
        }));
        exportData.bloodPotency = this.character.bloodPotency;
        exportData.generation = this.character.generation;
        exportData.willpower = this.character.willpower;
        exportData.humanity = this.character.humanity;
        exportData.hunger = this.character.hunger;

        // Add tracker data
        exportData.health = this.character.health;
        exportData.healthDamage = this.character.healthDamage;
        exportData.willpowerDamage = this.character.willpowerDamage;
        exportData.humanityStains = this.character.humanityStains;
        // Make sure we're using consistent values for resonance and temperament
        exportData.resonance = this.character.resonance || 'None';
        exportData.temperament = this.character.temperament || 'None';
        
        // Add dyscrasia details if applicable
        if (this.character.temperament === 'Acute' && this.character.dyscrasia) {
            exportData.dyscrasia = this.character.dyscrasia;
        }

        // Add specialties to the export data
        if (this.character.skillSpecialties && this.character.skillSpecialties.length > 0) {
            exportData.skillSpecialties = this.character.skillSpecialties.map(specialty => ({
                skill: specialty.skill.toLowerCase(),
                name: specialty.name
            }));
        }

        // Convert to JSON string with proper formatting
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create a blob with the JSON data
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.character.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_character.json`;

        // Trigger the download
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    init() {
        // Add event listeners for buttons
        document.getElementById('toggle-progeny').addEventListener('click', () => this.toggleModal());
        document.getElementById('progeny-file').addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('progeny-modal').addEventListener('click', (e) => {
            if (e.target.id === 'progeny-modal') {
                this.toggleModal();
            }
        });

        // Add event listener for export button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('progeny-button') && e.target.classList.contains('export')) {
                this.exportCharacter();
            }
        });

        // Add event listener for clear button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('progeny-button') && e.target.classList.contains('clear')) {
                this.clearCharacter();
            }
        });
    }

    // Helper method to check if a discipline gets a resonance bonus
    checkDisciplineResonanceBonus(disciplineName) {
        if (!this.character || !disciplineName) return 0;
        
        const resonance = this.character.resonance;
        const temperament = this.character.temperament || '';
        
        // Only apply bonus for Acute or Dyscrasia temperaments
        if (!resonance || !temperament || 
            (temperament !== 'Acute' && temperament !== 'Dyscrasia')) {
            return 0;
        }
        
        // Define the mapping of resonance types to disciplines
        const resonanceToDisciplines = {
            'Choleric': ['Celerity', 'Potence'],
            'Melancholic': ['Fortitude', 'Obfuscate'],
            'Phlegmatic': ['Auspex', 'Dominate'],
            'Sanguine': ['Blood Sorcery', 'Presence'],
            '"Empty"': ['Oblivion'],
            'Animal Blood': ['Animalism', 'Protean']
        };
        
        // Support both spellings of "Melancholy/Melancholic"
        let resonanceKey = resonance;
        if (resonanceKey === 'Melancholy') {
            resonanceKey = 'Melancholic';
        }
        
        // Check if discipline matches any in the resonance list (case-insensitive)
        if (resonanceToDisciplines[resonanceKey]) {
            const matches = resonanceToDisciplines[resonanceKey].some(
                d => d.toLowerCase() === disciplineName.toLowerCase()
            );
            
            if (matches) {
                return 1;
            }
        }
        
        return 0;
    }
    
    saveCharacter() {
        if (this.character && this.originalJson) {
            localStorage.setItem('progenyCharacter', JSON.stringify({
                character: this.character,
                originalJson: this.originalJson
            }));
        }
    }

    loadSavedCharacter() {
        const savedData = localStorage.getItem('progenyCharacter');
        if (savedData) {
            try {
                const { character, originalJson } = JSON.parse(savedData);
                this.character = character;
                this.originalJson = originalJson;
                
                // Make sure modal is visible and has the right class
                const modal = document.getElementById('progeny-modal');
                const modalContent = modal.querySelector('.modal-content');
                if (modal && modalContent) {
                    modalContent.classList.add('has-character');
                }
                
                this.displayCharacterStats();
                this.showNotification('Character loaded from saved data');
            } catch (error) {
                console.error('Error loading saved character:', error);
                localStorage.removeItem('progenyCharacter');
            }
        }
    }

    updateStat(statType, statName, value) {
        if (!this.character) return;
        
        if (statType === 'attributes') {
            this.character.attributes[statName] = value;
        } else if (statType === 'skills') {
            this.character.skills[statName] = value;
        }
        
        this.displayCharacterStats();
        this.saveCharacter(); // Save after stat update
    }

    addDiscipline(discipline) {
        if (!this.character) return;
        
        if (!this.character.disciplines[discipline]) {
            this.character.disciplines[discipline] = [];
            this.displayCharacterStats();
            this.saveCharacter(); // Save after adding discipline
            this.showNotification(`Added ${this.formatName(discipline)} discipline`);
        }
    }

    removeDiscipline(discipline) {
        if (!this.character) return;
        
        if (confirm(`Are you sure you want to remove the ${this.formatName(discipline)} discipline?`)) {
            delete this.character.disciplines[discipline];
            this.displayCharacterStats();
            this.saveCharacter(); // Save after removing discipline
            this.showNotification(`Removed ${this.formatName(discipline)} discipline`);
        }
    }

    addPower(discipline) {
        if (!this.character) return;
        
        this.createPowerModal(discipline, (power) => {
            if (!power) return; // User cancelled
            
            // Add additional fields needed for this version
            power.amalgamPrerequisites = [];
            
            this.character.disciplines[discipline].push(power);
            this.displayCharacterStats();
            this.saveCharacter(); // Save after adding power
            this.showNotification(`Added ${power.name} power to ${this.formatName(discipline)}`);
        });
    }

    removePower(discipline, powerName) {
        if (confirm(`Are you sure you want to remove the ${powerName} power?`)) {
            this.character.disciplines[discipline] = this.character.disciplines[discipline].filter(
                power => power.name !== powerName
            );
            this.displayCharacterStats();
            this.saveCharacter(); // Save after removing power
            this.showNotification(`Removed ${powerName} power`);
        }
    }

    addMerit() {
        if (!this.character) return;
        
        const meritName = prompt('Enter merit name:');
        if (!meritName) return;
        
        const level = parseInt(prompt('Enter merit level:'));
        if (isNaN(level) || level < 1) {
            alert('Invalid merit level');
            return;
        }
        
        const merit = {
            name: meritName,
            level: level,
            type: 'merit',
            summary: ''
        };
        
        this.character.merits.push(merit);
        this.displayCharacterStats();
        this.saveCharacter(); // Save after adding merit
        this.showNotification(`Added ${meritName} merit`);
    }

    removeMerit(meritName) {
        if (confirm(`Are you sure you want to remove the ${meritName} merit?`)) {
            this.character.merits = this.character.merits.filter(merit => merit.name !== meritName);
            this.displayCharacterStats();
            this.saveCharacter(); // Save after removing merit
            this.showNotification(`Removed ${meritName} merit`);
        }
    }

    addFlaw() {
        if (!this.character) return;
        
        const flawName = prompt('Enter flaw name:');
        if (!flawName) return;
        
        const level = parseInt(prompt('Enter flaw level:'));
        if (isNaN(level) || level < 1) {
            alert('Invalid flaw level');
            return;
        }
        
        const flaw = {
            name: flawName,
            level: level,
            type: 'flaw',
            summary: ''
        };
        
        this.character.flaws.push(flaw);
        this.displayCharacterStats();
        this.saveCharacter(); // Save after adding flaw
        this.showNotification(`Added ${flawName} flaw`);
    }

    removeFlaw(flawName) {
        if (confirm(`Are you sure you want to remove the ${flawName} flaw?`)) {
            this.character.flaws = this.character.flaws.filter(flaw => flaw.name !== flawName);
            this.displayCharacterStats();
            this.saveCharacter(); // Save after removing flaw
            this.showNotification(`Removed ${flawName} flaw`);
        }
    }

    addSpecialty(skill) {
        if (!this.character) return;
        
        // Initialize skillSpecialties array if it doesn't exist
        if (!this.character.skillSpecialties) {
            this.character.skillSpecialties = [];
        }

        // Check if skill already has 3 specialties
        const existingSpecialties = this.character.skillSpecialties.filter(s => s.skill.toLowerCase() === skill.toLowerCase());
        if (existingSpecialties.length >= 3) {
            this.showNotification('A skill can have at most 3 specialties');
            return;
        }

        // Create a modal for entering the specialty name
        const modal = document.createElement('div');
        modal.className = 'progeny-modal';
        modal.innerHTML = `
            <div class="progeny-modal-content">
                <h3>Add Specialty for ${this.formatName(skill)}</h3>
                <input type="text" id="specialty-name" placeholder="Enter specialty name" />
                <div class="modal-buttons">
                    <button class="progeny-button" id="save-specialty">Save</button>
                    <button class="progeny-button" id="cancel-specialty">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#specialty-name');
        input.focus();

        const saveButton = modal.querySelector('#save-specialty');
        const cancelButton = modal.querySelector('#cancel-specialty');

        const saveSpecialty = () => {
            const name = input.value.trim();
            if (name) {
                this.character.skillSpecialties.push({
                    skill: skill.toLowerCase(),
                    name: name
                });
                this.displayCharacterStats();
                this.saveCharacter();
                modal.remove();
            }
        };

        saveButton.addEventListener('click', saveSpecialty);
        cancelButton.addEventListener('click', () => modal.remove());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveSpecialty();
            }
        });
    }

    editSpecialty(skill, currentName) {
        if (!this.character || !this.character.skillSpecialties) return;

        const specialty = this.character.skillSpecialties.find(s => 
            s.skill.toLowerCase() === skill.toLowerCase() && s.name === currentName
        );

        if (!specialty) return;

        // Create a modal for editing the specialty name
        const modal = document.createElement('div');
        modal.className = 'progeny-modal';
        modal.innerHTML = `
            <div class="progeny-modal-content">
                <h3>Edit Specialty for ${this.formatName(skill)}</h3>
                <input type="text" id="specialty-name" value="${currentName}" />
                <div class="modal-buttons">
                    <button class="progeny-button" id="save-specialty">Save</button>
                    <button class="progeny-button" id="delete-specialty">Delete</button>
                    <button class="progeny-button" id="cancel-specialty">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#specialty-name');
        input.focus();
        input.select();

        const saveButton = modal.querySelector('#save-specialty');
        const deleteButton = modal.querySelector('#delete-specialty');
        const cancelButton = modal.querySelector('#cancel-specialty');

        const saveSpecialty = () => {
            const name = input.value.trim();
            if (name) {
                specialty.name = name;
                this.displayCharacterStats();
                this.saveCharacter();
                modal.remove();
            }
        };

        const deleteSpecialty = () => {
            const index = this.character.skillSpecialties.indexOf(specialty);
            if (index > -1) {
                this.character.skillSpecialties.splice(index, 1);
                this.displayCharacterStats();
                this.saveCharacter();
                modal.remove();
            }
        };

        saveButton.addEventListener('click', saveSpecialty);
        deleteButton.addEventListener('click', deleteSpecialty);
        cancelButton.addEventListener('click', () => modal.remove());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveSpecialty();
            }
        });
    }

    createDamageTracker(type, maxValue, damage) {
        const div = document.createElement('div');
        div.className = 'damage-tracker';
        
        const currentValue = maxValue - (damage.superficial + damage.aggravated);
        const isImpaired = currentValue <= 0;
        const isMaxAggravated = damage.aggravated >= maxValue;
        
        let statusText = '';
        if (isMaxAggravated) {
            statusText = type === 'Health' ? 'Torpor' : 'Defeated';
        } else if (isImpaired) {
            statusText = 'Impaired';
        }
        
        div.innerHTML = `
            <div class="damage-header">
                <span class="damage-label">${type}</span>
                <div class="damage-values">
                    <span class="current-value">${currentValue}</span>
                    <span class="separator">/</span>
                    <span class="max-value">${maxValue}</span>
                </div>
            </div>
            <div class="damage-controls">
                <div class="damage-type">
                    <span class="damage-label">Superficial</span>
                    <div class="damage-buttons">
                        <button class="damage-btn minus" data-type="superficial">-</button>
                        <span class="damage-value">${damage.superficial}</span>
                        <button class="damage-btn plus" data-type="superficial">+</button>
                    </div>
                </div>
                <div class="damage-type">
                    <span class="damage-label">Aggravated</span>
                    <div class="damage-buttons">
                        <button class="damage-btn minus" data-type="aggravated">-</button>
                        <span class="damage-value">${damage.aggravated}</span>
                        <button class="damage-btn plus" data-type="aggravated">+</button>
                    </div>
                </div>
            </div>
            ${statusText ? `<div class="status-warning impaired">${statusText}</div>` : ''}
        `;

        // Add event listeners for damage buttons
        div.querySelectorAll('.damage-btn').forEach(button => {
            button.addEventListener('click', () => {
                const damageType = button.dataset.type;
                const isPlus = button.classList.contains('plus');
                
                // Get current damage values
                const currentDamage = this.character[`${type.toLowerCase()}Damage`];
                
                // Calculate new value
                let newValue = currentDamage[damageType] + (isPlus ? 1 : -1);
                newValue = Math.max(0, Math.min(maxValue, newValue));
                
                // If impaired and adding damage, convert superficial to aggravated
                if (isImpaired && isPlus && damageType === 'superficial') {
                    currentDamage.aggravated = Math.min(maxValue, currentDamage.aggravated + 1);
                    currentDamage.superficial = Math.max(0, currentDamage.superficial - 1);
                } else {
                    currentDamage[damageType] = newValue;
                }
                
                // Update display
                this.displayCharacterStats();
            });
        });

        return div;
    }
    
    createRouseCheckButton() {
        const div = document.createElement('div');
        div.className = 'rouse-check-container';
        
        div.innerHTML = `
            <div class="rouse-header">
                <span class="rouse-label">Rouse Check</span>
            </div>
            <button class="rouse-roll-btn">Roll</button>
        `;
        
        // Add event listener for the Rouse roll button
        div.querySelector('.rouse-roll-btn').addEventListener('click', () => {
            this.rollRouseCheck();
        });
        
        return div;
    }
    
    createRemorseCheckButton() {
        const div = document.createElement('div');
        div.className = 'remorse-check-container';
        
        // Calculate the Remorse dice pool - spaces left between Humanity and Stains
        const humanity = this.character.humanity;
        const stains = this.character.humanityStains || 0;
        // Calculate remorse dice: spaces between current humanity rating and 10
        // Minimum 1 die even if there are no empty spaces
        const remorseDicePool = Math.max(1, 10 - humanity - stains);
        
        div.innerHTML = `
            <div class="remorse-header">
                <span class="remorse-label">Remorse Check</span>
                <div class="remorse-values">
                    <span class="remorse-pool">${remorseDicePool} dice</span>
                </div>
            </div>
            <button class="remorse-roll-btn">Roll</button>
        `;
        
        // Add event listener for the Remorse roll button
        div.querySelector('.remorse-roll-btn').addEventListener('click', () => {
            this.rollRemorseCheck();
        });
        
        return div;
    }
    
    createFrenzyCheckButton() {
        const div = document.createElement('div');
        div.className = 'frenzy-check-container';
        
        // Calculate the Frenzy dice pool
        const availableWillpower = this.calculateUnspentWillpower();
        const humanityBonus = Math.floor(this.character.humanity / 3);
        const frenzyDicePool = availableWillpower + humanityBonus;
        
        div.innerHTML = `
            <div class="frenzy-header">
                <span class="frenzy-label">Frenzy Check</span>
                <div class="frenzy-values">
                    <span class="frenzy-pool">${frenzyDicePool} dice</span>
                </div>
            </div>
            <button class="frenzy-roll-btn">Roll</button>
        `;
        
        // Add event listener for the Frenzy roll button
        div.querySelector('.frenzy-roll-btn').addEventListener('click', () => {
            this.rollFrenzyCheck();
        });
        
        return div;
    }
    
    calculateUnspentWillpower() {
        if (!this.character || !this.character.willpower || !this.character.willpowerDamage) {
            return 0;
        }
        
        const maxWillpower = this.character.willpower;
        const superficialDamage = this.character.willpowerDamage.superficial || 0;
        const aggravatedDamage = this.character.willpowerDamage.aggravated || 0;
        const totalDamage = superficialDamage + aggravatedDamage;
        
        return Math.max(0, maxWillpower - totalDamage);
    }
    
    rollRemorseCheck() {
        // Calculate the Remorse dice pool
        const humanity = this.character.humanity;
        const stains = this.character.humanityStains || 0;
        // Calculate spaces left (10 - humanity - stains), minimum 1
        const remorseDicePool = Math.max(1, 10 - humanity - stains);
        
        // Update the remorse dice pool in the control panel
        document.getElementById('remorse_pool').value = remorseDicePool;
        
        // Hide regular dice control
        const regularControl = document.querySelector('.dice-control:not(.hidden-controls *)');
        if (regularControl) {
            regularControl.classList.add('hidden');
        }
        
        // Make sure the remorse control is visible
        const remorseControl = document.querySelector('.remorse-control');
        if (remorseControl) {
            remorseControl.classList.remove('hidden');
        }
        
        // Update the remorse dice count display
        const remorseInfo = document.getElementById('remorse-info');
        if (remorseInfo) {
            remorseInfo.textContent = `${remorseDicePool} Remorse Dice`;
        }
        
        // Toggle the remorse button to active and deactivate others
        const remorseToggle = document.querySelector('[data-target="remorse"]');
        if (remorseToggle) {
            remorseToggle.classList.add('active');
            // Deactivate other toggles
            document.querySelectorAll('[data-target="hunger"], [data-target="rouse"], [data-target="frenzy"]').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        // Add event listener for roll results
        window.addEventListener('diceRollComplete', this.handleRemorseRollResult);
        
        // Close the modal
        const modal = document.getElementById('progeny-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Get the dice box instance from the global window object
        const box = window.box;
        if (box && box.start_throw) {
            // Call start_throw with the proper notation getter
            box.start_throw(
                function() {
                    return $t.dice.parse_notation(
                        0, // Regular dice
                        0, // Hunger dice
                        0, // Rouse dice
                        remorseDicePool, // Remorse dice
                        0 // Frenzy dice
                    );
                },
                window.before_roll,
                window.after_roll
            );
        }
    }
    
    rollRouseCheck() {
        // Update the rouse checkbox in the control panel
        const rouseCheckbox = document.getElementById('rouse_pool');
        if (rouseCheckbox) {
            rouseCheckbox.checked = true;
        }
        
        // Make sure the rouse control is visible
        const rouseControl = document.querySelector('.rouse-control');
        if (rouseControl) {
            rouseControl.classList.remove('hidden');
        }
        
        // Update the rouse check label
        const rouseInfo = document.getElementById('rouse-info');
        if (rouseInfo) {
            rouseInfo.textContent = `Rouse Check`;
        }
        
        // Toggle the rouse button to active
        const rouseToggle = document.querySelector('[data-target="rouse"]');
        if (rouseToggle) {
            rouseToggle.classList.add('active');
        }
        
        // Add event listener for roll results
        window.addEventListener('diceRollComplete', this.handleRouseRollResult);
        
        // Close the modal
        const modal = document.getElementById('progeny-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Get the dice box instance from the global window object
        const box = window.box;
        if (box && box.start_throw) {
            // Call start_throw with the proper notation getter
            box.start_throw(
                function() {
                    return $t.dice.parse_notation(
                        0, // Regular dice
                        0, // Hunger dice
                        1, // Rouse dice (always 1)
                        0, // Remorse dice
                        0  // Frenzy dice
                    );
                },
                window.before_roll,
                window.after_roll
            );
        }
    }
    
    handleRouseRollResult = (event) => {
        // Only process rouse rolls
        if (!event.detail || !event.detail.isRouse) {
            return;
        }
        
        // Remove the event listener to prevent duplicate handling
        window.removeEventListener('diceRollComplete', this.handleRouseRollResult);
        
        // Check if the roll was successful (at least one success)
        const successes = event.detail.successes || 0;
        
        if (successes === 0) {
            // If no successes, increase hunger by 1
            const currentHunger = this.character.hunger || 0;
            this.character.hunger = Math.min(5, currentHunger + 1);
        }
        
        // Update the character sheet to reflect changes
        this.displayCharacterStats();
        this.saveCharacter();
    }
    
    handleRemorseRollResult = (event) => {
        // Only process remorse rolls
        if (!event.detail || !event.detail.isRemorse) {
            return;
        }
        
        // Remove the event listener to prevent duplicate handling
        window.removeEventListener('diceRollComplete', this.handleRemorseRollResult);
        
        // Check if the roll was successful (at least one success)
        const successes = event.detail.successes || 0;
        
        if (successes === 0) {
            // If no successes, reduce humanity by 1
            this.character.humanity = Math.max(0, this.character.humanity - 1);
        }
        
        // Clear all stains regardless of success or failure
        this.character.humanityStains = 0;
        
        // Update the character sheet to reflect changes
        this.displayCharacterStats();
        this.saveCharacter();
    }
    
    rollFrenzyCheck() {
        // Calculate the Frenzy dice pool
        const availableWillpower = this.calculateUnspentWillpower();
        const humanityBonus = Math.floor(this.character.humanity / 3);
        const frenzyDicePool = availableWillpower + humanityBonus;
        
        // Update the frenzy dice pool in the control panel
        document.getElementById('frenzy_pool').value = frenzyDicePool;
        
        // Hide regular dice control
        const regularControl = document.querySelector('.dice-control:not(.hidden-controls *)');
        if (regularControl) {
            regularControl.classList.add('hidden');
        }
        
        // Make sure the frenzy control is visible
        const frenzyControl = document.querySelector('.frenzy-control');
        if (frenzyControl) {
            frenzyControl.classList.remove('hidden');
        }
        
        // Update the frenzy dice count display
        const frenzyInfo = document.getElementById('frenzy-info');
        if (frenzyInfo) {
            frenzyInfo.textContent = `${frenzyDicePool} Frenzy Dice`;
        }
        
        // Toggle the frenzy button to active and deactivate others
        const frenzyToggle = document.querySelector('[data-target="frenzy"]');
        if (frenzyToggle) {
            frenzyToggle.classList.add('active');
            // Deactivate other toggles
            document.querySelectorAll('[data-target="hunger"], [data-target="rouse"], [data-target="remorse"]').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        // Close the modal
        const modal = document.getElementById('progeny-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Get the dice box instance from the global window object
        const box = window.box;
        if (box && box.start_throw) {
            // Call start_throw with the proper notation getter
            box.start_throw(
                function() {
                    return $t.dice.parse_notation(
                        0, // Regular dice
                        0, // Hunger dice
                        0, // Rouse dice
                        0, // Remorse dice
                        frenzyDicePool // Frenzy dice
                    );
                },
                window.before_roll,
                window.after_roll
            );
        }
    }

    // Updates health and willpower based on current attribute values
    updateDerivedStats() {
        // Update health based on Stamina
        const newHealth = (this.character.attributes['Stamina'] || 0) + 3;
        if (this.character.health !== newHealth) {
            this.character.health = newHealth;
        }
        
        // Update willpower based on Resolve and Composure
        const newWillpower = (this.character.attributes['Resolve'] || 0) + (this.character.attributes['Composure'] || 0);
        if (this.character.willpower !== newWillpower) {
            this.character.willpower = newWillpower;
        }
    }
    
    createHumanityTracker(humanity, stains) {
        const div = document.createElement('div');
        div.className = 'humanity-tracker';
        
        const maxStains = 10 - humanity; // Maximum possible stains
        const isImpaired = stains > maxStains;
        const excessStains = Math.max(0, stains - maxStains);
        
        div.innerHTML = `
            <div class="humanity-header">
                <span class="humanity-label">Humanity</span>
                <div class="humanity-value-container">
                    <div class="humanity-values">
                        <span class="current-value">${humanity}</span>
                        <span class="separator">/</span>
                        <span class="max-value">10</span>
                    </div>
                    <button class="edit-button humanity-edit" title="Edit Humanity">✎</button>
                </div>
            </div>
            <div class="stains-controls">
                <div class="stains-type">
                    <span class="stains-label">Stains</span>
                    <div class="stains-buttons">
                        <button class="stains-btn minus">-</button>
                        <span class="stains-value">${stains}</span>
                        <button class="stains-btn plus">+</button>
                    </div>
                </div>
            </div>
            ${isImpaired ? `<div class="status-warning impaired">Impaired (${excessStains} excess)</div>` : ''}
        `;

        // Add event listener for humanity edit button
        const humanityEditButton = div.querySelector('.humanity-edit');
        if (humanityEditButton) {
            humanityEditButton.addEventListener('click', () => {
                const humanityValues = div.querySelector('.humanity-values');
                const currentValue = div.querySelector('.current-value').textContent;
                
                // Create input field
                const input = document.createElement('input');
                input.type = 'number';
                input.value = currentValue;
                input.min = '0';
                input.max = '10';
                input.className = 'humanity-input';
                
                // Replace display with input
                const originalHTML = humanityValues.innerHTML;
                humanityValues.innerHTML = '';
                humanityValues.appendChild(input);
                input.focus();
                
                // Handle input completion
                const finishEdit = () => {
                    const newValue = parseInt(input.value);
                    if (!isNaN(newValue) && newValue >= 0 && newValue <= 10) {
                        this.character.humanity = newValue;
                        humanityValues.innerHTML = `
                            <span class="current-value">${newValue}</span>
                            <span class="separator">/</span>
                            <span class="max-value">10</span>
                        `;
                        // Refresh display to update all related elements
                        this.displayCharacterStats();
                        this.saveCharacter(); // Save changes
                    } else {
                        // Restore original display if invalid
                        humanityValues.innerHTML = originalHTML;
                    }
                };
                
                // Handle events for completing edit
                input.addEventListener('blur', finishEdit);
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        finishEdit();
                    }
                });
            });
        }
        
        // Add event listeners for stains buttons
        div.querySelectorAll('.stains-btn').forEach(button => {
            button.addEventListener('click', () => {
                const isPlus = button.classList.contains('plus');
                let newStains = this.character.humanityStains + (isPlus ? 1 : -1);
                
                // Ensure stains stay between 0 and 10
                newStains = Math.max(0, Math.min(10, newStains));
                
                if (newStains !== this.character.humanityStains) {
                    this.character.humanityStains = newStains;
                    
                    // If adding stains and exceeding max, add aggravated willpower damage
                    if (isPlus && newStains > maxStains) {
                        const excess = newStains - maxStains;
                        // Calculate how much aggravated damage we can add without exceeding max
                        const currentAggravated = this.character.willpowerDamage.aggravated;
                        const maxAggravated = this.character.willpower;
                        const availableSpace = maxAggravated - currentAggravated;
                        
                        // Only add as much aggravated damage as we have space for
                        if (availableSpace > 0) {
                            this.character.willpowerDamage.aggravated = Math.min(maxAggravated, currentAggravated + 1);
                        }
                    }
                    
                    // Update display
                    this.displayCharacterStats();
                }
            });
        });

        return div;
    }

    createResonanceTracker() {
        const div = document.createElement('div');
        div.className = 'resonance-tracker';
        
        const resonanceTypes = ['Sanguine', 'Choleric', 'Phlegmatic', 'Melancholic', 'Empty', "Animal Blood"];
        const temperamentTypes = ['Fleeting', 'Intense', 'Acute'];
        const currentResonance = this.character.resonance || 'None';
        const currentTemperament = this.character.temperament || 'None';
        const currentDyscrasia = this.character.dyscrasia || 'None';
        
        // Define Dyscrasia subtypes
        const dyscrasiaTypes = {
            'Sanguine': [
                'Contagious Enthusiasm',
                'Smell Game',
                'High on Life',
                'Manic High',
                'True Love',
                'Stirring'
            ],
            'Choleric': [
                'Bully',
                'Cycle of Violence',
                'Envy',
                'Principled',
                'Vengeful',
                'Vicious',
                'Driving'
            ],
            'Melancholic': [
                'In Mourning',
                'Lost Love',
                'Lost Relative',
                'Massive Failure',
                'Nostalgic',
                'Recalling'
            ],
            'Phlegmatic': [
                'Chill',
                'Feel no Pain',
                'Eating your Emotions',
                'Given Up',
                'Lone Wolf',
                'Procrastinate',
                'Reflection'
            ]
        };
        
        // Check if dyscrasia section should be shown - only shown with Acute temperament
        const showDyscrasia = currentTemperament === 'Acute' && 
                             (currentResonance === 'Sanguine' || 
                              currentResonance === 'Choleric' || 
                              currentResonance === 'Phlegmatic' || 
                              currentResonance === 'Melancholic');
        
        // Get appropriate dyscrasia options based on resonance
        const dyscrasiaOptions = showDyscrasia ? (dyscrasiaTypes[currentResonance] || []) : [];
        
        // No longer need to add styles here - moved to CSS file
        
        div.innerHTML = `
            <div class="resonance-header">
                <span class="resonance-label">Resonance</span>
            </div>
            <div class="resonance-controls">
                <div class="resonance-type">
                    <span class="resonance-sub-label">Type</span>
                    <select class="resonance-select" id="resonance-type-select">
                        <option value="None" ${currentResonance === 'None' ? 'selected' : ''}>None</option>
                        ${resonanceTypes.map(type => 
                            `<option value="${type}" ${currentResonance === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="resonance-temperament">
                    <span class="resonance-sub-label">Temperament</span>
                    <select class="resonance-select" id="temperament-select">
                        <option value="None" ${currentTemperament === 'None' ? 'selected' : ''}>None</option>
                        ${temperamentTypes.map(type => {
                            // Disable Acute temperament for "Empty" and "Animal Blood" since they can't have Dyscrasia
                            const isDisabled = type === 'Acute' && 
                                              (currentResonance === 'Empty' || currentResonance === 'Animal Blood');
                            return `<option value="${type}" 
                                ${currentTemperament === type ? 'selected' : ''} 
                                ${isDisabled ? 'disabled' : ''}>${type}${isDisabled ? ' (Not Available)' : ''}</option>`;
                        }).join('')}
                    </select>
                </div>
            </div>
            ${showDyscrasia ? `
            <div class="resonance-controls dyscrasia-section">
                <div class="dyscrasia-type">
                    <span class="resonance-sub-label">${currentResonance} Dyscrasia</span>
                    <select class="resonance-select" id="dyscrasia-select">
                        <option value="None" ${currentDyscrasia === 'None' ? 'selected' : ''}>Select a Dyscrasia</option>
                        ${dyscrasiaOptions.map(type => 
                            `<option value="${type}" ${currentDyscrasia === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>` : ''}
            </div>
        `;

        // Add event listeners for resonance and temperament selection
        div.querySelectorAll('.resonance-select').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.id === 'resonance-type-select') {
                    this.character.resonance = e.target.value;
                    console.log(`Changed resonance to: ${e.target.value}`);
                    
                    // If switching to "Empty" or "Animal Blood", reset temperament if it was Acute
                    if ((e.target.value === 'Empty' || e.target.value === 'Animal Blood') && 
                        this.character.temperament === 'Acute') {
                        this.character.temperament = 'None';
                        this.character.dyscrasia = 'None';
                    }
                    
                    // Save the character before re-rendering
                    this.saveCharacter();
                    
                    // Force a re-render to update disabled status and dyscrasia options
                    const newTracker = this.createResonanceTracker();
                    div.parentNode.replaceChild(newTracker, div);
                    return;
                } else if (e.target.id === 'temperament-select') {
                    this.character.temperament = e.target.value;
                    console.log(`Changed temperament to: ${e.target.value}`);
                    
                    // Reset dyscrasia if temperament is not Acute
                    if (e.target.value !== 'Acute') {
                        this.character.dyscrasia = 'None';
                    }
                    
                    // Save the character before re-rendering
                    this.saveCharacter();
                    
                    // Force a re-render to update dyscrasia options
                    const newTracker = this.createResonanceTracker();
                    div.parentNode.replaceChild(newTracker, div);
                    return;
                } else if (e.target.id === 'dyscrasia-select') {
                    this.character.dyscrasia = e.target.value;
                    console.log(`Changed dyscrasia to: ${e.target.value}`);
                }
                
                // Save the character after updating resonance or temperament
                this.saveCharacter();
                this.displayCharacterStats();
                
                // Update bonus indicator
                //this.updateResonanceBonusIndicator(div);
            });
        });
        
        // Initialize the bonus indicator
        //this.updateResonanceBonusIndicator(div);

        return div;
    }
    
    // Helper method to update the resonance bonus indicator
    updateResonanceBonusIndicator(container) {
        if (!this.character) return;
        
        // Remove any existing indicator
        const existingIndicator = container.querySelector('.resonance-bonus-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        const resonance = this.character.resonance;
        const temperament = this.character.temperament || '';
        
        // Only show indicator for Acute temperament
        if (!resonance || resonance === 'None' || !temperament || temperament !== 'Acute') {
            return;
        }
        
        // Create the indicator element
        const indicator = document.createElement('div');
        indicator.className = 'resonance-bonus-indicator';
        indicator.innerHTML = `
            <div class="indicator-content">
                <span class="bonus-label">+1 Die Bonus</span>
                <span class="bonus-details">
                    When using these disciplines:
                    <ul class="discipline-list">
                        ${this.getResonanceDisciplines(resonance).map(d => 
                            `<li>${d}</li>`
                        ).join('')}
                    </ul>
                </span>
            </div>
        `;
        
        // Add some styling
        const style = document.createElement('style');
        if (!document.querySelector('#resonance-bonus-styles')) {
            style.id = 'resonance-bonus-styles';
            style.innerHTML = `
                .resonance-bonus-indicator {
                    margin-top: 10px;
                    padding: 5px;
                    background-color: rgba(0, 128, 0, 0.1);
                    border-left: 3px solid green;
                    border-radius: 3px;
                    font-size: 0.9em;
                }
                .bonus-label {
                    font-weight: bold;
                    color: green;
                    display: block;
                }
                .discipline-list {
                    margin: 5px 0 0 15px;
                    padding: 0;
                }
                .discipline-list li {
                    margin-bottom: 2px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to the container
        container.appendChild(indicator);
    }
    
    // Helper to get disciplines for a resonance type
    getResonanceDisciplines(resonance) {
        const resonanceToDisciplines = {
            'Choleric': ['Celerity', 'Potence'],
            'Melancholic': ['Fortitude', 'Obfuscate'],
            'Phlegmatic': ['Auspex', 'Dominate'],
            'Sanguine': ['Blood Sorcery', 'Presence'],
            '"Empty"': ['Oblivion'],
            'Animal Blood': ['Animalism', 'Protean']
        };
        
        // Support both spellings
        if (resonance === 'Melancholy') {
            resonance = 'Melancholic';
        }
        
        return resonanceToDisciplines[resonance] || [];
    }
}

// Initialize the Progeny manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const progenyManager = new ProgenyManager();
    window.progenyManager = progenyManager;
}); 