# CSS Architecture Documentation

## Overview
The CSS has been reorganized into a modular architecture for better maintainability and organization.

## Directory Structure

```
css/
├── styles.css              # Master file that imports all modules
├── base/
│   └── reset.css           # CSS reset and base styles
├── layout/
│   └── container.css       # Layout and container styles
├── utilities/
│   └── helpers.css         # Utility classes and helpers
├── components/
│   ├── menu.css           # Menu-related styles
│   ├── overlays.css       # Pause, game over overlays
│   ├── windows.css        # Character/talents windows
│   └── connection-status.css # Connection indicators
├── game/
│   ├── level-display.css  # Player level display
│   └── ui-elements.css    # Generic game UI elements
└── animations/
    └── game-animations.css # Game animations and transitions
```

## Usage

### Single Import
The main HTML file now imports only `styles.css`, which automatically imports all other modules:

```html
<link rel="stylesheet" href="css/styles.css">
```

### Individual Imports
For better performance or specific use cases, you can import individual modules:

```html
<link rel="stylesheet" href="css/base/reset.css">
<link rel="stylesheet" href="css/components/menu.css">
<!-- etc. -->
```

## Benefits

1. **Modularity**: Each file focuses on a specific component or functionality
2. **Maintainability**: Easier to find and modify specific styles
3. **Scalability**: Easy to add new components without cluttering existing files
4. **Reusability**: Components can be reused across different parts of the application
5. **Organization**: Clear separation of concerns

## Adding New Styles

1. **Base styles**: Add to `base/reset.css`
2. **Layout changes**: Add to `layout/container.css`
3. **New components**: Create new file in `components/`
4. **Game-specific**: Add to appropriate file in `game/`
5. **Animations**: Add to `animations/game-animations.css`
6. **Utilities**: Add to `utilities/helpers.css`

Remember to update the `styles.css` imports when adding new files!
