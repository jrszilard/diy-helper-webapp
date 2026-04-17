-- Shopping Trips: point-in-time snapshots of project materials for in-store checklists

CREATE TABLE IF NOT EXISTS shopping_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_shopping_trips_project ON shopping_trips(project_id);
CREATE INDEX idx_shopping_trips_user ON shopping_trips(user_id);

ALTER TABLE shopping_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own shopping trips"
  ON shopping_trips FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE shopping_trips IS 'Point-in-time snapshots of project materials for in-store shopping checklists';

CREATE TABLE IF NOT EXISTS shopping_trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES shopping_trips(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT,
  estimated_price NUMERIC,
  purchased BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_shopping_trip_items_trip ON shopping_trip_items(trip_id);

ALTER TABLE shopping_trip_items ENABLE ROW LEVEL SECURITY;

-- Trip items inherit access from their parent trip
CREATE POLICY "Users can manage their own trip items"
  ON shopping_trip_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shopping_trips
      WHERE shopping_trips.id = shopping_trip_items.trip_id
      AND shopping_trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_trips
      WHERE shopping_trips.id = shopping_trip_items.trip_id
      AND shopping_trips.user_id = auth.uid()
    )
  );

COMMENT ON TABLE shopping_trip_items IS 'Individual items in a shopping trip, frozen at snapshot time';
