-- Add sort_order column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on creation time
WITH numbered_categories AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at) - 1 AS row_num
  FROM categories
)
UPDATE categories
SET sort_order = numbered_categories.row_num
FROM numbered_categories
WHERE categories.id = numbered_categories.id;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(parent_id, sort_order);
