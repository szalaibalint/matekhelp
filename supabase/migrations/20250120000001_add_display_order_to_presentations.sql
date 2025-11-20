-- Add display_order column to presentations table
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_presentations_display_order ON presentations(display_order);

-- Set initial display_order values based on creation date
WITH numbered_presentations AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at) - 1 AS row_num
  FROM presentations
)
UPDATE presentations
SET display_order = numbered_presentations.row_num
FROM numbered_presentations
WHERE presentations.id = numbered_presentations.id
  AND presentations.display_order IS NULL;
