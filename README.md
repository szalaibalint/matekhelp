# MatekHelp - Presentation Editor

A feature-rich online presentation editor inspired by Prezi, built with React, TypeScript, and Konva. Create stunning presentations with an intuitive drag-and-drop interface.

## Features

- 🎨 **Shape Tools**: Rectangle, Circle, Triangle, Text, Lines, Arrows, and Images
- 🖱️ **Interactive Canvas**: Drag, resize, rotate shapes with zoom and pan support
- 📊 **Multiple Slides**: Create, duplicate, reorder, and manage slides
- 🎯 **Property Editor**: Fine-tune position, size, colors, opacity, and more
- ⌨️ **Keyboard Shortcuts**: Undo/Redo, Copy/Paste, Delete
- 💾 **Object-Oriented Architecture**: Clean, maintainable codebase

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Konva / React-Konva** - Canvas rendering
- **React-Zoom-Pan-Pinch** - Zoom and pan controls
- **Zustand** - State management
- **Supabase** - Backend (ready to integrate)
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
cd matekhelp
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables (optional, for Supabase)
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Start the development server
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── models/          # OOP models (Shape, Slide, Presentation)
├── services/        # Business logic (ShapeFactory, PresentationService)
├── stores/          # Zustand state management
├── components/      # React components
│   ├── Canvas/      # Main canvas editor
│   ├── Toolbar/     # Tool selection bar
│   ├── Sidebar/     # Slide thumbnails
│   └── Properties/  # Shape property editor
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── lib/             # External library configs (Supabase)
```

## Keyboard Shortcuts

- `V` - Select tool
- `H` - Pan tool
- `R` - Rectangle
- `C` - Circle
- `T` - Text
- `L` - Line
- `A` - Arrow
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+C` - Copy
- `Ctrl+V` - Paste
- `Delete` - Delete selected
- `+/-` - Zoom in/out
- `0` - Reset view

## Supabase Integration

To connect to Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` file with your credentials
4. Create the database schema (see below)
5. Uncomment the Supabase integration code in `PresentationService.ts`

### Database Schema Example

```sql
-- Presentations table
create table presentations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Slides table
create table slides (
  id uuid default uuid_generate_v4() primary key,
  presentation_id uuid references presentations on delete cascade not null,
  name text not null,
  background text default '#ffffff',
  "order" integer not null,
  thumbnail text
);

-- Shapes table
create table shapes (
  id uuid default uuid_generate_v4() primary key,
  slide_id uuid references slides on delete cascade not null,
  type text not null,
  data jsonb not null
);

-- Enable Row Level Security
alter table presentations enable row level security;
alter table slides enable row level security;
alter table shapes enable row level security;
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Future Enhancements

- [ ] Real-time collaboration
- [ ] Animation paths (Prezi-style)
- [ ] Templates library
- [ ] Export to PDF/PowerPoint
- [ ] Image upload and management
- [ ] Custom fonts
- [ ] Presentation mode
- [ ] Comments and feedback

## Inspiration

This project draws inspiration from:
- [Prezi](https://prezi.com) - Zooming presentation interface
- [Excalidraw](https://github.com/excalidraw/excalidraw) - Hand-drawn style diagrams
- [tldraw](https://github.com/tldraw/tldraw) - Infinite canvas drawing

## License

MIT

