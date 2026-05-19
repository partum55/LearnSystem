# LearnSystem Frontend Design System

This directory contains the enhanced design system for the LearnSystem Learning Management System.

## Components

The design system includes enhanced versions of core UI components:

1. **ButtonEnhanced** - Enhanced button with gradient backgrounds and smooth animations
2. **CardEnhanced** - Modern card with decorative top border and hover effects
3. **InputEnhanced** - Form input with validation states and helpful messaging

## Viewing the Design System

To view the design system components in action:

1. Start the development server:
   ```bash
   cd frontend
   npm start
   ```

2. Navigate to the design system demo page:
   ```
   http://localhost:3000/design-system
   ```

   Note: This page is only accessible to SUPERADMIN users.

## Design Principles

- **Warm and Approachable**: Uses warm blues and coral accents to create a welcoming educational environment
- **Organic Shapes**: Rounded corners and soft shadows for a friendly appearance
- **Clear Visual Hierarchy**: Distinctive typography with Poppins headings and Open Sans body text
- **Enhanced Interactions**: Smooth animations and transitions for delightful user experiences
- **Accessibility**: WCAG 2.1 compliant color contrasts and keyboard navigation support

## Files

- `design-system.css` - Core CSS styles and design tokens
- `ButtonEnhanced.tsx` - Enhanced button component
- `CardEnhanced.tsx` - Enhanced card component
- `InputEnhanced.tsx` - Enhanced input component
- `DesignSystemDemo.tsx` - Demo page showcasing all components
- `DESIGN_SYSTEM.md` - Documentation for the design system

## Testing

Component tests are located in the same directory with `.test.tsx` extensions.

## Integration

The design system integrates with the existing component library:
- Updated Button component maintains backward compatibility
- Updated Card component maintains backward compatibility
- Updated Input component maintains backward compatibility