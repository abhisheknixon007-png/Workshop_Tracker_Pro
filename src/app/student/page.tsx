"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, Award, Calendar, BookOpen, MessageSquare, 
  CheckSquare, CheckCircle2, XCircle, Brain, ArrowUpRight, GraduationCap, Clock 
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser, logoutUser } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import { generateStudentFeedback, AIFeedbackResponse } from "@/lib/services/aiFeedback";
import { Profile, Workshop, StudentProgressSummary, Session, Attendance, Activity, ActivityScore, Assessment, AssessmentScore, Certificate } from "@/lib/types";
import { AttendanceBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import CertificatePDF from "@/components/CertificatePDF";

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = React.useState<Profile | null>(null);
  const [currentTab, setCurrentTab] = React.useState("overview");
  
  // Workshops & Progress States
  const [workshops, setWorkshops] = React.useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = React.useState("");
  const [progress, setProgress] = React.useState<StudentProgressSummary | null>(null);
  
  // Tab-specific details
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [activityScores, setActivityScores] = React.useState<ActivityScore[]>([]);
  const [assessments, setAssessments] = React.useState<Assessment[]>([]);
  const [assessmentScores, setAssessmentScores] = React.useState<AssessmentScore[]>([]);
  
  // AI Feedback State
  const [aiFeedback, setAiFeedback] = React.useState<AIFeedbackResponse | null>(null);
  const [loadingAI, setLoadingAI] = React.useState(false);

  // Load user session
  React.useEffect(() => {
    const session = getLoggedInUser();
    if (!session || session.role !== "student") {
      router.push("/login");
    } else {
      setUser(session);
      
      // Load workshops student is enrolled in
      const studentEnrollments = mockDb.enrollments.filter(e => e.student_id === session.id);
      const enrolledWorkshopIds = studentEnrollments.map(e => e.workshop_id);
      const enrolledWorkshops = mockDb.workshops.filter(w => enrolledWorkshopIds.includes(w.id));
      
      setWorkshops(enrolledWorkshops);
      if (enrolledWorkshops.length > 0) {
        setSelectedWorkshopId(enrolledWorkshops[0].id);
      }
    }
  }, [router]);

  // Load details whenever active workshop changes
  React.useEffect(() => {
    if (!user || !selectedWorkshopId) return;

    // 1. Calculate overall progress summary
    const prog = mockDb.getStudentProgress(user.id, selectedWorkshopId);
    setProgress(prog);

    // 2. Load sessions & attendance
    const wkSessions = mockDb.sessions.filter(s => s.workshop_id === selectedWorkshopId);
    setSessions(wkSessions);
    
    const sessIds = wkSessions.map(s => s.id);
    const wkAttendance = mockDb.attendance.filter(a => a.student_id === user.id && sessIds.includes(a.session_id));
    setAttendance(wkAttendance);

    // 3. Load activities & scores
    const wkActivities = mockDb.activities.filter(a => a.workshop_id === selectedWorkshopId);
    setActivities(wkActivities);

    const actIds = wkActivities.map(a => a.id);
    const wkActScores = mockDb.activityScores.filter(s => s.student_id === user.id && actIds.includes(s.activity_id));
    setActivityScores(wkActScores);

    // 4. Load assessments & scores
    const wkAssessments = mockDb.assessments.filter(a => a.workshop_id === selectedWorkshopId);
    setAssessments(wkAssessments);

    const assIds = wkAssessments.map(a => a.id);
    const wkAssScores = mockDb.assessmentScores.filter(s => s.student_id === user.id && assIds.includes(s.assessment_id));
    setAssessmentScores(wkAssScores);

    // 5. Generate AI feedback (degrades gracefully to local heuristics)
    setLoadingAI(true);
    const activeWk = mockDb.workshops.find(w => w.id === selectedWorkshopId);
    if (activeWk) {
      generateStudentFeedback(prog, activeWk.name).then(res => {
        setAiFeedback(res);
        setLoadingAI(false);
      });
    }

  }, [user, selectedWorkshopId]);

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  if (!user || !progress) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090a0f] text-indigo-400">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <GraduationCap className="h-10 w-10 animate-bounce" />
          <span>Synchronizing student dashboard...</span>
        </div>
      </div>
    );
  }

  const activeWorkshop = workshops.find(w => w.id === selectedWorkshopId);
  const trainer = mockDb.profiles.find(p => p.id === activeWorkshop?.trainer_id);

  // Check if certificate issued
  const certificate = mockDb.certificates.find(c => c.student_id === user.id && c.workshop_id === selectedWorkshopId);

  return (
    <div className="flex bg-[#090a0f] min-h-screen text-slate-100 font-sans">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold font-outfit text-white tracking-wide glow-text-primary">
              Student Workspace
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Welcome back, {user.full_name}. View your academic progress, marks, and downloads.
            </p>
          </div>

          {/* Workshop Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Course:</span>
            <select
              value={selectedWorkshopId}
              onChange={(e) => setSelectedWorkshopId(e.target.value)}
              className="bg-[#11131e] border border-white/10 text-white rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500"
            >
              {workshops.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* OVERVIEW VIEW */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Overall Progress Meter */}
              <Card className="flex items-center p-6 space-x-4">
                <div className="relative h-16 w-16 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
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
                  <span className="absolute text-sm font-bold font-outfit text-white">{progress.overallProgress}%</span>
                </div>
                <div>
                  <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Overall Course Rank</h4>
                  <p className="text-lg font-bold text-white mt-1">Dynamic Rating</p>
                </div>
              </Card>

              {/* Attendance Ratio */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Lecture Attendance</h4>
                    <p className="text-2xl font-extrabold text-white mt-2">{progress.attendancePct}%</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-indigo-500 h-full" style={{ width: `${progress.attendancePct}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">{progress.sessionsAttended} / {progress.totalSessions} sessions logged</p>
              </Card>

              {/* Graded Labs */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Hands-on Labs</h4>
                    <p className="text-2xl font-extrabold text-white mt-2">
                      {progress.completedActivities} / {progress.totalActivities}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${progress.totalActivities > 0 ? (progress.completedActivities / progress.totalActivities) * 100 : 100}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-mono">{progress.pendingActivities} outstanding tasks</p>
              </Card>

              {/* Certificate eligibility status card */}
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Certificate Status</h4>
                    <p className="text-lg font-bold text-white mt-2 flex items-center space-x-1.5">
                      {progress.certificateStatus === "Issued" && <span className="text-emerald-400 font-outfit uppercase text-sm font-bold">Issued ✓</span>}
                      {progress.certificateStatus === "Eligible" && <span className="text-indigo-400 font-outfit uppercase text-sm font-bold">Eligible</span>}
                      {progress.certificateStatus === "Not Eligible" && <span className="text-rose-400 font-outfit uppercase text-sm font-bold">Not Eligible</span>}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${progress.isEligibleForCertificate || certificate ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    <Award className="h-5 w-5" />
                  </div>
                </div>
                <button
                  onClick={() => setCurrentTab("certificates")}
                  className="mt-4 w-full flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors group"
                >
                  <span>Verify Checklist</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </Card>
            </div>

            {/* AI feedback summary box */}
            <Card className="p-6 bg-gradient-to-br from-indigo-950/20 via-indigo-900/10 to-transparent border border-indigo-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold font-outfit rounded-bl-xl flex items-center space-x-1">
                <Brain className="h-3 w-3" />
                <span>AI SYNTHESIZED</span>
              </div>
              
              <h3 className="text-lg font-bold font-outfit text-white flex items-center space-x-2">
                <Brain className="h-5 w-5 text-indigo-400" />
                <span>AI Performance Summary</span>
              </h3>
              
              {loadingAI ? (
                <div className="mt-4 space-y-2 animate-pulse">
                  <div className="h-3.5 bg-white/5 rounded w-3/4"></div>
                  <div className="h-3.5 bg-white/5 rounded w-5/6"></div>
                  <div className="h-3.5 bg-white/5 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="mt-4 font-sans text-sm text-slate-300 leading-relaxed">
                  <p>{aiFeedback?.summary}</p>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div>
                      <h4 className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-2">Core Strengths</h4>
                      <ul className="space-y-1.5">
                        {aiFeedback?.strengths.map((s, idx) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-center space-x-2">
                            <span className="h-1 w-1 bg-indigo-500 rounded-full" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs text-pink-400 font-semibold uppercase tracking-wider mb-2">Recommendations</h4>
                      <ul className="space-y-1.5">
                        {aiFeedback?.recommendations.map((r, idx) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-center space-x-2">
                            <span className="h-1 w-1 bg-pink-500 rounded-full" />
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
              <Card p-6="true" className="p-6">
                <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-indigo-400" />
                  <span>Workshop Overview</span>
                </h3>
                <p className="text-sm text-slate-300 mt-4 leading-relaxed font-sans">
                  {activeWorkshop?.description}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                  <div>
                    <span className="block text-slate-500 font-sans uppercase text-[10px] tracking-wider">Start Date</span>
                    <span className="text-white mt-1 block">{activeWorkshop?.start_date}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-sans uppercase text-[10px] tracking-wider">End Date</span>
                    <span className="text-white mt-1 block">{activeWorkshop?.end_date}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-white font-outfit">Staff & Faculty</h3>
                {trainer ? (
                  <div className="mt-6 flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-base flex-shrink-0">
                      T
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{trainer.full_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 capitalize">{trainer.department} • {trainer.college_name}</p>
                      <p className="text-xs text-slate-500 mt-2 font-mono">{trainer.email}</p>
                      {trainer.phone_number && <p className="text-xs text-slate-500 mt-1 font-mono">{trainer.phone_number}</p>}
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
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
              <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
              <span>Detailed Attendance Log</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Session Name</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-sans">
                  {sessions.map(sess => {
                    const statusRecord = attendance.find(a => a.session_id === sess.id);
                    const statusStr = statusRecord ? statusRecord.status : "Absent"; // default if missing
                    return (
                      <tr key={sess.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">{sess.name}</td>
                        <td className="py-3.5 px-4 text-xs font-mono">{sess.session_date}</td>
                        <td className="py-3.5 px-4 text-xs font-mono flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{sess.duration_mins} mins</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <AttendanceBadge status={statusStr} />
                        </td>
                      </tr>
                    );
                  })}
                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
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
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-indigo-400" />
              <span>Hands-on Laboratory Activities</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.map(act => {
                const grade = activityScores.find(s => s.activity_id === act.id);
                return (
                  <Card key={act.id} className="p-6 relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="font-bold text-white tracking-wide">{act.name}</h4>
                        {grade ? (
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-[#c5a86a] font-mono">{grade.score}</span>
                            <span className="text-xs text-slate-400 font-mono"> / 100</span>
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">Pending Grade</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 font-sans leading-relaxed">{act.description}</p>
                    </div>

                    {grade && (
                      <div className="mt-6 pt-4 border-t border-white/5 text-xs bg-indigo-950/10 p-3 rounded-lg border border-indigo-500/5">
                        <span className="font-semibold text-indigo-400 block mb-1">Trainer Feedback:</span>
                        <p className="text-slate-300 italic">"{grade.feedback}"</p>
                        <p className="text-[10px] text-slate-500 font-mono text-right mt-2">Graded on {grade.submission_date}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
              {activities.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-500 font-sans glass-panel rounded-xl">
                  No hands-on activities have been added for this workshop yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASSESSMENTS VIEW */}
        {currentTab === "assessments" && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-indigo-400" />
              <span>Assessment Results & Gradebook</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="py-3 px-4">Assessment Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Weight</th>
                    <th className="py-3 px-4">Threshold</th>
                    <th className="py-3 px-4">My Score</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300 font-sans">
                  {assessments.map(ass => {
                    const grade = assessmentScores.find(s => s.assessment_id === ass.id);
                    const isPassed = grade ? grade.score >= ass.pass_score : false;
                    return (
                      <tr key={ass.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">{ass.name}</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-indigo-300">{ass.type}</td>
                        <td className="py-3.5 px-4 text-xs font-mono">{ass.weightage}%</td>
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-400">{ass.pass_score} / {ass.max_score}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {grade ? `${grade.score} / ${ass.max_score}` : "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          {grade ? (
                            isPassed ? (
                              <span className="inline-flex items-center text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Pass
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-rose-400 font-medium">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Fail
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-500">Unsubmitted</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {assessments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
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
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-indigo-400" />
              <span>Trainer & Evaluator Feedback Logs</span>
            </h3>

            <div className="space-y-4 font-sans">
              {mockDb.feedback
                .filter(fb => fb.student_id === user.id && fb.workshop_id === selectedWorkshopId)
                .map(fb => {
                  const author = mockDb.profiles.find(p => p.id === fb.created_by);
                  return (
                    <Card key={fb.id} className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-600/10 text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {author?.full_name[0] || 'T'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">{author?.full_name || 'Trainer'}</h4>
                            <p className="text-[10px] text-slate-500 font-mono capitalize">{author?.role || 'Evaluator'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(fb.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed italic">
                        "{fb.feedback_text}"
                      </p>
                    </Card>
                  );
                })}
              
              {mockDb.feedback.filter(fb => fb.student_id === user.id && fb.workshop_id === selectedWorkshopId).length === 0 && (
                <div className="py-8 text-center text-slate-500 glass-panel rounded-xl">
                  No trainer feedbacks recorded for this workshop yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* CERTIFICATE VIEW PORTAL */}
        {currentTab === "certificates" && (
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white font-outfit flex items-center space-x-2 mb-6">
              <Award className="h-5 w-5 text-[#c5a86a]" />
              <span>Verifiable Completion Certificate</span>
            </h3>

            {/* Check Eligibility Details */}
            {progress.isEligibleForCertificate || certificate ? (
              <div className="space-y-8 animate-fade-in-up">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-sm font-sans flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Eligibility Confirmed!</span>
                    <p className="text-xs text-slate-400 mt-1">
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
                    <p className="text-slate-400 text-sm mb-4">Your certificate has not been generated in the records yet.</p>
                    <button
                      onClick={() => {
                        // Dynamically create a mock certificate record in the DB!
                        const randHex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
                        const newCert: Certificate = {
                          id: `c-${Date.now()}`,
                          student_id: user.id,
                          workshop_id: selectedWorkshopId,
                          issued_at: new Date().toISOString(),
                          certificate_number: `CERT-${activeWorkshop?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)}-${randHex}`,
                          qr_code: `VERIFY_CERT-${randHex}`,
                          status: 'Issued'
                        };
                        const list = mockDb.certificates;
                        list.push(newCert);
                        mockDb.certificates = list;
                        setProgress(mockDb.getStudentProgress(user.id, selectedWorkshopId));
                      }}
                      className="px-6 py-2.5 bg-[#c5a86a] text-slate-900 font-bold hover:bg-[#b09356] rounded-xl transition-all shadow-lg shadow-[#c5a86a]/20"
                    >
                      Generate Certificate Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in-up font-sans">
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Requirements Not Satisfied</span>
                    <p className="text-xs text-slate-400 mt-1">
                      You are not currently eligible to receive a certificate for this workshop. Please review the missing criteria checklist below.
                    </p>
                  </div>
                </div>

                {/* Checklist Rules details */}
                <div className="p-6 bg-slate-950/40 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="font-semibold text-white text-sm">Certification Criteria Checklist</h4>
                  
                  <div className="divide-y divide-white/5 text-xs text-slate-300">
                    
                    {/* Attendance */}
                    <div className="py-3 flex justify-between items-center">
                      <span>Attendance Threshold (Min: {mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_attendance_pct || 80}%)</span>
                      <span className={`font-mono font-semibold ${progress.attendancePct >= (mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_attendance_pct || 80) ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {progress.attendancePct}% {progress.attendancePct >= (mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_attendance_pct || 80) ? '✓' : '✗'}
                      </span>
                    </div>

                    {/* Average Assessment score */}
                    <div className="py-3 flex justify-between items-center">
                      <span>Assessment Score Threshold (Min: {mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_assessment_score || 70}%)</span>
                      <span className={`font-mono font-semibold ${progress.averageScore >= (mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_assessment_score || 70) ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {progress.averageScore}% {progress.averageScore >= (mockDb.workshopRules.find(r => r.workshop_id === selectedWorkshopId)?.min_assessment_score || 70) ? '✓' : '✗'}
                      </span>
                    </div>

                    {/* Labs completed */}
                    <div className="py-3 flex justify-between items-center">
                      <span>Mandatory Hands-on Activities (No outstanding items)</span>
                      <span className={`font-mono font-semibold ${progress.pendingActivities === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {progress.pendingActivities > 0 ? `${progress.pendingActivities} Pending ✗` : 'All Completed ✓'}
                      </span>
                    </div>

                  </div>
                </div>

                <div className="text-center p-4 bg-white/2 rounded-xl text-xs text-slate-500 leading-normal">
                  Note: Grades are evaluated in real time. If your trainer modifies attendance logs or uploads outstanding activity scores, 
                  your status updates immediately. Reach out to your workshop trainer <span className="font-semibold text-white">{trainer?.full_name}</span> if you believe a score is missing.
                </div>
              </div>
            )}
          </Card>
        )}

      </main>
    </div>
  );
}
