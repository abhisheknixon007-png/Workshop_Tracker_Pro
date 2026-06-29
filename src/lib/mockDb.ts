// Local storage-backed Mock Database for out-of-the-box local developer demo
import { 
  Profile, Workshop, Session, Enrollment, Attendance, 
  Activity, ActivityScore, Assessment, AssessmentScore, 
  Feedback, WorkshopRules, Certificate, CertificateStatus, Notification, AuditLog,
  StudentProgressSummary, AttendanceStatus
} from './types';

// // Default Seed Data
const DEFAULT_PROFILES: Profile[] = [
  { id: 'u-admin', full_name: 'Sarah Connor', email: 'admin@workshop.com', role: 'admin', status: 'Approved', password: 'Password123!' }
];

const DEFAULT_WORKSHOPS: Workshop[] = [];
const DEFAULT_SESSIONS: Session[] = [];
const DEFAULT_ENROLLMENTS: Enrollment[] = [];
const DEFAULT_ATTENDANCE: Attendance[] = [];
const DEFAULT_ACTIVITIES: Activity[] = [];
const DEFAULT_ACTIVITY_SCORES: ActivityScore[] = [];
const DEFAULT_ASSESSMENTS: Assessment[] = [];
const DEFAULT_ASSESSMENT_SCORES: AssessmentScore[] = [];
const DEFAULT_WORKSHOP_RULES: WorkshopRules[] = [];
const DEFAULT_FEEDBACK: Feedback[] = [];
const DEFAULT_CERTIFICATES: Certificate[] = [];
const DEFAULT_NOTIFICATIONS: Notification[] = [];
const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  { id: 'l-1', user_id: 'u-admin', action: 'SYSTEM_CLEANUP', details: 'Cleared all student and trainer seed data', created_at: new Date().toISOString() }
];

