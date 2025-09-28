-- Create public assets bucket and secure policies (no table ownership changes)
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- Public read access for assets bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can view assets'
  ) THEN
    CREATE POLICY "Public can view assets"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'assets');
  END IF;
END $$;

-- Admins can upload to assets bucket
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload assets'
  ) THEN
    CREATE POLICY "Admins can upload assets"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Admins can update assets bucket files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update assets'
  ) THEN
    CREATE POLICY "Admins can update assets"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Admins can delete assets bucket files
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete assets'
  ) THEN
    CREATE POLICY "Admins can delete assets"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'assets' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
