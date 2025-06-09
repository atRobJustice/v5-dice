# Changelog
All notable changes to the Vampire Dice Roller will be documented in this file.

## [0.5.6]
### Added
- Added control panel styles with new CSS variables for consistent theming
- Added special dice controls for Rouse, Remorse, and Frenzy dice types
- Added improved dice toggle functionality for showing/hiding specific dice types

### Changed
- Reorganized file structure with resources moved to assets and css directories
- Refactored window resize handling to improve mobile keyboard experience
- Updated CSS structure with modern variables for colors, spacing, and shadows
- Enhanced dice notation parsing to support additional dice types

### Fixed
- Fixed page reload issues when mobile keyboard appears/disappears
- Fixed inconsistent naming between hunger/blood dice in various components

### Technical Changes
- Improved dice settings persistence with enhanced localStorage handling
- Refactored control panel styling into separate CSS file
- Enhanced mobile viewport handling with improved meta tags

## [0.5.5]
### Fixed
- Fixed mobile keyboard causing unwanted page reloads
- Improved handling of viewport height changes on mobile devices
- Added text input focus handling to prevent keyboard issues

### Technical Changes
- Enhanced mobile viewport meta tags with additional properties
- Improved CSS positioning for mobile interface elements
- Added debounce mechanism for resize events to prevent unnecessary reloads

## [0.5.4]
### Added
- Added context menu with modern styling for character actions
- Added close button to context menu for improved usability
- Added menu divider for better visual organization

### Changed
- Improved button styling with modern design elements
- Repositioned context menu to top right of modal
- Enhanced menu interactions with hover effects and transitions

## [0.5.3]
### Added
- Resonance and Temperament tracking system
  - Added dropdown selectors for Resonance Type and Temperament
  - Implemented proper import/export of Resonance data
  - Added visual styling for Resonance tracker
  - Added support for "Empty" Resonance type

- Health, Willpower, and Humanity trackers
  - Reorganized trackers into a single row layout
  - Added proper damage tracking for all stats
  - Implemented Humanity Stains limit (max 10)
  - Added visual indicators for impairment states
  - Improved compactness of tracker layout

### Fixed
- Fixed Willpower damage calculation when exceeding Humanity Stains limit
- Fixed Resonance data persistence in character exports
- Fixed tracker layout and alignment issues

## [0.5.2]

### Fixed
- Fixed Progeny character export to properly include skill specialties
- Improved heartbeat vibration pattern timing to match realistic 60 BPM rhythm

### Technical Changes
- Enhanced Progeny export functionality to maintain specialty data structure
- Optimized vibration pattern timing for more realistic feedback

## [0.5.1]

### Added
- Enhanced character sheet integration with Progeny
- Improved mobile keyboard handling
- Added vibration patterns for different roll outcomes

### Changed
- Updated UI/UX for better mobile experience
- Enhanced notification system

### Fixed
- Mobile keyboard causing screen reloads
- Slider interaction issues on mobile devices

### Technical Changes
- Implemented sophisticated mobile viewport handling
- Enhanced event system for better mobile interactions
- Improved notification styling and z-index management

## [0.5.0]

### Added
- Discord webhook integration
- Enhanced touch event system
- Improved mobile optimizations

### Changed
- Updated UI for better mobile experience
- Enhanced notification system

### Technical Changes
- Implemented Discord webhook system
- Enhanced mobile touch event handling
- Improved notification system architecture

## [0.4.5]

### Added
- Enhanced mobile optimizations
- Improved visual feedback system

### Changed
- Updated UI for better mobile experience
- Enhanced notification system

### Technical Changes
- Implemented sophisticated mobile viewport handling
- Enhanced event system for better mobile interactions
- Improved notification styling and z-index management

## [0.4.0]

### Added
- Progeny character sheet integration
- Automatic dice pool calculation
- Character data import/export

### Changed
- Updated UI for character sheet integration
- Enhanced mobile experience

### Technical Changes
- Implemented Progeny character sheet system
- Enhanced state management for character data
- Improved data persistence system

## [0.3.0]

### Added
- Discord integration
- Enhanced mobile support
- Improved UI/UX

### Changed
- Updated UI for better mobile experience
- Enhanced notification system

### Technical Changes
- Implemented Discord webhook system
- Enhanced mobile touch event handling
- Added data validation for webhook URLs

## [0.2.0]

### Added
- Enhanced mobile support
- Improved UI/UX
- Added vibration patterns

### Changed
- Updated UI for better mobile experience
- Enhanced notification system

### Technical Changes
- Implemented modern UI patterns
- Enhanced mobile touch event handling
- Improved notification system

## [0.1.0]

### Started With
- Basic 3D dice rolling functionality
- Simple UI with sliders
- Offline functionality
- Basic roll calculation
- Initial release from [prncc/vampire-dice-roller](https://github.com/prncc/vampire-dice-roller)