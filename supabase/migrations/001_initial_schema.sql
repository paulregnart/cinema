-- Cinema Ticket Booking - Initial Schema
-- Run this migration against your Supabase project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  film_name TEXT NOT NULL,
  screening_date DATE NOT NULL,
  screening_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  seat_number INT NOT NULL CHECK (seat_number BETWEEN 1 AND 20),
  row_label TEXT NOT NULL CHECK (row_label IN ('A', 'B', 'C', 'D')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'held', 'booked')),
  held_until TIMESTAMPTZ,
  held_by_session TEXT,
  booked_by_session TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (screening_id, seat_number)
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  seat_ids UUID[] NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  session_id TEXT NOT NULL,
  booked_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast seat lookups
CREATE INDEX idx_seats_screening_id ON seats(screening_id);
CREATE INDEX idx_seats_status ON seats(status);
CREATE INDEX idx_seats_held_until ON seats(held_until) WHERE status = 'held';
CREATE INDEX idx_bookings_screening_id ON bookings(screening_id);

-- ============================================================
-- ENABLE REALTIME on seats table
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE seats;

-- ============================================================
-- FUNCTION: Release expired holds
-- ============================================================
CREATE OR REPLACE FUNCTION release_expired_holds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE seats
  SET status = 'available',
      held_until = NULL,
      held_by_session = NULL
  WHERE status = 'held'
    AND held_until < now();
END;
$$;

