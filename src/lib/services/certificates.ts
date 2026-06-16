// Certificate Evaluation & Issuance Engine
import { mockDb } from '../mockDb';
import { Certificate, CertificateStatus } from '../types';

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
  rules: {
    minAttendance: number;
    minAssessment: number;
    mandatoryActivities: boolean;
    finalProjectMandatory: boolean;
  };
  stats: {
    attendancePct: number;
    averageScore: number;
    pendingActivities: number;
    passedFinalProject: boolean;
  };
}

/**
 * Check if a student is eligible for a workshop certificate based on the rules
 */
export function checkCertificateEligibility(
  studentId: string,
  workshopId: string
): EligibilityResult {
  const progress = mockDb.getStudentProgress(studentId, workshopId);
  
  // Get workshop rules (default to standard settings if rules don't exist)
  const rules = mockDb.workshopRules.find(r => r.workshop_id === workshopId) || {
    min_attendance_pct: 80,
    min_assessment_score: 70,
    mandatory_activities_completed: true,
    final_project_mandatory: false
  };

  const workshopAssessments = mockDb.assessments.filter(a => a.workshop_id === workshopId);
  const finalProject = workshopAssessments.find(a => a.type === 'Final Project');
  
  let passedFinalProject = true;
  if (finalProject) {
    const studentFinalScore = mockDb.assessmentScores.find(
      s => s.student_id === studentId && s.assessment_id === finalProject.id
    );
    if (!studentFinalScore || studentFinalScore.score < finalProject.pass_score) {
      passedFinalProject = false;
    }
  }

  const reasons: string[] = [];

  // Check attendance threshold
  if (progress.attendancePct < rules.min_attendance_pct) {
    reasons.push(`Attendance is ${progress.attendancePct}%, below the required ${rules.min_attendance_pct}%`);
  }

  // Check assessment scores threshold
  if (progress.averageScore < rules.min_assessment_score) {
    reasons.push(`Average assessment score is ${progress.averageScore}%, below the required ${rules.min_assessment_score}%`);
  }

  // Check activity completion status
  if (rules.mandatory_activities_completed && progress.pendingActivities > 0) {
    reasons.push(`Has ${progress.pendingActivities} pending hands-on activities`);
  }

  // Check final project constraint
  if (rules.final_project_mandatory && !passedFinalProject) {
    reasons.push("Final Project has not been completed or passed");
  }

  const isEligible = reasons.length === 0;

  return {
    isEligible,
    reasons,
    rules: {
      minAttendance: rules.min_attendance_pct,
      minAssessment: rules.min_assessment_score,
      mandatoryActivities: rules.mandatory_activities_completed,
      finalProjectMandatory: rules.final_project_mandatory
    },
    stats: {
      attendancePct: progress.attendancePct,
      averageScore: progress.averageScore,
      pendingActivities: progress.pendingActivities,
      passedFinalProject
    }
  };
}

/**
 * Issue a certificate for a student in a workshop if they are eligible
 */
export function issueCertificate(studentId: string, workshopId: string): Certificate | null {
  const eligibility = checkCertificateEligibility(studentId, workshopId);
  if (!eligibility.isEligible) {
    console.warn(`Student ${studentId} is not eligible for certificate in workshop ${workshopId}`);
    return null;
  }

  // Check if already issued
  const existingCert = mockDb.certificates.find(
    c => c.student_id === studentId && c.workshop_id === workshopId
  );
  if (existingCert) {
    if (existingCert.status !== 'Issued') {
      const updatedList = mockDb.certificates.map(c => 
        (c.student_id === studentId && c.workshop_id === workshopId)
          ? { ...c, status: 'Issued' as CertificateStatus, issued_at: new Date().toISOString() }
          : c
      );
      mockDb.certificates = updatedList;
      return updatedList.find(c => c.student_id === studentId && c.workshop_id === workshopId) || null;
    }
    return existingCert;
  }

  // Create new certificate number
  const workshop = mockDb.workshops.find(w => w.id === workshopId);
  const acronym = workshop ? workshop.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4) : 'WKSP';
  const randHex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
  const certNumber = `CERT-${acronym}-${randHex}`;

  const newCert: Certificate = {
    id: `c-${Date.now()}`,
    student_id: studentId,
    workshop_id: workshopId,
    issued_at: new Date().toISOString(),
    certificate_number: certNumber,
    qr_code: `VERIFY_${certNumber}`,
    status: 'Issued'
  };

  const list = mockDb.certificates;
  list.push(newCert);
  mockDb.certificates = list;

  // Log audit trail
  mockDb.logAudit(
    'u-admin', 
    'ISSUE_CERTIFICATE', 
    `Issued certificate ${certNumber} to student ID ${studentId} for workshop ${workshopId}`
  );

  // Notify student
  mockDb.notify(
    studentId, 
    `Congratulations! Your certificate for ${workshop?.name || 'the workshop'} has been issued.`
  );

  return newCert;
}
