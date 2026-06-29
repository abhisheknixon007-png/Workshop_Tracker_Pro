"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, ArrowRight, Award, CheckCircle, 
  Users, BarChart3, Database, ShieldAlert, Sparkles, BookOpen 
} from "lucide-react";
export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-grid overflow-hidden">
      {/* Background glow meshes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-200/30 blur-[120px] pointer-events-none" />

      {/* Glass Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-md">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="font-bold text-lg font-outfit tracking-wider text-slate-800">
              CertifyFlow
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => router.push("/login?tab=register")}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center relative">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold mb-6 animate-pulse-slow">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next.js 15 + Supabase Live Assessment Suite</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight font-outfit text-slate-800 max-w-4xl mx-auto leading-tight">
          Track Learning. <br/>
          <span className="bg-gradient-to-r from-indigo-600 via-violet-650 to-pink-600 bg-clip-text text-transparent glow-text-primary">
            Measure Progress.
          </span> <br/>
          Certify Achievement.
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-sans">
          Automated workshop lifecycle management. Track student attendance, evaluate hands-on activities, 
          record final assessments, generate AI feedbacks, and issue verifiable certificates.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={() => router.push("/login")}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-xl shadow-indigo-600/30 group cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Dashboard Feature Highlights */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-white border border-slate-100 shadow-sm p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-slate-800">Attendance Tracking</h3>
            <p className="mt-3 text-slate-500 leading-relaxed text-sm">
              Mark session-wise attendance with status badges. Calculate totals, excuses, late entries, 
              and percentage scores automatically.
            </p>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6 shadow-sm border border-violet-100">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-slate-800">Assessment Evaluator</h3>
            <p className="mt-3 text-slate-500 leading-relaxed text-sm">
              Grade practical exams, quizzes, or final projects. Configure custom weights and passing scores 
              per workshop rules.
            </p>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm p-8 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-6 shadow-sm border border-pink-100">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold font-outfit text-slate-800">AI Feedback Engine</h3>
            <p className="mt-3 text-slate-500 leading-relaxed text-sm">
              Generate performance analysis summaries for students and class retention suggestions 
              for trainers using LLM pipelines.
            </p>
          </div>

        </div>
      </section>



      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>© 2026 Live Workshop Progress & Assessment Tracker. Built with Next.js 15 & Supabase.</p>
        <p className="mt-2 text-slate-400">Enterprise Grade RLS • Automatic PDF Certification • LLM AI Synthesizer</p>
      </footer>
    </div>
  );
}
