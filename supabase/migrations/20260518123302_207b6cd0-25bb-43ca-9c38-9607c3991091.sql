DROP POLICY IF EXISTS "Public can read activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Public can insert activity logs" ON public.activity_logs;

CREATE POLICY "Authenticated can read activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert activity logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);