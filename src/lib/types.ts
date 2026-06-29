// TypeScript Type Definitions for Live Workshop Tracker

export type UserRole = 'admin' | 'trainer' | 'student';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone_number?: string;
  college_name?: string;
  department?: string;
  academic_year?: string;
  created_at?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  password?: string;
}

export type WorkshopStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface Workshop {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: WorkshopStatus;
  trainer_id: string | null;
  created_at?: string;
}

export interface Session {
  id: string;
  workshop_id: string;
  name: string;
  session_date: string;
  duration_mins: number;
  description: string;
  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  workshop_id: string;
  enrollment_date?: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  recorded_by?: string | null;
  recorded_at?: string;
}

export interface Activity {
  id: string;
  workshop_id: string;
  name: string;
  description: string;
  created_at?: string;
}

export interface ActivityScore {
  id: string;
  activity_id: string;
  student_id: string;
  score: number;
  feedback: string;
  submission_date: string;
  recorded_by?: string | null;
}

export type AssessmentType = 'Quiz' | 'Practical Assessment' | 'Viva' | 'Circuit Building' | 'Final Project';

export interface Assessment {
  id: string;
  workshop_id: string;
  name: string;
  type: AssessmentType;
  max_score: number;
  pass_score: number;
  weightage: number; // 0 to 100 percentage
  created_at?: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
  feedback: string;
  evaluation_date: string;
  recorded_by?: string | null;
}

export interface Feedback {
  id: string;
  workshop_id: string;
  student_id: string;
  feedback_text: string;
  created_by?: string | null;
  created_at?: string;
}

export interface WorkshopRules {
  id: string;
  workshop_id: string;
  min_attendance_pct: number;
  min_assessment_score: number;
  mandatory_activities_completed: boolean;
  final_project_mandatory: boolean;
  created_at?: string;
}

export type CertificateStatus = 'Eligible' | 'Not Eligible' | 'Issued';

export interface Certificate {
  id: string;
  student_id: string;
  workshop_id: string;
  issued_at: string;
  certificate_number: string;
  qr_code?: string;
  status: CertificateStatus;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  details: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Visual layout interfaces
export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  email: string;
  collegeName?: string;
  attendancePct: number;
  sessionsAttended: number;
  totalSessions: number;
  completedActivities: number;
  totalActivities: number;
  pendingActivities: number;
  averageScore: number;
  assessmentStatus: 'Pass' | 'Fail' | 'Pending';
  overallProgress: number;
  isEligibleForCertificate: boolean;
  certificateStatus: CertificateStatus;
}
