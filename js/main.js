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

    // Add vibration patterns for different events
    const vibrationPatterns = {
        // Heartbeat pattern at 60 BPM (1 second per beat)
        // lub (strong beat) - pause - dub (soft beat) - pause
        // Each complete cycle is 2 seconds (1200ms)
        rollStart: [300, 200, 150, 550, 300, 200, 150, 550],
        
        // Quick double-tap for standard completion
        rollComplete: [50, 50, 50],
        
        // Triumphant ascending pattern for critical success
        criticalSuccess: [50, 100, 150, 200, 150, 100, 50],
        
        // Intense, erratic pattern for messy critical (like losing control)
        messyCritical: [200, 50, 200, 50, 200, 50, 200, 50, 200],
        
        // Deep, ominous pattern for bestial failure (like a predator's growl)
        bestialFailure: [300, 100, 300, 100, 300],
        
        // Celebration pattern for multiple successes
        multipleSuccesses: [50, 100, 50, 100, 50, 100, 50],
        
        // Dramatic pattern for a close call (just enough successes)
        closeCall: [100, 200, 100, 200, 100]
    };

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
        hungerPool: $t.id('hunger_pool'),
        rousePool: $t.id('rouse_pool'),
        remorsePool: $t.id('remorse_pool'),
        frenzyPool: $t.id('frenzy_pool'),
        hungerInfo: $t.id('hunger-info'),
        regularInfo: $t.id('regular-info'),
        rouseInfo: $t.id('rouse-info'),
        remorseInfo: $t.id('remorse-info'),
        frenzyInfo: $t.id('frenzy-info'),
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
        hungerPool,
        rousePool,
        remorsePool,
        frenzyPool,
        hungerInfo,
        regularInfo,
        rouseInfo,
        remorseInfo,
        frenzyInfo,
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
    let lastHeight = window.innerHeight;
    let isKeyboardVisible = false;
    
    window.addEventListener('resize', function() {
        const currentHeight = window.innerHeight;
        const heightDifference = Math.abs(currentHeight - lastHeight);
        
        // If the height change is very small (likely keyboard), ignore it
        if (heightDifference < 50) {
            isKeyboardVisible = currentHeight < lastHeight;
            return;
        }
        
        // Reload on all significant changes
        console.log('Window resize detected, reloading page...');
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            location.reload();
        }, 250);
        
        lastHeight = currentHeight;
    });

    function updateCanvasSize() {
        try {
            const isMobile = window.innerWidth <= 768;
            const controlPanelHeight = getControlPanelHeight();
            const MIN_CANVAS_HEIGHT = 500; // Minimum height in pixels
            
            // Use a fixed height for mobile devices to prevent keyboard-triggered reloads
            let canvasHeight;
            if (isMobile) {
                // Store the initial height when the page loads
                if (!window.initialMobileHeight) {
                    window.initialMobileHeight = window.innerHeight;
                }
                // Use the initial height if keyboard is visible
                canvasHeight = Math.max(MIN_CANVAS_HEIGHT, (isKeyboardVisible ? window.initialMobileHeight : window.innerHeight) - controlPanelHeight);
                // Update the CSS variable
                document.documentElement.style.setProperty('--control-panel-height', controlPanelHeight + 'px');
            } else {
                canvasHeight = Math.max(MIN_CANVAS_HEIGHT, window.innerHeight - controlPanelHeight);
            }
            
            if (canvasHeight <= 0) {
                console.warn('Canvas height would be negative, skipping update');
                return;
            }
            
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            canvas.style.top = controlPanelHeight + 'px';
            canvas.style.position = 'fixed';
            canvas.style.left = '0';
            canvas.style.right = '0';
            canvas.style.bottom = '0';
            
            // Update box dimensions
            if (box && typeof box.reinit === 'function') {
                try {
                    // Make sure canvas exists and is properly attached to DOM
                    if (canvas && canvas.parentNode && document.body.contains(canvas)) {
                        box.reinit(canvas, { 
                            w: window.innerWidth, 
                            h: canvasHeight
                        });
                    } else {
                        console.warn('Canvas not ready for dice box initialization');
                    }
                } catch (e) {
                    console.warn('Error reinitializing dice box:', e);
                    // If we get an error, try to recreate the box from scratch
                    try {
                        if (typeof box.clear === 'function') box.clear();
                        initDiceBox();
                    } catch (reinitError) {
                        console.error('Failed to recover dice box:', reinitError);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to update canvas size:', error);
            // Only show error if it's not a resize-related issue
            if (!error.message?.includes('ResizeObserver') && !error.message?.includes('resize')) {
                showError('Failed to update display. Please refresh the page.');
            }
        }
    }

    function getControlPanelHeight() {
        const controlPanel = document.querySelector('.control_panel');
        if (!controlPanel) return window.innerWidth <= 768 ? 180 : 140;
        
        // Get the actual height of the control panel including padding and margins
        const height = controlPanel.getBoundingClientRect().height;
        return height;
    }

    // Add resize observer to watch for control panel size changes
    const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize();
    });

    const controlPanel = document.querySelector('.control_panel');
    if (controlPanel) {
        resizeObserver.observe(controlPanel);
    }

    // Add mobile-specific viewport meta tag handling
    function setupMobileViewport() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Store initial height and set it as a CSS variable
            window.initialMobileHeight = window.innerHeight;
            document.documentElement.style.setProperty('--control-panel-height', getControlPanelHeight() + 'px');
            
            // Add viewport meta tag if it doesn't exist
            let viewportMeta = document.querySelector('meta[name="viewport"]');
            if (!viewportMeta) {
                viewportMeta = document.createElement('meta');
                viewportMeta.name = 'viewport';
                document.head.appendChild(viewportMeta);
            }
            
            // Set viewport to prevent zoom and maintain height
            viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            
            // Handle orientation changes
            window.addEventListener('orientationchange', () => {
                // Update initial height on orientation change
                window.initialMobileHeight = window.innerHeight;
                document.documentElement.style.setProperty('--control-panel-height', getControlPanelHeight() + 'px');
                updateCanvasSize();
            });

            // Handle text input focus on mobile
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
                    e.preventDefault();
                    const input = e.target;
                    const currentValue = input.value;
                    const placeholder = input.placeholder;
                    
                    // Use a simple prompt for text input
                    const newValue = prompt(placeholder || 'Enter text:', currentValue);
                    if (newValue !== null) {
                        input.value = newValue;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }, { passive: false });

            // Prevent resize events when keyboard appears
            let resizeTimeout;
            let lastHeight = window.innerHeight;
            let isKeyboardVisible = false;
            
            window.addEventListener('resize', () => {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
                resizeTimeout = setTimeout(() => {
                    const currentHeight = window.innerHeight;
                    const heightDifference = Math.abs(currentHeight - lastHeight);
                    
                    // If the height change is small (likely keyboard), ignore it
                    if (heightDifference < 100) {
                        isKeyboardVisible = currentHeight < lastHeight;
                        return;
                    }
                    
                    // If it's a significant height change (orientation change or real resize)
                    lastHeight = currentHeight;
                    window.initialMobileHeight = currentHeight;
                    document.documentElement.style.setProperty('--control-panel-height', getControlPanelHeight() + 'px');
                    updateCanvasSize();
                }, 100);
            });

            // Handle input focus to prevent resize
            document.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    // Store the current scroll position
                    window.scrollPosition = window.scrollY;
                    // Prevent the default scroll behavior
                    e.target.scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            });

            document.addEventListener('focusout', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    // Restore scroll position
                    window.scrollTo(0, window.scrollPosition);
                }
            });

            // Prevent default behavior on input focus
            document.addEventListener('touchstart', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    e.preventDefault();
                    e.target.focus();
                }
            }, { passive: false });

            // Prevent scrolling when keyboard is visible
            document.addEventListener('scroll', (e) => {
                if (isKeyboardVisible) {
                    e.preventDefault();
                    window.scrollTo(0, window.scrollPosition);
                }
            }, { passive: false });
        }
    }

    // Initialize mobile viewport handling
    setupMobileViewport();

    // Handle window resize events for all devices
    window.addEventListener('resize', () => {
        updateCanvasSize();
    });

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
        [regularPool, hungerPool, remorsePool, frenzyPool, rousePool].forEach(slider => {
            slider.addEventListener('input', function() {
                this.style.setProperty('--slider-value', this.value);
                // Update the text immediately
                const isRegular = slider === regularPool;
                const isHunger = slider === hungerPool;
                const isRemorse = slider === remorsePool;
                const isFrenzy = slider === frenzyPool;
                const isRouse = slider === rousePool;
                
                let word;
                if (isRegular) word = (this.value == '1') ? 'Regular Die' : 'Regular Dice';
                else if (isHunger) word = (this.value == '1') ? 'Hunger Die' : 'Hunger Dice';
                else if (isRemorse) word = (this.value == '1') ? 'Remorse Die' : 'Remorse Dice';
                else if (isFrenzy) word = (this.value == '1') ? 'Frenzy Die' : 'Frenzy Dice';
                else if (isRouse) word = (this.value == '1') ? 'Rouse Die' : 'Rouse Dice';
                
                const infoElement = isRegular ? regularInfo : 
                                  isHunger ? hungerInfo :
                                  isRemorse ? remorseInfo :
                                  isFrenzy ? frenzyInfo :
                                  rouseInfo;
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
        const sliders = [regularPool, hungerPool, remorsePool, frenzyPool, rousePool];
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

    // Initialize dice settings first
    initializeDiceSettings();

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

    // Now that box is initialized, we can safely call updateCanvasSize
    updateCanvasSize();

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

    // Add cleanup function
    function cleanupDiceBox() {
        if (window.box) {
            window.box.dispose();
            window.box = null;
        }
    }

    // Add event listener for page unload
    window.addEventListener('unload', cleanupDiceBox);

    // Add cleanup to the clear roll button
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

    // Add cleanup when switching views or closing modals
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cleanupDiceBox();
        }
    });

    // Initialize dice settings
    function initializeDiceSettings() {
        // Load saved settings or use defaults
        const savedSettings = localStorage.getItem('diceSettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {
            regular: 0,
            hunger: 0,
            rouse: 0,
            remorse: 0,
            frenzy: 0,
            toggles: {
                hunger: false,
                rouse: false,
                remorse: false,
                frenzy: false,
                regular: true  // Regular dice is visible by default
            }
        };

        // Set initial values
        document.getElementById('regular_pool').value = settings.regular;
        document.getElementById('hunger_pool').value = settings.hunger;
        document.getElementById('rouse_pool').value = settings.rouse;
        document.getElementById('remorse_pool').value = settings.remorse;
        document.getElementById('frenzy_pool').value = settings.frenzy;

        // Restore toggle states
        if (settings.toggles) {
            // Handle regular dice visibility first
            const regularControl = document.querySelector('.dice-control:not(.hidden-controls *)');
            if (regularControl) {
                if (!settings.toggles.regular) {
                    regularControl.classList.add('hidden');
                } else {
                    regularControl.classList.remove('hidden');
                }
            }

            if (settings.toggles.hunger) {
                document.querySelector('.hunger-control').classList.remove('hidden');
                document.querySelector('[data-target="hunger"]').classList.add('active');
            }
            if (settings.toggles.rouse) {
                document.querySelector('.rouse-control').classList.remove('hidden');
                document.querySelector('[data-target="rouse"]').classList.add('active');
            }
            if (settings.toggles.remorse) {
                document.querySelector('.remorse-control').classList.remove('hidden');
                document.querySelector('[data-target="remorse"]').classList.add('active');
            }
            if (settings.toggles.frenzy) {
                document.querySelector('.frenzy-control').classList.remove('hidden');
                document.querySelector('[data-target="frenzy"]').classList.add('active');
            }
        }

        // Update labels
        updateDiceLabels();

        // Add event listeners for sliders
        document.getElementById('regular_pool').addEventListener('input', updateDiceLabels);
        document.getElementById('hunger_pool').addEventListener('input', updateDiceLabels);
        document.getElementById('rouse_pool').addEventListener('input', updateDiceLabels);
        document.getElementById('remorse_pool').addEventListener('input', updateDiceLabels);
        document.getElementById('frenzy_pool').addEventListener('input', updateDiceLabels);

        // Add event listeners for toggle buttons
        const toggleButtons = document.querySelectorAll('.dice-toggle');
        toggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const target = button.dataset.target;
                const control = document.querySelector(`.${target}-control`);
                
                if (control.classList.contains('hidden')) {
                    // For Remorse and Frenzy dice, hide all other controls and deactivate other toggles
                    if (target === 'remorse' || target === 'frenzy') {
                        // Hide all other controls
                        document.querySelectorAll('.hunger-control, .rouse-control, .remorse-control, .frenzy-control, .dice-control:not(.hidden-controls *)').forEach(ctrl => {
                            if (!ctrl.classList.contains(`${target}-control`)) {
                                ctrl.classList.add('hidden');
                            }
                        });
                        
                        // Deactivate all other toggle buttons
                        toggleButtons.forEach(btn => {
                            if (btn !== button) {
                                btn.classList.remove('active');
                            }
                        });
                        
                        // Reset all other dice values
                        document.getElementById('regular_pool').value = '0';
                        document.getElementById('hunger_pool').value = '0';
                        document.getElementById('rouse_pool').value = '0';
                        if (target === 'remorse') {
                            document.getElementById('frenzy_pool').value = '0';
                        } else {
                            document.getElementById('remorse_pool').value = '0';
                        }
                    }
                    // For Hunger and Rouse, hide Remorse and Frenzy controls and deactivate their toggles
                    else if (target === 'hunger' || target === 'rouse') {
                        // Hide Remorse and Frenzy controls
                        document.querySelectorAll('.remorse-control, .frenzy-control').forEach(ctrl => {
                            ctrl.classList.add('hidden');
                        });
                        
                        // Deactivate Remorse and Frenzy toggle buttons
                        document.querySelectorAll('[data-target="remorse"], [data-target="frenzy"]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        
                        // Reset Remorse and Frenzy values
                        document.getElementById('remorse_pool').value = '0';
                        document.getElementById('frenzy_pool').value = '0';

                        // Ensure Regular dice control is visible
                        document.querySelector('.dice-control:not(.hidden-controls *)').classList.remove('hidden');
                        const regularSlider = document.getElementById('regular_pool');
                        if (regularSlider.value === '0') {
                            regularSlider.value = '1';
                        }
                    }
                    
                    // Show control and set value to 1 if it was 0
                    control.classList.remove('hidden');
                    button.classList.add('active');
                    if (target === 'rouse') {
                        document.getElementById('rouse_pool').value = 1;
                        updateDiceLabels();
                    } else {
                        const slider = document.getElementById(`${target}_pool`);
                        if (slider.value === '0') {
                            slider.value = '1';
                            updateDiceLabels();
                        }
                    }
                } else {
                    // Hide control and reset value to 0
                    control.classList.add('hidden');
                    button.classList.remove('active');
                    if (target === 'rouse') {
                        document.getElementById('rouse_pool').value = 0;
                    } else {
                        document.getElementById(`${target}_pool`).value = '0';
                    }
                    
                    // If turning off Remorse or Frenzy, show Regular dice control
                    if (target === 'remorse' || target === 'frenzy') {
                        document.querySelector('.dice-control:not(.hidden-controls *)').classList.remove('hidden');
                        const regularSlider = document.getElementById('regular_pool');
                        if (regularSlider.value === '0') {
                            regularSlider.value = '1';
                        }
                    }
                    
                    updateDiceLabels();
                }
            });
        });
    }

    function updateDiceLabels() {
        const regular = document.getElementById('regular_pool').value;
        const hunger = document.getElementById('hunger_pool').value;
        const rouse = parseInt(document.getElementById('rouse_pool').value);
        const remorse = document.getElementById('remorse_pool').value;
        const frenzy = document.getElementById('frenzy_pool').value;

        document.getElementById('regular-info').textContent = `${regular} Regular Dice`;
        document.getElementById('hunger-info').textContent = `${hunger} Hunger Dice`;
        document.getElementById('rouse-info').textContent = `${rouse} Rouse Dice`;
        document.getElementById('remorse-info').textContent = `${remorse} Remorse Dice`;
        document.getElementById('frenzy-info').textContent = `${frenzy} Frenzy Dice`;

        // Save settings
        saveDiceSettings();
    }

    function saveDiceSettings() {
        const settings = {
            regular: document.getElementById('regular_pool').value,
            hunger: document.getElementById('hunger_pool').value,
            rouse: parseInt(document.getElementById('rouse_pool').value),
            remorse: document.getElementById('remorse_pool').value,
            frenzy: document.getElementById('frenzy_pool').value,
            toggles: {
                hunger: !document.querySelector('.hunger-control').classList.contains('hidden'),
                rouse: !document.querySelector('.rouse-control').classList.contains('hidden'),
                remorse: !document.querySelector('.remorse-control').classList.contains('hidden'),
                frenzy: !document.querySelector('.frenzy-control').classList.contains('hidden'),
                regular: !document.querySelector('.dice-control:not(.hidden-controls *)').classList.contains('hidden')
            }
        };
        localStorage.setItem('diceSettings', JSON.stringify(settings));
    }

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
        
        // Create a single notification element at initialization
        const notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);

        function showNotification(message, duration = 2000) {
            notification.textContent = message;
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, duration);
        }

        // Then use it like this:
        showNotification('Discord settings saved successfully!');


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
            vibrateDevice(vibrationPatterns.rollStart);

            callback();
        } catch (error) {
            console.error('Error during roll preparation:', error);
            showError('Failed to prepare roll. Please try again.');
            throwButton.disabled = false;
        }
    }

    function notation_getter() {
        const rouseValue = parseInt(rousePool.value);
        
        // Debug output
        console.log(`Dice values - Regular: ${regularPool.value}, Hunger: ${hungerPool.value}, Rouse: ${rouseValue}`);
        
        // Force the rouse control to be visible if rouse value > 0
        if (rouseValue > 0) {
            const rouseControl = document.querySelector('.rouse-control');
            if (rouseControl) {
                rouseControl.classList.remove('hidden');
            }
            
            // Also make sure the rouse toggle is activated
            const rouseToggle = document.querySelector('.dice-toggle[data-target="rouse"]');
            if (rouseToggle) {
                rouseToggle.classList.add('active');
            }
            
            // Make sure special dice controls are visible 
            const specialDice = document.querySelector('.special-dice-controls');
            if (specialDice) {
                specialDice.classList.remove('hidden');
            }
        }
        
        return $t.dice.parse_notation(
            parseInt(regularPool.value),
            parseInt(hungerPool.value),
            rouseValue,
            parseInt(remorsePool.value),
            parseInt(frenzyPool.value)
        );
    }

    function after_roll(notation, result) {
        try {
            latestElement.classList.remove('rolling');
            throwButton.disabled = false;
            
            if (!Array.isArray(result)) {
                throw new Error('Invalid roll result format');
            }
            
            // Always reset Blood Surge state after any roll if progeny manager exists
            if (window.progenyManager && window.progenyManager.bloodSurgeEnabled) {
                window.progenyManager.resetBloodSurge();
            }

            // Determine roll types
            const isHungerRoll = hungerPool.value > 0;
            const isRouseRoll = parseInt(rousePool.value) > 0;
            const isRemorseRoll = document.querySelector('.remorse-control:not(.hidden)') !== null;
            const isFrenzyRoll = document.querySelector('.frenzy-control:not(.hidden)') !== null;
            
            // Handle rouse checks - Check if we have rouse dice and there's a progeny manager available
            const rouseCount = notation.rouseSet ? notation.rouseSet.length : 0;
            
            // Debug output to check notation and rouse dice
            console.log('Notation:', notation);
            console.log(`Rouse count: ${rouseCount}, isRouseRoll: ${isRouseRoll}`);
            
            if (rouseCount > 0 && window.progenyManager) {
                // Get the rouse dice results (offset by regular and hunger dice)
                const rouseStartIndex = notation.set.length + notation.hungerSet.length;
                if (result.length > rouseStartIndex) {
                    // Extract all rouse dice results
                    const rouseResults = result.slice(rouseStartIndex, rouseStartIndex + rouseCount);
                    
                    // Only use handleRouseResults for Discipline power rolls
                    if (window.progenyManager._currentPower && window.progenyManager._currentPower.rouseChecks > 0) {
                        window.progenyManager.handleRouseResults(rouseResults);
                    }
                    
                    // Handle additional logic for rouse checks if needed
                }
            }

            let simpleAnkhs = 0;
            let hungerDoubleAnkhs = 0;
            let regularDoubleAnhks = 0;
            let bestialFailureCandidate = false;
            let rouseSuccess = false;
            
            result.forEach((roll, i) => {
                if (typeof roll !== 'number') {
                    throw new Error('Invalid roll value');
                }
                const isHunger = i >= notation.set.length && i < notation.set.length + notation.hungerSet.length;
                const isRouse = i >= notation.set.length + notation.hungerSet.length && 
                               i < notation.set.length + notation.hungerSet.length + notation.rouseSet.length;

                if (isRouse) {
                    // Rouse check is successful on 6 or higher (including 10/✪)
                    // In V5, a Rouse check fails on 1-5 and succeeds on 6-10
                    if (roll >= 6) {
                        rouseSuccess = true;
                    }
                } else {
                    // Only count successes for non-Rouse dice
                    if (6 <= roll && roll <= 9) {
                        simpleAnkhs += 1;
                    }
                    if (isHunger && roll == 1) {
                        bestialFailureCandidate = true;
                    }
                    if (roll == 10) {
                        if (isHunger) {
                            hungerDoubleAnkhs += 1;
                        } else {
                            regularDoubleAnhks += 1;
                        }
                    }
                }
            });
            
            const doubleAnkhs = regularDoubleAnhks + hungerDoubleAnkhs;
            const successes = simpleAnkhs + 4 * parseInt(doubleAnkhs / 2) + (doubleAnkhs % 2);
            const critical = parseInt(doubleAnkhs / 2);
            const messyCritical = critical && (hungerDoubleAnkhs > 0);
            const bestialFailure = bestialFailureCandidate && successes === 0;

            // Apply appropriate vibration pattern based on result
            if (bestialFailure) {
                vibrateDevice(vibrationPatterns.bestialFailure);
            } else if (messyCritical) {
                vibrateDevice(vibrationPatterns.messyCritical);
            } else if (critical) {
                vibrateDevice(vibrationPatterns.criticalSuccess);
            } else if (successes >= 3) {
                vibrateDevice(vibrationPatterns.multipleSuccesses);
            } else if (successes === 1) {
                vibrateDevice(vibrationPatterns.closeCall);
            } else {
                vibrateDevice(vibrationPatterns.rollComplete);
            }

            // Update interface with animation
            let newHtml = '';
            const hasRegularOrHungerDice = notation.set.length > 0 || notation.hungerSet.length > 0;
            
            if (isRemorseRoll) {
                // For Remorse checks, we need to check if any of the dice rolled 6 or higher
                const remorseSuccess = result.some(r => r >= 6);
                newHtml += `<span class="${remorseSuccess ? 'success' : 'failure'}">Remorse Check: ${remorseSuccess ? 'Success' : 'Failure'}</span>`;
            } else if (isFrenzyRoll) {
                // For Frenzy checks, we need to check if any of the dice rolled 6 or higher
                const frenzySuccess = result.some(r => r >= 6);
                newHtml += `<span class="${frenzySuccess ? 'success' : 'failure'}">Frenzy Check: ${frenzySuccess ? 'Success' : 'Failure'}</span>`;
            } else if (hasRegularOrHungerDice) {
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
            }

            // Add Rouse check result if present
            if (notation.rouseSet && notation.rouseSet.length > 0) {
                if (hasRegularOrHungerDice || isFrenzyRoll || isRemorseRoll) {
                    newHtml += '<br>';
                }
                
                // Count successes for multiple rouse checks
                const rouseStartIndex = notation.set.length + notation.hungerSet.length;
                const rouseEndIndex = rouseStartIndex + notation.rouseSet.length;
                const rouseResults = result.slice(rouseStartIndex, rouseEndIndex);
                const rouseSuccesses = rouseResults.filter(r => r >= 6).length;
                const rouseFailures = rouseResults.length - rouseSuccesses;
                
                if (rouseResults.length === 1) {
                    // Single rouse check
                    newHtml += `<span class="${rouseSuccess ? 'success' : 'failure'}">Rouse Check: ${rouseSuccess ? 'Success' : 'Failure'}</span>`;
                } else {
                    // Multiple rouse checks
                    newHtml += `<span class="${rouseSuccesses === rouseResults.length ? 'success' : 'failure'}">
                        Rouse Checks: ${rouseSuccesses} Success${rouseSuccesses !== 1 ? 'es' : ''}, ${rouseFailures} Failure${rouseFailures !== 1 ? 's' : ''}
                    </span>`;
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
                    hungerDice: hungerPool.value,
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
            
            // Dispatch custom event for roll results that can be listened to by other components
            // Prepare dice results for event
            let rouseResults = [];
            let rouseSuccessCount = 0;
            if (isRouseRoll && notation.rouseSet) {
                const rouseStartIndex = notation.set.length + notation.hungerSet.length;
                const rouseEndIndex = rouseStartIndex + notation.rouseSet.length;
                rouseResults = result.slice(rouseStartIndex, rouseEndIndex).map((value, i) => {
                    const isSuccess = value >= 6;
                    if (isSuccess) rouseSuccessCount++;
                    return {
                        value: value,
                        // Rouse check success is 6 or higher (6-10)
                        success: isSuccess
                    };
                });
            }
            
            window.dispatchEvent(new CustomEvent('diceRollComplete', {
                detail: {
                    regularDice: parseInt(regularPool.value) || 0,
                    hungerDice: parseInt(hungerPool.value) || 0,
                    rouseDice: parseInt(rousePool.value) || 0,
                    remorseDice: parseInt(remorsePool.value) || 0,
                    frenzyDice: parseInt(frenzyPool.value) || 0,
                    results: rouseResults.length > 0 ? rouseResults : result,
                    successes: isRouseRoll ? rouseSuccessCount : successes,
                    critical: critical,
                    messyCritical: messyCritical,
                    bestialFailure: bestialFailure,
                    isHunger: isHungerRoll,
                    isRouse: isRouseRoll,
                    isRemorse: isRemorseRoll,
                    isFrenzy: isFrenzyRoll,
                    diceType: isRouseRoll ? 'rouse' : (isRemorseRoll ? 'remorse' : (isFrenzyRoll ? 'frenzy' : 'regular'))
                }
            }));
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
