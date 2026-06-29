"use client";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function ConnectionStatus() {
  const [status, setStatus] = React.useState<"checking" | "connected" | "error">("checking");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [showToast, setShowToast] = React.useState(false);

  const checkConnection = async () => {
    setStatus("checking");
    setErrorMessage("");
    try {
      // Run a simple query to verify database reachability
      const { error } = await supabase.from("profiles").select("count", { count: "exact", head: true });
      
      if (error) {
        throw error;
      }
      setStatus("connected");
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    } catch (err: any) {
      console.warn("Supabase Connection Check Failed:", err?.message || String(err));
      setStatus("error");
      setErrorMessage(err.message || "Failed to query the database. Check your API keys and table definitions.");
      setShowToast(true);
    }
  };

  React.useEffect(() => {
    checkConnection();
  }, []);

  if (!showToast && status !== "error") return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full animate-fade-in-up font-sans">
      {status === "connected" && showToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-xl flex items-start space-x-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Supabase Connected</h4>
            <p className="text-xs text-slate-500 mt-1">Live database connection verified successfully.</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl shadow-xl flex items-start space-x-3">
          <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Database Connection Error</h4>
            <p className="text-xs text-slate-500 mt-1">
              Could not establish connection to the Supabase database.
            </p>
            <p className="text-[10px] text-rose-600 font-mono mt-2 bg-rose-100/50 p-2 rounded-lg break-all">
              {errorMessage}
            </p>
            <button
              onClick={checkConnection}
              className="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold transition-colors border-0 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
