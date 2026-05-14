CREATE POLICY "Public can delete sample students"
  ON public.students FOR DELETE
  TO public
  USING (source = 'sample');