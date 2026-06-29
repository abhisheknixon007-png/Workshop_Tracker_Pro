"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, ArrowLeft, Loader2, User, Mail, Building, Phone, Lock } from "lucide-react";
import { getLoggedInUser, setLoggedInUser, registerUser, loginUser } from "@/lib/auth";
import { UserRole } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set default view based on query string
  const initialTab = searchParams.get("tab") === "register" ? "register" : "login";
  const [activeTab, setActiveTab] = React.useState<"login" | "register">(initialTab);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [loginRole, setLoginRole] = React.useState<UserRole>("student");
  
  // Register Form States
  const [regName, setRegName] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const profile = await loginUser(loginEmail.trim(), loginPassword);

      if (profile.role !== loginRole) {
        setErrorMsg(`Email matches a profile, but the role registered is '${profile.role}' not '${loginRole}'.`);
        setIsLoading(false);
        return;
      }

      // Success
      router.push(`/${profile.role}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify your email, password, and status.");
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!regName || !regEmail || !regPassword) {
      setErrorMsg("Please fill in Name, Email, and Password fields.");
      setIsLoading(false);
      return;
    }

    try {
      const newProfile = await registerUser({
        fullName: regName,
        email: regEmail,
        role: regRole,
        phoneNumber: regPhone,
        collegeName: (regRole === 'student' || regRole === 'trainer') ? regCollege : undefined,
        department: (regRole === 'student' || regRole === 'trainer') ? regDept : undefined,
        academicYear: regRole === 'student' ? regYear : undefined,
        password: regPassword
      });

      if (newProfile.status === 'Approved') {
        setSuccessMsg("Registration successful! Logging you in...");
        setTimeout(async () => {
          try {
            await loginUser(regEmail, regPassword);
            router.push(`/${newProfile.role}`);
          } catch (loginErr: any) {
            setErrorMsg("Registration succeeded, but auto-login failed. Please sign in manually.");
            setIsLoading(false);
          }
        }, 1500);
      } else {
        setSuccessMsg("Your account has been created successfully and is awaiting admin approval.");
        setIsLoading(false);
        
        // Clear inputs
        setRegName("");
        setRegEmail("");
        setRegPassword("");
        setRegPhone("");
        setRegCollege("");
        setRegDept("");
        
        // Redirect to login tab after 4 seconds
        setTimeout(() => {
          setActiveTab("login");
          setSuccessMsg("");
        }, 4000);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during registration.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative">
      {/* Back Button */}
      <button
        onClick={() => router.push("/")}
        className="absolute -top-12 left-0 flex items-center space-x-2 text-slate-500 hover:text-indigo-650 text-sm transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Landing</span>
      </button>

      {/* Brand Card */}
      <div className="glass-panel border-white/5 rounded-2xl p-8 shadow-2xl relative">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold font-outfit text-slate-850 tracking-wide">
            {activeTab === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-sans">
            {activeTab === "login" 
              ? "Enter your credentials to access the tracker dashboards" 
              : "Fill in details to register a new account"}
          </p>
        </div>

        {/* Error / Success Alerts */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-sans whitespace-pre-line">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-sans">
            {successMsg}
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6 border border-slate-200/50">
          <button
            type="button"
            onClick={() => { setActiveTab("login"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-center text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "login" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-850"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-center text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "register" ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:text-slate-850"
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN FORM */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student1@workshop.com"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-655 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                Dashboard Role
              </label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value as UserRole)}
                className="w-full py-2 px-3 text-sm bg-white border border-slate-200 text-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="student">Student</option>
                <option value="trainer">Trainer</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
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
              <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                  Account Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full py-2 px-3 text-sm bg-white border border-slate-200 text-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
                >
                  <option value="student">Student</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-650 mb-1.5 uppercase tracking-wide">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2 text-sm glass-input rounded-xl focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Student & Trainer specific fields */}
            {(regRole === "student" || regRole === "trainer") && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="inline-flex items-center space-x-1.5 text-xs text-indigo-650 font-medium font-outfit">
                  <Building className="h-3.5 w-3.5" />
                  <span>{regRole === "student" ? "Academic Information" : "Institution Information"}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      College Name
                    </label>
                    <input
                      type="text"
                      value={regCollege}
                      onChange={(e) => setRegCollege(e.target.value)}
                      placeholder="IIT Madras"
                      className="w-full px-3 py-1.5 text-xs glass-input rounded-lg focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full px-3 py-1.5 text-xs glass-input rounded-lg focus:border-indigo-500 text-slate-800 bg-white border border-slate-200"
                    />
                  </div>
                </div>

                {regRole === "student" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={regYear}
                      onChange={(e) => setRegYear(e.target.value)}
                      className="w-full py-1.5 px-3 text-xs bg-white border border-slate-200 text-slate-850 rounded-lg focus:border-indigo-500"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-[#f5f7fb] text-indigo-600">
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
