"use strict";

function dice_initialize(container) {
    // Ensure dice object is initialized
    if (!window.$t || !window.$t.dice) {
        console.error('Dice object not properly initialized');
        showError('Failed to initialize dice roller. Please refresh the page.');
        return;
    }

    // Add error handling for haptic feedback
    function vibrateDevice(pattern) {
        try {
            if ('vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (error) {
            console.warn('Haptic feedback not available:', error);
        }
    }

    // Add error display function
    function showError(message, duration = 5000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, duration);
    }

    // Get all required elements
    const elements = {
        canvas: $t.id('canvas'),
        regularPool: $t.id('regular_pool'),
        bloodPool: $t.id('blood_pool'),
        bloodInfo: $t.id('blood-info'),
        regularInfo: $t.id('regular-info'),
        throwButton: $t.id('throw'),
        latestElement: $t.id('latest-roll'),
        webhookInput: $t.id('discord-webhook'),
        characterNameInput: $t.id('character-name'),
        saveWebhookButton: $t.id('save-webhook'),
        clearWebhookButton: $t.id('clear-webhook'),
        legendModal: $t.id('legend-modal'),
        discordModal: $t.id('discord-modal'),
        closeDiscordButton: $t.id('close-discord'),
        toggleLegendButton: $t.id('toggle-legend'),
        closeLegendButton: $t.id('close-legend'),
        toggleDiscordButton: $t.id('toggle-discord')
    };

    // Check if all required elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Required element '${key}' not found`);
            showError(`Failed to initialize: missing ${key}. Please refresh the page.`);
            return;
        }
    }

    // Destructure elements for easier access
    const {
        canvas,
        regularPool,
        bloodPool,
        bloodInfo,
        regularInfo,
        throwButton,
        latestElement,
        webhookInput,
        characterNameInput,
        saveWebhookButton,
        clearWebhookButton,
        legendModal,
        discordModal,
        closeDiscordButton,
        toggleLegendButton,
        closeLegendButton,
        toggleDiscordButton
    } = elements;

    try {
        $t.remove($t.id('loading_text'));
    } catch (error) {
        console.error('Failed to remove loading text:', error);
    }

    // Improved resize handling with debounce
    let resizeTimeout;
    window.addEventListener('resize', function() {
        console.log('Resize event triggered');
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            console.log('Reloading page...');
            location.reload();
        }, 250);
    });

    function updateCanvasSize() {
        try {
            const isMobile = window.innerWidth <= 768;
            const controlPanelHeight = getControlPanelHeight();
            const canvasHeight = window.innerHeight - controlPanelHeight;
            
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            canvas.style.top = controlPanelHeight + 'px';
            canvas.style.position = 'absolute';
            canvas.style.left = '0';
            canvas.style.right = '0';
            canvas.style.bottom = '0';
            
            // Update box dimensions
            if (box) {
                box.reinit(canvas, { 
                    w: window.innerWidth, 
                    h: canvasHeight
                });
            }
        } catch (error) {
            console.error('Failed to update canvas size:', error);
            showError('Failed to update display. Please refresh the page.');
        }
    }

    function getControlPanelHeight() {
        if (window.innerWidth <= 768) {
            return 180;
        }
        return 140;
    }

    $t.dice.use_true_random = false;

    // Add modern UI interactions
    function setupModernUI() {
        // Add ripple effect to button
        throwButton.addEventListener('click', function(e) {
            const rect = throwButton.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            throwButton.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });

        // Add smooth slider interaction
        [regularPool, bloodPool].forEach(slider => {
            slider.addEventListener('input', function() {
                this.style.setProperty('--slider-value', this.value);
                // Update the text immediately
                const isRegular = slider === regularPool;
                const word = (this.value == '1') ? (isRegular ? 'Regular Die' : 'Hunger Die') : (isRegular ? 'Regular Dice' : 'Hunger Dice');
                const infoElement = isRegular ? regularInfo : bloodInfo;
                infoElement.innerHTML = this.value + ' ' + word;
            });
        });

        // Add keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                throwButton.click();
            }
        });
    }

    // Add touch event handling for sliders
    function setupTouchHandlers() {
        const sliders = [regularPool, bloodPool];
        sliders.forEach(slider => {
            slider.addEventListener('touchstart', function(e) {
                e.preventDefault();
            }, { passive: false });
            
            slider.addEventListener('touchmove', function(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = slider.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));
                const value = Math.round(percentage * (parseInt(slider.max) - parseInt(slider.min)) + parseInt(slider.min));
                slider.value = value;
                
                const event = new Event('input', { bubbles: true });
                slider.dispatchEvent(event);
            }, { passive: false });
        });
    }

    // Initialize UI
    setupModernUI();
    setupTouchHandlers();

    // Initialize dice box
    const box = new $t.dice.dice_box(canvas, { 
        w: window.innerWidth, 
        h: window.innerHeight - getControlPanelHeight()
    });
    box.animate_selector = false;
    box.init();
    box.bind_mouse(container);
    box.bind_throw(throwButton, notation_getter, before_roll, after_roll);
    
    // Store the dice box instance globally
    window.box = box;

    // Clear roll result
    const clearRollButton = document.getElementById('clear-roll');
    clearRollButton.addEventListener('click', () => {
        // Clear the text result
        latestElement.innerHTML = '';
        latestElement.classList.remove('rolling');
        throwButton.disabled = false;

        // Remove all dice from the canvas
        if (box) {
            box.clear();
            box.init();
        }
    });

    // Initialize dice settings
    function initializeDiceSettings() {
        try {
            const savedRegularDice = localStorage.getItem('regularDice');
            const savedHungerDice = localStorage.getItem('hungerDice');
            
            if (savedRegularDice !== null) {
                const value = parseInt(savedRegularDice);
                if (!isNaN(value) && value >= 0 && value <= 20) {
                    regularPool.value = value;
                    regularInfo.textContent = value + ' Regular Dice';
                    regularPool.style.setProperty('--slider-value', value);
                }
            }
            
            if (savedHungerDice !== null) {
                const value = parseInt(savedHungerDice);
                if (!isNaN(value) && value >= 0 && value <= 5) {
                    bloodPool.value = value;
                    bloodInfo.textContent = value + ' Hunger Dice';
                    bloodPool.style.setProperty('--slider-value', value);
                }
            }
        } catch (error) {
            console.error('Failed to initialize dice settings:', error);
            showError('Failed to load saved settings. Using defaults.');
        }
    }

    // Save dice settings
    function saveDiceSettings() {
        try {
            localStorage.setItem('regularDice', regularPool.value);
            localStorage.setItem('hungerDice', bloodPool.value);
        } catch (error) {
            console.error('Failed to save dice settings:', error);
            showError('Failed to save settings. Please check your browser storage permissions.');
        }
    }

    // Add event listeners for saving settings
    regularPool.addEventListener('change', saveDiceSettings);
    bloodPool.addEventListener('change', saveDiceSettings);
    regularPool.addEventListener('input', saveDiceSettings);
    bloodPool.addEventListener('input', saveDiceSettings);

    // Initialize settings when the page loads
    initializeDiceSettings();

    // Discord toggle functionality
    toggleDiscordButton.addEventListener('click', () => {
        discordModal.classList.remove('hidden');
    });

    closeDiscordButton.addEventListener('click', () => {
        discordModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    discordModal.addEventListener('click', (e) => {
        if (e.target === discordModal) {
            discordModal.classList.add('hidden');
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !discordModal.classList.contains('hidden')) {
            discordModal.classList.add('hidden');
        }
    });

    // Legend toggle functionality
    toggleLegendButton.addEventListener('click', () => {
        legendModal.classList.remove('hidden');
    });

    closeLegendButton.addEventListener('click', () => {
        legendModal.classList.add('hidden');
    });

    // Close legend modal when clicking outside
    legendModal.addEventListener('click', (e) => {
        if (e.target === legendModal) {
            legendModal.classList.add('hidden');
        }
    });

    // Close legend modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !legendModal.classList.contains('hidden')) {
            legendModal.classList.add('hidden');
        }
    });

    // Load saved webhook and character name
    webhookInput.value = localStorage.getItem('discordWebhook') || '';
    characterNameInput.value = localStorage.getItem('characterName') || '';

    // Function to update character name field visibility
    function updateCharacterNameField() {
        const progenyCharacter = localStorage.getItem('progenyCharacter');
        if (progenyCharacter) {
            try {
                const { character } = JSON.parse(progenyCharacter);
                characterNameInput.value = character.name;
                characterNameInput.style.display = 'none';
            } catch (error) {
                console.error('Error parsing Progeny character:', error);
                characterNameInput.style.display = 'block';
            }
        } else {
            characterNameInput.style.display = 'block';
        }
    }

    // Initial update of character name field
    updateCharacterNameField();

    // Listen for changes to Progeny character
    window.addEventListener('storage', (e) => {
        if (e.key === 'progenyCharacter') {
            updateCharacterNameField();
        }
    });

    // Save webhook
    saveWebhookButton.addEventListener('click', function() {
        localStorage.setItem('discordWebhook', webhookInput.value);
        // Only save character name if no Progeny character is loaded
        if (!localStorage.getItem('progenyCharacter')) {
            localStorage.setItem('characterName', characterNameInput.value);
        }
        
        // Show success message
        const successDiv = document.createElement('div');
        successDiv.className = 'notification';
        successDiv.textContent = 'Discord settings saved successfully!';
        document.body.appendChild(successDiv);
        
        // Add show class after a small delay to trigger animation
        setTimeout(() => {
            successDiv.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            successDiv.classList.remove('show');
            // Remove element after animation completes
            setTimeout(() => {
                successDiv.remove();
            }, 300);
        }, 2000);

        // Close the Discord modal
        discordModal.classList.add('hidden');
    });

    // Clear webhook
    clearWebhookButton.addEventListener('click', function() {
        localStorage.removeItem('discordWebhook');
        localStorage.removeItem('characterName');
        webhookInput.value = '';
        characterNameInput.value = '';
        updateCharacterNameField();
    });

    function before_roll(vectors, notation, callback) {
        try {
            latestElement.innerHTML = 'rolling...';
            latestElement.classList.add('rolling');
            throwButton.disabled = true;
            vibrateDevice(50);
            callback();
        } catch (error) {
            console.error('Error during roll preparation:', error);
            showError('Failed to prepare roll. Please try again.');
            throwButton.disabled = false;
        }
    }

    function notation_getter() {
        return $t.dice.parse_notation(regularPool.value, bloodPool.value);
    }

    function after_roll(notation, result) {
        try {
            latestElement.classList.remove('rolling');
            throwButton.disabled = false;
            
            vibrateDevice([50, 100, 50]);
            
            if (!Array.isArray(result)) {
                throw new Error('Invalid roll result format');
            }

            let simpleAnkhs = 0;
            let hungerDoubleAnkhs = 0;
            let regularDoubleAnhks = 0;
            let bestialFailureCandidate = false;
            
            result.forEach((roll, i) => {
                if (typeof roll !== 'number') {
                    throw new Error('Invalid roll value');
                }
                const isBlood = i >= notation.set.length;
                if (6 <= roll && roll <= 9) {
                    simpleAnkhs += 1;
                }
                if (isBlood && roll == 1) {
                    bestialFailureCandidate = true;
                }
                if (roll == 0) {
                    if (isBlood) {
                        hungerDoubleAnkhs += 1;
                    } else {
                        regularDoubleAnhks += 1;
                    }
                }
            });
            
            const doubleAnkhs = regularDoubleAnhks + hungerDoubleAnkhs;
            const successes = simpleAnkhs + 4 * parseInt(doubleAnkhs / 2) + (doubleAnkhs % 2);
            const critical = parseInt(doubleAnkhs / 2);
            const messyCritical = critical && (hungerDoubleAnkhs > 0);
            const bestialFailure = bestialFailureCandidate && successes === 0;

            // Update interface with animation
            let newHtml = '';
            if (successes > 0) {
                newHtml += `${successes} Success`;
                if (successes > 1) { newHtml += 'es'; }
                if (messyCritical) {
                    newHtml += ', <span class="messy-critical critical">Messy Critical</span>'
                } else if (critical) {
                    newHtml += ', <span class="critical">Critical</span>'
                }
            } else {
                if (bestialFailure) {
                    newHtml += '<span class="bestial-failure failure">Bestial Failure</span>';
                } else {
                    newHtml += '<span class="failure">Failure</span>';
                }
            }

            latestElement.innerHTML = newHtml;
            
            // Add result animation
            latestElement.style.animation = 'none';
            latestElement.offsetHeight; // Trigger reflow
            latestElement.style.animation = 'fadeIn 0.5s ease-out';

            // Send results to Discord if webhook is configured
            const webhookUrl = localStorage.getItem('discordWebhook');
            const characterName = localStorage.getItem('characterName');
            
            if (webhookUrl) {
                sendToDiscord(webhookUrl, {
                    regularDice: regularPool.value,
                    hungerDice: bloodPool.value,
                    successes: successes,
                    critical: critical,
                    messyCritical: messyCritical,
                    bestialFailure: bestialFailure,
                    result: newHtml,
                    characterName: characterName
                }).catch(error => {
                    console.error('Failed to send to Discord:', error);
                });
            }
        } catch (error) {
            console.error('Error processing roll result:', error);
            showError('Failed to process roll result. Please try again.');
            throwButton.disabled = false;
        }
    }

    // Expose the roll functions globally
    window.before_roll = before_roll;
    window.after_roll = after_roll;

    // Function to send results to Discord with improved error handling
    async function sendToDiscord(webhookUrl, rollData) {
        if (!webhookUrl) {
            throw new Error('No webhook URL provided');
        }

        try {
            const embed = {
                title: rollData.characterName ? `${rollData.characterName}'s Roll` : "🎲 Vampire Dice Roll",
                color: rollData.successes > 0 ? 0x00ff00 : 0xff0000,
                fields: [
                    {
                        name: "Dice Pool",
                        value: `${rollData.regularDice} Regular + ${rollData.hungerDice} Hunger`,
                        inline: true
                    },
                    {
                        name: "Result",
                        value: rollData.result.replace(/<[^>]*>/g, ''), // Remove HTML tags
                        inline: true
                    }
                ],
                timestamp: new Date().toISOString()
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    embeds: [embed]
                })
            });

            if (!response.ok) {
                throw new Error(`Discord API responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send to Discord:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }
}
