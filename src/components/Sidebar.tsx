import * as React from "react";
import { 
  LayoutDashboard, BookOpen, Calendar, Users, BarChart3, 
  Award, Settings, LogOut, CheckSquare, FileSpreadsheet, 
  MessageSquare, ChevronLeft, ChevronRight, GraduationCap,
  Database, DatabaseZap, ShieldAlert
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
      { id: "approvals", label: "Pending Approvals", icon: ShieldAlert },
      { id: "students", label: "Students", icon: Users },
      { id: "trainers", label: "Trainers", icon: Users },
      { id: "reports", label: "Reports", icon: BarChart3 },
      { id: "certificates", label: "Certificates", icon: Award },
      { id: "settings", label: "Rules & Settings", icon: Settings },
    ],
    trainer: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "workshops", label: "Workshops", icon: BookOpen },
      { id: "sessions", label: "Sessions", icon: Calendar },
      { id: "attendance", label: "Attendance", icon: FileSpreadsheet },
      { id: "activities", label: "Activities", icon: CheckSquare },
      { id: "assessments", label: "Assessments", icon: Award },
      { id: "progress", label: "Student Progress", icon: Users },
      { id: "students", label: "All Students", icon: Users },
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
      className={`bg-[#7a83f4] text-white flex flex-col justify-between transition-all duration-300 z-30 ${
        isCollapsed ? "w-20" : "w-64"
      } h-screen sticky top-0 shadow-lg`}
    >
      <div>
        {/* Logo Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-lg bg-white/15 text-white flex-shrink-0 shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg font-outfit tracking-wider text-white truncate">
                CertifyFlow
              </span>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md bg-white/10 border border-white/10 text-white/80 hover:text-white hover:bg-white/20 hidden md:block cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-white/10 bg-white/5 ${isCollapsed ? "flex justify-center" : ""}`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-10 w-10 rounded-full bg-white text-[#7a83f4] flex items-center justify-center font-bold shadow-md flex-shrink-0">
              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h4 className="font-semibold text-sm text-white font-outfit truncate">{user.full_name}</h4>
                <p className="text-xs text-white/80 truncate capitalize">{user.role} Dashboard</p>
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
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? "bg-white text-[#7a83f4] font-semibold shadow-md" 
                    : "text-white/80 hover:text-white hover:bg-white/10"
                } ${isCollapsed ? "justify-center" : "space-x-3"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[#7a83f4]" : "text-white/80"}`} />
                {!isCollapsed && <span className="text-sm font-sans tracking-wide">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls (Database indicator & Logout) */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {/* Database indicator pill */}
        {!isCollapsed ? (
          <div className={`flex items-center justify-between p-2 rounded-xl text-xs ${
            useMockDb ? "bg-amber-400/20 border border-amber-400/30 text-amber-200" : "bg-emerald-400/20 border border-emerald-400/30 text-emerald-200"
          }`}>
            <span className="flex items-center space-x-1.5 font-sans">
              {useMockDb ? <DatabaseZap className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
              <span>{useMockDb ? "Local Mock Data" : "Supabase Live"}</span>
            </span>
          </div>
        ) : (
          <div 
            className="flex justify-center p-2 text-slate-300 cursor-pointer"
            title={useMockDb ? "Database: Local Mock" : "Database: Supabase Live"}
          >
            {useMockDb ? <DatabaseZap className="h-4 w-4 text-amber-200" /> : <Database className="h-4 w-4 text-emerald-200" />}
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center p-3 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition-all duration-300 cursor-pointer ${
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
