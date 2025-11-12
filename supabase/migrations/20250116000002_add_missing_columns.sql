-- Add missing columns to existing tables

-- Add description column to documents if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN description text;
    END IF;
END $$;

-- Add content column to slide_sets if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'slide_sets' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.slide_sets ADD COLUMN content jsonb DEFAULT '{}';
    END IF;
END $$;

-- Add content column to quizzes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quizzes' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.quizzes ADD COLUMN content jsonb DEFAULT '{}';
    END IF;
END $$;
