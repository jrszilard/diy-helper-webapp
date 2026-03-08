-- Optimize project listing by creation date
CREATE INDEX IF NOT EXISTS idx_projects_user_id_created_at
  ON projects(user_id, created_at DESC);

-- Optimize inventory lookup by category and name
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id_category_item_name
  ON user_inventory(user_id, category, item_name);