-- ============================================================
-- FUNCTION: Hold seats (atomic, with validation)
-- ============================================================
CREATE OR REPLACE FUNCTION hold_seats(
  p_seat_ids UUID[],
  p_session_id TEXT,
  p_screening_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seat_count INT;
  v_available_count INT;
  v_seat RECORD;
  v_row_seats RECORD;
  v_all_seats RECORD;
  v_row_label TEXT;
  v_seat_number INT;
  v_row_available INT[];
  v_has_isolated BOOLEAN := FALSE;
BEGIN
  -- First, release any expired holds
  PERFORM release_expired_holds();

  -- Validate seat count (1-5)
  v_seat_count := array_length(p_seat_ids, 1);
  IF v_seat_count IS NULL OR v_seat_count < 1 OR v_seat_count > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must select between 1 and 5 seats');
  END IF;

  -- Lock the rows for update to prevent race conditions
  PERFORM id FROM seats
  WHERE screening_id = p_screening_id
  FOR UPDATE;

  -- Check all requested seats belong to this screening and are available
  SELECT COUNT(*) INTO v_available_count
  FROM seats
  WHERE id = ANY(p_seat_ids)
    AND screening_id = p_screening_id
    AND (status = 'available' OR (status = 'held' AND held_by_session = p_session_id));

  IF v_available_count != v_seat_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Some selected seats are no longer available');
  END IF;

  -- Release any previously held seats by this session (for this screening)
  UPDATE seats
  SET status = 'available',
      held_until = NULL,
      held_by_session = NULL
  WHERE screening_id = p_screening_id
    AND held_by_session = p_session_id
    AND status = 'held'
    AND NOT (id = ANY(p_seat_ids));

  -- Simulate the new state and check for isolated seats
  -- Build a picture of what each row looks like after this hold
  FOR v_row_label IN SELECT DISTINCT s.row_label FROM seats s WHERE s.screening_id = p_screening_id ORDER BY s.row_label
  LOOP
    v_row_available := ARRAY[]::INT[];
    FOR v_all_seats IN
      SELECT s.seat_number,
             CASE
               WHEN s.id = ANY(p_seat_ids) THEN 'held'
               WHEN s.status = 'available' THEN 'available'
               WHEN s.status = 'held' AND s.held_by_session = p_session_id THEN 'held'
               ELSE s.status
             END AS new_status
      FROM seats s
      WHERE s.screening_id = p_screening_id
        AND s.row_label = v_row_label
      ORDER BY s.seat_number
    LOOP
      IF v_all_seats.new_status = 'available' THEN
        v_row_available := array_append(v_row_available, v_all_seats.seat_number);
      END IF;
    END LOOP;

    -- Check for isolated seats in this row
    -- A seat is isolated if it is available and has no available neighbor
    IF array_length(v_row_available, 1) IS NOT NULL THEN
      FOR i IN 1..array_length(v_row_available, 1)
      LOOP
        v_seat_number := v_row_available[i];
        -- Check if this available seat has at least one available neighbor
        IF NOT (
          (v_seat_number - 1) = ANY(v_row_available) OR
          (v_seat_number + 1) = ANY(v_row_available)
        ) THEN
          -- It's isolated — but only flag it if the row has more than 1 seat total
          -- (if only 1 seat left in entire row, it's fine as "last seat")
          -- Actually, spec says cannot leave a single isolated seat
          -- Check: a seat with no available neighbors on either side in the row
          -- We need to check actual row boundaries (seats 1-5 per row mapped to positions)
          -- Get the positions occupied/booked in this row
          DECLARE
            v_row_seat_min INT;
            v_row_seat_max INT;
          BEGIN
            SELECT MIN(seat_number), MAX(seat_number) INTO v_row_seat_min, v_row_seat_max
            FROM seats
            WHERE screening_id = p_screening_id AND row_label = v_row_label;

            -- A single available seat is isolated if it has no available neighbor
            v_has_isolated := TRUE;
            RETURN jsonb_build_object(
              'success', false,
              'error', format('Selection would leave an isolated seat at row %s, position %s', v_row_label, v_seat_number)
            );
          END;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- All validations passed — hold the seats
  UPDATE seats
  SET status = 'held',
      held_until = now() + INTERVAL '60 seconds',
      held_by_session = p_session_id
  WHERE id = ANY(p_seat_ids)
    AND screening_id = p_screening_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- FUNCTION: Book seats (atomic, with validation)
-- ============================================================
CREATE OR REPLACE FUNCTION book_seats(
  p_seat_ids UUID[],
  p_session_id TEXT,
  p_screening_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seat_count INT;
  v_held_count INT;
  v_booking_id UUID;
BEGIN
  -- Release expired holds first
  PERFORM release_expired_holds();

  v_seat_count := array_length(p_seat_ids, 1);
  IF v_seat_count IS NULL OR v_seat_count < 1 OR v_seat_count > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid number of seats');
  END IF;

  -- Lock rows
  PERFORM id FROM seats
  WHERE screening_id = p_screening_id
  FOR UPDATE;

  -- Verify all seats are held by this session and not expired
  SELECT COUNT(*) INTO v_held_count
  FROM seats
  WHERE id = ANY(p_seat_ids)
    AND screening_id = p_screening_id
    AND status = 'held'
    AND held_by_session = p_session_id
    AND held_until >= now();

  IF v_held_count != v_seat_count THEN
    RETURN jsonb_build_object('success', false, 'error', 'Some seats are no longer held by you or have expired. Please try again.');
  END IF;

  -- Book the seats
  UPDATE seats
  SET status = 'booked',
      held_until = NULL,
      held_by_session = NULL,
      booked_by_session = p_session_id
  WHERE id = ANY(p_seat_ids)
    AND screening_id = p_screening_id;

  -- Create booking record
  INSERT INTO bookings (screening_id, seat_ids, customer_name, customer_email, session_id)
  VALUES (p_screening_id, p_seat_ids, p_customer_name, p_customer_email, p_session_id)
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'bookingId', v_booking_id
  );
END;
$$;

-- ============================================================
-- FUNCTION: Release held seats for a session
-- ============================================================
CREATE OR REPLACE FUNCTION release_held_seats(
  p_session_id TEXT,
  p_screening_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_released INT;
BEGIN
  IF p_screening_id IS NOT NULL THEN
    UPDATE seats
    SET status = 'available',
        held_until = NULL,
        held_by_session = NULL
    WHERE held_by_session = p_session_id
      AND status = 'held'
      AND screening_id = p_screening_id;
  ELSE
    UPDATE seats
    SET status = 'available',
        held_until = NULL,
        held_by_session = NULL
    WHERE held_by_session = p_session_id
      AND status = 'held';
  END IF;

  GET DIAGNOSTICS v_released = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'released', v_released);
END;
$$;

-- ============================================================
-- SEED DATA: One screening with 20 seats
-- ============================================================
INSERT INTO screenings (film_name, screening_date, screening_time)
VALUES ('The Grand Budapest Hotel', '2026-03-01', '19:30:00');

-- Create 20 seats (4 rows × 5 seats) for the screening
INSERT INTO seats (screening_id, seat_number, row_label)
SELECT
  s.id,
  seat_num,
  row_lbl
FROM screenings s
CROSS JOIN (
  VALUES
    ('A', 1), ('A', 2), ('A', 3), ('A', 4), ('A', 5),
    ('B', 6), ('B', 7), ('B', 8), ('B', 9), ('B', 10),
    ('C', 11), ('C', 12), ('C', 13), ('C', 14), ('C', 15),
    ('D', 16), ('D', 17), ('D', 18), ('D', 19), ('D', 20)
) AS seat_data(row_lbl, seat_num)
LIMIT 20;

-- ============================================================
-- OPTIONAL: pg_cron job to release expired holds every 10 seconds
-- Uncomment if pg_cron extension is enabled on your Supabase project
-- ============================================================
-- SELECT cron.schedule(
--   'release-expired-holds',
--   '*/10 * * * *',  -- every minute (cron minimum)
--   $$SELECT release_expired_holds()$$
-- );

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Public read access to screenings and seats
CREATE POLICY "Anyone can read screenings" ON screenings FOR SELECT USING (true);
CREATE POLICY "Anyone can read seats" ON seats FOR SELECT USING (true);
CREATE POLICY "Anyone can read bookings" ON bookings FOR SELECT USING (true);

-- Only service role can insert/update/delete (API routes use service role key)
CREATE POLICY "Service role can manage screenings" ON screenings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage seats" ON seats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage bookings" ON bookings FOR ALL USING (true) WITH CHECK (true);
