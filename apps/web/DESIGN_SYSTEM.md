# LearnSystem Design System

## Overview

The LearnSystem Design System provides a cohesive visual language and component library for the Learning Management System. It focuses on creating a warm, student-centric experience with approachable aesthetics and intuitive interactions.

## Color Palette

### Primary Colors
- **Primary Blue**: `#0ea5e9` (Warm blue for primary actions and highlights)
- **Accent Coral**: `#ff6b35` (Coral for important actions and alerts)

### Neutral Colors
- Light mode: Warm grays from `#fafaf9` to `#1c1917`
- Dark mode: Inverted warm grays for accessibility

## Typography

### Font Family
- **Headings**: Poppins (friendly, modern sans-serif)
- **Body Text**: Open Sans (highly readable, neutral)

### Hierarchy
- H1: 2.25rem
- H2: 1.875rem
- H3: 1.5rem
- H4: 1.25rem
- H5: 1.125rem
- H6: 1rem
- Body: 1rem
- Small: 0.875rem

## Components

### Button

Enhanced button component with gradient backgrounds and smooth animations.

**Variants:**
- `primary`: Gradient blue background
- `secondary`: Subtle gray background
- `accent`: Gradient coral background
- `outline`: Transparent with colored border
- `ghost`: Transparent background

**Sizes:**
- `sm`: Small padding and font size
- `md`: Medium padding and font size
- `lg`: Large padding and font size

**States:**
- `isLoading`: Shows spinner indicator
- `fullWidth`: Expands to full container width
- `disabled`: Reduced opacity with no interaction

### Card

Modern card component with decorative top border and hover effects.

**Structure:**
- `Card`: Container with shadow and rounded corners
- `Card.Header`: Top section with border
- `Card.Body`: Main content area
- `Card.Footer`: Bottom section with background

**Features:**
- Subtle hover elevation
- Gradient top border
- Smooth transitions

### Input

Enhanced form input with validation states and helpful messaging.

**Features:**
- Label support
- Error state with coral coloring
- Success state with green coloring
- Helper text for guidance
- Focus states with blue ring

## Spacing System

Consistent spacing using rem units:
- xs: 0.25rem
- sm: 0.5rem
- md: 1rem
- lg: 1.5rem
- xl: 2rem
- 2xl: 3rem

## Border Radius

- sm: 0.5rem
- md: 0.75rem
- lg: 1rem
- xl: 1.5rem
- full: 9999px

## Shadows

- sm: Subtle shadow for depth
- md: Medium shadow for cards
- lg: Strong shadow for hover states
- xl: Prominent shadow for modals

## Animations

- Fast: 150ms transitions
- Normal: 300ms transitions
- Slow: 500ms transitions
- Fade-in-up entrance animation

## Usage Guidelines

### Accessibility
- All components meet WCAG 2.1 contrast requirements
- Focus states are clearly visible
- Semantic HTML is used where appropriate
- ARIA attributes are applied for interactive elements

### Responsive Design
- Components adapt to different screen sizes
- Mobile-first approach
- Touch targets are appropriately sized

### Dark Mode
- Full dark mode support with inverted color schemes
- Automatic theme switching based on system preference
- Manual toggle available in UI

## Implementation

### CSS Variables
All design tokens are available as CSS variables for easy customization:

```css
:root {
  --primary-500: #0ea5e9;
  --accent-500: #ff6b35;
  --neutral-900: #1c1917;
  --font-heading: 'Poppins', sans-serif;
  --font-body: 'Open Sans', sans-serif;
  --radius-md: 0.75rem;
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

### Component API

Components follow consistent API patterns:

```jsx
// Button
<Button
  variant="primary"
  size="md"
  isLoading={false}
  fullWidth={false}
  disabled={false}
>
  Click me
</Button>

// Card
<Card hoverable={true}>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Footer</Card.Footer>
</Card>

// Input
<Input
  label="Email"
  error=""
  helperText="Enter your email address"
  success={false}
/>
```

## Future Enhancements

Planned additions to the design system:
- Data visualization components (charts, graphs)
- Advanced form components (select, date picker)
- Navigation components (breadcrumbs, pagination)
- Feedback components (toasts, modals)
- Loading and progress indicators