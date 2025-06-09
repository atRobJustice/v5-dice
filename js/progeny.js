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
                this.character.resonance = data.resonance || 'None';
                this.character.temperament = data.temperament || 'None';

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
                    summary: discipline.summary
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
        const name = prompt('Enter power name:');
        if (!name) return;

        const level = parseInt(prompt('Enter power level (1-5):'));
        if (isNaN(level) || level < 1 || level > 5) {
            alert('Invalid level. Please enter a number between 1 and 5.');
            return;
        }

        const dicePool = prompt('Enter dice pool (e.g., "Strength + Brawl"):');
        if (!dicePool) return;

        const summary = prompt('Enter power summary:');
        if (!summary) return;

        const power = {
            name,
            level,
            dicePool,
            summary
        };

        this.character.disciplines[discipline].push(power);
        this.displayCharacterStats();
        this.showNotification(`Added ${name} power to ${discipline}`);
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
                        <div class="power-details">
                            <div>${power.dicePool}</div>
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
        const box = window.box;
        if (box && box.start_throw) {
            // Call start_throw with the proper notation getter
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
        }
    }

    getDicePool(stat) {
        let regularDice = 0;
        let hungerDice = 0;
        let specialtyBonus = 0;

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

        // Check if the stat exists in disciplines
        if (this.character.disciplines[stat]) {
            // Find the highest level power for this discipline
            const powers = this.character.disciplines[stat];
            if (powers && powers.length > 0) {
                const highestLevel = Math.max(...powers.map(power => power.level));
                regularDice += highestLevel;
            }
        }

        // Add specialty bonus to regular dice
        regularDice += specialtyBonus;
        console.log('Final dice pool:', { regular: regularDice, hunger: hungerDice, specialtyBonus });

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
        exportData.resonance = this.character.resonance || 'None';
        exportData.temperament = this.character.temperament || 'None';

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
        
        const powerName = prompt('Enter power name:');
        if (!powerName) return;
        
        const level = parseInt(prompt('Enter power level (1-5):'));
        if (isNaN(level) || level < 1 || level > 5) {
            alert('Invalid power level');
            return;
        }
        
        const power = {
            name: powerName,
            level: level,
            description: '',
            rouseChecks: 0,
            amalgamPrerequisites: [],
            summary: '',
            dicePool: ''
        };
        
        this.character.disciplines[discipline].push(power);
        this.displayCharacterStats();
        this.saveCharacter(); // Save after adding power
        this.showNotification(`Added ${powerName} power to ${this.formatName(discipline)}`);
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
        
        // Toggle the remorse button to active
        const remorseToggle = document.querySelector('[data-target="remorse"]');
        if (remorseToggle) {
            remorseToggle.classList.add('active');
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
            this.showNotification('Rouse check failed: Hunger increased by 1', 3000);
        } else {
            this.showNotification('Rouse check passed: Hunger unchanged', 3000);
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
            this.showNotification('Remorse check failed: Humanity reduced by 1', 3000);
        } else {
            this.showNotification('Remorse check passed', 3000);
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
        
        // Toggle the frenzy button to active
        const frenzyToggle = document.querySelector('[data-target="frenzy"]');
        if (frenzyToggle) {
            frenzyToggle.classList.add('active');
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
        
        const resonanceTypes = ['Sanguine', 'Choleric', 'Phlegmatic', 'Melancholic', '"Empty"'];
        const temperamentTypes = ['Negligible', 'Fleeting', 'Intense', 'Accute'];
        const currentResonance = this.character.resonance || 'None';
        const currentTemperament = this.character.temperament || 'None';
        
        div.innerHTML = `
            <div class="resonance-header">
                <span class="resonance-label">Resonance</span>
            </div>
            <div class="resonance-controls">
                <div class="resonance-type">
                    <span class="resonance-sub-label">Type</span>
                    <select class="resonance-select">
                        <option value="None" ${currentResonance === 'None' ? 'selected' : ''}>None</option>
                        ${resonanceTypes.map(type => 
                            `<option value="${type}" ${currentResonance === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="resonance-temperament">
                    <span class="resonance-sub-label">Temperament</span>
                    <select class="resonance-select">
                        <option value="None" ${currentTemperament === 'None' ? 'selected' : ''}>None</option>
                        ${temperamentTypes.map(type => 
                            `<option value="${type}" ${currentTemperament === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
        `;

        // Add event listeners for resonance and temperament selection
        div.querySelectorAll('.resonance-select').forEach(select => {
            select.addEventListener('change', (e) => {
                if (e.target.parentElement.classList.contains('resonance-type')) {
                    this.character.resonance = e.target.value;
                } else {
                    this.character.temperament = e.target.value;
                }
                this.displayCharacterStats();
            });
        });

        return div;
    }
}

// Initialize the Progeny manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const progenyManager = new ProgenyManager();
    window.progenyManager = progenyManager;
}); 