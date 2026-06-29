"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, BookOpen, Calendar, Users, Award, Settings, 
  Download, Upload, Save, Loader2, ToggleLeft, ToggleRight,
  ShieldAlert, Search, Trash2, Send, Smartphone, MailCheck, Sparkles, Eye, Database
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser, registerUser } from "@/lib/auth";
import { 
  fetchWorkshops, fetchSessions, fetchProfiles, fetchCertificates, fetchEnrollments,
  fetchWorkshopRules, fetchAuditLogs, updateUserProfileStatus, createNotification,
  createAuditLog, createWorkshop, saveWorkshopRules, createSession, enrollStudent,
  getStudentProgress, issueCertificate as issueCertificateDb, updateUserPassword,
  deleteUserProfile, resetTrainerStudentData
} from "@/lib/supabaseDb";
import { Profile, Workshop, Session, Enrollment, WorkshopRules, Certificate, WorkshopStatus, AuditLog, StudentProgressSummary } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { WorkshopStatusBadge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PrintableReport from "@/components/PrintableReport";
import { sendNotificationTemplate } from "@/lib/services/messaging";
import { supabase } from "@/integrations/supabase/client";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = React.useState("overview");

  // Core Data Lists
  const [workshops, setWorkshops] = React.useState<Workshop[]>([]);
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [students, setStudents] = React.useState<Profile[]>([]);
  const [trainers, setTrainers] = React.useState<Profile[]>([]);
  const [certificates, setCertificates] = React.useState<Certificate[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);
  const [workshopRules, setWorkshopRules] = React.useState<WorkshopRules[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [studentProgressMap, setStudentProgressMap] = React.useState<Record<string, StudentProgressSummary>>({});

  // Approvals Management States
  const [approvalSearch, setApprovalSearch] = React.useState("");
  const [approvalFilterRole, setApprovalFilterRole] = React.useState<"all" | "student" | "trainer">("all");



  // Student Enrollment Form States
  const [selectedStudent, setSelectedStudent] = React.useState("");
  const [selectedEnrollWk, setSelectedEnrollWk] = React.useState("");

  // CSV Bulk Upload state
  const [csvContent, setCsvContent] = React.useState("");
  const [csvUploadStatus, setCsvUploadStatus] = React.useState("");

  // Certification Rules States
  const [selectedRulesWk, setSelectedRulesWk] = React.useState("");
  const [minAttendance, setMinAttendance] = React.useState(80);
  const [minAssessment, setMinAssessment] = React.useState(70);
  const [mandatoryActivities, setMandatoryActivities] = React.useState(true);
  const [finalProjectMandatory, setFinalProjectMandatory] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");

  // Password Edit Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = React.useState<Profile | null>(null);
  const [newPasswordVal, setNewPasswordVal] = React.useState("");

  // AI & Integrations Configuration States
  const [aiProvider, setAiProvider] = React.useState<"none" | "openai" | "gemini">("none");
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [geminiKey, setGeminiKey] = React.useState("");
  const [emailProvider, setEmailProvider] = React.useState<"none" | "sendgrid">("none");
  const [sendgridKey, setSendgridKey] = React.useState("");
  const [sendgridSender, setSendgridSender] = React.useState("");
  const [whatsappProvider, setWhatsappProvider] = React.useState<"none" | "twilio">("none");
  const [twilioSid, setTwilioSid] = React.useState("");
  const [twilioToken, setTwilioToken] = React.useState("");
  const [twilioFrom, setTwilioFrom] = React.useState("");
  const [twilioTestRecipient, setTwilioTestRecipient] = React.useState("");

  // Supabase Auth session diagnostics
  const [authSessionUser, setAuthSessionUser] = React.useState<any>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  // Printable Report States
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [selectedReportWorkshop, setSelectedReportWorkshop] = React.useState<Workshop | null>(null);
  const [selectedReportTrainer, setSelectedReportTrainer] = React.useState<Profile | null>(null);
  const [selectedReportProgressList, setSelectedReportProgressList] = React.useState<StudentProgressSummary[]>([]);
  const [selectedReportAiInsights, setSelectedReportAiInsights] = React.useState<any>(null);

  // Load admin session and integrations configuration
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "admin") {
      router.push("/login");
    } else {
      setUser(session);
      refreshData();

      // Load configurations from localStorage
      if (typeof window !== "undefined") {
        setAiProvider((localStorage.getItem("tracker_ai_provider") as any) || "none");
        setOpenaiKey(localStorage.getItem("tracker_openai_api_key") || "");
        setGeminiKey(localStorage.getItem("tracker_gemini_api_key") || "");
        setEmailProvider((localStorage.getItem("tracker_email_provider") as any) || "none");
        setSendgridKey(localStorage.getItem("tracker_sendgrid_key") || "");
        setSendgridSender(localStorage.getItem("tracker_sendgrid_sender") || "");
        setWhatsappProvider((localStorage.getItem("tracker_whatsapp_provider") as any) || "none");
        setTwilioSid(localStorage.getItem("tracker_twilio_sid") || "");
        setTwilioToken(localStorage.getItem("tracker_twilio_token") || "");
        setTwilioFrom(localStorage.getItem("tracker_twilio_from") || "");
        setTwilioTestRecipient(localStorage.getItem("tracker_twilio_test_recipient") || "");
      }
    }
  }, [router]);

  // Check Supabase Auth active session status
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthSessionUser(data.session?.user || null);
      setAuthChecked(true);
    });
  }, []);

  // Synchronize rules details whenever active rules workshop changes
  React.useEffect(() => {
    if (!selectedRulesWk) return;
    const rule = workshopRules.find(r => r.workshop_id === selectedRulesWk);
    if (rule) {
      setMinAttendance(rule.min_attendance_pct);
      setMinAssessment(rule.min_assessment_score);
      setMandatoryActivities(rule.mandatory_activities_completed);
      setFinalProjectMandatory(rule.final_project_mandatory);
    } else {
      setMinAttendance(80);
      setMinAssessment(70);
      setMandatoryActivities(true);
      setFinalProjectMandatory(false);
    }
  }, [selectedRulesWk, workshopRules]);

  const refreshData = async () => {
    try {
      const [wks, sess, allProfiles, certs, enrolls, rules, logs] = await Promise.all([
        fetchWorkshops(),
        fetchSessions(),
        fetchProfiles(),
        fetchCertificates(),
        fetchEnrollments(),
        fetchWorkshopRules(),
        fetchAuditLogs()
      ]);

      setWorkshops(wks);
      setSessions(sess);
      setProfiles(allProfiles);
      setCertificates(certs);
      setEnrollments(enrolls);
      setWorkshopRules(rules);
      setAuditLogs(logs);

      const studList = allProfiles.filter(p => p.role === 'student');
      setStudents(studList);
      
      const trainerList = allProfiles.filter(p => p.role === 'trainer');
      setTrainers(trainerList);
      
      if (wks.length > 0) {
        setSelectedEnrollWk(wks[0].id);
        setSelectedRulesWk(wks[0].id);
      }
      
      if (studList.length > 0) {
        setSelectedStudent(studList[0].id);
      }

      // Calculate progress summaries asynchronously
      const progressList = await Promise.all(
        enrolls.map(async (e) => {
          try {
            const p = await getStudentProgress(e.student_id, e.workshop_id);
            return { key: `${e.student_id}-${e.workshop_id}`, progress: p };
          } catch (err: any) {
            console.warn("Failed to calculate progress summary:", err?.message || String(err));
            return null;
          }
        })
      );
      
      const progressMap: Record<string, StudentProgressSummary> = {};
      progressList.forEach(item => {
        if (item) {
          progressMap[item.key] = item.progress;
        }
      });
      setStudentProgressMap(progressMap);

    } catch (err: any) {
      setErrorMessage("Failed to load records from Supabase: " + err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateUserPassword(selectedUserForPassword.id, newPasswordVal);
      await createAuditLog(
        user?.id || null, 
        'UPDATE_USER_PASSWORD', 
        `Updated password for ${selectedUserForPassword.email} (${selectedUserForPassword.role})`
      );
      
      setSuccessMessage(`Password updated successfully for ${selectedUserForPassword.full_name}!`);
      setIsPasswordModalOpen(false);
      setNewPasswordVal("");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage("Failed to update password: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const handleApproveUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await updateUserProfileStatus(userId, 'Approved', user?.id);
      await createNotification(userId, "Your account has been approved by the administrator. You can now log in.");
      
      const approvedProfile = profiles.find(p => p.id === userId);
      if (approvedProfile) {
        await createAuditLog(user?.id || null, 'APPROVE_USER', `Approved registration for ${approvedProfile.email} (${approvedProfile.role})`);
      }
      
      setSuccessMessage("User registration approved successfully!");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to approve user: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await updateUserProfileStatus(userId, 'Rejected', user?.id);
      
      const rejectedProfile = profiles.find(p => p.id === userId);
      if (rejectedProfile) {
        await createAuditLog(user?.id || null, 'REJECT_USER', `Rejected registration for ${rejectedProfile.email} (${rejectedProfile.role})`);
      }

      setSuccessMessage("User registration rejected.");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to reject user: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user account? This will wipe their credentials and all progress data.")) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const deleteProfile = profiles.find(p => p.id === userId);
      await deleteUserProfile(userId);
      if (deleteProfile) {
        await createAuditLog(user?.id || null, 'DELETE_USER', `Permanently deleted account for ${deleteProfile.email} (${deleteProfile.role})`);
      }
      setSuccessMessage("User account deleted successfully.");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to delete user: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete ALL workshops, sessions, attendance logs, activities, grades, and learner/trainer accounts (except administrators). This cannot be undone. Do you want to proceed?")) return;
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await resetTrainerStudentData();
      await createAuditLog(user?.id || null, 'DATABASE_RESET', `Admin wiped all student and trainer data.`);
      setSuccessMessage("All student and trainer accounts, and all workshops have been wiped.");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage("Failed to reset database: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIntegrations = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("tracker_ai_provider", aiProvider);
      localStorage.setItem("tracker_openai_api_key", openaiKey);
      localStorage.setItem("tracker_gemini_api_key", geminiKey);
      localStorage.setItem("tracker_email_provider", emailProvider);
      localStorage.setItem("tracker_sendgrid_key", sendgridKey);
      localStorage.setItem("tracker_sendgrid_sender", sendgridSender);
      localStorage.setItem("tracker_whatsapp_provider", whatsappProvider);
      localStorage.setItem("tracker_twilio_sid", twilioSid);
      localStorage.setItem("tracker_twilio_token", twilioToken);
      localStorage.setItem("tracker_twilio_from", twilioFrom);
      localStorage.setItem("tracker_twilio_test_recipient", twilioTestRecipient);
      setSuccessMessage("Integrations configuration saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleSendNotification = async (
    type: 'approval_confirmation' | 'attendance_reminder' | 'pending_activities_alert' | 'performance_summary',
    studentProgress: StudentProgressSummary,
    workshop: Workshop
  ) => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const student = profiles.find(p => p.id === studentProgress.studentId);
      if (!student) throw new Error("Student not found");

      const wEnrolls = enrollments.filter(e => e.workshop_id === workshop.id);
      const progressList = wEnrolls.map(e => studentProgressMap[`${e.student_id}-${workshop.id}`]).filter(Boolean);
      
      let payload: Record<string, any> = {
        workshopName: workshop.name,
        attendancePct: studentProgress.attendancePct,
        minThreshold: 80,
        pendingCount: studentProgress.pendingActivities,
        completedCount: studentProgress.completedActivities,
        totalCount: studentProgress.totalActivities,
        averageGrade: studentProgress.averageScore,
        eligible: studentProgress.isEligibleForCertificate,
        certificateStatus: studentProgress.certificateStatus,
        // Class fields for trainer reports
        learnerCount: wEnrolls.length,
        avgAttendance: progressList.length > 0 ? Math.round(progressList.reduce((a,c)=>a+c.attendancePct, 0)/progressList.length) : 0,
        avgGrade: progressList.length > 0 ? Math.round(progressList.reduce((a,c)=>a+c.averageScore, 0)/progressList.length) : 0,
        topPerformerName: progressList.sort((a,b)=>b.averageScore - a.averageScore)[0]?.studentName || 'N/A',
        topPerformerScore: progressList.sort((a,b)=>b.averageScore - a.averageScore)[0]?.averageScore || 0
      };

      const { emailResult, whatsappResult } = await sendNotificationTemplate(
        type,
        student.full_name,
        student.email,
        student.phone_number || "",
        payload
      );

      setSuccessMessage(`Alerts dispatched! Email Method: ${emailResult.providerUsed}. WhatsApp Method: ${whatsappResult.providerUsed}`);
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage("Failed to dispatch notifications: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReport = async (workshopId: string) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const w = workshops.find(wk => wk.id === workshopId);
      if (!w) throw new Error("Workshop not found");
      
      const t = profiles.find(p => p.id === w.trainer_id) || null;
      
      const wEnrolls = enrollments.filter(e => e.workshop_id === workshopId);
      const progressList = await Promise.all(
        wEnrolls.map(e => getStudentProgress(e.student_id, workshopId))
      );
      
      const { generateTrainerInsights } = await import("@/lib/services/aiFeedback");
      const aiInsights = await generateTrainerInsights(progressList, w);

      setSelectedReportWorkshop(w);
      setSelectedReportTrainer(t);
      setSelectedReportProgressList(progressList);
      setSelectedReportAiInsights(aiInsights);
      setIsReportModalOpen(true);
    } catch (err: any) {
      setErrorMessage("Failed to prepare report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportAllProfilesCSV = (roleFilter: 'student' | 'trainer') => {
    const list = roleFilter === 'student' ? students : trainers;
    let csv = "Name,Email,Phone,College,Department,Status,Created At\n";
    list.forEach(p => {
      csv += `"${p.full_name}","${p.email}","${p.phone_number || ''}","${p.college_name || ''}","${p.department || ''}","${p.status}","${p.created_at || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${roleFilter}s-directory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAuditLogsCSV = () => {
    let csv = "Action,Details,User,Timestamp\n";
    auditLogs.forEach(l => {
      const actor = profiles.find(p => p.id === l.user_id)?.full_name || 'System';
      csv += `"${l.action}","${l.details}","${actor}","${l.created_at}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-trail.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  // Enroll Student Manual
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const exists = enrollments.some(
        enroll => enroll.student_id === selectedStudent && enroll.workshop_id === selectedEnrollWk
      );

      if (exists) {
        setErrorMessage("Student is already enrolled in this workshop.");
        setIsLoading(false);
        return;
      }

      await enrollStudent(selectedStudent, selectedEnrollWk);
      await createAuditLog(user?.id || null, 'ENROLL_STUDENT', `Enrolled student ${selectedStudent} in workshop ${selectedEnrollWk}`);

      setSuccessMessage("Student enrolled successfully!");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to enroll student: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk CSV Upload
  const handleCsvBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    setIsLoading(true);
    setCsvUploadStatus("");

    try {
      const lines = csvContent.trim().split("\n");
      let addedCount = 0;
      let enrolledCount = 0;

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 2) continue;

        const fullName = cols[0];
        const email = cols[1];
        const phone = cols[2] || "";
        const college = cols[3] || "";
        const dept = cols[4] || "";
        const year = cols[5] || "3rd Year";

        if (!fullName || !email) continue;

        // 1. Check profile existence
        let profile = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
        if (!profile) {
          try {
            profile = await registerUser({
              fullName,
              email,
              role: 'student',
              phoneNumber: phone,
              collegeName: college,
              department: dept,
              academicYear: year,
              password: 'Password123!'
            });
            addedCount++;
          } catch (err: any) {
            console.warn("Failed to register bulk student profile:", err?.message || String(err));
            continue;
          }
        }

        // 2. Enroll in workshop
        if (selectedEnrollWk && profile) {
          const alreadyEnrolled = enrollments.some(
            enroll => enroll.student_id === profile!.id && enroll.workshop_id === selectedEnrollWk
          );

          if (!alreadyEnrolled) {
            await enrollStudent(profile.id, selectedEnrollWk);
            enrolledCount++;
          }
        }
      }

      await createAuditLog(user?.id || null, 'BULK_CSV_UPLOAD', `Uploaded roster: ${addedCount} new profiles, ${enrolledCount} enrollments`);

      setCsvUploadStatus(`Import successful! Registered ${addedCount} new students and created ${enrolledCount} enrollments.`);
      setCsvContent("");
      await refreshData();
    } catch (err: any) {
      setCsvUploadStatus(`Error parsing CSV: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Configure rules
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await saveWorkshopRules({
        workshop_id: selectedRulesWk,
        min_attendance_pct: Number(minAttendance),
        min_assessment_score: Number(minAssessment),
        mandatory_activities_completed: mandatoryActivities,
        final_project_mandatory: finalProjectMandatory
      });

      await createAuditLog(user?.id || null, 'CONFIGURE_RULES', `Updated rules for workshop ${selectedRulesWk}`);

      setSuccessMessage("Certification rules updated successfully!");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to update rules: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Issue Certificate Manual Action
  const handleIssueCertificate = async (studentId: string, workshopId: string) => {
    setIsLoading(true);
    try {
      const prog = studentProgressMap[`${studentId}-${workshopId}`];
      if (!prog || !prog.isEligibleForCertificate) {
        setErrorMessage("Student is not eligible for certificate issuance. Verify rules unfulfilled.");
        setTimeout(() => setErrorMessage(""), 4000);
        setIsLoading(false);
        return;
      }

      // Create new certificate number
      const w = workshops.find(wk => wk.id === workshopId);
      const acronym = w ? w.name.split(' ').map(wk => wk[0]).join('').toUpperCase().slice(0, 4) : 'WKSP';
      const randHex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
      const certNumber = `CERT-${acronym}-${randHex}`;
      const qrCode = `VERIFY_${certNumber}`;

      await issueCertificateDb(studentId, workshopId, certNumber, qrCode);

      // Log audit trail
      await createAuditLog(
        user?.id || null, 
        'ISSUE_CERTIFICATE', 
        `Issued certificate ${certNumber} to student ID ${studentId} for workshop ${workshopId}`
      );

      // Notify student
      await createNotification(
        studentId, 
        `Congratulations! Your certificate for ${w?.name || 'the workshop'} has been issued.`
      );

      setSuccessMessage(`Certificate successfully issued to student! Reference: ${certNumber}`);
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err: any) {
      setErrorMessage("Failed to issue certificate: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export Workshop Report CSV
  const handleExportCSVReport = async (workshopId: string) => {
    const w = workshops.find(wk => wk.id === workshopId);
    if (!w) return;

    setIsLoading(true);
    try {
      const wEnrolls = enrollments.filter(e => e.workshop_id === workshopId);
      
      const progressList = await Promise.all(
        wEnrolls.map(e => getStudentProgress(e.student_id, workshopId))
      );

      let csv = "Student Name,Email,College Name,Attendance %,Labs Completed,Labs Pending,Assessment Avg,Eligible,Certificate Status\n";
      progressList.forEach(p => {
        csv += `"${p.studentName}","${p.email}","${p.collegeName || ''}",${p.attendancePct},${p.completedActivities},${p.pendingActivities},${p.averageScore},${p.isEligibleForCertificate ? 'YES' : 'NO'},"${p.certificateStatus}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Report-${w.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setErrorMessage("Failed to export report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] text-indigo-600">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <span className="text-sm font-semibold">Synchronizing admin dashboard...</span>
        </div>
      </div>
    );
  }

  // Renders analytics summary data for charts
  const analyticsData = workshops.map(w => {
    const wEnrolls = enrollments.filter(e => e.workshop_id === w.id);
    const enrollsCount = wEnrolls.length;
    const progressList = wEnrolls.map(e => studentProgressMap[`${e.student_id}-${w.id}`]).filter(Boolean);
    
    const avgScore = progressList.length > 0 
      ? Math.round(progressList.reduce((acc, curr) => acc + curr.averageScore, 0) / progressList.length) 
      : 0;
      
    const completionRate = progressList.length > 0 
      ? Math.round((progressList.filter(p => p.certificateStatus === 'Issued' || p.isEligibleForCertificate).length / progressList.length) * 100)
      : 0;

    return {
      name: w.name.split(' ').slice(0, 2).join(' ') + '...',
      students: enrollsCount,
      avgScore,
      completionRate
    };
  });

  return (
    <div className="flex bg-[#f5f7fb] min-h-screen text-slate-800 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-slate-800 tracking-wide glow-text-primary">
              Admin Command Console
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure certificate validation limits, enrollment databases, and global course settings.
            </p>
          </div>
        </div>

        {/* Auth Diagnostics */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl text-xs font-mono space-y-2 mb-4 shadow-sm">
          <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Session Diagnostics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div><strong>sessionStorage Profile:</strong> ID={user?.id || 'none'}, Email={user?.email || 'none'}, Role={user?.role || 'none'}</div>
            <div><strong>Supabase Auth Session:</strong> {authChecked ? (authSessionUser ? `ID=${authSessionUser.id}, Email=${authSessionUser.email}` : "NO ACTIVE SESSION (ANONYMOUS)") : "Loading..."}</div>
          </div>
          {!authSessionUser && (
            <div className="text-rose-600 font-semibold mt-1">
              ⚠️ Warning: You have no active Supabase Auth session! Please log out and log back in to refresh your login token.
            </div>
          )}
        </div>

        {/* Global Feedback alerts */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-750 rounded-xl text-xs font-semibold animate-fade-in-up">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-750 rounded-xl text-xs font-semibold animate-fade-in-up">
            {errorMessage}
          </div>
        )}

        {/* APPROVALS VIEW */}
        {currentTab === "approvals" && (
          <div className="space-y-6 font-sans">
            {/* Search & Filter Panel */}
            <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                    <ShieldAlert className="h-5 w-5 text-indigo-500" />
                    <span>Pending Registration Requests</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Approve or reject newly registered trainer and student accounts. Approved users can log in instantly.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={approvalSearch}
                      onChange={(e) => setApprovalSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs glass-input rounded-xl focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                    />
                  </div>
                  
                  <select
                    value={approvalFilterRole}
                    onChange={(e) => setApprovalFilterRole(e.target.value as any)}
                    className="w-full sm:w-40 bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="trainer">Trainers</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Pending Requests Table */}
            <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-3 px-4">User Details</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Contact Info</th>
                      <th className="py-3 px-4">Registered At</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {profiles
                      .filter(p => p.status === 'Pending')
                      .filter(p => {
                        const search = approvalSearch.toLowerCase().trim();
                        if (!search) return true;
                        return p.full_name.toLowerCase().includes(search) || p.email.toLowerCase().includes(search);
                      })
                      .filter(p => {
                        if (approvalFilterRole === 'all') return true;
                        return p.role === approvalFilterRole;
                      })
                      .map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {p.full_name ? p.full_name[0] : 'U'}
                              </div>
                              <div>
                                <div className="text-sm font-semibold">{p.full_name}</div>
                                <div className="text-xs text-slate-400 mt-0.5 font-mono">{p.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.role === 'student' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-violet-50 text-violet-600 border border-violet-100'
                            }`}>
                              {p.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-[10px] text-slate-500">{p.phone_number || 'No phone'}</div>
                            {(p.role === 'student' || p.role === 'trainer') && p.college_name && (
                              <div className="text-slate-400 text-[10px] mt-0.5 truncate max-w-xs">{p.college_name} • {p.department}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleApproveUser(p.id)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/10 transition-all cursor-pointer border-0"
                              >
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectUser(p.id)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/10 transition-all cursor-pointer border-0"
                              >
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {profiles.filter(p => p.status === 'Pending').length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <p className="text-sm font-bold text-slate-800 mb-1">No Pending Registrations</p>
                          <p className="text-xs text-slate-500">All registered accounts are fully processed.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Workshops</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{workshops.length}</p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">{workshops.filter(w=>w.status==='active').length} active courses</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <BookOpen className="h-6 w-6" />
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Trainer Staff</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{trainers.length}</p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Assigned faculty logs</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Total Roster Students</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{students.length}</p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">{enrollments.length} total enrollments</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Certificates Issued</h4>
                  <p className="text-3xl font-extrabold text-[#b09356] mt-2">
                    {certificates.filter(c => c.status === 'Issued').length}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Verification registry logs</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Award className="h-6 w-6" />
                </div>
              </Card>
            </div>

            {/* Recharts Analytics Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
              
              <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit mb-4">Class Performance & Enrolled Roster</h3>
                <div className="h-72 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="students" name="Enrolled Students" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgScore" name="Avg Assessment Score %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit mb-4">Verification Completion Rate</h3>
                <div className="h-72 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis type="number" stroke="#64748b" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={60} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b' }} />
                      <Bar dataKey="completionRate" name="Completion Rate %" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Audit Logs Block */}
            <Card className="p-6 font-sans bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 font-outfit">System Activity Audit Trail</h4>
                <button
                  onClick={handleExportAuditLogsCSV}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-all cursor-pointer text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Logs CSV</span>
                </button>
              </div>
              <div className="overflow-y-auto max-h-40 divide-y divide-slate-100 pr-2">
                {auditLogs.map(log => {
                  const actor = profiles.find(p => p.id === log.user_id);
                  return (
                    <div key={log.id} className="py-2.5 flex justify-between items-start text-[11px]">
                      <div>
                        <span className="text-indigo-600 font-bold font-mono">[{log.action}]</span>
                        <span className="text-slate-650 ml-2">{log.details}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-slate-500 block">{actor?.full_name || 'System'}</span>
                        <span className="text-slate-400 block font-mono text-[9px] mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* STUDENTS & CSV VIEW */}
        {currentTab === "students" && (
          <div className="space-y-6 font-sans">
            
            {/* Roster Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Enrollment form */}
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span>Manual Course Enrollment</span>
                </h3>

                <form onSubmit={handleEnrollStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Student</label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {students.filter(s => s.status === 'Approved').map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Workshop Target</label>
                    <select
                      value={selectedEnrollWk}
                      onChange={(e) => setSelectedEnrollWk(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {workshops.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    <span>Enroll Student</span>
                  </button>
                </form>
              </Card>

              {/* CSV Upload form */}
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-indigo-500" />
                    <span>CSV Roster Importer</span>
                  </h3>
                  <button
                    onClick={() => {
                      const csvHeader = "Full Name,Email,Phone Number,College Name,Department,Academic Year\n\"Grace Hopper\",\"grace@example.com\",\"+1-999-888-7777\",\"MIT\",\"Computing\",\"4th Year\"\n\"Ada Lovelace\",\"ada@example.com\",\"+1-111-222-3333\",\"Oxford\",\"Mathematics\",\"2nd Year\"";
                      const blob = new Blob([csvHeader], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "Roster_Template.csv";
                      link.click();
                    }}
                    className="text-[10px] text-indigo-500 hover:underline font-mono bg-transparent border-0 cursor-pointer"
                  >
                    Download Template CSV
                  </button>
                </div>

                <form onSubmit={handleCsvBulkUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Workshop to Auto-Enroll (Optional)</label>
                    <select
                      value={selectedEnrollWk}
                      onChange={(e) => setSelectedEnrollWk(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Register Profile Only (No Enrollment)</option>
                      {workshops.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Paste CSV Contents (Comma Separated)</label>
                    <textarea
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      placeholder='Format: "Full Name","Email","Phone","College","Dept","Academic Year"'
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 font-mono text-[10px] focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !csvContent}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-xs cursor-pointer border-0"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span>Import Student CSV</span>
                  </button>
                </form>

                {csvUploadStatus && (
                  <p className="text-[10px] text-slate-700 font-mono mt-3 leading-normal bg-slate-100 border border-slate-200 p-2.5 rounded-lg">
                    {csvUploadStatus}
                  </p>
                )}
              </Card>

            </div>            {/* Students roster details directory */}
            <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 font-outfit">Global Roster Directory</h4>
                <button
                  onClick={() => handleExportAllProfilesCSV('student')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-650 text-indigo-600 hover:text-white border border-indigo-200 transition-all cursor-pointer text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Students CSV</span>
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">College & Department</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Password</th>
                      <th className="py-2.5 px-3 text-center">Enrollments</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {students.map(s => {
                      const sEnrollCount = enrollments.filter(e => e.student_id === s.id).length;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-850">{s.full_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{s.email}</td>
                          <td className="py-2.5 px-3 text-slate-655">
                            {s.college_name ? `${s.college_name} • ${s.department || ''}` : "N/A"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              s.status === 'Approved' ? 'bg-emerald-50 text-emerald-605 border border-emerald-200' :
                              s.status === 'Pending' ? 'bg-amber-50 text-amber-605 border border-amber-200' :
                              'bg-rose-550/10 text-rose-600 border border-rose-200'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="flex items-center justify-center space-x-1.5">
                              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] select-all font-semibold shadow-sm">
                                {s.password || "Password123!"}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedUserForPassword(s);
                                  setNewPasswordVal(s.password || "Password123!");
                                  setIsPasswordModalOpen(true);
                                }}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-indigo-650 border border-slate-200 transition-colors cursor-pointer"
                                title="Change Password"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{sEnrollCount}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {sEnrollCount > 0 && workshops.length > 0 && (
                                <button
                                  onClick={async () => {
                                    const studentEnrollments = enrollments.filter(e => e.student_id === s.id);
                                    if (studentEnrollments.length > 0) {
                                      const activeWkId = studentEnrollments[0].workshop_id;
                                      const wk = workshops.find(w => w.id === activeWkId);
                                      const prog = studentProgressMap[`${s.id}-${activeWkId}`] || await getStudentProgress(s.id, activeWkId);
                                      if (wk && prog) {
                                        if (prog.pendingActivities > 1) {
                                          await handleSendNotification('pending_activities_alert', prog, wk);
                                        } else if (prog.attendancePct < 80) {
                                          await handleSendNotification('attendance_reminder', prog, wk);
                                        } else {
                                          await handleSendNotification('performance_summary', prog, wk);
                                        }
                                      }
                                    }
                                  }}
                                  className="p-1 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-200 transition-colors cursor-pointer"
                                  title="Dispatch Alert / Report"
                                >
                                  <Send className="h-3 w-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(s.id)}
                                className="p-1 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                title="Delete Account"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

        {/* TRAINERS VIEW */}
        {currentTab === "trainers" && (
          <div className="space-y-6 font-sans">
            {/* Trainers roster details directory */}
            <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 font-outfit">Global Trainer Directory</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage and review institutional trainers assigned to academic boot camps and workshops.
                  </p>
                </div>
                <button
                  onClick={() => handleExportAllProfilesCSV('trainer')}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-650 text-indigo-600 hover:text-white border border-indigo-200 transition-all cursor-pointer text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export Trainers CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Trainer Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">College & Department</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Password</th>
                      <th className="py-2.5 px-3 text-center">Assigned Workshops</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {trainers.map(t => {
                      const tWorkshopCount = workshops.filter(w => w.trainer_id === t.id).length;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-855">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {t.full_name ? t.full_name[0] : 'T'}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-850">{t.full_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.phone_number || 'No phone'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{t.email}</td>
                          <td className="py-2.5 px-3 text-slate-650 font-sans">
                            {t.college_name ? `${t.college_name} • ${t.department || ''}` : "N/A"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              t.status === 'Approved' ? 'bg-emerald-50 text-emerald-605 border border-emerald-200' :
                              t.status === 'Pending' ? 'bg-amber-50 text-amber-605 border border-amber-200' :
                              'bg-rose-550/10 text-rose-600 border border-rose-200'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="flex items-center justify-center space-x-1.5">
                              <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px] select-all font-semibold shadow-sm">
                                {t.password || "Password123!"}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedUserForPassword(t);
                                  setNewPasswordVal(t.password || "Password123!");
                                  setIsPasswordModalOpen(true);
                                }}
                                className="p-1 rounded bg-slate-50 hover:bg-slate-100 text-indigo-655 border border-slate-200 transition-colors cursor-pointer"
                                title="Change Password"
                              >
                                <Settings className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{tWorkshopCount}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(t.id)}
                              className="p-1 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {trainers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <p className="text-sm font-bold text-slate-800 mb-1">No Trainers Found</p>
                          <p className="text-xs text-slate-500">There are no trainer accounts currently registered.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* REPORTS VIEW */}
        {currentTab === "reports" && (
          <Card className="p-6 font-sans bg-white border border-slate-100 shadow-sm rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
              <Plus className="h-5 w-5 text-indigo-500" />
              <span>Workshop Performance Reports</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                    <th className="py-3 px-4">Workshop</th>
                    <th className="py-3 px-4 text-center">Total Enrolled</th>
                    <th className="py-3 px-4 text-center">Completion Rate</th>
                    <th className="py-3 px-4 text-center">Class Grade Average</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {workshops.map(w => {
                    const wEnrolls = enrollments.filter(e => e.workshop_id === w.id);
                    const enrollsCount = wEnrolls.length;
                    const progressList = wEnrolls.map(e => studentProgressMap[`${e.student_id}-${w.id}`]).filter(Boolean);
                    
                    const avgScore = progressList.length > 0 
                      ? Math.round(progressList.reduce((acc, curr) => acc + curr.averageScore, 0) / progressList.length) 
                      : 0;
                      
                    const completionRate = progressList.length > 0 
                      ? Math.round((progressList.filter(p => p.certificateStatus === 'Issued' || p.isEligibleForCertificate).length / progressList.length) * 100)
                      : 0;

                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-850">{w.name}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">{enrollsCount}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-mono font-semibold ${completionRate >= 75 ? "text-emerald-600" : "text-amber-600"}`}>
                            {completionRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#b09356]">{avgScore}%</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewReport(w.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 transition-all cursor-pointer border-0"
                              title="Print PDF Executive Report"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View Report</span>
                            </button>
                            <button
                              onClick={() => handleExportCSVReport(w.id)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 transition-all cursor-pointer border-0"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Export CSV</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* CERTIFICATES ISSUANCE VIEW */}
        {currentTab === "certificates" && (
          <Card className="p-6 font-sans bg-white border border-slate-100 shadow-sm rounded-2xl">
            <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-indigo-500" />
              <span>Verifiable Certification Registry</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Workshop</th>
                    <th className="py-3 px-4 text-center">Attendance</th>
                    <th className="py-3 px-4 text-center">Assessment Avg</th>
                    <th className="py-3 px-4 text-center">Eligibility</th>
                    <th className="py-3 px-4 text-center">Reference ID</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {enrollments.map(enroll => {
                    const student = profiles.find(p => p.id === enroll.student_id);
                    const workshop = workshops.find(w => w.id === enroll.workshop_id);
                    
                    if (!student || !workshop) return null;

                    const prog = studentProgressMap[`${student.id}-${workshop.id}`];
                    if (!prog) {
                      return (
                        <tr key={enroll.id}>
                          <td colSpan={7} className="py-2 text-center text-slate-400">Loading progress...</td>
                        </tr>
                      );
                    }
                    const isIssued = prog.certificateStatus === 'Issued';

                    return (
                      <tr key={enroll.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-850">
                          <div>{student.full_name}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">{student.email}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[150px] truncate" title={workshop.name}>{workshop.name}</td>
                        <td className="py-3 px-4 text-center font-mono">{prog.attendancePct}%</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#b09356]">{prog.averageScore}%</td>
                        <td className="py-3 px-4 text-center">
                          {prog.isEligibleForCertificate ? (
                            <span className="text-emerald-600 font-semibold">Eligible</span>
                          ) : (
                            <span className="text-slate-400">Ineligible</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[9px] text-slate-550">
                          {isIssued 
                            ? certificates.find(c => c.student_id === student.id && c.workshop_id === workshop.id)?.certificate_number
                            : "-"
                          }
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isIssued ? (
                            <span className="text-[10px] text-emerald-600 font-semibold mr-3 font-outfit uppercase">Issued ✓</span>
                          ) : (
                            <button
                              onClick={() => handleIssueCertificate(student.id, workshop.id)}
                              disabled={!prog.isEligibleForCertificate}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] transition-all cursor-pointer border-0 ${
                                prog.isEligibleForCertificate
                                  ? "bg-emerald-650 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10"
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              Issue Cert
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* SETTINGS (RULES SETUP) VIEW */}
        {currentTab === "settings" && (
          <div className="space-y-6 font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Rules editor form */}
              <Card className="lg:col-span-1 p-6 h-fit bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                  <Settings className="h-5 w-5 text-indigo-500" />
                  <span>Configure Rules</span>
                </h3>

                <form onSubmit={handleSaveRules} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Workshop</label>
                    <select
                      value={selectedRulesWk}
                      onChange={(e) => setSelectedRulesWk(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {workshops.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Min Attendance Rate: <span className="text-slate-800 font-bold font-mono">{minAttendance}%</span></label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minAttendance}
                      onChange={(e) => setMinAttendance(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Min Average Assessment: <span className="text-slate-800 font-bold font-mono">{minAssessment}%</span></label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minAssessment}
                      onChange={(e) => setMinAssessment(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Mandatory Activities toggle */}
                  <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                    <div>
                      <span className="block text-xs font-medium text-slate-800">Mandatory Lab Activities</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Students must complete all assigned activities</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMandatoryActivities(!mandatoryActivities)}
                      className="text-indigo-500 focus:outline-none bg-transparent border-0 cursor-pointer"
                    >
                      {mandatoryActivities ? (
                        <ToggleRight className="h-9 w-9 text-indigo-650" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {/* Final Project toggle */}
                  <div className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="block text-xs font-medium text-slate-800">Final Project Mandatory</span>
                      <span className="block text-[9px] text-slate-400 mt-0.5">Final Project must be completed and passed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFinalProjectMandatory(!finalProjectMandatory)}
                      className="text-indigo-500 focus:outline-none bg-transparent border-0 cursor-pointer"
                    >
                      {finalProjectMandatory ? (
                        <ToggleRight className="h-9 w-9 text-indigo-655" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Configuration Rules</span>
                  </button>
                </form>
              </Card>

              {/* Current configurations list */}
              <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h4 className="font-bold text-slate-800 font-outfit mb-4">Workshop Certification Settings</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Workshop</th>
                        <th className="py-2.5 px-3 text-center">Min Attendance</th>
                        <th className="py-2.5 px-3 text-center">Min Grade</th>
                        <th className="py-2.5 px-3 text-center">Labs Required</th>
                        <th className="py-2.5 px-3 text-center">Final Project Required</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {workshopRules.map(r => {
                        const workshopName = workshops.find(w => w.id === r.workshop_id)?.name || "Unknown";
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-855">{workshopName}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{r.min_attendance_pct}%</td>
                            <td className="py-2.5 px-3 text-center font-mono">{r.min_assessment_score}%</td>
                            <td className="py-2.5 px-3 text-center">
                              {r.mandatory_activities_completed ? (
                                <span className="text-indigo-600 font-semibold">Yes</span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {r.final_project_mandatory ? (
                                <span className="text-indigo-600 font-semibold">Yes</span>
                              ) : (
                                <span className="text-slate-400">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Integrations Card */}
              <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-4">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  <span>AI & Messaging Credentials Configuration</span>
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Select messaging and AI suggestions providers. Set up credentials to fetch updated insights and send messages.
                </p>

                <form onSubmit={handleSaveIntegrations} className="space-y-6">
                  {/* AI Provider configuration */}
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">AI Suggestions Engine</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">AI Provider</label>
                        <select
                          value={aiProvider}
                          onChange={(e) => setAiProvider(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                        >
                          <option value="none">None (Local Heuristics Fallback)</option>
                          <option value="openai">OpenAI (GPT-4o-mini)</option>
                          <option value="gemini">Google Gemini (Gemini 2.5 Flash)</option>
                        </select>
                      </div>
                      
                      {aiProvider === 'openai' && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">OpenAI API Key</label>
                          <input
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                      )}

                      {aiProvider === 'gemini' && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">Gemini API Key</label>
                          <input
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email provider configuration */}
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Email Notification API</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">Email Provider</label>
                        <select
                          value={emailProvider}
                          onChange={(e) => setEmailProvider(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                        >
                          <option value="none">None (Simulated Mail Sender)</option>
                          <option value="sendgrid">SendGrid Mail API</option>
                        </select>
                      </div>

                      {emailProvider === 'sendgrid' && (
                        <>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">SendGrid API Key</label>
                            <input
                              type="password"
                              value={sendgridKey}
                              onChange={(e) => setSendgridKey(e.target.value)}
                              placeholder="SG..."
                              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">Sender Email</label>
                            <input
                              type="email"
                              value={sendgridSender}
                              onChange={(e) => setSendgridSender(e.target.value)}
                              placeholder="sender@domain.com"
                              className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp provider configuration */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">WhatsApp Business API</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-450 mb-1">WhatsApp Provider</label>
                        <select
                          value={whatsappProvider}
                          onChange={(e) => setWhatsappProvider(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs focus:outline-none"
                        >
                          <option value="none">None (Simulated WhatsApp Alert)</option>
                          <option value="twilio">Twilio Business API</option>
                        </select>
                      </div>
                    </div>

                    {whatsappProvider === 'twilio' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-50 pt-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-455 mb-1">Twilio Account SID</label>
                          <input
                            type="text"
                            value={twilioSid}
                            onChange={(e) => setTwilioSid(e.target.value)}
                            placeholder="AC..."
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-455 mb-1">Twilio Auth Token</label>
                          <input
                            type="password"
                            value={twilioToken}
                            onChange={(e) => setTwilioToken(e.target.value)}
                            placeholder="Token String"
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-455 mb-1">Twilio Sender Number</label>
                          <input
                            type="text"
                            value={twilioFrom}
                            onChange={(e) => setTwilioFrom(e.target.value)}
                            placeholder="+14155252771"
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-455 mb-1">Test Recipient Phone</label>
                          <input
                            type="text"
                            value={twilioTestRecipient}
                            onChange={(e) => setTwilioTestRecipient(e.target.value)}
                            placeholder="+15551234567"
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Credentials</span>
                  </button>
                </form>
              </Card>

              {/* Database Maintenance Card */}
              <Card className="lg:col-span-1 p-6 h-fit bg-white border border-slate-100 shadow-sm rounded-2xl border-rose-100 bg-rose-50/10">
                <h3 className="text-lg font-bold text-rose-800 font-outfit flex items-center space-x-2 mb-4">
                  <Database className="h-5 w-5 text-rose-500" />
                  <span>Database Reset</span>
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Reset the environment to a blank state. Wiping the database deletes all learner profiles, workshops, sessions, grades, certificates, and logs. Administrators are preserved.
                </p>

                <button
                  onClick={handleResetDatabase}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-semibold rounded-xl transition-all cursor-pointer border-0 shadow-md shadow-rose-600/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Wipe All Student & Trainer Data</span>
                </button>
              </Card>

            </div>
          </div>
        )}

      </main>

      <Dialog isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Update Account Password</DialogTitle>
          <DialogDescription>
            Change the login password for <span className="font-semibold text-white">{selectedUserForPassword?.full_name}</span> ({selectedUserForPassword?.email}).
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-450 mb-1.5 uppercase tracking-wide">
              New Password
            </label>
            <input
              type="text"
              required
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              placeholder="e.g. SecurePassword123!"
              className="w-full px-3 py-2 text-sm rounded-xl text-white bg-[#11131e]/90 border border-white/10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newPasswordVal}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 transition-all cursor-pointer border-0"
            >
              {isLoading ? "Updating..." : "Save Password"}
            </button>
          </DialogFooter>
        </form>
      </Dialog>

      {isReportModalOpen && selectedReportWorkshop && (
        <Dialog 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)}
          className="max-w-4xl"
        >
          <DialogHeader>
            <DialogTitle>Workshop Performance Report</DialogTitle>
            <DialogDescription>
              Review student progress summaries, attendance rates, and AI performance insights.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[80vh] overflow-y-auto">
            <PrintableReport
              workshop={selectedReportWorkshop}
              trainer={selectedReportTrainer}
              progressList={selectedReportProgressList}
              aiInsights={selectedReportAiInsights}
              onClose={() => setIsReportModalOpen(false)}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
