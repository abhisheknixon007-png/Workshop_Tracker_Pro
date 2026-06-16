"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Award, Calendar, CheckSquare, Users, 
  Brain, HelpCircle, Save, Loader2, MessageSquare, AlertTriangle 
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { generateTrainerInsights, TrainerInsightsResponse } from "@/lib/services/aiFeedback";
import { Profile, Workshop, StudentProgressSummary, Session, Attendance, AttendanceStatus, Activity, Assessment } from "@/lib/types";
import { AttendanceBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default function TrainerDashboard() {
  const router = useRouter();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = React.useState("overview");

  // Workshops State
  const [workshops, setWorkshops] = React.useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = React.useState("");
  
  // Student roster & progress calculations
  const [students, setStudents] = React.useState<Profile[]>([]);
  const [studentProgressList, setStudentProgressList] = React.useState<StudentProgressSummary[]>([]);

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

  // Assessment Scoring States
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [assScoreStudentId, setAssScoreStudentId] = React.useState("");
  const [assScoreAssessmentId, setAssScoreAssessmentId] = React.useState("");
  const [assScoreVal, setAssScoreVal] = React.useState(80);
  const [assScoreFeedback, setAssScoreFeedback] = React.useState("");

  // Summary Feedback State
  const [fbStudentId, setFbStudentId] = React.useState("");
  const [fbText, setFbText] = React.useState("");

  // AI insights block
  const [aiInsights, setAiInsights] = React.useState<TrainerInsightsResponse | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");

  // Load user session
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "trainer") {
      router.push("/login");
    } else {
      setUser(session);
      
      // Load workshops assigned to this trainer
      const trainerWorkshops = mockDb.workshops.filter(w => w.trainer_id === session.id);
      setWorkshops(trainerWorkshops);
      if (trainerWorkshops.length > 0) {
        setSelectedWorkshopId(trainerWorkshops[0].id);
      }
    }
  }, [router]);

  // Load details whenever active workshop shifts
  React.useEffect(() => {
    if (!user || !selectedWorkshopId) return;

    const currentWk = mockDb.workshops.find(w => w.id === selectedWorkshopId);

    // 1. Get enrolled students
    const enrolls = mockDb.enrollments.filter(e => e.workshop_id === selectedWorkshopId);
    const studIds = enrolls.map(e => e.student_id);
    const enrolledStudents = mockDb.profiles.filter(p => studIds.includes(p.id));
    setStudents(enrolledStudents);

    if (enrolledStudents.length > 0) {
      setActiveScoreStudentId(enrolledStudents[0].id);
      setAssScoreStudentId(enrolledStudents[0].id);
      setFbStudentId(enrolledStudents[0].id);
    }

    // 2. Compute progress list for all students
    const list = enrolledStudents.map(s => mockDb.getStudentProgress(s.id, selectedWorkshopId));
    setStudentProgressList(list);

    // 3. Get sessions
    const wkSessions = mockDb.sessions.filter(s => s.workshop_id === selectedWorkshopId);
    setSessions(wkSessions);
    if (wkSessions.length > 0) {
      setSelectedSessionId(wkSessions[0].id);
    } else {
      setSelectedSessionId("");
    }

    // 4. Get activities
    const wkActivities = mockDb.activities.filter(a => a.workshop_id === selectedWorkshopId);
    setActivities(wkActivities);
    if (wkActivities.length > 0) {
      setActiveScoreActivityId(wkActivities[0].id);
    }

    // 5. Get assessments
    const wkAssessments = mockDb.assessments.filter(a => a.workshop_id === selectedWorkshopId);
    setAssessments(wkAssessments);
    if (wkAssessments.length > 0) {
      setAssScoreAssessmentId(wkAssessments[0].id);
    }

    // 6. Generate AI trainer insights
    if (list.length > 0 && currentWk) {
      setLoadingAI(true);
      generateTrainerInsights(list, currentWk).then(res => {
        setAiInsights(res);
        setLoadingAI(false);
      });
    } else {
      setAiInsights(null);
    }

  }, [user, selectedWorkshopId]);

  // Load attendance grid whenever selected session changes
  React.useEffect(() => {
    if (!selectedSessionId) {
      setAttendanceGrid({});
      return;
    }
    const grid: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      const record = mockDb.attendance.find(
        a => a.session_id === selectedSessionId && a.student_id === s.id
      );
      grid[s.id] = record ? record.status : "Absent";
    });
    setAttendanceGrid(grid);
  }, [selectedSessionId, students]);

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  // Toggle Attendance handler
  const handleToggleAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendanceGrid(prev => ({
      ...prev,
      [studentId]: status
    }));

    // Update locally in mock database instantly!
    const list = mockDb.attendance;
    const existingIdx = list.findIndex(
      a => a.session_id === selectedSessionId && a.student_id === studentId
    );

    if (existingIdx > -1) {
      list[existingIdx] = {
        ...list[existingIdx],
        status,
        recorded_at: new Date().toISOString(),
        recorded_by: user?.id
      };
    } else {
      list.push({
        id: `att-${Date.now()}-${Math.random()}`,
        session_id: selectedSessionId,
        student_id: studentId,
        status,
        recorded_by: user?.id,
        recorded_at: new Date().toISOString()
      });
    }

    mockDb.attendance = list;

    // Recalculate roster stats
    const updatedList = students.map(s => mockDb.getStudentProgress(s.id, selectedWorkshopId));
    setStudentProgressList(updatedList);
    
    // Log audit
    const sName = students.find(s => s.id === studentId)?.full_name;
    const sNameSession = sessions.find(s => s.id === selectedSessionId)?.name;
    mockDb.logAudit(user?.id || null, 'MARK_ATTENDANCE', `Marked ${sName} as ${status} in session ${sNameSession}`);
  };

  // Save Activity Score
  const handleSaveActivityScore = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    setTimeout(() => {
      const list = mockDb.activityScores;
      const existingIdx = list.findIndex(
        s => s.activity_id === activeScoreActivityId && s.student_id === activeScoreStudentId
      );

      if (existingIdx > -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          score: Number(activeScoreVal),
          feedback: activeScoreFeedback,
          submission_date: new Date().toISOString().split('T')[0],
          recorded_by: user?.id
        };
      } else {
        list.push({
          id: `acts-${Date.now()}`,
          activity_id: activeScoreActivityId,
          student_id: activeScoreStudentId,
          score: Number(activeScoreVal),
          feedback: activeScoreFeedback,
          submission_date: new Date().toISOString().split('T')[0],
          recorded_by: user?.id
        });
      }

      mockDb.activityScores = list;
      
      // Recalculate progress list
      const updatedList = students.map(s => mockDb.getStudentProgress(s.id, selectedWorkshopId));
      setStudentProgressList(updatedList);

      setIsSaving(false);
      setSuccessMessage("Activity grade saved successfully!");
      setActiveScoreFeedback("");
      
      // Clean success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Save Assessment Score
  const handleSaveAssessmentScore = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    setTimeout(() => {
      const list = mockDb.assessmentScores;
      const existingIdx = list.findIndex(
        s => s.assessment_id === assScoreAssessmentId && s.student_id === assScoreStudentId
      );

      if (existingIdx > -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          score: Number(assScoreVal),
          feedback: assScoreFeedback,
          evaluation_date: new Date().toISOString().split('T')[0],
          recorded_by: user?.id
        };
      } else {
        list.push({
          id: `asss-${Date.now()}`,
          assessment_id: assScoreAssessmentId,
          student_id: assScoreStudentId,
          score: Number(assScoreVal),
          feedback: assScoreFeedback,
          evaluation_date: new Date().toISOString().split('T')[0],
          recorded_by: user?.id
        });
      }

      mockDb.assessmentScores = list;

      // Recalculate progress list
      const updatedList = students.map(s => mockDb.getStudentProgress(s.id, selectedWorkshopId));
      setStudentProgressList(updatedList);

      setIsSaving(false);
      setSuccessMessage("Assessment grade saved successfully!");
      setAssScoreFeedback("");

      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  // Save Summary Feedback
  const handleSaveSummaryFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbText) return;
    setIsSaving(true);
    setSuccessMessage("");

    setTimeout(() => {
      const list = mockDb.feedback;
      list.push({
        id: `fb-${Date.now()}`,
        workshop_id: selectedWorkshopId,
        student_id: fbStudentId,
        feedback_text: fbText,
        created_by: user?.id,
        created_at: new Date().toISOString()
      });
      mockDb.feedback = list;
      
      // Notify student
      const wName = workshops.find(w => w.id === selectedWorkshopId)?.name;
      mockDb.notify(fbStudentId, `New summary feedback added for workshop ${wName}.`);

      setIsSaving(false);
      setSuccessMessage("Student summary feedback logged!");
      setFbText("");
      
      setTimeout(() => setSuccessMessage(""), 3000);
    }, 600);
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0f] text-indigo-400">
        <div className="animate-pulse">Loading dashboard session...</div>
      </div>
    );
  }

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);

  return (
    <div className="flex bg-[#090a0f] min-h-screen text-slate-100 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide glow-text-secondary">
              Trainer Workspace
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Course evaluation logs, student rosters, session registers, and grades.
            </p>
          </div>

          {/* Workshop Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Course:</span>
            {workshops.length > 0 ? (
              <select
                value={selectedWorkshopId}
                onChange={(e) => setSelectedWorkshopId(e.target.value)}
                className="bg-[#11131e] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
              >
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-slate-500">No assigned workshops</span>
            )}
          </div>
        </div>

        {/* Global Notifications panel */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-medium animate-fade-in-up">
            {successMessage}
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* KPI metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Class Attendance Avg</h4>
                <p className="text-3xl font-extrabold text-white mt-2">
                  {studentProgressList.length > 0 
                    ? Math.round(studentProgressList.reduce((acc, curr) => acc + curr.attendancePct, 0) / studentProgressList.length)
                    : 0}%
                </p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">{sessions.length} sessions scheduled</div>
              </Card>

              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Enrolled Students</h4>
                <p className="text-3xl font-extrabold text-white mt-2">{students.length}</p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">Academic rosters updated</div>
              </Card>

              <Card className="p-6">
                <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Class Performance Avg</h4>
                <p className="text-3xl font-extrabold text-[#c5a86a] mt-2">
                  {studentProgressList.length > 0 
                    ? Math.round(studentProgressList.reduce((acc, curr) => acc + curr.averageScore, 0) / studentProgressList.length)
                    : 0}%
                </p>
                <div className="text-[10px] text-slate-500 mt-2 font-mono">Assessments criteria checks</div>
              </Card>
            </div>

            {/* AI Insights Block */}
            {selectedWorkshop && studentProgressList.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-violet-950/20 via-violet-900/10 to-transparent border border-violet-500/10 relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 p-3 bg-violet-500/10 text-violet-400 text-[10px] font-semibold font-outfit rounded-bl-xl flex items-center space-x-1">
                  <Brain className="h-3 w-3" />
                  <span>AI SYNTHESIZED CLASS ANALYTICS</span>
                </div>

                <h3 className="text-lg font-bold font-outfit text-white flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-violet-400 animate-pulse-slow" />
                  <span>AI Class Insights & Recommendations</span>
                </h3>

                {loadingAI ? (
                  <div className="mt-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-6 text-sm">
                    <div>
                      <p className="text-slate-300 leading-relaxed font-sans">{aiInsights?.attendanceTrends}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                      
                      {/* Top & At-risk list */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Top Performers</span>
                          </h4>
                          <ul className="space-y-2 text-xs">
                            {aiInsights?.topPerformers.map((p, idx) => (
                              <li key={idx} className="flex justify-between items-center bg-white/2 p-2 rounded-lg">
                                <span className="text-slate-300 font-semibold">{p.name}</span>
                                <span className="font-mono text-[#c5a86a] font-bold">{p.score}%</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>At-Risk Students</span>
                          </h4>
                          {aiInsights?.atRiskStudents && aiInsights.atRiskStudents.length > 0 ? (
                            <ul className="space-y-2 text-xs">
                              {aiInsights.atRiskStudents.map((p, idx) => (
                                <li key={idx} className="flex justify-between items-center bg-rose-950/10 border border-rose-500/10 p-2 rounded-lg">
                                  <span className="text-slate-300 font-semibold">{p.name}</span>
                                  <span className="text-rose-300 font-mono text-[10px]">{p.reason}</span>
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
                        <h4 className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2 flex items-center space-x-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Actionable Insights</span>
                        </h4>
                        <ul className="space-y-3">
                          {aiInsights?.actionableInsights.map((ins, idx) => (
                            <li key={idx} className="text-xs text-slate-300 bg-white/2 p-2.5 rounded-lg border border-white/5 leading-relaxed">
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
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                  <span>Session Attendance Register</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Select a session date and toggle attendance badges for each student.</p>
              </div>

              {/* Sessions Selector */}
              {sessions.length > 0 ? (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-[#11131e] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.session_date})</option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-500 italic">No sessions configured</span>
              )}
            </div>

            {selectedSessionId ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-center">Mark Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-sans">
                    {students.map(student => {
                      const activeStatus = attendanceGrid[student.id] || "Absent";
                      return (
                        <tr key={student.id} className="hover:bg-white/2 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white">{student.full_name}</td>
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
                                  onClick={() => handleToggleAttendance(student.id, status as AttendanceStatus)}
                                  className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                                    activeStatus === status
                                      ? status === "Present" ? "bg-emerald-600 text-white"
                                        : status === "Absent" ? "bg-rose-600 text-white"
                                        : status === "Late" ? "bg-amber-600 text-white"
                                        : "bg-sky-600 text-white"
                                      : "bg-white/5 hover:bg-white/10 text-slate-400"
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
            <Card className="lg:col-span-1 p-6 h-fit">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <CheckSquare className="h-5 w-5 text-indigo-400" />
                <span>Score Practical Activity</span>
              </h3>

              {activities.length > 0 && students.length > 0 ? (
                <form onSubmit={handleSaveActivityScore} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Student</label>
                    <select
                      value={activeScoreStudentId}
                      onChange={(e) => setActiveScoreStudentId(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Lab Activity</label>
                    <select
                      value={activeScoreActivityId}
                      onChange={(e) => setActiveScoreActivityId(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {activities.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Score (0 - 100): <span className="text-[#c5a86a] font-bold font-mono">{activeScoreVal}</span></label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={activeScoreVal}
                      onChange={(e) => setActiveScoreVal(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Feedback Comment</label>
                    <textarea
                      value={activeScoreFeedback}
                      onChange={(e) => setActiveScoreFeedback(e.target.value)}
                      placeholder="e.g. Excellent circuit integration, wiring code calibrated perfectly."
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
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
            <Card className="lg:col-span-2 p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Laboratory Activity Log Book</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Lab Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3">Trainer Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {mockDb.activityScores
                      .filter(s => {
                        const act = mockDb.activities.find(a => a.id === s.activity_id);
                        return act && act.workshop_id === selectedWorkshopId;
                      })
                      .map(s => {
                        const studentName = mockDb.profiles.find(p => p.id === s.student_id)?.full_name;
                        const activityName = mockDb.activities.find(a => a.id === s.activity_id)?.name;
                        return (
                          <tr key={s.id} className="hover:bg-white/2 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-white">{studentName}</td>
                            <td className="py-2.5 px-3">{activityName}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#c5a86a]">{s.score}</td>
                            <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-400 italic" title={s.feedback}>
                              "{s.feedback}"
                            </td>
                          </tr>
                        );
                      })}
                    {mockDb.activityScores.filter(s => {
                      const act = mockDb.activities.find(a => a.id === s.activity_id);
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
            <Card className="lg:col-span-1 p-6 h-fit">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <Award className="h-5 w-5 text-indigo-400" />
                <span>Grade Quiz / Projects</span>
              </h3>

              {assessments.length > 0 && students.length > 0 ? (
                <form onSubmit={handleSaveAssessmentScore} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Student</label>
                    <select
                      value={assScoreStudentId}
                      onChange={(e) => setAssScoreStudentId(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Assessment Block</label>
                    <select
                      value={assScoreAssessmentId}
                      onChange={(e) => setAssScoreAssessmentId(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {assessments.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Score: <span className="text-[#c5a86a] font-bold font-mono">{assScoreVal}</span></label>
                    <input
                      type="range"
                      min="0"
                      max={assessments.find(a => a.id === assScoreAssessmentId)?.max_score || 100}
                      value={assScoreVal}
                      onChange={(e) => setAssScoreVal(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Min: 0</span>
                      <span>Max: {assessments.find(a => a.id === assScoreAssessmentId)?.max_score || 100} (Pass: {assessments.find(a => a.id === assScoreAssessmentId)?.pass_score || 50})</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Evaluation Comments</label>
                    <textarea
                      value={assScoreFeedback}
                      onChange={(e) => setAssScoreFeedback(e.target.value)}
                      placeholder="e.g. Theoretical section was perfect. Minor calculation errors in practical wiring assembly."
                      rows={3}
                      className="w-full glass-input rounded-xl p-3 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>Record Assessment Score</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-500 italic">No assessments configured for active workshop.</p>
              )}
            </Card>

            {/* Right side: Grading Ledger */}
            <Card className="lg:col-span-2 p-6">
              <h4 className="font-bold text-white font-outfit mb-4">Assessment Gradebook Logs</h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Assessment</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {mockDb.assessmentScores
                      .filter(s => {
                        const ass = mockDb.assessments.find(a => a.id === s.assessment_id);
                        return ass && ass.workshop_id === selectedWorkshopId;
                      })
                      .map(s => {
                        const studentName = mockDb.profiles.find(p => p.id === s.student_id)?.full_name;
                        const ass = mockDb.assessments.find(a => a.id === s.assessment_id);
                        const isPassed = ass ? s.score >= ass.pass_score : false;
                        return (
                          <tr key={s.id} className="hover:bg-white/2 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-white">{studentName}</td>
                            <td className="py-2.5 px-3">{ass?.name}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{s.score} / {ass?.max_score}</td>
                            <td className="py-2.5 px-3 text-center">
                              {isPassed ? (
                                <span className="text-emerald-400 font-semibold">Pass</span>
                              ) : (
                                <span className="text-rose-400 font-semibold">Fail</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-400 italic" title={s.feedback}>
                              "{s.feedback}"
                            </td>
                          </tr>
                        );
                      })}
                    {mockDb.assessmentScores.filter(s => {
                      const ass = mockDb.assessments.find(a => a.id === s.assessment_id);
                      return ass && ass.workshop_id === selectedWorkshopId;
                    }).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No assessment grades logged. Use the panel on the left to grade students.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ROSTER PROGRESS & FEEDBACK VIEW */}
        {currentTab === "progress" && (
          <div className="space-y-6 font-sans">
            {/* Student list ledger */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white font-outfit mb-6 flex items-center space-x-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <span>Class Enrollment Progress Roster</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4 text-center">Attendance</th>
                      <th className="py-3 px-4 text-center">Completed Labs</th>
                      <th className="py-3 px-4 text-center">Assessment Avg</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {studentProgressList.map(prog => (
                      <tr key={prog.studentId} className="hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{prog.studentName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{prog.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          <span className={prog.attendancePct >= 80 ? "text-emerald-400" : "text-rose-400"}>
                            {prog.attendancePct}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {prog.completedActivities} / {prog.totalActivities}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-[#c5a86a]">
                          {prog.averageScore}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {prog.assessmentStatus === 'Pass' ? (
                            <span className="text-emerald-400 font-semibold">Pass</span>
                          ) : (
                            <span className="text-rose-400 font-semibold">Needs Work</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {prog.certificateStatus === 'Issued' && <span className="text-emerald-400 uppercase tracking-wide text-[10px]">Issued ✓</span>}
                          {prog.certificateStatus === 'Eligible' && <span className="text-indigo-400 uppercase tracking-wide text-[10px]">Eligible</span>}
                          {prog.certificateStatus === 'Not Eligible' && <span className="text-slate-500 uppercase tracking-wide text-[10px]">Incomplete</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Custom summary feedback form */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                <span>Write Trainer Summary Recommendation Feedback</span>
              </h3>

              {students.length > 0 ? (
                <form onSubmit={handleSaveSummaryFeedback} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Student</label>
                    <select
                      value={fbStudentId}
                      onChange={(e) => setFbStudentId(e.target.value)}
                      className="w-full bg-[#090a0f] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Summary Feedback Paragraph</label>
                    <input
                      type="text"
                      required
                      value={fbText}
                      onChange={(e) => setFbText(e.target.value)}
                      placeholder="e.g. Alice showed excellent technical skills. Ensure she finishes the outstanding homework assignments."
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      <span>Save Feedback Summary</span>
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-slate-500 italic">No students available to submit feedback.</p>
              )}
            </Card>
          </div>
        )}

      </main>
    </div>
  );
}
