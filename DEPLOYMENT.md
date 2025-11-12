# Multi-Site Configuration

This project now supports running the Editor and Viewer as separate applications.

## Development

### Run both sites simultaneously:
```bash
npm run dev
```
This will start:
- **Editor** on http://localhost:5173
- **Viewer** on http://localhost:5174

### Run individually:
```bash
npm run dev:editor   # Editor only on port 5173
npm run dev:viewer   # Viewer only on port 5174
```

## Building for Production

### Build both sites:
```bash
npm run build
```
This creates:
- `dist/editor/` - Editor application
- `dist/viewer/` - Viewer application

### Build individually:
```bash
npm run build:editor   # Builds to dist/editor/
npm run build:viewer   # Builds to dist/viewer/
```

## Preview Production Builds

```bash
npm run preview:editor   # Preview editor on port 4173
npm run preview:viewer   # Preview viewer on port 4174
```

## Deployment

After building, you can deploy each folder to separate servers:
- Upload `dist/editor/` contents to your editor/admin server
- Upload `dist/viewer/` contents to your viewer/presentation server

Each build is completely independent with its own:
- HTML entry point
- JavaScript bundles
- CSS files
- Assets
