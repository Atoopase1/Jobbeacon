-- ==============================================================================
-- Site Content Admin: site_text table
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create site_text table
CREATE TABLE IF NOT EXISTS public.site_text (
  text_id    TEXT PRIMARY KEY,          -- unique ID per text element per page
  page       TEXT NOT NULL,             -- page path, e.g. '/pages/learn'
  content    TEXT NOT NULL,             -- the modified text content
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE public.site_text ENABLE ROW LEVEL SECURITY;

-- Anyone can read text overrides (so all visitors see updated text)
CREATE POLICY "Public can read site text"
  ON public.site_text FOR SELECT
  USING ( true );

-- Only admins can insert / update / delete
CREATE POLICY "Admins can insert site text"
  ON public.site_text FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

CREATE POLICY "Admins can update site text"
  ON public.site_text FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

CREATE POLICY "Admins can delete site text"
  ON public.site_text FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );
