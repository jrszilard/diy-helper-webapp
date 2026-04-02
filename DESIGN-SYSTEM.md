# DIY Helper Design System Reference

Reference for all UI work. Follow these tokens, patterns, and components to maintain consistency.

## Color Tokens

### Earth-Tone Palette (Primary)
| Token | Value | Usage |
|-------|-------|-------|
| `--earth-cream` | `#F5F0E6` | Light backgrounds, body bg |
| `--earth-tan` | `#E8DFD0` | Secondary backgrounds, borders |
| `--earth-sand` | `#D4C8B8` | Muted text, dividers |
| `--earth-brown-light` | `#A89880` | Secondary text |
| `--earth-brown` | `#7D6B5D` | Body text |
| `--earth-brown-dark` | `#4A3F35` | Dark backgrounds (landing page, nav) |

### Accent Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--terracotta` | `#C67B5C` | Primary action, user messages, CTAs |
| `--terracotta-dark` | `#A65D3F` | Hover states |
| `--rust` | `#B8593B` | Destructive/danger |
| `--forest-green` | `#4A7C59` | Success, purchased, positive |
| `--forest-green-dark` | `#2D5A3B` | Green hover |
| `--sage` | `#7D9A6F` | Secondary green |
| `--slate-blue` | `#5D7B93` | Links, info, hints |
| `--slate-blue-dark` | `#4A6578` | Blue hover |

### Status Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--status-research` / `--status-research-bg` | `#5D7B93` / `#E8F0F5` | Research phase, hints |
| `--status-progress` / `--status-progress-bg` | `#C67B5C` / `#FDF3ED` | In-progress |
| `--status-waiting` / `--status-waiting-bg` | `#9B7BA6` / `#F5EEF8` | Waiting state |
| `--status-complete` / `--status-complete-bg` | `#4A7C59` / `#E8F3EC` | Completed |

## Contexts

### Dark Context (Landing Page, Nav, Drawers backgrounds)
- Background: `bg-earth-brown-dark` or `bg-[var(--earth-brown-dark)]`
- Text: `text-white`, `text-earth-cream`, `text-white/70`, `text-white/40`
- Borders: `border-white/[0.06]`, `border-[var(--blueprint-grid-major)]`
- Interactive: `hover:bg-white/10`, `bg-white/5`, `bg-white/10`
- Links: `text-sky-300 hover:text-sky-200`

### Light Context (Drawer content areas, Reports, Modals)
- Background: `bg-white`, `bg-earth-cream`, `bg-surface`
- Text: `text-foreground`, `text-earth-brown`, `text-earth-brown-light`
- Borders: `border-earth-sand`, `border-earth-sand/30`
- Interactive: `hover:bg-earth-tan/30`
- Links: `text-slate-blue hover:text-slate-blue-dark`

## Spacing

Uses Utopia fluid scale via CSS custom properties:
- `--space-3xs` through `--space-3xl`
- Use `var(--space-m)` etc. in margins/padding for responsive scaling
- Tailwind fallbacks: `p-3`, `gap-2`, `mb-4` for non-fluid spacing

## Components

### Button (`components/ui/Button.tsx`)
- Variants: `primary`, `secondary`, `tertiary`, `ghost`, `danger`, `outline`
- Sizes: `xs`, `sm`, `md`, `lg`
- Props: `leftIcon`, `rightIcon`, `iconSize` (default 16), `href` (renders as link)

### Modal (`components/ui/Modal.tsx`)
- Centered overlay with backdrop blur
- Props: `isOpen`, `onClose`, `title`

### TextInput (`components/ui/TextInput.tsx`)
- Styled input with earth-tone borders
- Standard React input props

### Select (`components/ui/Select.tsx`)
- Styled select dropdown

### Spinner (`components/ui/Spinner.tsx`)
- Props: `size` ('sm' | 'md' | 'lg')

### ContextualHint (`components/ui/ContextualHint.tsx`)
- Dismissible tip banner with localStorage persistence
- Props: `hintKey`, `children`, `dismissWhen?`

## Layout Patterns

### Drawer (Right-side panel)
```html
<div className="fixed inset-0 z-50">
  <div className="absolute inset-0 bg-black/60" onClick={onClose} />
  <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-lg bg-white shadow-xl">
    <header> ... </header>
    <div className="flex-1 overflow-y-auto"> ... </div>
  </div>
</div>
```

### Header Nav Button
```html
<Button variant="ghost" size="sm" leftIcon={Icon} iconSize={18} className={btnClass}>
  <span className="text-xs sm:text-sm">Label</span>
</Button>
```

### Toast Notification
```html
<div className="fixed top-20 right-4 bg-forest-green text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 max-w-sm">
  <Icon /> <p>{message}</p> <button>x</button>
</div>
```

### Card
```html
<div className="border rounded-xl p-3.5 bg-white border-earth-sand/30 hover:border-forest-green/30">
  ...
</div>
```

### Status Badge
```html
<span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[var(--status-complete-bg)] text-forest-green">
  COMPLETED
</span>
```

## Typography

- Headings: `font-bold` with sizes `text-2xl` (h1), `text-lg` (h2), `text-md` (h3)
- Body: `text-sm` default, `text-xs` for labels/metadata
- Muted: `text-earth-brown-light` or `text-white/40` (dark context)
- Labels: `text-[10px] font-semibold uppercase tracking-wider`

## Chat Message Bubbles

### User
```
bg-terracotta text-white rounded-2xl rounded-br-md px-4 py-2.5
```

### Assistant
```
bg-white/10 text-earth-cream rounded-2xl rounded-bl-md px-4 py-3
```

## Do's and Don'ts

- **DO** use CSS custom properties for colors (`var(--terracotta)`) or Tailwind shortcuts (`text-terracotta`)
- **DO** use `text-xs sm:text-sm` pattern for responsive text that must show on mobile
- **DO** match context (dark vs light) when adding new UI
- **DON'T** use raw hex values — always use tokens
- **DON'T** add new color variables without updating this doc
- **DON'T** use `hidden sm:inline` for nav labels (they should always show)
