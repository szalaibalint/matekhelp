# Admin Site Rework - Site Settings Feature

## Overview
The admin site has been restructured to provide a landing page with two main sections:
- **Presentation Editor** (existing functionality)
- **Site Settings** (new feature)

## New Routes

### Admin Routes
- `/admin` - Admin landing page with navigation cards
- `/admin/editor` - Presentation editor (previously at `/admin`)
- `/admin/settings` - Site settings management page

## Features

### Site Settings
The new Site Settings page allows administrators to configure global site settings:

#### Development Mode
- **Toggle**: Enable/disable development mode
- **Message**: Customize the maintenance message shown to visitors
- **Effect**: When enabled, the viewer site displays a maintenance page instead of the normal content

### Database Changes

A new table `site_settings` has been created to store configuration:

```sql
CREATE TABLE public.site_settings (
    id uuid PRIMARY KEY,
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL,
    description text,
    created_at timestamp,
    updated_at timestamp,
    updated_by uuid
);
```

**Default Settings:**
- `development_mode`: Controls whether the site shows a maintenance page
- `site_info`: General site information (name, version)

### New Components

1. **AdminLanding** (`src/components/admin/AdminLanding.tsx`)
   - Landing page with navigation cards
   - Clean, modern design with gradient cards

2. **SiteSettings** (`src/components/admin/SiteSettings.tsx`)
   - Settings management interface
   - Real-time preview of maintenance message
   - Save functionality with feedback

3. **MaintenanceMode** (`src/components/shared/MaintenanceMode.tsx`)
   - Maintenance page shown to visitors when development mode is enabled
   - Customizable message display

### New Services

**SiteSettingsService** (`src/services/SiteSettingsService.ts`)
- `getDevelopmentMode()` - Get development mode settings
- `updateDevelopmentMode()` - Update development mode
- `getSetting()` - Get a specific setting by key
- `getAllSettings()` - Get all settings
- `updateSetting()` - Update a specific setting
- `isInDevelopmentMode()` - Check if site is in maintenance mode

## Usage

### For Administrators

1. **Access Admin Panel**
   - Navigate to `/admin` or `/` (when logged in)
   - You'll see two cards: Presentation Editor and Site Settings

2. **Enable Development Mode**
   - Click on "Oldal Beállítások" (Site Settings)
   - Toggle "Fejlesztői mód bekapcsolása"
   - Optionally edit the maintenance message
   - Click "Beállítások mentése" to save

3. **Edit Content**
   - Click on "Prezentáció Szerkesztő" to access the presentation editor
   - Works exactly as before

### For Developers

#### Check Development Mode in Code
```typescript
import { SiteSettingsService } from '@/services/SiteSettingsService';

const isMaintenanceMode = await SiteSettingsService.isInDevelopmentMode();
if (isMaintenanceMode) {
  // Show maintenance page
}
```

#### Add New Settings
1. Insert new setting in database:
```sql
INSERT INTO site_settings (setting_key, setting_value, description)
VALUES ('my_setting', '{"value": true}'::jsonb, 'Description');
```

2. Update the service with type definitions and helper methods

## Migration

To apply the database changes:

1. **Using Supabase Dashboard:**
   - Open SQL Editor
   - Run the migration file: `supabase/migrations/20260129000001_create_site_settings_table.sql`

2. **Using Complete Migration:**
   - The migration has been added to `COMPLETE_MIGRATION.sql`
   - Run this if you're rebuilding the entire database

## Future Enhancements

The site settings page is designed to be extensible. Future settings could include:
- Email notifications settings
- Analytics configuration
- Theme customization
- Feature flags
- Content moderation settings
- Performance optimization toggles

## Notes

- The viewer/public site automatically checks for development mode on load
- Admin routes require authentication
- Settings are cached and checked on each page load for the viewer
- The maintenance message supports multi-line text
