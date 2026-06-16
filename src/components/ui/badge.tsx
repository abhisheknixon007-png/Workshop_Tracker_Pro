import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';
  glow?: boolean;
}

export function Badge({ 
  className = "", 
  variant = 'default', 
  glow = false,
  ...props 
}: BadgeProps) {
  const baseStyle = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-all duration-300";
  
  const variants = {
    default: "bg-slate-800 text-slate-200 border border-slate-700",
    secondary: "bg-indigo-950/40 text-indigo-300 border border-indigo-500/20",
    success: "bg-emerald-950/40 text-emerald-300 border border-emerald-500/20" + (glow ? " shadow-[0_0_8px_rgba(16,185,129,0.2)]" : ""),
    warning: "bg-amber-950/40 text-amber-300 border border-amber-500/20" + (glow ? " shadow-[0_0_8px_rgba(245,158,11,0.2)]" : ""),
    error: "bg-rose-950/40 text-rose-300 border border-rose-500/20" + (glow ? " shadow-[0_0_8px_rgba(244,63,94,0.2)]" : ""),
    info: "bg-sky-950/40 text-sky-300 border border-sky-500/20" + (glow ? " shadow-[0_0_8px_rgba(14,165,233,0.2)]" : ""),
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

// Attendance Badge Helper
export function AttendanceBadge({ status }: { status: string }) {
  switch (status) {
    case 'Present':
      return <Badge variant="success" glow>Present</Badge>;
    case 'Absent':
      return <Badge variant="error">Absent</Badge>;
    case 'Late':
      return <Badge variant="warning">Late</Badge>;
    case 'Excused':
      return <Badge variant="info">Excused</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

// Workshop Status Badge Helper
export function WorkshopStatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case 'active':
      return <Badge variant="success" className="capitalize">Active</Badge>;
    case 'completed':
      return <Badge variant="info" className="capitalize">Completed</Badge>;
    case 'draft':
      return <Badge variant="secondary" className="capitalize">Draft</Badge>;
    case 'archived':
      return <Badge variant="default" className="capitalize">Archived</Badge>;
    default:
      return <Badge className="capitalize">{status}</Badge>;
  }
}
