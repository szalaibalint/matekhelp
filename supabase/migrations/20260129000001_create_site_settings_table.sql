-- Site Settings Table
-- This table stores global site configuration settings

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.site_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key text UNIQUE NOT NULL,
    setting_value jsonb NOT NULL DEFAULT '{}',
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default settings with explicit UUID generation
INSERT INTO public.site_settings (id, setting_key, setting_value, description)
VALUES 
    (uuid_generate_v4(), 'development_mode', '{"enabled": false, "message": "A weboldal jelenleg fejlesztés alatt áll. Kérjük, nézzen vissza később!"}'::jsonb, 'Development mode settings - when enabled, shows maintenance message to visitors'),
    (uuid_generate_v4(), 'site_info', '{"name": "MatekHelp", "version": "1.0.0"}'::jsonb, 'General site information')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read site settings
CREATE POLICY "Anyone can read site settings"
    ON public.site_settings
    FOR SELECT
    USING (true);

-- Policy: Only authenticated users can update site settings
CREATE POLICY "Authenticated users can update site settings"
    ON public.site_settings
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert site settings
CREATE POLICY "Authenticated users can insert site settings"
    ON public.site_settings
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(setting_key);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_site_settings_updated_at();
