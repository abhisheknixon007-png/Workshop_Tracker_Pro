"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowLeft, Loader2, User, Mail, Sparkles, Building, Phone } from "lucide-react";
import { getLoggedInUser, setLoggedInUser, registerUser } from "@/lib/auth";
import mockDb from "@/lib/mockDb";
import { UserRole } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set default view based on query string
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = React.useState<"login" | "register">(initialTab);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginRole, setLoginRole] = React.useState<UserRole>("student");
  
  // Register Form States
  const [regName, setRegName] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regRole, setRegRole] = React.useState<UserRole>("student");
  const [regPhone, setRegPhone] = React.useState("");
  const [regCollege, setRegCollege] = React.useState("");
  const [regDept, setRegDept] = React.useState("");
  const [regYear, setRegYear] = React.useState("3rd Year");

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");

  // Redirect if already logged in
  React.useEffect(() => {
    const user = getLoggedInUser();
    if (user) {
      router.push(`/${user.role}`);
    }
  }, [router]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    setTimeout(() => {
      // Find profile by email
      const profile = mockDb.profiles.find(
        p => p.email.toLowerCase() === loginEmail.trim().toLowerCase()
      );

      if (!profile) {
        setErrorMsg("Email not found. Use a seed email like 'student1@workshop.com' or click 'Register' below.");
        setIsLoading(false);
        return;
      }

      if (profile.role !== loginRole) {
        setErrorMsg(`Email matches a profile, but the role registered is '${profile.role}' not '${loginRole}'.`);
        setIsLoading(false);
        return;
      }

      // Success
      setLoggedInUser(profile);
      router.push(`/${profile.role}`);
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName || !regEmail) {
      setErrorMsg("Please fill in Name and Email fields.");
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      try {
        const newProfile = registerUser({
          fullName: regName,
          email: regEmail,
          role: regRole,
          phoneNumber: regPhone,
          collegeName: regRole === 'student' ? regCollege : undefined,
          department: regRole === 'student' ? regDept : undefined,
          academicYear: regRole === 'student' ? regYear : undefined
        });

        setSuccessMsg("Registration successful! Logging you in...");
        
        setTimeout(() => {
          setLoggedInUser(newProfile);
          router.push(`/${newProfile.role}`);
        }, 1000);

      } catch (err: any) {
        setErrorMsg(err.message || "An error occurred during registration.");
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Back Button */}
      <button
        onClick={() => router.push("/")}
        className="absolute -top-12 left-0 flex items-center space-x-2 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Landing</span>
      </button>

      {/* Brand Card */}
      <div className="glass-panel border-white/5 rounded-2xl p-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold font-outfit text-white tracking-wide">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            {activeTab === "login" 
              ? "Enter your sandbox credentials or switch accounts" 
              : "Fill in details to access the tracker dashboards"}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs font-sans">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-xs font-sans">
            {successMsg}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex bg-slate-950/40 rounded-xl p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-center text-xs font-medium rounded-lg transition-all ${
              activeTab === "login" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-center text-xs font-medium rounded-lg transition-all ${
              activeTab === "register" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student1@workshop.com"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Sandbox hint: Use <code className="text-indigo-400 font-mono">student1@workshop.com</code>, <code className="text-violet-400 font-mono">trainer1@workshop.com</code>, or <code className="text-pink-400 font-mono">admin@workshop.com</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Dashboard Role
              </label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value as UserRole)}
                className="w-full py-2 px-3 text-sm bg-[#090a0f] border border-white/10 text-white rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="student">Student</option>
                <option value="trainer">Trainer</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                  Account Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full py-2 px-3 text-sm bg-[#090a0f] border border-white/10 text-white rounded-xl focus:border-indigo-500 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Student specific fields */}
            {regRole === "student" && (
              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 font-medium font-outfit">
                  <Building className="h-3.5 w-3.5" />
                  <span>Academic Information</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      College Name
                    </label>
                    <input
                      type="text"
                      value={regCollege}
                      onChange={(e) => setRegCollege(e.target.value)}
                      placeholder="IIT Madras"
                      className="w-full px-3 py-1.5 text-xs glass-input rounded-lg focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full px-3 py-1.5 text-xs glass-input rounded-lg focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={regYear}
                    onChange={(e) => setRegYear(e.target.value)}
                    className="w-full py-1.5 px-3 text-xs bg-[#090a0f] border border-white/10 text-white rounded-lg focus:border-indigo-500"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Account</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-grid flex items-center justify-center p-4">
      {/* Background glow mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-[#090a0f] text-indigo-400">
          <div className="animate-pulse flex flex-col items-center space-y-2">
            <Loader2 className="h-10 w-10 animate-spin" />
            <span>Loading authentication configurations...</span>
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
