"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, ArrowRight, Award, CheckCircle, 
  Users, BarChart3, Database, ShieldAlert, Sparkles, BookOpen 
} from "lucide-react";
import { setLoggedInUser } from "@/lib/auth";
import mockDb from "@/lib/mockDb";

export default function LandingPage() {
  const router = useRouter();

  const handleSandboxLogin = (email: string) => {
    const profile = mockDb.profiles.find(p => p.email === email);
    if (profile) {
      setLoggedInUser(profile);
      router.push(`/${profile.role}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-grid overflow-hidden">
      {/* Background glow meshes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/15 blur-[120px] pointer-events-none" />

      {/* Glass Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel bg-opacity-30 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-bold text-lg font-outfit tracking-wider text-white">
              CertifyFlow
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push("/login?tab=register")}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6 animate-pulse-slow">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next.js 15 + Supabase Live Assessment Suite</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-outfit text-white max-w-4xl mx-auto leading-tight">
          Track Learning. <br/>
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-500 bg-clip-text text-transparent glow-text-primary">
            Measure Progress.
          </span> <br/>
          Certify Achievement.
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-sans">
          Automated workshop lifecycle management. Track student attendance, evaluate hands-on activities, 
          record final assessments, generate AI feedbacks, and issue verifiable certificates.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={() => router.push("/login")}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-xl shadow-indigo-600/30 group"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </button>
          <a 
            href="#sandbox-portal"
            className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold rounded-xl border border-white/10 transition-all"
          >
            Explore Sandbox Demo
          </a>
        </div>
      </section>

      {/* Dashboard Feature Highlights */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-6">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-white">Attendance Tracking</h3>
            <p className="mt-3 text-slate-400 leading-relaxed text-sm">
              Mark session-wise attendance with status badges. Calculate totals, excuses, late entries, 
              and percentage scores automatically.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center mb-6">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-white">Assessment Evaluator</h3>
            <p className="mt-3 text-slate-400 leading-relaxed text-sm">
              Grade practical exams, quizzes, or final projects. Configure custom weights and passing scores 
              per workshop rules.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover p-8 rounded-2xl">
            <div className="w-12 h-12 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-6">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-white">AI Feedback Engine</h3>
            <p className="mt-3 text-slate-400 leading-relaxed text-sm">
              Generate performance analysis summaries for students and class retention suggestions 
              for trainers using LLM pipelines.
            </p>
          </div>

        </div>
      </section>

      {/* Sandbox Login Portal Block */}
      <section id="sandbox-portal" className="max-w-5xl mx-auto px-6 py-16 relative">
        <div className="glass-panel border-indigo-500/20 bg-indigo-950/10 p-8 md:p-12 rounded-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 text-indigo-400 text-xs font-semibold rounded-bl-2xl flex items-center space-x-1">
            <Database className="h-3 w-3" />
            <span>Developer Sandbox Mode</span>
          </div>

          <h2 className="text-3xl font-extrabold font-outfit text-white tracking-wide">
            Interactive Role Portal
          </h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Test the entire workshop management workflow immediately! Select any pre-configured seed account 
            below to log in instantly.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Admin Selector */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between hover:border-indigo-500/30 transition-all">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 font-bold text-sm">A</div>
                <h4 className="font-bold text-white text-base">Sarah Connor</h4>
                <p className="text-xs text-indigo-400 mt-1 font-semibold uppercase tracking-wider">Super Admin</p>
                <p className="text-xs text-slate-500 mt-3 italic truncate w-full max-w-[180px]">admin@workshop.com</p>
              </div>
              <button 
                onClick={() => handleSandboxLogin("admin@workshop.com")}
                className="mt-6 w-full py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white font-medium text-xs rounded-xl border border-indigo-500/20 hover:border-transparent transition-all"
              >
                Access Admin Portal
              </button>
            </div>

            {/* Trainer Selector */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between hover:border-violet-500/30 transition-all">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center mx-auto mb-4 font-bold text-sm">T</div>
                <h4 className="font-bold text-white text-base">Dr. Elena Rostova</h4>
                <p className="text-xs text-violet-400 mt-1 font-semibold uppercase tracking-wider">Trainer</p>
                <p className="text-xs text-slate-500 mt-3 italic truncate w-full max-w-[180px]">trainer1@workshop.com</p>
              </div>
              <button 
                onClick={() => handleSandboxLogin("trainer1@workshop.com")}
                className="mt-6 w-full py-2 bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white font-medium text-xs rounded-xl border border-violet-500/20 hover:border-transparent transition-all"
              >
                Access Trainer Portal
              </button>
            </div>

            {/* Student Selector */}
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-between hover:border-pink-500/30 transition-all">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full bg-pink-600/20 text-pink-400 flex items-center justify-center mx-auto mb-4 font-bold text-sm">S</div>
                <h4 className="font-bold text-white text-base">Alice Cooper</h4>
                <p className="text-xs text-pink-400 mt-1 font-semibold uppercase tracking-wider">Student</p>
                <p className="text-xs text-slate-500 mt-3 italic truncate w-full max-w-[180px]">student1@workshop.com</p>
              </div>
              <button 
                onClick={() => handleSandboxLogin("student1@workshop.com")}
                className="mt-6 w-full py-2 bg-pink-600/10 hover:bg-pink-600 text-pink-300 hover:text-white font-medium text-xs rounded-xl border border-pink-500/20 hover:border-transparent transition-all"
              >
                Access Student Portal
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center text-slate-500 text-sm">
        <p>© 2026 Live Workshop Progress & Assessment Tracker. Built with Next.js 15 & Supabase.</p>
        <p className="mt-2 text-slate-600">Enterprise Grade RLS • Automatic PDF Certification • LLM AI Synthesizer</p>
      </footer>
    </div>
  );
}
