# Cafe POS System

A modern point-of-sale system built with Next.js, Tailwind CSS, Zustand, and Shadcn UI.

## Features

- ✨ Modern UI with dark/light theme support
- 🛒 Shopping cart with Zustand state management
- 📱 Responsive design
- 🎨 Tailwind CSS for styling
- 🌙 Theme toggle using next-themes
- 🔄 Real-time cart updates

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS v3
- **State Management**: Zustand
- **UI Components**: Shadcn UI
- **Icons**: Material Symbols
- **Fonts**: Inter, Playfair Display

## Setup Instructions

### 1. Fix Permission Issues (Important!)

If you encounter permission errors with the `.next` directory, run:

```bash
cd apps/web
sudo chown -R $USER:$USER .next
# Or simply remove it
sudo rm -rf .next
```

### 2. Install Dependencies

```bash
cd apps/web
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is in use).

### 4. Build for Production

```bash
npm run build
npm run start
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main POS page
│   │   ├── layout.tsx         # Root layout with theme provider
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── theme-provider.tsx # Theme context provider
│   │   └── mode-toggle.tsx    # Dark/Light mode toggle
│   ├── store/
│   │   └── useCartStore.ts    # Zustand cart store
│   └── lib/
│       └── utils.ts           # Utility functions
├── public/                     # Static assets
├── package.json
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.mjs         # PostCSS configuration
└── tsconfig.json              # TypeScript configuration
```

## Features Overview

### Theme Toggle
- Click the sun/moon icon in the sidebar to switch between light and dark modes
- Theme preference is persisted in localStorage

### Shopping Cart
- Add items to cart by clicking menu items
- Adjust quantities with +/- buttons
- Remove items with the delete button
- Real-time total calculation with tax

### Menu Categories
- Filter menu items by category
- Search functionality (UI ready)
- Grid layout with hover effects

## Troubleshooting

### Permission Denied Errors

If you see `EACCES: permission denied` errors:

```bash
# Option 1: Fix ownership
sudo chown -R $USER:$USER .

# Option 2: Remove .next and restart
rm -rf .next
npm run dev
```

### Port Already in Use

If port 3000 is in use, Next.js will automatically try port 3001. You can also specify a custom port:

```bash
npm run dev -- -p 3002
```

### Build Errors

If you encounter build errors, try:

```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Customization

### Colors

Edit `tailwind.config.js` and `src/app/globals.css` to customize the color scheme.

### Fonts

Fonts are configured in `src/app/layout.tsx`. Currently using:
- **Inter**: Primary display font
- **Playfair Display**: Serif font for headings

## Version

Current version: 1.0.0

---

Built with ❤️ using Next.js and Tailwind CSS
