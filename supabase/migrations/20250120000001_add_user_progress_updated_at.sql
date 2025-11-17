-- Add updated_at column to user_progress table
ALTER TABLE public.user_progress
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS user_progress_updated_at ON public.user_progress;

-- Create trigger
CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_updated_at();

COMMENT ON COLUMN public.user_progress.updated_at IS 'Timestamp of last update to this progress record';