// Helper to initialize and retrieve database from Local Storage
class MockDatabase {
  private getStorageItem<T>(key: string, defaultValue: T[]): T[] {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(`tracker_${key}`);
    if (!item) {
      localStorage.setItem(`tracker_${key}`, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
  }

  private setStorageItem<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tracker_${key}`, JSON.stringify(data));
  }

  // Getters
  get profiles() {
    const list = this.getStorageItem<Profile>('profiles', DEFAULT_PROFILES);
    // Auto-clear cache of student and trainer data from previous sessions to start fresh
    if (list.some(p => p.role === 'student' || p.role === 'trainer')) {
      if (typeof window !== 'undefined') {
        const keys = ['profiles', 'workshops', 'sessions', 'enrollments', 'attendance', 
                      'activities', 'activity_scores', 'assessments', 'assessment_scores', 
                      'feedback', 'workshop_rules', 'certificates', 'notifications', 'audit_logs'];
        keys.forEach(k => localStorage.removeItem(`tracker_${k}`));
      }
      return DEFAULT_PROFILES;
    }
    return list;
  }
  get workshops() { return this.getStorageItem<Workshop>('workshops', DEFAULT_WORKSHOPS); }
  get sessions() { return this.getStorageItem<Session>('sessions', DEFAULT_SESSIONS); }
  get enrollments() { return this.getStorageItem<Enrollment>('enrollments', DEFAULT_ENROLLMENTS); }
  get attendance() { return this.getStorageItem<Attendance>('attendance', DEFAULT_ATTENDANCE); }
  get activities() { return this.getStorageItem<Activity>('activities', DEFAULT_ACTIVITIES); }
  get activityScores() { return this.getStorageItem<ActivityScore>('activity_scores', DEFAULT_ACTIVITY_SCORES); }
  get assessments() { return this.getStorageItem<Assessment>('assessments', DEFAULT_ASSESSMENTS); }
  get assessmentScores() { return this.getStorageItem<AssessmentScore>('assessment_scores', DEFAULT_ASSESSMENT_SCORES); }
  get feedback() { return this.getStorageItem<Feedback>('feedback', DEFAULT_FEEDBACK); }
  get workshopRules() { return this.getStorageItem<WorkshopRules>('workshop_rules', DEFAULT_WORKSHOP_RULES); }
  get certificates() { return this.getStorageItem<Certificate>('certificates', DEFAULT_CERTIFICATES); }
  get notifications() { return this.getStorageItem<Notification>('notifications', DEFAULT_NOTIFICATIONS); }
  get auditLogs() { return this.getStorageItem<AuditLog>('audit_logs', DEFAULT_AUDIT_LOGS); }

  // Setters/Update handlers
  set profiles(val) { this.setStorageItem('profiles', val); }
  set workshops(val) { this.setStorageItem('workshops', val); }
  set sessions(val) { this.setStorageItem('sessions', val); }
  set enrollments(val) { this.setStorageItem('enrollments', val); }
  set attendance(val) { this.setStorageItem('attendance', val); }
  set activities(val) { this.setStorageItem('activities', val); }
  set activityScores(val) { this.setStorageItem('activity_scores', val); }
  set assessments(val) { this.setStorageItem('assessments', val); }
  set assessmentScores(val) { this.setStorageItem('assessment_scores', val); }
  set feedback(val) { this.setStorageItem('feedback', val); }
  set workshopRules(val) { this.setStorageItem('workshop_rules', val); }
  set certificates(val) { this.setStorageItem('certificates', val); }
  set notifications(val) { this.setStorageItem('notifications', val); }
  set auditLogs(val) { this.setStorageItem('audit_logs', val); }

  // Helper to delete a single profile and all its related data
  deleteProfile(id: string): void {
    const list = this.profiles;
    const profile = list.find(p => p.id === id);
    if (!profile) return;

    this.profiles = list.filter(p => p.id !== id);

    if (profile.role === 'student') {
      this.enrollments = this.enrollments.filter(e => e.student_id !== id);
      this.attendance = this.attendance.filter(a => a.student_id !== id);
      this.activityScores = this.activityScores.filter(s => s.student_id !== id);
      this.assessmentScores = this.assessmentScores.filter(s => s.student_id !== id);
      this.feedback = this.feedback.filter(f => f.student_id !== id);
      this.certificates = this.certificates.filter(c => c.student_id !== id);
    } else if (profile.role === 'trainer') {
      this.workshops = this.workshops.map(w => w.trainer_id === id ? { ...w, trainer_id: null } : w);
    }
    this.logAudit('u-admin', 'DELETE_USER', `Deleted user account: ${profile.email}`);
  }

  // Helper to bulk delete all trainer and student profiles and workshops
  resetTrainerStudentData(): void {
    this.profiles = this.profiles.filter(p => p.role === 'admin');
    this.workshops = [];
    this.sessions = [];
    this.enrollments = [];
    this.attendance = [];
    this.activities = [];
    this.activityScores = [];
    this.assessments = [];
    this.assessmentScores = [];
    this.feedback = [];
    this.certificates = [];
    this.notifications = [];
    this.logAudit('u-admin', 'SYSTEM_RESET', 'Wiped all student/trainer accounts and workshop data');
  }

  // Calculate Student Progress Summary in a Workshop
  getStudentProgress(studentId: string, workshopId: string): StudentProgressSummary {
    const profile = this.profiles.find(p => p.id === studentId);
    if (!profile) throw new Error('Student profile not found');

    const workshopSessions = this.sessions.filter(s => s.workshop_id === workshopId);
    const sessionIds = workshopSessions.map(s => s.id);
    
    // Attendance calculations
    const studentAttendance = this.attendance.filter(a => a.student_id === studentId && sessionIds.includes(a.session_id));
    const totalSessions = workshopSessions.length;
    const attendedCount = studentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
    
    let attendancePct = 100;
    if (totalSessions > 0) {
      attendancePct = Math.round((attendedCount / totalSessions) * 100);
    }

    // Activities
    const workshopActivities = this.activities.filter(a => a.workshop_id === workshopId);
    const activityIds = workshopActivities.map(a => a.id);
    const gradedActivityScores = this.activityScores.filter(s => s.student_id === studentId && activityIds.includes(s.activity_id));
    
    const completedActivities = gradedActivityScores.length;
    const totalActivities = workshopActivities.length;
    const pendingActivities = totalActivities - completedActivities;

    // Assessments
    const workshopAssessments = this.assessments.filter(a => a.workshop_id === workshopId);
    const assessmentIds = workshopAssessments.map(a => a.id);
    const gradedAssessmentScores = this.assessmentScores.filter(s => s.student_id === studentId && assessmentIds.includes(s.assessment_id));
    
    let averageScore = 0;
    let finalProjectPassed = true;
    let allAssessmentsPassed = true;

    if (workshopAssessments.length > 0) {
      let weightedScoreSum = 0;
      let totalWeight = 0;

      workshopAssessments.forEach(ass => {
        const scoreRecord = gradedAssessmentScores.find(s => s.assessment_id === ass.id);
        const scoreValue = scoreRecord ? scoreRecord.score : 0;
        
        // Check pass thresholds
        if (scoreValue < ass.pass_score) {
          allAssessmentsPassed = false;
        }
        
        if (ass.type === 'Final Project' && scoreValue < ass.pass_score) {
          finalProjectPassed = false;
        }

        weightedScoreSum += (scoreValue / ass.max_score) * 100 * (ass.weightage / 100);
        totalWeight += ass.weightage;
      });

      // If weightages do not add up to 100 or 0, compute simple average
      if (totalWeight === 0) {
        const sum = gradedAssessmentScores.reduce((acc, curr) => acc + curr.score, 0);
        averageScore = Math.round(gradedAssessmentScores.length > 0 ? sum / gradedAssessmentScores.length : 0);
      } else {
        averageScore = Math.round(weightedScoreSum * (100 / (totalWeight || 100)));
      }
    }

    const rules = this.workshopRules.find(r => r.workshop_id === workshopId) || {
      min_attendance_pct: 80,
      min_assessment_score: 70,
      mandatory_activities_completed: true,
      final_project_mandatory: false
    };

    // Evaluate certificate eligibility
    let isEligible = true;
    if (attendancePct < rules.min_attendance_pct) isEligible = false;
    if (averageScore < rules.min_assessment_score) isEligible = false;
    if (rules.mandatory_activities_completed && pendingActivities > 0) isEligible = false;
    if (rules.final_project_mandatory && !finalProjectPassed) isEligible = false;

    // Check certificate status
    const certRecord = this.certificates.find(c => c.student_id === studentId && c.workshop_id === workshopId);
    let certStatus: CertificateStatus = 'Not Eligible';
    if (certRecord) {
      certStatus = certRecord.status;
    } else if (isEligible) {
      certStatus = 'Eligible';
    }

    // Overall Progress calculation (average of attendance % and activity completion %)
    const activityCompletionPct = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 100;
    const overallProgress = Math.round((attendancePct + activityCompletionPct) / 2);

    return {
      studentId,
      studentName: profile.full_name,
      email: profile.email,
      collegeName: profile.college_name,
      attendancePct,
      sessionsAttended: attendedCount,
      totalSessions,
      completedActivities,
      totalActivities,
      pendingActivities,
      averageScore,
      assessmentStatus: allAssessmentsPassed && gradedAssessmentScores.length === workshopAssessments.length ? 'Pass' : 'Fail',
      overallProgress,
      isEligibleForCertificate: isEligible,
      certificateStatus: certStatus
    };
  }

  // Create notifications helper
  notify(userId: string, message: string) {
    const list = this.notifications;
    list.unshift({
      id: `n-${Date.now()}`,
      user_id: userId,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    });
    this.notifications = list;
  }

  // Log audit helper
  logAudit(userId: string | null, action: string, details: string) {
    const list = this.auditLogs;
    list.unshift({
      id: `l-${Date.now()}`,
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    });
    this.auditLogs = list;
  }
}

export const mockDb = new MockDatabase();
export default mockDb;
