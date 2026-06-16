import * as React from "react";
import { 
  LayoutDashboard, BookOpen, Calendar, Users, BarChart3, 
  Award, Settings, LogOut, CheckSquare, FileSpreadsheet, 
  MessageSquare, ChevronLeft, ChevronRight, GraduationCap,
  Database, DatabaseZap
} from "lucide-react";
import { Profile } from "@/lib/types";
import { useMockDb } from "@/lib/supabase";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: Profile;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, user, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Dynamic Navigation definitions based on roles
  const navItems = {
    admin: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "workshops", label: "Workshops", icon: BookOpen },
      { id: "sessions", label: "Sessions", icon: Calendar },
      { id: "students", label: "Students", icon: Users },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "certificates", label: "Certificates", icon: Award },
      { id: "settings", label: "Rules & Settings", icon: Settings },
    ],
    trainer: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "attendance", label: "Attendance", icon: FileSpreadsheet },
      { id: "activities", label: "Activities", icon: CheckSquare },
      { id: "assessments", label: "Assessments", icon: Award },
      { id: "progress", label: "Student Progress", icon: Users },
    ],
    student: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "attendance", label: "Attendance", icon: Calendar },
      { id: "activities", label: "Activities", icon: CheckSquare },
      { id: "assessments", label: "Assessments", icon: Award },
      { id: "feedback", label: "AI & Trainer Feedback", icon: MessageSquare },
      { id: "certificates", label: "My Certificates", icon: Award },
    ]
  };

  const items = navItems[user.role] || [];

  return (
    <aside 
      className={`glass-panel border-r border-white/5 flex flex-col justify-between transition-all duration-300 z-30 ${
        isCollapsed ? "w-20" : "w-64"
      } h-screen sticky top-0`}
    >
      <div>
        {/* Logo Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 h-16">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-indigo-600 text-white flex-shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <GraduationCap className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg font-outfit tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent truncate">
                CertifyFlow
              </span>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hidden md:block"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-white/5 bg-white/2 ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h4 className="font-semibold text-sm text-white font-outfit truncate">{user.full_name}</h4>
                <p className="text-xs text-slate-400 truncate capitalize">{user.role} Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? "bg-indigo-600/20 text-indigo-300 border-l-4 border-indigo-500 font-medium" 
                    : "text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent"
                } ${isCollapsed ? "justify-center" : "space-x-3"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                {!isCollapsed && <span className="text-sm font-sans tracking-wide">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls (Database indicator & Logout) */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* Database indicator pill */}
        {!isCollapsed ? (
          <div className={`flex items-center justify-between p-2 rounded-xl text-xs ${
            useMockDb ? "bg-amber-950/20 border border-amber-500/20 text-amber-300" : "bg-emerald-950/20 border border-emerald-500/20 text-emerald-300"
          }`}>
            <span className="flex items-center space-x-1.5 font-sans">
              {useMockDb ? <DatabaseZap className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
              <span>{useMockDb ? "Local Mock Data" : "Supabase Live"}</span>
            </span>
          </div>
        ) : (
          <div 
            className="flex justify-center p-2 text-slate-400 cursor-pointer"
            title={useMockDb ? "Database: Local Mock" : "Database: Supabase Live"}
          >
            {useMockDb ? <DatabaseZap className="h-4 w-4 text-amber-400" /> : <Database className="h-4 w-4 text-emerald-400" />}
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center p-3 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/20 transition-all duration-300 ${
            isCollapsed ? "justify-center" : "space-x-3"
          }`}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="text-sm font-sans">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
