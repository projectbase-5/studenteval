CREATE POLICY "Public can delete students" ON public.students FOR DELETE USING (true);
CREATE UNIQUE INDEX IF NOT EXISTS students_student_code_key ON public.students(student_code);