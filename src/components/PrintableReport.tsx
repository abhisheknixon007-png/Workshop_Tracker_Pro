import * as React from "react";
import { Download, Printer, Award, BookOpen, Clock, Users, ArrowUpRight } from "lucide-react";
import { Workshop, Profile, StudentProgressSummary } from "@/lib/types";

interface PrintableReportProps {
  workshop: Workshop;
  trainer: Profile | null;
  progressList: StudentProgressSummary[];
  aiInsights: {
    topPerformers: { name: string; score: number }[];
    atRiskStudents: { name: string; reason: string }[];
    attendanceTrends: string;
    actionableInsights: string[];
  } | null;
  onClose: () => void;
}

export default function PrintableReport({
  workshop,
  trainer,
  progressList,
  aiInsights,
  onClose
}: PrintableReportProps) {
  const handlePrint = () => {
    const printContent = document.getElementById("printable-report-container")?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Executive Report - ${workshop.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;650;700;800&display=swap');
            
            body {
              margin: 0;
              padding: 40px;
              background-color: #ffffff;
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              -webkit-print-color-adjust: exact;
            }

            .report-header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }

            .report-title {
              font-family: 'Outfit', sans-serif;
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }

            .report-subtitle {
              font-size: 14px;
              color: #64748b;
              margin-top: 5px;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }

            .meta-card {
              background-color: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              padding: 15px;
            }

            .meta-label {
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.5px;
            }

            .meta-value {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 5px;
            }

            .section-title {
              font-family: 'Outfit', sans-serif;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 30px;
              margin-bottom: 15px;
              border-left: 4px solid #4f46e5;
              padding-left: 10px;
            }

            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              font-size: 12px;
            }

            .data-table th {
              background-color: #f8fafc;
              border-bottom: 2px solid #e2e8f0;
              color: #475569;
              font-weight: 600;
              text-align: left;
              padding: 10px 12px;
            }

            .data-table td {
              border-bottom: 1px solid #f1f5f9;
              padding: 10px 12px;
              color: #334155;
            }

            .data-table tr:nth-child(even) {
              background-color: #fcfcfd;
            }

            .badge {
              display: inline-block;
              padding: 2px 6px;
              font-size: 10px;
              font-weight: 600;
              border-radius: 4px;
            }

            .badge-success { background-color: #dcfce7; color: #15803d; }
            .badge-primary { background-color: #e0e7ff; color: #4338ca; }
            .badge-warning { background-color: #fef3c7; color: #b45309; }

            .insight-box {
              background-color: #eef2ff;
              border: 1px solid #e0e7ff;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
            }

            .insight-title {
              font-family: 'Outfit', sans-serif;
              font-weight: 700;
              font-size: 14px;
              color: #312e81;
              margin: 0 0 10px 0;
            }

            .insight-body {
              font-size: 12px;
              color: #3730a3;
              line-height: 1.5;
            }

            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }

            @page {
              size: portrait;
              margin: 20mm;
            }
          </style>
        </head>
        <body>
          <div id="report-root">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const totalStudents = progressList.length;
  const avgAttendance = totalStudents > 0 
    ? Math.round(progressList.reduce((acc, curr) => acc + curr.attendancePct, 0) / totalStudents)
    : 0;
  const avgGrade = totalStudents > 0
    ? Math.round(progressList.reduce((acc, curr) => acc + curr.averageScore, 0) / totalStudents)
    : 0;
  const eligibleCount = progressList.filter(p => p.isEligibleForCertificate || p.certificateStatus === 'Issued').length;
  const certificationRate = totalStudents > 0 ? Math.round((eligibleCount / totalStudents) * 100) : 0;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Report Container */}
      <div className="w-full overflow-x-auto p-4 flex justify-center bg-slate-900/40 rounded-2xl border border-white/5">
        <div
          id="printable-report-container"
          className="w-[800px] bg-white text-slate-800 p-10 shadow-2xl relative select-none rounded-lg"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-100 pb-5 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold font-outfit text-slate-900 tracking-wide">
                Workshop Performance Report
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Executive analytics summary compiled on {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono px-2 py-1 bg-indigo-50 text-indigo-650 rounded-md font-bold uppercase">
                Internal Summary
              </span>
            </div>
          </div>

          {/* Workshop Details block */}
          <div className="mb-6 grid grid-cols-2 gap-6 text-xs bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Workshop Name</span>
              <span className="text-slate-800 font-bold block mt-1 text-sm">{workshop.name}</span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-3">Instructor / Trainer</span>
              <span className="text-slate-800 font-semibold block mt-1">{trainer?.full_name || "Not Assigned"}</span>
            </div>
            <div>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Date Range</span>
              <span className="text-slate-800 font-semibold block mt-1">{workshop.start_date} to {workshop.end_date}</span>
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-3">Status</span>
              <span className="text-slate-805 block mt-1 font-bold uppercase tracking-wider text-indigo-600 text-[10px]">{workshop.status}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Learners</span>
              <span className="text-xl font-extrabold text-slate-800 block mt-1">{totalStudents}</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avg Attendance</span>
              <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{avgAttendance}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Class Average</span>
              <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{avgGrade}%</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Cert. Rate</span>
              <span className="text-xl font-extrabold text-emerald-600 block mt-1 font-mono">{certificationRate}%</span>
            </div>
          </div>

          {/* AI Insights (If available) */}
          {aiInsights && (
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-5 mb-6 text-xs text-indigo-950 font-sans">
              <h4 className="font-bold text-indigo-900 text-sm flex items-center space-x-1.5 mb-3 font-outfit">
                <span>AI Performance Evaluation Insights</span>
              </h4>
              <p className="leading-relaxed text-slate-650">{aiInsights.attendanceTrends}</p>
              
              <div className="mt-4 grid grid-cols-2 gap-6 pt-3 border-t border-indigo-100/50">
                <div>
                  <h5 className="font-bold text-indigo-900 mb-1.5 uppercase text-[9px] tracking-wider">Top Performers</h5>
                  <ul className="space-y-1">
                    {aiInsights.topPerformers.map((p, i) => (
                      <li key={i} className="flex justify-between items-center text-slate-600 font-mono text-[11px]">
                        <span>{p.name}</span>
                        <span className="font-bold text-indigo-650">{p.score}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-bold text-indigo-900 mb-1.5 uppercase text-[9px] tracking-wider">Actionable Recommendations</h5>
                  <ul className="space-y-1 pl-4 list-disc text-slate-500 text-[10px]">
                    {aiInsights.actionableInsights.slice(0, 3).map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Learners Roster */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 font-outfit border-b border-slate-100 pb-1">
              Class Roster & Competencies Summary
            </h4>
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Email Address</th>
                  <th className="py-2 px-3 text-center">Attendance</th>
                  <th className="py-2 px-3 text-center">Avg Grade</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {progressList.map(p => (
                  <tr key={p.studentId} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-800">{p.studentName}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{p.email}</td>
                    <td className="py-2 px-3 text-center font-mono">{p.attendancePct}%</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-[#b09356]">{p.averageScore}%</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        p.certificateStatus === 'Issued' ? 'bg-emerald-100 text-emerald-800' :
                        p.isEligibleForCertificate ? 'bg-indigo-100 text-indigo-850' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {p.certificateStatus === 'Issued' ? 'Certified' : p.certificateStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {progressList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No student records available for this workshop.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Metadata */}
          <div className="w-full flex justify-between text-[8px] text-slate-400 font-mono tracking-wider pt-4 mt-8 border-t border-slate-100">
            <span>ISSUED BY: WORKSHOP TRACKER PRO SYSTEMS</span>
            <span>DATA BLOCK ID: WK-${workshop.id.substring(0, 8).toUpperCase()}</span>
            <span>VERIFIED ON: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex space-x-3 w-full justify-center">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-650 text-white font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer border-0"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save as PDF</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-350 font-medium hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <span>Close Report</span>
        </button>
      </div>
    </div>
  );
}
