"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, Calendar, Users, Award, BookOpen, BarChart3, Settings, 
  Download, Upload, Save, HelpCircle, GraduationCap, CheckCircle2, 
  XCircle, Loader2, PlayCircle, ToggleLeft, ToggleRight
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { issueCertificate } from "@/lib/services/certificates";
import { Profile, Workshop, Session, Enrollment, WorkshopRules, Certificate, WorkshopStatus, UserRole } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { WorkshopStatusBadge } from "@/components/ui/badge";

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

  // Add Workshop Form States
  const [newWkName, setNewWkName] = React.useState("");
  const [newWkDesc, setNewWkDesc] = React.useState("");
  const [newWkStart, setNewWkStart] = React.useState("2026-06-20");
  const [newWkEnd, setNewWkEnd] = React.useState("2026-06-30");
  const [newWkTrainer, setNewWkTrainer] = React.useState("");
  const [newWkStatus, setNewWkStatus] = React.useState<WorkshopStatus>("draft");

  // Add Session Form States
  const [newSessWorkshop, setNewSessWorkshop] = React.useState("");
  const [newSessName, setNewSessName] = React.useState("");
  const [newSessDate, setNewSessDate] = React.useState("2026-06-20");
  const [newSessDur, setNewSessDur] = React.useState(120);
  const [newSessDesc, setNewSessDesc] = React.useState("");

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

  // Load admin session
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "admin") {
      router.push("/login");
    } else {
      setUser(session);
      refreshData();
    }
  }, [router]);

  // Synchronize rules details whenever active rules workshop changes
  React.useEffect(() => {
    if (!selectedRulesWk) return;
    const rule = mockDb.workshopRules.find(r => r.workshop_id === selectedRulesWk);
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
  }, [selectedRulesWk]);

  const refreshData = () => {
    setWorkshops(mockDb.workshops);
    setSessions(mockDb.sessions);
    
    const allProfiles = mockDb.profiles;
    setStudents(allProfiles.filter(p => p.role === 'student'));
    
    const allTrainers = allProfiles.filter(p => p.role === 'trainer');
    setTrainers(allTrainers);
    if (allTrainers.length > 0) {
      setNewWkTrainer(allTrainers[0].id);
    }

    setCertificates(mockDb.certificates);

    if (mockDb.workshops.length > 0) {
      setNewSessWorkshop(mockDb.workshops[0].id);
      setSelectedEnrollWk(mockDb.workshops[0].id);
      setSelectedRulesWk(mockDb.workshops[0].id);
    }
    
    const allStudents = allProfiles.filter(p => p.role === 'student');
    if (allStudents.length > 0) {
      setSelectedStudent(allStudents[0].id);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  // Add Workshop
  const handleAddWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const wks = mockDb.workshops;
      const newWk: Workshop = {
        id: `w-${Date.now()}`,
        name: newWkName,
        description: newWkDesc,
        start_date: newWkStart,
        end_date: newWkEnd,
        status: newWkStatus,
        trainer_id: newWkTrainer || null
      };
      
      wks.push(newWk);
      mockDb.workshops = wks;

      // Add default certificate rules for this workshop
      const rules = mockDb.workshopRules;
      rules.push({
        id: `r-${Date.now()}`,
        workshop_id: newWk.id,
        min_attendance_pct: 80,
        min_assessment_score: 70,
        mandatory_activities_completed: true,
        final_project_mandatory: false
      });
      mockDb.workshopRules = rules;

      mockDb.logAudit(user?.id || null, 'CREATE_WORKSHOP', `Created workshop: ${newWk.name}`);

      setIsLoading(false);
      setSuccessMessage("Workshop created successfully!");
      setNewWkName("");
      setNewWkDesc("");
      refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Add Session
  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const sess = mockDb.sessions;
      const newSess: Session = {
        id: `s-${Date.now()}`,
        workshop_id: newSessWorkshop,
        name: newSessName,
        session_date: newSessDate,
        duration_mins: Number(newSessDur),
        description: newSessDesc
      };

      sess.push(newSess);
      mockDb.sessions = sess;
      
      mockDb.logAudit(user?.id || null, 'CREATE_SESSION', `Created session: ${newSess.name}`);

      setIsLoading(false);
      setSuccessMessage("Session scheduled successfully!");
      setNewSessName("");
      setNewSessDesc("");
      refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Enroll Student Manual
  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    setTimeout(() => {
      const enrolls = mockDb.enrollments;
      const exists = enrolls.some(
        e => e.student_id === selectedStudent && e.workshop_id === selectedEnrollWk
      );

      if (exists) {
        setErrorMessage("Student is already enrolled in this workshop.");
        setIsLoading(false);
        return;
      }

      enrolls.push({
        id: `e-${Date.now()}`,
        student_id: selectedStudent,
        workshop_id: selectedEnrollWk,
        enrollment_date: new Date().toISOString()
      });
      mockDb.enrollments = enrolls;

      mockDb.logAudit(user?.id || null, 'ENROLL_STUDENT', `Enrolled student ${selectedStudent} in workshop ${selectedEnrollWk}`);

      setIsLoading(false);
      setSuccessMessage("Student enrolled successfully!");
      refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Bulk CSV Upload
  const handleCsvBulkUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;
    setIsLoading(true);
    setCsvUploadStatus("");

    setTimeout(() => {
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
          let profile = mockDb.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
          if (!profile) {
            profile = {
              id: `u-${Date.now()}-${Math.random()}`,
              full_name: fullName,
              email: email,
              role: 'student',
              phone_number: phone,
              college_name: college,
              department: dept,
              academic_year: year,
              created_at: new Date().toISOString()
            };
            const profilesList = mockDb.profiles;
            profilesList.push(profile);
            mockDb.profiles = profilesList;
            addedCount++;
          }

          // 2. Enroll in active rules workshop if selected
          if (selectedEnrollWk) {
            const enrollList = mockDb.enrollments;
            const alreadyEnrolled = enrollList.some(
              e => e.student_id === profile!.id && e.workshop_id === selectedEnrollWk
            );

            if (!alreadyEnrolled) {
              enrollList.push({
                id: `e-${Date.now()}-${Math.random()}`,
                student_id: profile.id,
                workshop_id: selectedEnrollWk,
                enrollment_date: new Date().toISOString()
              });
              mockDb.enrollments = enrollList;
              enrolledCount++;
            }
          }
        }

        mockDb.logAudit(user?.id || null, 'BULK_CSV_UPLOAD', `Uploaded roster: ${addedCount} new profiles, ${enrolledCount} enrollments`);

        setCsvUploadStatus(`Import successful! Registered ${addedCount} new students and created ${enrolledCount} enrollments.`);
        setCsvContent("");
        refreshData();
      } catch (err: any) {
        setCsvUploadStatus(`Error parsing CSV: ${err.message}`);
      }
      setIsLoading(false);
    }, 1000);
  };

  // Configure rules
  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const list = mockDb.workshopRules;
      const idx = list.findIndex(r => r.workshop_id === selectedRulesWk);

      if (idx > -1) {
        list[idx] = {
          ...list[idx],
          min_attendance_pct: Number(minAttendance),
          min_assessment_score: Number(minAssessment),
          mandatory_activities_completed: mandatoryActivities,
          final_project_mandatory: finalProjectMandatory
        };
      } else {
        list.push({
          id: `r-${Date.now()}`,
          workshop_id: selectedRulesWk,
          min_attendance_pct: Number(minAttendance),
          min_assessment_score: Number(minAssessment),
          mandatory_activities_completed: mandatoryActivities,
          final_project_mandatory: finalProjectMandatory
        });
      }

      mockDb.workshopRules = list;
      
      mockDb.logAudit(user?.id || null, 'CONFIGURE_RULES', `Updated rules for workshop ${selectedRulesWk}`);

      setIsLoading(false);
      setSuccessMessage("Certification rules updated successfully!");
      refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Issue Certificate Manual Action
  const handleIssueCertificate = (studentId: string, workshopId: string) => {
    const cert = issueCertificate(studentId, workshopId);
    if (cert) {
      setSuccessMessage(`Certificate successfully issued to student! Reference: ${cert.certificate_number}`);
      refreshData();
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrorMessage("Student is not eligible for certificate issuance. Verify rules unfulfilled.");
      setTimeout(() => setErrorMessage(""), 4000);
    }
  };

  // Export Workshop Report CSV
  const handleExportCSVReport = (workshopId: string) => {
    const w = mockDb.workshops.find(wk => wk.id === workshopId);
    if (!w) return;

    const enrolls = mockDb.enrollments.filter(e => e.workshop_id === workshopId);
    const progressList = enrolls.map(e => mockDb.getStudentProgress(e.student_id, workshopId));

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
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0f] text-indigo-400">
        <div className="animate-pulse">Loading admin workspace...</div>
      </div>
    );
  }

  // Renders analytics summary data for charts
  const analyticsData = workshops.map(w => {
    const enrollsCount = mockDb.enrollments.filter(e => e.workshop_id === w.id).length;
    const progressList = mockDb.enrollments
      .filter(e => e.workshop_id === w.id)
      .map(e => mockDb.getStudentProgress(e.student_id, w.id));
    
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
    <div className="flex bg-[#090a0f] min-h-screen text-slate-100 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide glow-text-primary">
              Admin Command Console
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure certificate validation limits, enrollment databases, and global course settings.
            </p>
          </div>
        </div>

        {/* Global Feedback alerts */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-medium animate-fade-in-up">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs font-medium animate-fade-in-up">
            {errorMessage}
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Workshops</h4>
                <p className="text-3xl font-extrabold text-white mt-2">{workshops.length}</p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">{workshops.filter(w=>w.status==='active').length} active courses</div>
              </Card>

              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Trainer Staff</h4>
                <p className="text-3xl font-extrabold text-white mt-2">{trainers.length}</p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">Assigned faculty logs</div>
              </Card>

              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Total Roster Students</h4>
                <p className="text-3xl font-extrabold text-white mt-2">{students.length}</p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">{mockDb.enrollments.length} total enrollments</div>
              </Card>

              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Certificates Issued</h4>
                <p className="text-3xl font-extrabold text-[#c5a86a] mt-2">
                  {certificates.filter(c => c.status === 'Issued').length}
                </p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">Verification registry logs</div>
              </Card>
            </div>

            {/* Recharts Analytics Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
              
              <Card className="lg:col-span-2 p-6">
                <h3 className="text-lg font-bold text-white font-outfit mb-4">Class Performance & Enrolled Roster</h3>
                <div className="h-72 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#11131e', border: '1px solid rgba(255,255,255,0.08)' }} />
                      <Legend />
                      <Bar dataKey="students" name="Enrolled Students" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avgScore" name="Avg Assessment Score %" fill="#c5a86a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="lg:col-span-1 p-6">
                <h3 className="text-lg font-bold text-white font-outfit mb-4">Verification Completion Rate</h3>
                <div className="h-72 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={60} />
                      <Tooltip contentStyle={{ backgroundColor: '#11131e' }} />
                      <Bar dataKey="completionRate" name="Completion Rate %" fill="#ec4899" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Audit Logs Block */}
            <Card className="p-6 font-sans">
              <h4 className="font-bold text-white font-outfit mb-4">System Activity Audit Trail</h4>
              <div className="overflow-y-auto max-h-40 divide-y divide-white/5 pr-2">
                {mockDb.auditLogs.map(log => {
                  const actor = mockDb.profiles.find(p => p.id === log.user_id);
                  return (
                    <div key={log.id} className="py-2.5 flex justify-between items-start text-[11px]">
                      <div>
                        <span className="text-indigo-400 font-bold font-mono">[{log.action}]</span>
                        <span className="text-slate-300 ml-2">{log.details}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span className="text-slate-500 block">{actor?.full_name || 'System'}</span>
                        <span className="text-slate-600 block font-mono text-[9px] mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* WORKSHOPS VIEW */}
        {currentTab === "workshops" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Create Workshop Form */}
            <Card className="lg:col-span-1 p-6 h-fit">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Create Workshop</span>
              </h3>

              <form onSubmit={handleAddWorkshop} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Workshop Name</label>
                  <input
                    type="text"
                    required
                    value={newWkName}
                    onChange={(e) => setNewWkName(e.target.value)}
                    placeholder="e.g. IoT Development Foundations"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                  <textarea
                    required
                    value={newWkDesc}
                    onChange={(e) => setNewWkDesc(e.target.value)}
                    placeholder="Provide overview details..."
                    rows={3}
                    className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={newWkStart}
                      onChange={(e) => setNewWkStart(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={newWkEnd}
                      onChange={(e) => setNewWkEnd(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                    <select
                      value={newWkStatus}
                      onChange={(e) => setNewWkStatus(e.target.value as WorkshopStatus)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2 text-xs focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Assign Trainer</label>
                    <select
                      value={newWkTrainer}
                      onChange={(e) => setNewWkTrainer(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2 text-xs focus:outline-none"
                    >
                      <option value="">No Assignment</option>
                      {trainers.map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Workshop</span>
                </button>
              </form>
            </Card>

            {/* Workshops list table */}
            <Card className="lg:col-span-2 p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Workshop Catalog</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Workshop Name</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3">Trainer Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {workshops.map(w => {
                      const trainerName = trainers.find(t => t.id === w.trainer_id)?.full_name || "Unassigned";
                      return (
                        <tr key={w.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            <div>{w.name}</div>
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 max-w-xs truncate" title={w.description}>
                              {w.description}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <WorkshopStatusBadge status={w.status} />
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                            {w.start_date} to {w.end_date}
                          </td>
                          <td className="py-3 px-3 text-slate-300">{trainerName}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* SESSIONS VIEW */}
        {currentTab === "sessions" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Create Session Form */}
            <Card className="lg:col-span-1 p-6 h-fit">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Schedule Session</span>
              </h3>

              <form onSubmit={handleAddSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select Workshop</label>
                  <select
                    value={newSessWorkshop}
                    onChange={(e) => setNewSessWorkshop(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                  >
                    {workshops.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Session Name</label>
                  <input
                    type="text"
                    required
                    value={newSessName}
                    onChange={(e) => setNewSessName(e.target.value)}
                    placeholder="e.g. Introduction to MQTT Protocols"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Session Date</label>
                    <input
                      type="date"
                      required
                      value={newSessDate}
                      onChange={(e) => setNewSessDate(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      required
                      value={newSessDur}
                      onChange={(e) => setNewSessDur(Number(e.target.value))}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Topic Outline Details</label>
                  <textarea
                    value={newSessDesc}
                    onChange={(e) => setNewSessDesc(e.target.value)}
                    placeholder="Summary of code topics, libraries covered..."
                    rows={2}
                    className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Schedule Session</span>
                </button>
              </form>
            </Card>

            {/* Sessions Ledger */}
            <Card className="lg:col-span-2 p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Scheduled Session Matrix</h4>
              
              <div className="overflow-y-auto max-h-[450px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider sticky top-0 bg-[#11131e] z-10">
                      <th className="py-2 px-3">Session Topic</th>
                      <th className="py-2 px-3">Workshop Name</th>
                      <th className="py-2 px-3 text-center">Date</th>
                      <th className="py-2 px-3 text-center">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {sessions.map(s => {
                      const workshopName = workshops.find(w => w.id === s.workshop_id)?.name || "Unknown";
                      return (
                        <tr key={s.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-white">{s.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 italic">{s.description}</div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-400" title={workshopName}>{workshopName}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-[10px]">{s.session_date}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{s.duration_mins} mins</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
              <Card className="p-6">
                <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                  <GraduationCap className="h-5 w-5 text-indigo-400" />
                  <span>Manual Course Enrollment</span>
                </h3>

                <form onSubmit={handleEnrollStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Student</label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Workshop Target</label>
                    <select
                      value={selectedEnrollWk}
                      onChange={(e) => setSelectedEnrollWk(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {workshops.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                  >
                    <span>Enroll Student</span>
                  </button>
                </form>
              </Card>

              {/* CSV Upload form */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-indigo-400" />
                    <span>CSV Roster Roster Importer</span>
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
                    className="text-[10px] text-indigo-400 hover:underline font-mono"
                  >
                    Download Template CSV
                  </button>
                </div>

                <form onSubmit={handleCsvBulkUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Workshop to Auto-Enroll (Optional)</label>
                    <select
                      value={selectedEnrollWk}
                      onChange={(e) => setSelectedEnrollWk(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs focus:outline-none"
                    >
                      <option value="">Register Profile Only (No Enrollment)</option>
                      {workshops.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Paste CSV Contents (Comma Separated)</label>
                    <textarea
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      placeholder='Format: "Full Name","Email","Phone","College","Dept","Academic Year"'
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 font-mono text-[10px] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !csvContent}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-xs"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span>Import Student CSV</span>
                  </button>
                </form>

                {csvUploadStatus && (
                  <p className="text-[10px] text-amber-300 font-mono mt-3 leading-normal bg-amber-950/20 border border-amber-500/10 p-2.5 rounded-lg">
                    {csvUploadStatus}
                  </p>
                )}
              </Card>

            </div>

            {/* Students roster details directory */}
            <Card className="p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Global Roster Directory</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Email Address</th>
                      <th className="py-2.5 px-3">College & Department</th>
                      <th className="py-2.5 px-3 text-center">Enrollments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {students.map(s => {
                      const sEnrollCount = mockDb.enrollments.filter(e => e.student_id === s.id).length;
                      return (
                        <tr key={s.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">{s.full_name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{s.email}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {s.college_name ? `${s.college_name} • ${s.department || ''}` : "N/A"}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-400">{sEnrollCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

          </div>
        )}

        {/* REPORTS VIEW */}
        {currentTab === "reports" && (
          <Card className="p-6 font-sans">
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <span>Workshop Performance Reports</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Workshop</th>
                    <th className="py-3 px-4 text-center">Total Enrolled</th>
                    <th className="py-3 px-4 text-center">Completion Rate</th>
                    <th className="py-3 px-4 text-center">Class Grade Average</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {workshops.map(w => {
                    const enrollsCount = mockDb.enrollments.filter(e => e.workshop_id === w.id).length;
                    const progressList = mockDb.enrollments
                      .filter(e => e.workshop_id === w.id)
                      .map(e => mockDb.getStudentProgress(e.student_id, w.id));
                    
                    const avgScore = progressList.length > 0 
                      ? Math.round(progressList.reduce((acc, curr) => acc + curr.averageScore, 0) / progressList.length) 
                      : 0;
                      
                    const completionRate = progressList.length > 0 
                      ? Math.round((progressList.filter(p => p.certificateStatus === 'Issued' || p.isEligibleForCertificate).length / progressList.length) * 100)
                      : 0;

                    return (
                      <tr key={w.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white">{w.name}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold">{enrollsCount}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-mono font-semibold ${completionRate >= 75 ? "text-emerald-400" : "text-amber-400"}`}>
                            {completionRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#c5a86a]">{avgScore}%</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleExportCSVReport(w.id)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-transparent transition-all"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Export CSV</span>
                          </button>
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
          <Card className="p-6 font-sans">
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-indigo-400" />
              <span>Verifiable Certification Registry</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Workshop</th>
                    <th className="py-3 px-4 text-center">Attendance</th>
                    <th className="py-3 px-4 text-center">Assessment Avg</th>
                    <th className="py-3 px-4 text-center">Eligibility</th>
                    <th className="py-3 px-4 text-center">Reference ID</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {mockDb.enrollments.map(enroll => {
                    const student = mockDb.profiles.find(p => p.id === enroll.student_id);
                    const workshop = mockDb.workshops.find(w => w.id === enroll.workshop_id);
                    
                    if (!student || !workshop) return null;

                    const prog = mockDb.getStudentProgress(student.id, workshop.id);
                    const isIssued = prog.certificateStatus === 'Issued';

                    return (
                      <tr key={enroll.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">
                          <div>{student.full_name}</div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">{student.email}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[150px] truncate" title={workshop.name}>{workshop.name}</td>
                        <td className="py-3 px-4 text-center font-mono">{prog.attendancePct}%</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-[#c5a86a]">{prog.averageScore}%</td>
                        <td className="py-3 px-4 text-center">
                          {prog.isEligibleForCertificate ? (
                            <span className="text-emerald-400 font-semibold">Eligible</span>
                          ) : (
                            <span className="text-slate-500">Ineligible</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[9px] text-slate-400">
                          {isIssued 
                            ? certificates.find(c => c.student_id === student.id && c.workshop_id === workshop.id)?.certificate_number
                            : "-"
                          }
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isIssued ? (
                            <span className="text-[10px] text-emerald-400 font-semibold mr-3 font-outfit uppercase">Issued ✓</span>
                          ) : (
                            <button
                              onClick={() => handleIssueCertificate(student.id, workshop.id)}
                              disabled={!prog.isEligibleForCertificate}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] transition-all ${
                                prog.isEligibleForCertificate
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10"
                                  : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Rules editor form */}
            <Card className="lg:col-span-1 p-6 h-fit">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <Settings className="h-5 w-5 text-indigo-400" />
                <span>Configure Rules</span>
              </h3>

              <form onSubmit={handleSaveRules} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Select Workshop</label>
                  <select
                    value={selectedRulesWk}
                    onChange={(e) => setSelectedRulesWk(e.target.value)}
                    className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                  >
                    {workshops.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Attendance Rate: <span className="text-white font-bold font-mono">{minAttendance}%</span></label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Average Assessment: <span className="text-white font-bold font-mono">{minAssessment}%</span></label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minAssessment}
                    onChange={(e) => setMinAssessment(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Mandatory Activities toggle */}
                <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                  <div>
                    <span className="block text-xs font-medium text-white">Mandatory Lab Activities</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">Students must complete all assigned activities</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMandatoryActivities(!mandatoryActivities)}
                    className="text-indigo-400 focus:outline-none"
                  >
                    {mandatoryActivities ? (
                      <ToggleRight className="h-9 w-9 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Final Project toggle */}
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="block text-xs font-medium text-white">Final Project Mandatory</span>
                    <span className="block text-[9px] text-slate-500 mt-0.5">Final Project must be completed and passed</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFinalProjectMandatory(!finalProjectMandatory)}
                    className="text-indigo-400 focus:outline-none"
                  >
                    {finalProjectMandatory ? (
                      <ToggleRight className="h-9 w-9 text-indigo-500" />
                    ) : (
                      <ToggleLeft className="h-9 w-9 text-slate-600" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Configuration Rules</span>
                </button>
              </form>
            </Card>

            {/* Current configurations list */}
            <Card className="lg:col-span-2 p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Workshop Certification Settings</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Workshop</th>
                      <th className="py-2.5 px-3 text-center">Min Attendance</th>
                      <th className="py-2.5 px-3 text-center">Min Grade</th>
                      <th className="py-2.5 px-3 text-center">Labs Required</th>
                      <th className="py-2.5 px-3 text-center">Final Project Required</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {mockDb.workshopRules.map(r => {
                      const workshopName = workshops.find(w => w.id === r.workshop_id)?.name || "Unknown";
                      return (
                        <tr key={r.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-white">{workshopName}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{r.min_attendance_pct}%</td>
                          <td className="py-2.5 px-3 text-center font-mono">{r.min_assessment_score}%</td>
                          <td className="py-2.5 px-3 text-center">
                            {r.mandatory_activities_completed ? (
                              <span className="text-indigo-400 font-semibold">Yes</span>
                            ) : (
                              <span className="text-slate-500">No</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {r.final_project_mandatory ? (
                              <span className="text-indigo-400 font-semibold">Yes</span>
                            ) : (
                              <span className="text-slate-500">No</span>
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
        )}

      </main>
    </div>
  );
}
