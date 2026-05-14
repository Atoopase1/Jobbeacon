-- ==============================================================================
-- Image Admin: site_images table + storage bucket
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Create site_images table
CREATE TABLE IF NOT EXISTS public.site_images (
  img_id     TEXT PRIMARY KEY,          -- unique ID per image per page
  page       TEXT NOT NULL,             -- page path, e.g. '/pages/learn'
  url        TEXT NOT NULL,             -- the custom image URL or storage URL
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read image overrides (so all visitors see updated images)
CREATE POLICY "Public can read site images"
  ON public.site_images FOR SELECT
  USING ( true );

-- Only admins can insert / update / delete
CREATE POLICY "Admins can insert site images"
  ON public.site_images FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

CREATE POLICY "Admins can update site images"
  ON public.site_images FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

CREATE POLICY "Admins can delete site images"
  ON public.site_images FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

-- 3. Create site-images storage bucket (for file uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-images', 'site-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Site images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'site-images' );

-- Admin upload
CREATE POLICY "Admins can upload site images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'site-images' AND
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

-- Admin update
CREATE POLICY "Admins can update site images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'site-images' AND
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );

-- Admin delete
CREATE POLICY "Admins can delete site images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'site-images' AND
    auth.role() = 'authenticated' AND
    (auth.jwt() ->> 'email') IN ('atoopase@gmail.com', 'www.atoopasechristopher@gmail.com')
  );
