"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Award, Calendar, CheckSquare, Users, 
  Brain, Save, Loader2, AlertTriangle, Plus, BookOpen
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser } from "@/lib/auth";
import { 
  fetchWorkshops, fetchProfiles, fetchEnrollments, fetchSessions, fetchActivities, fetchAssessments, 
  fetchAttendance, fetchActivityScores, fetchAssessmentScores, getStudentProgress, saveAttendance,
  saveActivityScore, saveAssessmentScore, saveSummaryFeedback, createNotification, createAuditLog,
  createWorkshop, saveWorkshopRules, createSession
} from "@/lib/supabaseDb";
import { generateTrainerInsights, TrainerInsightsResponse } from "@/lib/services/aiFeedback";
import { Profile, Workshop, StudentProgressSummary, Session, AttendanceStatus, Activity, Assessment, ActivityScore, AssessmentScore, WorkshopStatus, Enrollment } from "@/lib/types";
import { AttendanceBadge, WorkshopStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function TrainerDashboard() {
  const router = useRouter();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = React.useState("overview");

  // Core States
  const [workshops, setWorkshops] = React.useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = React.useState("");
  
  // Student roster & progress calculations
  const [students, setStudents] = React.useState<Profile[]>([]);
  const [studentProgressList, setStudentProgressList] = React.useState<StudentProgressSummary[]>([]);
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [enrollments, setEnrollments] = React.useState<Enrollment[]>([]);

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

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [authSessionUser, setAuthSessionUser] = React.useState<any>(null);
  const [authChecked, setAuthChecked] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthSessionUser(data.session?.user || null);
      setAuthChecked(true);
    });
  }, []);

  // Attendance Tracker States
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = React.useState("");
  const [attendanceGrid, setAttendanceGrid] = React.useState<Record<string, AttendanceStatus>>({});
  
  // Activity Scoring States
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [activeScoreStudentId, setActiveScoreStudentId] = React.useState("");
  const [activeScoreActivityId, setActiveScoreActivityId] = React.useState("");
  const [activeScoreVal, setActiveScoreVal] = React.useState(85);
  const [activeScoreFeedback, setActiveScoreFeedback] = React.useState("");
  const [activityScores, setActivityScores] = React.useState<ActivityScore[]>([]);

  // Assessment Scoring States
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [assScoreStudentId, setAssScoreStudentId] = React.useState("");
  const [assScoreAssessmentId, setAssScoreAssessmentId] = React.useState("");
  const [assScoreVal, setAssScoreVal] = React.useState(80);
  const [assScoreFeedback, setAssScoreFeedback] = React.useState("");
  const [assessmentScores, setAssessmentScores] = React.useState<AssessmentScore[]>([]);

  // Summary Feedback State
  const [fbStudentId, setFbStudentId] = React.useState("");
  const [fbText, setFbText] = React.useState("");

  // AI insights block
  const [aiInsights, setAiInsights] = React.useState<TrainerInsightsResponse | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");

  const refreshData = async () => {
    try {
      const [allWks, allSessions, allProfiles, enrolls] = await Promise.all([
        fetchWorkshops(),
        fetchSessions(),
        fetchProfiles(),
        fetchEnrollments()
      ]);
      setWorkshops(allWks);
      setSessions(allSessions);
      setProfiles(allProfiles);
      setEnrollments(enrolls);

      const session = getLoggedInUser();
      if (session && !newWkTrainer) {
        setNewWkTrainer(session.id);
      }
      if (allWks.length > 0 && !newSessWorkshop) {
        setNewSessWorkshop(allWks[0].id);
      }
    } catch (err: any) {
      console.warn("Failed to refresh trainer data:", err?.message || String(err));
    }
  };

  // Load user session
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "trainer") {
      router.push("/login");
    } else {
      setUser(session);
      refreshData().then(() => {
        fetchWorkshops().then(allWks => {
          if (allWks.length > 0) {
            setSelectedWorkshopId(allWks[0].id);
          }
        });
      });
    }
  }, [router]);

  // Load details whenever active workshop shifts
  React.useEffect(() => {
    if (!user || !selectedWorkshopId) return;

    const loadWorkshopDetails = async () => {
      try {
        const [allProfiles, enrolls, wkSessions, wkActivities, wkAssessments, actScores, assScores] = await Promise.all([
          fetchProfiles(),
          fetchEnrollments(),
          fetchSessions(),
          fetchActivities(),
          fetchAssessments(),
          fetchActivityScores(),
          fetchAssessmentScores()
        ]);

        const currentWk = workshops.find(w => w.id === selectedWorkshopId);
        setProfiles(allProfiles);
        setEnrollments(enrolls);
        setActivityScores(actScores);
        setAssessmentScores(assScores);

        // 1. Get enrolled students
        const enrollsList = enrolls.filter(e => e.workshop_id === selectedWorkshopId);
        const studIds = enrollsList.map(e => e.student_id);
        const enrolledStudents = allProfiles.filter(p => studIds.includes(p.id));
        setStudents(enrolledStudents);

        if (enrolledStudents.length > 0) {
          setActiveScoreStudentId(enrolledStudents[0].id);
          setAssScoreStudentId(enrolledStudents[0].id);
          setFbStudentId(enrolledStudents[0].id);
        }

        // 2. Compute progress list for all students
        const progressList = await Promise.all(
          enrolledStudents.map(s => getStudentProgress(s.id, selectedWorkshopId))
        );
        setStudentProgressList(progressList);

        // 3. Get sessions
        const wSessions = wkSessions.filter(s => s.workshop_id === selectedWorkshopId);
        setSessions(wSessions);
        if (wSessions.length > 0) {
          setSelectedSessionId(wSessions[0].id);
        } else {
          setSelectedSessionId("");
        }

        // 4. Get activities
        const wActivities = wkActivities.filter(a => a.workshop_id === selectedWorkshopId);
        setActivities(wActivities);
        if (wActivities.length > 0) {
          setActiveScoreActivityId(wActivities[0].id);
        }

        // 5. Get assessments
        const wAssessments = wkAssessments.filter(a => a.workshop_id === selectedWorkshopId);
        setAssessments(wAssessments);
        if (wAssessments.length > 0) {
          setAssScoreAssessmentId(wAssessments[0].id);
        }

        // 6. Generate AI trainer insights
        if (progressList.length > 0 && currentWk) {
          setLoadingAI(true);
          const res = await generateTrainerInsights(progressList, currentWk);
          setAiInsights(res);
          setLoadingAI(false);
        } else {
          setAiInsights(null);
        }
      } catch (err: any) {
        console.warn("Failed to load trainer workshop details:", err?.message || String(err));
      }
    };

    loadWorkshopDetails();
  }, [user, selectedWorkshopId, currentTab, workshops]);

  // Load attendance grid whenever selected session changes
  React.useEffect(() => {
    if (!selectedSessionId) {
      setAttendanceGrid({});
      return;
    }

    const loadAttendanceGrid = async () => {
      try {
        const allAttendance = await fetchAttendance();
        const grid: Record<string, AttendanceStatus> = {};
        students.forEach(s => {
          const record = allAttendance.find(
            a => a.session_id === selectedSessionId && a.student_id === s.id
          );
          grid[s.id] = record ? (record.status as AttendanceStatus) : "Absent";
        });
        setAttendanceGrid(grid);
      } catch (err: any) {
        console.warn("Failed to load attendance grid:", err?.message || String(err));
      }
    };

    loadAttendanceGrid();
  }, [selectedSessionId, students]);

  const handleAddWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const newWk = await createWorkshop({
        name: newWkName,
        description: newWkDesc,
        start_date: newWkStart,
        end_date: newWkEnd,
        status: newWkStatus,
        trainer_id: newWkTrainer || null
      });
      
      // Add default certificate rules for this workshop
      await saveWorkshopRules({
        workshop_id: newWk.id,
        min_attendance_pct: 80,
        min_assessment_score: 70,
        mandatory_activities_completed: true,
        final_project_mandatory: false
      });

      await createAuditLog(user?.id || null, 'CREATE_WORKSHOP', `Trainer created workshop: ${newWk.name}`);

      setSuccessMessage("Workshop created successfully!");
      setNewWkName("");
      setNewWkDesc("");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to create workshop: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const newSess = await createSession({
        workshop_id: newSessWorkshop,
        name: newSessName,
        session_date: newSessDate,
        duration_mins: Number(newSessDur),
        description: newSessDesc
      });
      
      await createAuditLog(user?.id || null, 'CREATE_SESSION', `Trainer scheduled session: ${newSess.name}`);

      setSuccessMessage("Session scheduled successfully!");
      setNewSessName("");
      setNewSessDesc("");
      await refreshData();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage("Failed to schedule session: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  // Toggle Attendance handler
  const handleToggleAttendance = async (studentId: string, status: AttendanceStatus) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [studentId]: status
    }));

    try {
      await saveAttendance(selectedSessionId, studentId, status, user?.id || null);

      // Recalculate roster stats
      const progressList = await Promise.all(
        students.map(s => getStudentProgress(s.id, selectedWorkshopId))
      );
      setStudentProgressList(progressList);
      
      // Log audit
      const sName = students.find(s => s.id === studentId)?.full_name;
      const sNameSession = sessions.find(s => s.id === selectedSessionId)?.name;
      await createAuditLog(user?.id || null, 'MARK_ATTENDANCE', `Marked ${sName} as ${status} in session ${sNameSession}`);
    } catch (err: any) {
      console.warn("Failed to save attendance:", err?.message || String(err));
    }
  };

  // Save Activity Score
  const handleSaveActivityScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    try {
      await saveActivityScore(activeScoreActivityId, activeScoreStudentId, Number(activeScoreVal), activeScoreFeedback, user?.id || null);

      // Recalculate progress list & refresh scores
      const [progressList, scores] = await Promise.all([
        Promise.all(students.map(s => getStudentProgress(s.id, selectedWorkshopId))),
        fetchActivityScores()
      ]);
      setStudentProgressList(progressList);
      setActivityScores(scores);

      setIsSaving(false);
      setSuccessMessage("Activity grade saved successfully!");
      setActiveScoreFeedback("");
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.warn("Failed to save activity score:", err?.message || String(err));
      setIsSaving(false);
    }
  };

  // Save Assessment Score
  const handleSaveAssessmentScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    try {
      await saveAssessmentScore(assScoreAssessmentId, assScoreStudentId, Number(assScoreVal), assScoreFeedback, user?.id || null);

      // Recalculate progress list & refresh scores
      const [progressList, scores] = await Promise.all([
        Promise.all(students.map(s => getStudentProgress(s.id, selectedWorkshopId))),
        fetchAssessmentScores()
      ]);
      setStudentProgressList(progressList);
      setAssessmentScores(scores);

      setIsSaving(false);
      setSuccessMessage("Assessment grade saved successfully!");
      setAssScoreFeedback("");

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.warn("Failed to save assessment score:", err?.message || String(err));
      setIsSaving(false);
    }
  };

  // Save Summary Feedback
  const handleSaveSummaryFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbText) return;
    setIsSaving(true);
    setSuccessMessage("");

    try {
      await saveSummaryFeedback(selectedWorkshopId, fbStudentId, fbText, user?.id || null);
      
      // Notify student
      const wName = workshops.find(w => w.id === selectedWorkshopId)?.name;
      await createNotification(fbStudentId, `New summary feedback added for workshop ${wName}.`);

      setIsSaving(false);
      setSuccessMessage("Student summary feedback logged!");
      setFbText("");
      
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      console.warn("Failed to save summary feedback:", err?.message || String(err));
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] text-indigo-605">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <span>Synchronizing trainer dashboard...</span>
        </div>
      </div>
    );
  }

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);

  return (
    <div className="flex bg-[#f5f7fb] min-h-screen text-slate-800 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-slate-800 tracking-wide glow-text-secondary">
              Trainer Workspace
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Course evaluation logs, student rosters, session registers, and grades.
            </p>
          </div>

          {/* Workshop Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Course:</span>
            {workshops.length > 0 ? (
              <select
                value={selectedWorkshopId}
                onChange={(e) => setSelectedWorkshopId(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-400">No assigned workshops</span>
            )}
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
            <div className="text-rose-650 font-semibold mt-1">
              ⚠️ Warning: You have no active Supabase Auth session! Please log out and log back in to refresh your login token.
            </div>
          )}
        </div>

        {/* Global Notifications panel */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold animate-fade-in-up">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold animate-fade-in-up">
            {errorMessage}
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* KPI metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Class Attendance Avg</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">
                    {studentProgressList.length > 0 
                      ? Math.round(studentProgressList.reduce((acc, curr) => acc + curr.attendancePct, 0) / studentProgressList.length)
                      : 0}%
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">{sessions.length} sessions scheduled</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Enrolled Students</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">{students.length}</p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Academic rosters updated</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Users className="h-6 w-6" />
                </div>
              </Card>

              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Class Performance Avg</h4>
                  <p className="text-3xl font-extrabold text-slate-800 mt-2">
                    {studentProgressList.length > 0 
                      ? Math.round(studentProgressList.reduce((acc, curr) => acc + curr.averageScore, 0) / studentProgressList.length)
                      : 0}%
                  </p>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Assessments criteria checks</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Award className="h-6 w-6" />
                </div>
              </Card>
            </div>

            {/* AI Insights Block */}
            {selectedWorkshop && studentProgressList.length > 0 && (
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 p-3 bg-violet-50 text-violet-600 text-[10px] font-semibold font-outfit rounded-bl-xl border-l border-b border-violet-100 flex items-center space-x-1">
                  <Brain className="h-3 w-3" />
                  <span>AI SYNTHESIZED CLASS ANALYTICS</span>
                </div>

                <h3 className="text-lg font-bold font-outfit text-slate-800 flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-violet-500 animate-pulse-slow" />
                  <span>AI Class Insights & Recommendations</span>
                </h3>

                {loadingAI ? (
                  <div className="mt-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-6 text-sm">
                    <div>
                      <p className="text-slate-600 leading-relaxed font-sans">{aiInsights?.attendanceTrends}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                      
                      {/* Top & At-risk list */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Top Performers</span>
                          </h4>
                          <ul className="space-y-2 text-xs">
                            {aiInsights?.topPerformers.map((p, idx) => (
                              <li key={idx} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-lg">
                                <span className="text-slate-705 font-semibold">{p.name}</span>
                                <span className="font-mono text-[#b09356] font-bold">{p.score}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs text-rose-600 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>At-Risk Students</span>
                          </h4>
                          {aiInsights?.atRiskStudents && aiInsights.atRiskStudents.length > 0 ? (
                            <ul className="space-y-2 text-xs">
                              {aiInsights.atRiskStudents.map((p, idx) => (
                                <li key={idx} className="flex justify-between items-center bg-rose-50 border border-rose-100 p-2 rounded-lg">
                                  <span className="text-slate-705 font-semibold">{p.name}</span>
                                  <span className="text-rose-600 font-mono text-[10px]">{p.reason}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No at-risk indicators flagged.</p>
                          )}
                        </div>
                      </div>

                      {/* Action items */}
                      <div>
                        <h4 className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Actionable Insights</span>
                        </h4>
                        <ul className="space-y-3">
                          {aiInsights?.actionableInsights.map((ins, idx) => (
                            <li key={idx} className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ATTENDANCE MARK VIEW */}
        {currentTab === "attendance" && (
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                  <span>Session Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Select a session date and toggle attendance badges for each student.</p>
              </div>

              {/* Sessions Selector */}
              {sessions.length > 0 ? (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.session_date})</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-400 italic">No sessions configured</span>
              )}
            </div>

            {selectedSessionId ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-center">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {students.map(student => {
                      const activeStatus = attendanceGrid[student.id] || "Absent";
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-slate-800">{student.full_name}</td>
                          <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{student.email}</td>
                          <td className="py-3.5 px-4">
                            <AttendanceBadge status={activeStatus} />
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex justify-center space-x-1.5">
                              {["Present", "Absent", "Late", "Excused"].map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => handleToggleAttendance(student.id, status as any)}
                                  className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors cursor-pointer border-0 ${
                                    activeStatus === status
                                      ? status === "Present" ? "bg-emerald-600 text-white"
                                        : status === "Absent" ? "bg-rose-600 text-white"
                                        : status === "Late" ? "bg-amber-600 text-white"
                                        : "bg-sky-600 text-white"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                                  }`}
                                >
                                  {status[0]}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 italic">
                No sessions available to register attendance. Add sessions in the Admin panel.
              </div>
            )}
          </Card>
        )}

        {/* ACTIVITIES SCORING VIEW */}
        {currentTab === "activities" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Left side: Evaluation grade form */}
            <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl h-fit">
              <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                <CheckSquare className="h-5 w-5 text-indigo-500" />
                <span>Score Practical Activity</span>
              </h3>

              {activities.length > 0 && students.length > 0 ? (
                <form onSubmit={handleSaveActivityScore} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Student</label>
                    <select
                      value={activeScoreStudentId}
                      onChange={(e) => setActiveScoreStudentId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Lab Activity</label>
                    <select
                      value={activeScoreActivityId}
                      onChange={(e) => setActiveScoreActivityId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {activities.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Score (0 - 100): <span className="text-[#b09356] font-bold font-mono">{activeScoreVal}</span></label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activeScoreVal}
                      onChange={(e) => setActiveScoreVal(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feedback Comment</label>
                    <textarea
                      value={activeScoreFeedback}
                      onChange={(e) => setActiveScoreFeedback(e.target.value)}
                      placeholder="e.g. Excellent circuit integration, wiring code calibrated perfectly."
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none text-slate-850 bg-white border border-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Record Activity Score</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500 italic">No lab activities or students enrolled in active workshop.</p>
              )}
            </Card>

            {/* Right side: Grading Ledger */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h4 className="font-bold text-slate-800 font-outfit mb-4">Laboratory Activity Log Book</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Lab Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3">Trainer Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activityScores
                      .filter(s => {
                        const act = activities.find(a => a.id === s.activity_id);
                        return act && act.workshop_id === selectedWorkshopId;
                      })
                      .map(s => {
                        const studentName = profiles.find(p => p.id === s.student_id)?.full_name;
                        const activityName = activities.find(a => a.id === s.activity_id)?.name;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-850">{studentName}</td>
                            <td className="py-2.5 px-3">{activityName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#b09356]">{s.score}</td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-400 italic" title={s.feedback}>
                              "{s.feedback}"
                            </td>
                          </tr>
                        );
                      })}
                    {activityScores.filter(s => {
                      const act = activities.find(a => a.id === s.activity_id);
                      return act && act.workshop_id === selectedWorkshopId;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No laboratory grades recorded. Use the panel on the left to grade students.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ASSESSMENTS GRADING VIEW */}
        {currentTab === "assessments" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Left side: Evaluation grade form */}
            <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl h-fit">
              <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                <Award className="h-5 w-5 text-indigo-500" />
                <span>Grade Quiz / Projects</span>
              </h3>

              {assessments.length > 0 && students.length > 0 ? (
                <form onSubmit={handleSaveAssessmentScore} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Student</label>
                    <select
                      value={assScoreStudentId}
                      onChange={(e) => setAssScoreStudentId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Assessment Block</label>
                    <select
                      value={assScoreAssessmentId}
                      onChange={(e) => setAssScoreAssessmentId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {assessments.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Score: <span className="text-[#b09356] font-bold font-mono">{assScoreVal}</span></label>
                    <input
                      type="range"
                      min="0"
                      max={assessments.find(a => a.id === assScoreAssessmentId)?.max_score || 100}
                      value={assScoreVal}
                      onChange={(e) => setAssScoreVal(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Min: 0</span>
                      <span>Max: {assessments.find(a => a.id === assScoreAssessmentId)?.max_score || 100} (Pass: {assessments.find(a => a.id === assScoreAssessmentId)?.pass_score || 50})</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Evaluation Comments</label>
                    <textarea
                      value={assScoreFeedback}
                      onChange={(e) => setAssScoreFeedback(e.target.value)}
                      placeholder="e.g. Theoretical section was perfect. Minor calculation errors in practical wiring assembly."
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none text-slate-850 bg-white border border-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Record Assessment Score</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500 italic">No assessments or students enrolled in active workshop.</p>
              )}
            </Card>

            {/* Right side: Grading Ledger */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h4 className="font-bold text-slate-800 font-outfit mb-4">Assessment Gradebook Ledger</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Assessment Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Threshold</th>
                      <th className="py-2.5 px-3">Evaluation Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {assessmentScores
                      .filter(s => {
                        const ass = assessments.find(a => a.id === s.assessment_id);
                        return ass && ass.workshop_id === selectedWorkshopId;
                      })
                      .map(s => {
                        const studentName = profiles.find(p => p.id === s.student_id)?.full_name;
                        const ass = assessments.find(a => a.id === s.assessment_id);
                        const assName = ass?.name;
                        const maxScore = ass?.max_score;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-850">{studentName}</td>
                            <td className="py-2.5 px-3">{assName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#b09356]">{s.score}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">/ {maxScore}</td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-400 italic" title={s.feedback}>
                              "{s.feedback}"
                            </td>
                          </tr>
                        );
                      })}
                    {assessmentScores.filter(s => {
                      const ass = assessments.find(a => a.id === s.assessment_id);
                      return ass && ass.workshop_id === selectedWorkshopId;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No assessment grades recorded. Use the panel on the left to grade students.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* STUDENT PROGRESS & FEEDBACK VIEW */}
        {currentTab === "progress" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Left side: Log feedback comments */}
            <Card className="lg:col-span-1 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl h-fit">
              <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                <Users className="h-5 w-5 text-indigo-500" />
                <span>Log Student Feedback</span>
              </h3>

              {students.length > 0 ? (
                <form onSubmit={handleSaveSummaryFeedback} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Select Student</label>
                    <select
                      value={fbStudentId}
                      onChange={(e) => setFbStudentId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feedback Text</label>
                    <textarea
                      value={fbText}
                      onChange={(e) => setFbText(e.target.value)}
                      placeholder="e.g. Alice has demonstrated exceptional hardware integration. Lab assignments completed 100%."
                      rows={4}
                      className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none text-slate-850 bg-white border border-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving || !fbText}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Save Summary Feedback</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500 italic">No enrolled students to write feedback for.</p>
              )}
            </Card>

            {/* Right side: Detailed Class Roster Progress */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h4 className="font-bold text-slate-800 font-outfit mb-4">Detailed Roster Progress Card</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3 text-center">Attendance %</th>
                      <th className="py-2.5 px-3 text-center">Labs Done</th>
                      <th className="py-2.5 px-3 text-center">Assessment Score</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {studentProgressList.map(prog => (
                      <tr key={prog.studentId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-850">{prog.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{prog.email}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">{prog.attendancePct}%</td>
                        <td className="py-3 px-3 text-center font-mono">
                          {prog.completedActivities} / {prog.totalActivities}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-[#b09356]">{prog.averageScore}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            prog.certificateStatus === 'Issued' ? 'bg-emerald-50 text-emerald-605 border border-emerald-200' :
                            prog.certificateStatus === 'Eligible' ? 'bg-indigo-50 text-indigo-605 border border-indigo-200' :
                            'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {prog.certificateStatus === 'Issued' ? 'Certified' : prog.certificateStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {studentProgressList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No student details available. Verify workshop enrollment registry.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* WORKSHOPS VIEW */}
        {currentTab === "workshops" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            
            {/* Create Workshop Form */}
            <Card className="lg:col-span-1 p-6 h-fit bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                <Plus className="h-5 w-5 text-indigo-500" />
                <span>Create Workshop</span>
              </h3>

              <form onSubmit={handleAddWorkshop} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Workshop Name</label>
                  <input
                    type="text"
                    required
                    value={newWkName}
                    onChange={(e) => setNewWkName(e.target.value)}
                    placeholder="e.g. IoT Development Foundations"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                  <textarea
                    required
                    value={newWkDesc}
                    onChange={(e) => setNewWkDesc(e.target.value)}
                    placeholder="Provide overview details..."
                    rows={3}
                    className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={newWkStart}
                      onChange={(e) => setNewWkStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={newWkEnd}
                      onChange={(e) => setNewWkEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select
                      value={newWkStatus}
                      onChange={(e) => setNewWkStatus(e.target.value as WorkshopStatus)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-2 text-xs focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Assign Trainer</label>
                    <select
                      value={newWkTrainer}
                      onChange={(e) => setNewWkTrainer(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-1.5 px-2 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">No Assignment</option>
                      {profiles.filter(p => p.role === 'trainer' && p.status === 'Approved').map(t => (
                        <option key={t.id} value={t.id}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Save Workshop</span>
                </button>
              </form>
            </Card>

            {/* Workshops list table */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h4 className="font-bold text-slate-800 font-outfit mb-4">Workshop Catalog</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Workshop Name</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3">Trainer Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {workshops.map(w => {
                      const trainerName = profiles.find(t => t.id === w.trainer_id)?.full_name || "Unassigned";
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-855">
                            <div>{w.name}</div>
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 max-w-xs truncate" title={w.description}>
                              {w.description}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <WorkshopStatusBadge status={w.status} />
                          </td>
                          <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                            {w.start_date} to {w.end_date}
                          </td>
                          <td className="py-3 px-3 text-slate-655">{trainerName}</td>
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
            <Card className="lg:col-span-1 p-6 h-fit bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                <Plus className="h-5 w-5 text-indigo-500" />
                <span>Schedule Session</span>
              </h3>

              <form onSubmit={handleAddSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Select Workshop</label>
                  <select
                    value={newSessWorkshop}
                    onChange={(e) => setNewSessWorkshop(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {workshops.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Session Name</label>
                  <input
                    type="text"
                    required
                    value={newSessName}
                    onChange={(e) => setNewSessName(e.target.value)}
                    placeholder="e.g. Introduction to MQTT Protocols"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Session Date</label>
                    <input
                      type="date"
                      required
                      value={newSessDate}
                      onChange={(e) => setNewSessDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      required
                      value={newSessDur}
                      onChange={(e) => setNewSessDur(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 text-slate-855 rounded-xl py-1.5 px-2.5 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Topic Outline Details</label>
                  <textarea
                    value={newSessDesc}
                    onChange={(e) => setNewSessDesc(e.target.value)}
                    placeholder="Summary of code topics, libraries covered..."
                    rows={2}
                    className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none text-slate-800 bg-white border border-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all cursor-pointer border-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>Schedule Session</span>
                </button>
              </form>
            </Card>

            {/* Sessions Ledger */}
            <Card className="lg:col-span-2 p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
              <h4 className="font-bold text-slate-800 font-outfit mb-4">Scheduled Session Matrix</h4>
              
              <div className="overflow-y-auto max-h-[450px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider sticky top-0 z-10">
                      <th className="py-2 px-3">Session Topic</th>
                      <th className="py-2 px-3">Workshop Name</th>
                      <th className="py-2 px-3 text-center">Date</th>
                      <th className="py-2 px-3 text-center">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sessions.map(s => {
                      const workshopName = workshops.find(w => w.id === s.workshop_id)?.name || "Unknown";
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-855">{s.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 italic">{s.description}</div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-500" title={workshopName}>{workshopName}</td>
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

        {/* ALL STUDENTS VIEW */}
        {currentTab === "students" && (
          <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl font-sans">
            <h4 className="font-bold text-slate-800 font-outfit mb-4 border-b border-slate-100 pb-3">Learner Directory</h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">College & Department</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Enrollments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {profiles.filter(p => p.role === 'student').map(s => {
                    const sEnrollCount = enrollments.filter(e => e.student_id === s.id).length;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-855">{s.full_name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{s.email}</td>
                        <td className="py-2.5 px-3 text-slate-655">
                          {s.college_name ? `${s.college_name} • ${s.department || ''}` : "N/A"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.status === 'Approved' ? 'bg-emerald-50 text-emerald-605 border border-emerald-200' :
                            s.status === 'Pending' ? 'bg-amber-50 text-amber-605 border border-amber-200' :
                            'bg-rose-555/10 text-rose-600 border border-rose-200'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-600">{sEnrollCount}</td>
                      </tr>
                    );
                  })}
                  {profiles.filter(p => p.role === 'student').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No students registered in the system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
