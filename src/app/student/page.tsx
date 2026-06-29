"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Award, Calendar, BookOpen, MessageSquare, 
  CheckSquare, CheckCircle2, XCircle, Brain, ArrowUpRight, GraduationCap, Clock 
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser } from "@/lib/auth";
import { 
  fetchWorkshops, fetchProfiles, fetchEnrollments, fetchSessions, fetchActivities, fetchAssessments, 
  fetchAttendance, fetchActivityScores, fetchAssessmentScores, getStudentProgress, fetchFeedback, 
  fetchCertificates, issueCertificate as issueCertificateDb
} from "@/lib/supabaseDb";
import { generateStudentFeedback, AIFeedbackResponse } from "@/lib/services/aiFeedback";
import { Profile, Workshop, StudentProgressSummary, Session, Attendance, Activity, ActivityScore, Assessment, AssessmentScore, Certificate } from "@/lib/types";
import { AttendanceBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import CertificatePDF from "@/components/CertificatePDF";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = React.useState("overview");
  
  // Workshops & Progress States
  const [workshops, setWorkshops] = React.useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = React.useState("");
  const [progressState, setProgressState] = React.useState<StudentProgressSummary | null>(null);
  
  // Tab-specific details
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [activityScores, setActivityScores] = React.useState<ActivityScore[]>([]);
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [assessmentScores, setAssessmentScores] = React.useState<AssessmentScore[]>([]);
  
  // Global lookups loaded from Supabase
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [feedbacks, setFeedbacks] = React.useState<any[]>([]);
  const [certificatesList, setCertificatesList] = React.useState<Certificate[]>([]);

  // AI Feedback State
  const [aiFeedback, setAiFeedback] = React.useState<AIFeedbackResponse | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Load user session
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "student") {
      router.push("/login");
    } else {
      setUser(session);
      
      const loadEnrolledWorkshops = async () => {
        try {
          const [enrolls, allWks] = await Promise.all([
            fetchEnrollments(),
            fetchWorkshops()
          ]);
          const studentEnrollments = enrolls.filter(e => e.student_id === session.id);
          const enrolledWorkshopIds = studentEnrollments.map(e => e.workshop_id);
          const enrolledWorkshops = allWks.filter(w => enrolledWorkshopIds.includes(w.id));
          
          setWorkshops(enrolledWorkshops);
          if (enrolledWorkshops.length > 0) {
            setSelectedWorkshopId(enrolledWorkshops[0].id);
          }
        } catch (err: any) {
          console.warn("Failed to load enrolled workshops:", err?.message || String(err));
        }
      };

      loadEnrolledWorkshops();
    }
  }, [router]);

  // Load details whenever active workshop changes
  React.useEffect(() => {
    if (!user || !selectedWorkshopId) return;

    const loadWorkshopDetails = async () => {
      try {
        setLoadingAI(true);
        
        // 1. Calculate overall progress summary
        const prog = await getStudentProgress(user.id, selectedWorkshopId);
        setProgressState(prog);

        // 2. Load sessions, attendance, etc.
        const [wkSessions, allAttendance, wkActivities, actScores, wkAssessments, assScores, certs, fbs, allProfiles] = await Promise.all([
          fetchSessions(),
          fetchAttendance(),
          fetchActivities(),
          fetchActivityScores(),
          fetchAssessments(),
          fetchAssessmentScores(),
          fetchCertificates(),
          fetchFeedback(),
          fetchProfiles()
        ]);

        setProfiles(allProfiles);
        setFeedbacks(fbs);
        setCertificatesList(certs);

        const wSessions = wkSessions.filter(s => s.workshop_id === selectedWorkshopId);
        setSessions(wSessions);
        
        const sessIds = wSessions.map(s => s.id);
        const wAttendance = allAttendance.filter(a => a.student_id === user.id && sessIds.includes(a.session_id));
        setAttendance(wAttendance);

        // 3. Load activities & scores
        const wActivities = wkActivities.filter(a => a.workshop_id === selectedWorkshopId);
        setActivities(wActivities);

        const actIds = wActivities.map(a => a.id);
        const wActScores = actScores.filter(s => s.student_id === user.id && actIds.includes(s.activity_id));
        setActivityScores(wActScores);

        // 4. Load assessments & scores
        const wAssessments = wkAssessments.filter(a => a.workshop_id === selectedWorkshopId);
        setAssessments(wAssessments);

        const assIds = wAssessments.map(a => a.id);
        const wAssScores = assScores.filter(s => s.student_id === user.id && assIds.includes(s.assessment_id));
        setAssessmentScores(wAssScores);

        // 5. Generate AI feedback (degrades gracefully to local heuristics)
        const activeWk = workshops.find(w => w.id === selectedWorkshopId);
        if (activeWk) {
          const res = await generateStudentFeedback(prog, activeWk.name);
          setAiFeedback(res);
        }
      } catch (err: any) {
        console.warn("Failed to load student dashboard details:", err?.message || String(err));
      } finally {
        setLoadingAI(false);
      }
    };

    loadWorkshopDetails();
  }, [user, selectedWorkshopId, workshops]);

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] text-indigo-600">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <GraduationCap className="h-10 w-10 animate-bounce" />
          <span>Synchronizing student dashboard...</span>
        </div>
      </div>
    );
  }

  if (workshops.length > 0 && !progressState) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f7fb] text-indigo-600">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <GraduationCap className="h-10 w-10 animate-bounce" />
          <span>Synchronizing student dashboard...</span>
        </div>
      </div>
    );
  }

  const progress = progressState!;
  const activeWorkshop = workshops.find(w => w.id === selectedWorkshopId);
  const trainer = profiles.find(p => p.id === activeWorkshop?.trainer_id);
  const certificate = certificatesList.find(c => c.student_id === user.id && c.workshop_id === selectedWorkshopId);

  return (
    <div className="flex bg-[#f5f7fb] min-h-screen text-slate-800 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-slate-800 tracking-wide glow-text-primary">
              Student Workspace
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Welcome back, {user.full_name}. View your academic progress, marks, and downloads.
            </p>
          </div>

          {/* Workshop Selector */}
          {workshops.length > 0 ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Course:</span>
              <select
                value={selectedWorkshopId}
                onChange={(e) => setSelectedWorkshopId(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
              >
                {workshops.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-mono">No Active Enrollments</span>
          )}
        </div>

        {workshops.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
            <Card className="max-w-md w-full p-8 text-center bg-white border border-slate-100 shadow-xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <GraduationCap className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold font-outfit text-slate-800 mb-3 tracking-wide">
                No Active Enrollments
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 font-sans">
                You are not currently enrolled in any active workshops. Please contact your administrator for enrollment.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl text-[10px] text-slate-400 font-mono">
                Student ID: {user.id} • Status: {user.status}
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* OVERVIEW VIEW */}
            {currentTab === "overview" && (
              <div className="space-y-6">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Overall Progress Meter */}
                  <Card className="flex items-center p-6 space-x-4 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <div className="relative h-16 w-16 flex items-center justify-center flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="4" />
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="url(#progress-grad)" strokeWidth="5" 
                          strokeDasharray={175} strokeDashoffset={175 - (175 * progress.overallProgress) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute text-sm font-bold font-outfit text-slate-800">{progress.overallProgress}%</span>
                    </div>
                    <div>
                      <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Overall Course Rank</h4>
                      <p className="text-lg font-bold text-slate-800 mt-1">Dynamic Rating</p>
                    </div>
                  </Card>

                  {/* Attendance Ratio */}
                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Lecture Attendance</h4>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">{progress.attendancePct}%</p>
                      </div>
                      <div className="p-2.5 rounded-full bg-indigo-50 text-indigo-600 shadow-sm">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${progress.attendancePct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">{progress.sessionsAttended} / {progress.totalSessions} sessions logged</p>
                  </Card>

                  {/* Graded Labs */}
                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Hands-on Labs</h4>
                        <p className="text-2xl font-extrabold text-slate-800 mt-2">
                          {progress.completedActivities} / {progress.totalActivities}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${progress.totalActivities > 0 ? (progress.completedActivities / progress.totalActivities) * 100 : 100}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-mono">{progress.pendingActivities} outstanding tasks</p>
                  </Card>

                  {/* Certificate eligibility status card */}
                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Certificate Status</h4>
                        <p className="text-lg font-bold mt-2 flex items-center space-x-1.5">
                          {progress.certificateStatus === "Issued" && <span className="text-emerald-605 font-outfit uppercase text-sm font-bold animate-pulse-slow">Issued ✓</span>}
                          {progress.certificateStatus === "Eligible" && <span className="text-indigo-600 font-outfit uppercase text-sm font-bold">Eligible</span>}
                          {progress.certificateStatus === "Not Eligible" && <span className="text-rose-600 font-outfit uppercase text-sm font-bold">Not Eligible</span>}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-full shadow-sm ${progress.isEligibleForCertificate || certificate ? "bg-emerald-50 text-emerald-605" : "bg-rose-550/10 text-rose-600"}`}>
                        <Award className="h-5 w-5" />
                      </div>
                    </div>
                    <button
                      onClick={() => setCurrentTab("certificates")}
                      className="mt-4 w-full flex items-center justify-between text-xs text-indigo-600 hover:text-indigo-500 font-semibold transition-colors group cursor-pointer bg-transparent border-0"
                    >
                      <span>Verify Checklist</span>
                      <ArrowUpRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </Card>
                </div>

                {/* AI feedback summary box */}
                <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-indigo-50 text-indigo-600 text-[10px] font-semibold font-outfit rounded-bl-xl flex items-center space-x-1 border-l border-b border-indigo-100">
                    <Brain className="h-3 w-3 animate-pulse" />
                    <span>AI SYNTHESIZED</span>
                  </div>
                  
                  <h3 className="text-lg font-bold font-outfit text-slate-800 flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-indigo-500 animate-pulse-slow" />
                    <span>AI Performance Summary</span>
                  </h3>
                  
                  {loadingAI ? (
                    <div className="mt-4 space-y-2 animate-pulse">
                      <div className="h-3.5 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-3.5 bg-slate-100 rounded w-5/6"></div>
                      <div className="h-3.5 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ) : (
                    <div className="mt-4 font-sans text-sm text-slate-600 leading-relaxed">
                      <p>{aiFeedback?.summary}</p>

                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div>
                          <h4 className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-2">Core Strengths</h4>
                          <ul className="space-y-1.5">
                            {aiFeedback?.strengths.map((s, idx) => (
                              <li key={idx} className="text-xs text-slate-500 flex items-center space-x-2">
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs text-pink-600 font-semibold uppercase tracking-wider mb-2">Recommendations</h4>
                          <ul className="space-y-1.5">
                            {aiFeedback?.recommendations.map((r, idx) => (
                              <li key={idx} className="text-xs text-slate-500 flex items-center space-x-2">
                                <span className="h-1.5 w-1.5 bg-pink-500 rounded-full" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Course Context Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                      <BookOpen className="h-5 w-5 text-indigo-500" />
                      <span>Workshop Overview</span>
                    </h3>
                    <p className="text-sm text-slate-605 mt-4 leading-relaxed font-sans">
                      {activeWorkshop?.description}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
                      <div>
                        <span className="block text-slate-400 font-sans uppercase text-[10px] tracking-wider">Start Date</span>
                        <span className="text-slate-800 font-semibold mt-1 block">{activeWorkshop?.start_date}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-sans uppercase text-[10px] tracking-wider">End Date</span>
                        <span className="text-slate-800 font-semibold mt-1 block">{activeWorkshop?.end_date}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                    <h3 className="text-lg font-bold text-slate-800 font-outfit">Staff & Faculty</h3>
                    {trainer ? (
                      <div className="mt-6 flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-base flex-shrink-0 border border-violet-100 shadow-sm">
                          T
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{trainer.full_name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5 capitalize">{trainer.department} • {trainer.college_name}</p>
                          <p className="text-xs text-slate-400 mt-2 font-mono">{trainer.email}</p>
                          {trainer.phone_number && <p className="text-xs text-slate-400 mt-1 font-mono">{trainer.phone_number}</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-4">No trainer has been assigned to this workshop yet.</p>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* ATTENDANCE LOG VIEW */}
            {currentTab === "attendance" && (
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                  <span>Detailed Attendance Log</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Session Name</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Duration</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {sessions.map(sess => {
                        const statusRecord = attendance.find(a => a.session_id === sess.id);
                        const statusStr = statusRecord ? statusRecord.status : "Absent";
                        return (
                          <tr key={sess.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-800">{sess.name}</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-500">{sess.session_date}</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-500 flex items-center space-x-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{sess.duration_mins} mins</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <AttendanceBadge status={statusStr as any} />
                            </td>
                          </tr>
                        );
                      })}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            No sessions have been scheduled yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ACTIVITY LOG VIEW */}
            {currentTab === "activities" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                  <CheckSquare className="h-5 w-5 text-indigo-500" />
                  <span>Hands-on Laboratory Activities</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activities.map(act => {
                    const grade = activityScores.find(s => s.activity_id === act.id);
                    return (
                      <Card key={act.id} className="p-6 relative flex flex-col justify-between bg-white border border-slate-100 shadow-sm rounded-2xl">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="font-bold text-slate-800 tracking-wide">{act.name}</h4>
                            {grade ? (
                              <div className="text-right">
                                <span className="text-xl font-extrabold text-indigo-600 font-mono">{grade.score}</span>
                                <span className="text-xs text-slate-400 font-mono"> / 100</span>
                              </div>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-slate-550/10 text-slate-500 border border-slate-205 font-medium">Pending Grade</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">{act.description}</p>
                        </div>

                        {grade && (
                          <div className="mt-6 pt-4 border-t border-slate-100 text-xs bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                            <span className="font-semibold text-indigo-605 block mb-1">Trainer Feedback:</span>
                            <p className="text-slate-600 italic">"{grade.feedback}"</p>
                            <p className="text-[10px] text-slate-400 font-mono text-right mt-2">Graded on {grade.submission_date}</p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                  {activities.length === 0 && (
                    <div className="col-span-2 py-8 text-center text-slate-400 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      No hands-on activities have been added for this workshop yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ASSESSMENTS VIEW */}
            {currentTab === "assessments" && (
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                  <Award className="h-5 w-5 text-indigo-500" />
                  <span>Assessment Results & Gradebook</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Assessment Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Weight</th>
                        <th className="py-3 px-4">Threshold</th>
                        <th className="py-3 px-4">My Score</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {assessments.map(ass => {
                        const grade = assessmentScores.find(s => s.assessment_id === ass.id);
                        const isPassed = grade ? grade.score >= ass.pass_score : false;
                        return (
                          <tr key={ass.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-slate-800">{ass.name}</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-indigo-650 font-semibold">{ass.type}</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-500">{ass.weightage}%</td>
                            <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{ass.pass_score} / {ass.max_score}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {grade ? `${grade.score} / ${ass.max_score}` : "-"}
                            </td>
                            <td className="py-3.5 px-4">
                              {grade ? (
                                isPassed ? (
                                  <span className="inline-flex items-center text-xs text-emerald-605 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                    Pass
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-xs text-rose-605 font-semibold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                                    Fail
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Unsubmitted</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {assessments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No assessments have been configured yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* FEEDBACK LOG VIEW */}
            {currentTab === "feedback" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                  <span>Trainer & Evaluator Feedback Logs</span>
                </h3>

                <div className="space-y-4 font-sans">
                  {feedbacks
                    .filter(fb => fb.student_id === user.id && fb.workshop_id === selectedWorkshopId)
                    .map(fb => {
                      const author = profiles.find(p => p.id === fb.created_by);
                      return (
                        <Card key={fb.id} className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-xs uppercase shadow-sm border border-indigo-100">
                                {author ? author.full_name[0] : 'T'}
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-800 text-sm">{author?.full_name || 'Trainer'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono capitalize">{author?.role || 'Evaluator'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(fb.created_at || '').toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-650 leading-relaxed italic pl-3 border-l-2 border-slate-200">
                            "{fb.feedback_text}"
                          </p>
                        </Card>
                      );
                    })}
                  
                  {feedbacks.filter(fb => fb.student_id === user.id && fb.workshop_id === selectedWorkshopId).length === 0 && (
                    <div className="py-8 text-center text-slate-400 bg-white border border-slate-100 shadow-sm rounded-2xl">
                      No trainer feedbacks recorded for this workshop yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CERTIFICATE VIEW PORTAL */}
            {currentTab === "certificates" && (
              <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <h3 className="text-lg font-bold text-slate-800 font-outfit flex items-center space-x-2 mb-6">
                  <Award className="h-5 w-5 text-[#b09356]" />
                  <span>Verifiable Completion Certificate</span>
                </h3>

                {/* Check Eligibility Details */}
                {progress.isEligibleForCertificate || certificate ? (
                  <div className="space-y-8 animate-fade-in-up">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-sans flex items-start space-x-3 shadow-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-emerald-805">Eligibility Confirmed!</span>
                        <p className="text-xs text-slate-500 mt-1">
                          You have met all the configured certification parameters (minimum attendance rates, activity completions, and passing grades).
                        </p>
                      </div>
                    </div>

                    {/* Certificate Render */}
                    {certificate ? (
                      <CertificatePDF 
                        certificate={certificate} 
                        student={user} 
                        workshop={activeWorkshop!} 
                        trainerName={trainer?.full_name}
                      />
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-500 text-sm mb-4 font-sans">Your certificate has not been generated in the records yet.</p>
                        <button
                          onClick={async () => {
                            setIsGenerating(true);
                            try {
                              const randHex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
                              const acronym = activeWorkshop?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'WKSP';
                              const certNumber = `CERT-${acronym}-${randHex}`;
                              const qrCode = `VERIFY_CERT-${randHex}`;
                              
                              await issueCertificateDb(user.id, selectedWorkshopId, certNumber, qrCode);
                              
                              // Refresh certificate list
                              const certs = await fetchCertificates();
                              setCertificatesList(certs);
                              const updatedProg = await getStudentProgress(user.id, selectedWorkshopId);
                              setProgressState(updatedProg);
                            } catch (err: any) {
                              console.warn("Failed to generate certificate:", err?.message || String(err));
                            } finally {
                              setIsGenerating(false);
                            }
                          }}
                          disabled={isGenerating}
                          className="px-6 py-2.5 bg-[#b09356] hover:bg-[#9a7e44] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#b09356]/20 cursor-pointer border-0 disabled:bg-[#d6c5a3]"
                        >
                          {isGenerating ? "Generating..." : "Generate Certificate Now"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-fade-in-up font-sans">
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3 shadow-sm">
                      <XCircle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold text-rose-850">Requirements Not Satisfied</span>
                        <p className="text-xs text-slate-500 mt-1">
                          You are not currently eligible to receive a certificate for this workshop. Please review the missing criteria checklist below.
                        </p>
                      </div>
                    </div>

                    <div className="text-center p-4 bg-slate-50 rounded-xl text-xs text-slate-400 leading-normal border border-slate-100 shadow-sm">
                      Note: Grades are evaluated in real time. If your trainer modifies attendance logs or uploads outstanding activity scores, 
                      your status updates immediately. Reach out to your workshop trainer <span className="font-semibold text-slate-700">{trainer?.full_name}</span> if you believe a score is missing.
                    </div>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
