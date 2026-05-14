CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'M',
  class TEXT NOT NULL DEFAULT '—',
  semester INTEGER NOT NULL DEFAULT 1,
  study_hours NUMERIC NOT NULL DEFAULT 0,
  attendance NUMERIC NOT NULL DEFAULT 0,
  sleep_hours NUMERIC NOT NULL DEFAULT 7,
  assignments_completed INTEGER NOT NULL DEFAULT 0,
  previous_marks NUMERIC NOT NULL DEFAULT 0,
  internet_usage NUMERIC NOT NULL DEFAULT 0,
  participation TEXT NOT NULL DEFAULT 'Medium',
  final_score NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read students"
ON public.students FOR SELECT
USING (true);

CREATE POLICY "Public can insert students"
ON public.students FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_students_class ON public.students(class);
CREATE INDEX idx_students_created_at ON public.students(created_at DESC);