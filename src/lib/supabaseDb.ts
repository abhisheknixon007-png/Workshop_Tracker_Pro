import { supabase } from '@/integrations/supabase/client';
import { useMockDb } from './supabase';
import { mockDb } from './mockDb';
import { 
  Profile, Workshop, Session, Enrollment, Attendance, 
  Activity, ActivityScore, Assessment, AssessmentScore, 
  Feedback, WorkshopRules, Certificate, CertificateStatus, Notification, AuditLog,
  StudentProgressSummary, AttendanceStatus
} from './types';

// Fetch helper functions
export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchWorkshops(): Promise<Workshop[]> {
  const { data, error } = await supabase.from('workshops').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase.from('sessions').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase.from('enrollments').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchAttendance(): Promise<Attendance[]> {
  const { data, error } = await supabase.from('attendance').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchActivityScores(): Promise<ActivityScore[]> {
  const { data, error } = await supabase.from('activity_scores').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchAssessments(): Promise<Assessment[]> {
  const { data, error } = await supabase.from('assessments').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchAssessmentScores(): Promise<AssessmentScore[]> {
  const { data, error } = await supabase.from('assessment_scores').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchFeedback(): Promise<Feedback[]> {
  const { data, error } = await supabase.from('feedback').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchWorkshopRules(): Promise<WorkshopRules[]> {
  const { data, error } = await supabase.from('workshop_rules').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase.from('certificates').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Student Progress Aggregator
export async function getStudentProgress(studentId: string, workshopId: string): Promise<StudentProgressSummary> {
  const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', studentId).single();
  if (profileErr || !profile) throw new Error('Student profile not found');

  const { data: wkSessions } = await supabase.from('sessions').select('*').eq('workshop_id', workshopId);
  const sessionsList = wkSessions || [];

  const sessionIds = sessionsList.map(s => s.id);
  let studentAttendance: any[] = [];
  if (sessionIds.length > 0) {
    const { data: att } = await supabase.from('attendance').select('*').eq('student_id', studentId).in('session_id', sessionIds);
    studentAttendance = att || [];
  }
  const totalSessions = sessionsList.length;
  const attendedCount = studentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  
  let attendancePct = 100;
  if (totalSessions > 0) {
    attendancePct = Math.round((attendedCount / totalSessions) * 100);
  }

  const { data: wkActivities } = await supabase.from('activities').select('*').eq('workshop_id', workshopId);
  const activitiesList = wkActivities || [];
  const activityIds = activitiesList.map(a => a.id);
  
  let gradedActivityScores: any[] = [];
  if (activityIds.length > 0) {
    const { data: scores } = await supabase.from('activity_scores').select('*').eq('student_id', studentId).in('activity_id', activityIds);
    gradedActivityScores = scores || [];
  }
  const completedActivities = gradedActivityScores.length;
  const totalActivities = activitiesList.length;
  const pendingActivities = totalActivities - completedActivities;

  const { data: wkAssessments } = await supabase.from('assessments').select('*').eq('workshop_id', workshopId);
  const assessmentsList = wkAssessments || [];
  const assessmentIds = assessmentsList.map(a => a.id);
  
  let gradedAssessmentScores: any[] = [];
  if (assessmentIds.length > 0) {
    const { data: scores } = await supabase.from('assessment_scores').select('*').eq('student_id', studentId).in('assessment_id', assessmentIds);
    gradedAssessmentScores = scores || [];
  }

  let averageScore = 0;
  let finalProjectPassed = true;
  let allAssessmentsPassed = true;

  if (assessmentsList.length > 0) {
    let weightedScoreSum = 0;
    let totalWeight = 0;

    assessmentsList.forEach(ass => {
      const scoreRecord = gradedAssessmentScores.find(s => s.assessment_id === ass.id);
      const scoreValue = scoreRecord ? Number(scoreRecord.score) : 0;
      
      if (scoreValue < Number(ass.pass_score)) {
        allAssessmentsPassed = false;
      }
      if (ass.type === 'Final Project' && scoreValue < Number(ass.pass_score)) {
        finalProjectPassed = false;
      }

      weightedScoreSum += (scoreValue / Number(ass.max_score)) * 100 * (Number(ass.weightage) / 100);
      totalWeight += Number(ass.weightage);
    });

    if (totalWeight === 0) {
      const sum = gradedAssessmentScores.reduce((acc, curr) => acc + Number(curr.score), 0);
      averageScore = Math.round(gradedAssessmentScores.length > 0 ? sum / gradedAssessmentScores.length : 0);
    } else {
      averageScore = Math.round(weightedScoreSum * (100 / (totalWeight || 100)));
    }
  }

  const { data: rulesData } = await supabase.from('workshop_rules').select('*').eq('workshop_id', workshopId).maybeSingle();
  const rules = rulesData || {
    min_attendance_pct: 80,
    min_assessment_score: 70,
    mandatory_activities_completed: true,
    final_project_mandatory: false
  };

  let isEligible = true;
  if (attendancePct < Number(rules.min_attendance_pct)) isEligible = false;
  if (averageScore < Number(rules.min_assessment_score)) isEligible = false;
  if (rules.mandatory_activities_completed && pendingActivities > 0) isEligible = false;
  if (rules.final_project_mandatory && !finalProjectPassed) isEligible = false;

  const { data: certRecord } = await supabase.from('certificates').select('*').eq('student_id', studentId).eq('workshop_id', workshopId).maybeSingle();
  
  let certStatus: CertificateStatus = 'Not Eligible';
  if (certRecord) {
    certStatus = certRecord.status as CertificateStatus;
  } else if (isEligible) {
    certStatus = 'Eligible';
  }

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
    assessmentStatus: allAssessmentsPassed && gradedAssessmentScores.length === assessmentsList.length ? 'Pass' : 'Fail',
    overallProgress,
    isEligibleForCertificate: isEligible,
    certificateStatus: certStatus
  };
}

// Mutation functions
export async function createWorkshop(fields: Omit<Workshop, 'id' | 'created_at'>): Promise<Workshop> {
  const { data, error } = await supabase.from('workshops').insert(fields).select('*').single();
  if (error) throw error;
  return data;
}

export async function createSession(fields: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
  const { data, error } = await supabase.from('sessions').insert(fields).select('*').single();
  if (error) throw error;
  return data;
}

export async function enrollStudent(studentId: string, workshopId: string): Promise<Enrollment> {
  const { data, error } = await supabase.from('enrollments').insert({ student_id: studentId, workshop_id: workshopId }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateUserProfileStatus(userId: string, status: 'Pending' | 'Approved' | 'Rejected', approvedBy: string | undefined): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update({
    status,
    approved_by: approvedBy || null,
    approved_at: new Date().toISOString()
  }).eq('id', userId).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveAttendance(sessionId: string, studentId: string, status: AttendanceStatus, recordedBy: string | null): Promise<Attendance> {
  // Fetch existing attendance to check if upsert is needed
  const { data: existing } = await supabase.from('attendance').select('id').eq('session_id', sessionId).eq('student_id', studentId).maybeSingle();
  
  if (existing) {
    const { data, error } = await supabase.from('attendance').update({
      status,
      recorded_by: recordedBy,
      recorded_at: new Date().toISOString()
    }).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('attendance').insert({
      session_id: sessionId,
      student_id: studentId,
      status,
      recorded_by: recordedBy,
      recorded_at: new Date().toISOString()
    }).select('*').single();
    if (error) throw error;
    return data;
  }
}

export async function saveActivityScore(activityId: string, studentId: string, score: number, feedback: string, recordedBy: string | null): Promise<ActivityScore> {
  const { data: existing } = await supabase.from('activity_scores').select('id').eq('activity_id', activityId).eq('student_id', studentId).maybeSingle();

  if (existing) {
    const { data, error } = await supabase.from('activity_scores').update({
      score,
      feedback,
      submission_date: new Date().toISOString().split('T')[0],
      recorded_by: recordedBy
    }).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('activity_scores').insert({
      activity_id: activityId,
      student_id: studentId,
      score,
      feedback,
      submission_date: new Date().toISOString().split('T')[0],
      recorded_by: recordedBy
    }).select('*').single();
    if (error) throw error;
    return data;
  }
}

export async function saveAssessmentScore(assessmentId: string, studentId: string, score: number, feedback: string, recordedBy: string | null): Promise<AssessmentScore> {
  const { data: existing } = await supabase.from('assessment_scores').select('id').eq('assessment_id', assessmentId).eq('student_id', studentId).maybeSingle();

  if (existing) {
    const { data, error } = await supabase.from('assessment_scores').update({
      score,
      feedback,
      evaluation_date: new Date().toISOString().split('T')[0],
      recorded_by: recordedBy
    }).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('assessment_scores').insert({
      assessment_id: assessmentId,
      student_id: studentId,
      score,
      feedback,
      evaluation_date: new Date().toISOString().split('T')[0],
      recorded_by: recordedBy
    }).select('*').single();
    if (error) throw error;
    return data;
  }
}

export async function saveSummaryFeedback(workshopId: string, studentId: string, feedbackText: string, createdBy: string | null): Promise<Feedback> {
  const { data, error } = await supabase.from('feedback').insert({
    workshop_id: workshopId,
    student_id: studentId,
    feedback_text: feedbackText,
    created_by: createdBy,
    created_at: new Date().toISOString()
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function saveWorkshopRules(fields: Omit<WorkshopRules, 'id' | 'created_at'>): Promise<WorkshopRules> {
  const { data: existing } = await supabase.from('workshop_rules').select('id').eq('workshop_id', fields.workshop_id).maybeSingle();

  if (existing) {
    const { data, error } = await supabase.from('workshop_rules').update({
      min_attendance_pct: fields.min_attendance_pct,
      min_assessment_score: fields.min_assessment_score,
      mandatory_activities_completed: fields.mandatory_activities_completed,
      final_project_mandatory: fields.final_project_mandatory
    }).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('workshop_rules').insert(fields).select('*').single();
    if (error) throw error;
    return data;
  }
}

export async function issueCertificate(studentId: string, workshopId: string, certNumber: string, qrCode: string): Promise<Certificate> {
  const { data, error } = await supabase.from('certificates').insert({
    student_id: studentId,
    workshop_id: workshopId,
    certificate_number: certNumber,
    qr_code: qrCode,
    status: 'Issued',
    issued_at: new Date().toISOString()
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function createNotification(userId: string, message: string): Promise<Notification> {
  try {
    const { data, error } = await supabase.from('notifications').insert({
      user_id: userId,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    }).select('*').single();
    
    if (error) {
      console.warn('⚠️ In-app notification could not be saved to DB:', error.message);
      return {
        id: 'mock-notification-' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        message,
        is_read: false,
        created_at: new Date().toISOString()
      };
    }
    return data;
  } catch (err: any) {
    console.warn('⚠️ In-app notification could not be saved to DB due to exception:', err.message);
    return {
      id: 'mock-notification-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    };
  }
}

export async function createAuditLog(userId: string | null, action: string, details: string): Promise<AuditLog> {
  try {
    const { data, error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    }).select('*').single();
    
    if (error) {
      console.warn('⚠️ Audit log could not be saved to DB:', error.message);
      return {
        id: 'mock-audit-log-' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        action,
        details,
        created_at: new Date().toISOString()
      };
    }
    return data;
  } catch (err: any) {
    console.warn('⚠️ Audit log could not be saved due to exception:', err.message);
    return {
      id: 'mock-audit-log-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      action,
      details,
      created_at: new Date().toISOString()
    };
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  if (useMockDb) {
    const list = mockDb.profiles;
    const index = list.findIndex(p => p.id === userId);
    if (index !== -1) {
      list[index].password = newPassword;
      mockDb.profiles = list;
    }
    return;
  }
  const { error } = await supabase
    .from('profiles')
    .update({ password: newPassword })
    .eq('id', userId);
  if (error) throw error;
}

export async function deleteUserProfile(userId: string): Promise<void> {
  if (useMockDb) {
    mockDb.deleteProfile(userId);
    return;
  }
  const { error } = await supabase.rpc('delete_user_by_admin', { user_id_to_delete: userId });
  if (error) throw error;
}

export async function resetTrainerStudentData(): Promise<void> {
  if (useMockDb) {
    mockDb.resetTrainerStudentData();
    return;
  }
  const { error } = await supabase.rpc('delete_all_trainers_and_students');
  if (error) throw error;
}
