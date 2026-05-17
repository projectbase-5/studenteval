// input validation for the Predict form.
// kept verbose so it's easy to tweak rules during viva demo.

export type MarkIssue = { field: string; message: string };

export function validateInputMarks(input: {
  study_hours?: number;
  attendance?: number;
  sleep_hours?: number;
  previous_marks?: number;
  assignments_completed?: number;
  internet_usage?: number;
}): MarkIssue[] {
  const issues: MarkIssue[] = [];

  // checking empty values before prediction
  if (input.study_hours == null || isNaN(input.study_hours)) {
    issues.push({ field: "study_hours", message: "Study hours is required" });
  } else if (input.study_hours < 0 || input.study_hours > 16) {
    issues.push({ field: "study_hours", message: "Study hours must be 0-16" });
  }

  if (input.attendance != null) {
    if (input.attendance < 0 || input.attendance > 100) {
      issues.push({ field: "attendance", message: "Attendance must be a percentage 0-100" });
    }
  }

  if (input.previous_marks != null) {
    if (input.previous_marks < 0 || input.previous_marks > 100) {
      issues.push({ field: "previous_marks", message: "Previous marks must be 0-100" });
    }
  }

  if (input.sleep_hours != null && (input.sleep_hours < 0 || input.sleep_hours > 14)) {
    issues.push({ field: "sleep_hours", message: "Sleep hours look unrealistic" });
  }

  // assignments completed is a count, not a percent
  if (input.assignments_completed != null && input.assignments_completed < 0) {
    issues.push({ field: "assignments_completed", message: "Cannot be negative" });
  }

  if (input.internet_usage != null && input.internet_usage < 0) {
    issues.push({ field: "internet_usage", message: "Cannot be negative" });
  }

  return issues;
}
