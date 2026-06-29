"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { 
  GraduationCap, ArrowLeft, RefreshCw, CheckCircle2, 
  XCircle, AlertCircle, Info, Database, ShieldCheck, Key
} from "lucide-react";

interface TestStep {
  name: string;
  description: string;
  status: "idle" | "running" | "passed" | "failed";
  details?: string;
}

export default function TestConnectionPage() {
  const router = useRouter();
  const [globalStatus, setGlobalStatus] = React.useState<"idle" | "running" | "passed" | "failed">("idle");
  const [steps, setSteps] = React.useState<TestStep[]>([
    { name: "Environment Configuration", description: "Verify Supabase URL and Publishable Key are correctly set in env files.", status: "idle" },
    { name: "API Reachability", description: "Test connection to the Supabase endpoint.", status: "idle" },
    { name: "Database Schema Query", description: "Query profiles table count to verify database connection and schema layout.", status: "idle" },
    { name: "Database Write Integrity", description: "Perform a temporary insert and delete on audit logs to verify write permissions.", status: "idle" },
    { name: "Auth Service Verification", description: "Verify reachability of Supabase Auth systems.", status: "idle" }
  ]);

  const updateStepStatus = (index: number, status: TestStep["status"], details?: string) => {
    setSteps(prev => prev.map((step, idx) => idx === index ? { ...step, status, details } : step));
  };

  const runDiagnostics = async () => {
    setGlobalStatus("running");
    setSteps(prev => prev.map(s => ({ ...s, status: "idle", details: undefined })));

    // Step 0: Env Config
    updateStepStatus(0, "running");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      updateStepStatus(0, "failed", `Missing environment variables: ${missing.join(", ")}. Please check your .env.local file.`);
      setGlobalStatus("failed");
      return;
    }
    
    const maskedUrl = supabaseUrl.replace(/(.{8}).+(.{4})/, "$1...$2");
    const maskedKey = supabaseAnonKey.slice(0, 10) + "..." + supabaseAnonKey.slice(-6);
    updateStepStatus(0, "passed", `Supabase environment variables loaded.\nURL: ${maskedUrl}\nKey: ${maskedKey}`);

    // Step 1: API Reachability
    updateStepStatus(1, "running");
    try {
      const start = Date.now();
      const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, {
        headers: { apikey: supabaseAnonKey }
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        throw new Error(`Endpoint returned status ${res.status}: ${res.statusText}`);
      }
      updateStepStatus(1, "passed", `API successfully reached. Latency: ${latency}ms.`);
    } catch (err: any) {
      updateStepStatus(1, "failed", `Failed to reach Supabase API endpoints: ${err.message}`);
      setGlobalStatus("failed");
      return;
    }

    // Step 2: Database Schema Query
    updateStepStatus(2, "running");
    try {
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      updateStepStatus(2, "passed", `Database query successful. Profiles table has ${count} records.`);
    } catch (err: any) {
      updateStepStatus(2, "failed", `Could not query profiles table: ${err.message || JSON.stringify(err)}`);
      setGlobalStatus("failed");
      return;
    }

    // Step 3: Database Write Integrity
    updateStepStatus(3, "running");
    try {
      // Create a temporary audit log and delete it
      const { data: insertData, error: insertErr } = await supabase.from("audit_logs").insert({
        action: "TEST_CONNECTION",
        details: "Diagnostics run write integrity check",
        created_at: new Date().toISOString()
      }).select("id").single();

      if (insertErr || !insertData) {
        throw new Error(`Insert error: ${insertErr?.message || "No data returned"}`);
      }

      const { error: deleteErr } = await supabase.from("audit_logs").delete().eq("id", insertData.id);
      if (deleteErr) {
        throw new Error(`Delete error: ${deleteErr.message}`);
      }

      updateStepStatus(3, "passed", "Write integrity verified. Temporary logs successfully created and recycled.");
    } catch (err: any) {
      updateStepStatus(3, "failed", `Write test failed: ${err.message || JSON.stringify(err)}\nNote: This may be normal if Anonymous writes are disabled in RLS policies.`);
      // We don't fail the whole connection test since select count passed, but we warning
      updateStepStatus(3, "failed", `Database write permissions warning: ${err.message || JSON.stringify(err)}. (Anonymous users cannot write logs directly without log-in session).`);
    }

    // Step 4: Auth Service Verification
    updateStepStatus(4, "running");
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateStepStatus(4, "passed", `Auth system active. Session status checked: ${data.session ? "Session Active" : "No Active Sessions"}`);
    } catch (err: any) {
      updateStepStatus(4, "failed", `Auth check failed: ${err.message}`);
      setGlobalStatus("failed");
      return;
    }

    setGlobalStatus("passed");
  };

  React.useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#f4f6fc] text-slate-800 font-sans flex items-center justify-center p-4">
      {/* Background glow mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-2xl relative my-10">
        
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="absolute -top-12 left-0 flex items-center space-x-2 text-slate-500 hover:text-indigo-600 text-xs transition-colors bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Landing</span>
        </button>

        <div className="glass-panel border-slate-200/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden bg-white/95 border">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 border border-indigo-100 flex items-center justify-center shadow-md">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-outfit text-slate-800 tracking-wide">
                  Supabase Diagnostics
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Verifying connections, keys, tables, and API authentication integrity.
                </p>
              </div>
            </div>

            {/* Global Badge */}
            <div>
              {globalStatus === "running" && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold rounded-full animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Checking</span>
                </span>
              )}
              {globalStatus === "passed" && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Passed</span>
                </span>
              )}
              {globalStatus === "failed" && (
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold rounded-full">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Failed</span>
                </span>
              )}
            </div>
          </div>

          {/* Steps Loop */}
          <div className="space-y-6 my-8">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start space-x-4">
                {/* Icon State */}
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === "idle" && (
                    <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold">
                      {idx + 1}
                    </div>
                  )}
                  {step.status === "running" && (
                    <div className="w-6 h-6 rounded-full border border-indigo-100 bg-indigo-50 flex items-center justify-center">
                      <RefreshCw className="h-3.5 w-3.5 text-indigo-650 animate-spin" />
                    </div>
                  )}
                  {step.status === "passed" && (
                    <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                  {step.status === "failed" && (
                    <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-800 tracking-wide">{step.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                  
                  {step.details && (
                    <pre className="text-[10px] font-mono mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-650 leading-relaxed whitespace-pre-wrap break-all shadow-inner">
                      {step.details}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Info className="h-4 w-4 text-slate-400" />
              <span>Status logs refresh instantly.</span>
            </div>
            
            <button
              onClick={runDiagnostics}
              disabled={globalStatus === "running"}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/15 transition-all border-0 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${globalStatus === "running" ? "animate-spin" : ""}`} />
              <span>Run Diagnostics</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
