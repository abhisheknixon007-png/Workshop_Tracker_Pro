import * as React from "react";
import { Download, Printer, Award, CheckCircle } from "lucide-react";
import { Certificate, Profile, Workshop } from "@/lib/types";

interface CertificatePDFProps {
  certificate: Certificate;
  student: Profile;
  workshop: Workshop;
  trainerName?: string;
  onClose?: () => void;
}

export default function CertificatePDF({ 
  certificate, 
  student, 
  workshop, 
  trainerName = "Dr. Elena Rostova",
  onClose 
}: CertificatePDFProps) {
  
  const handlePrint = () => {
    // Open a print window specifically for the certificate to keep it clean and print-ready
    const printContent = document.getElementById("printable-certificate-container")?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${student.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Great+Vibes&family=Montserrat:wght@400;600&display=swap');
            
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              font-family: 'Montserrat', sans-serif;
              -webkit-print-color-adjust: exact;
            }
            
            .cert-container {
              width: 1120px;
              height: 792px;
              box-sizing: border-box;
              position: relative;
              background-color: #fcfbf7;
              background-image: radial-gradient(#f3f0e3 1px, transparent 1px);
              background-size: 20px 20px;
              padding: 40px;
              margin: 0 auto;
              overflow: hidden;
            }
            
            .outer-border {
              border: 8px double #c5a86a;
              height: 100%;
              width: 100%;
              box-sizing: border-box;
              padding: 12px;
              position: relative;
            }
            
            .inner-border {
              border: 2px solid #c5a86a;
              height: 100%;
              width: 100%;
              box-sizing: border-box;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              position: relative;
            }

            /* Corner Ornaments */
            .corner {
              position: absolute;
              width: 40px;
              height: 40px;
              border-color: #c5a86a;
              border-style: solid;
              display: block;
            }
            .top-left { top: 10px; left: 10px; border-width: 3px 0 0 3px; }
            .top-right { top: 10px; right: 10px; border-width: 3px 3px 0 0; }
            .bottom-left { bottom: 10px; left: 10px; border-width: 0 0 3px 3px; }
            .bottom-right { bottom: 10px; right: 10px; border-width: 0 3px 3px 0; }

            .badge-gold {
              color: #c5a86a;
              margin-bottom: 5px;
            }
            
            .title {
              font-family: 'Cinzel', serif;
              font-size: 44px;
              font-weight: 800;
              color: #1e293b;
              margin: 5px 0;
              letter-spacing: 4px;
              text-transform: uppercase;
            }
            
            .subtitle {
              font-size: 16px;
              text-transform: uppercase;
              letter-spacing: 3px;
              color: #64748b;
              margin-top: 5px;
            }
            
            .presented-to {
              font-size: 15px;
              font-style: italic;
              color: #64748b;
              margin: 15px 0;
            }
            
            .student-name {
              font-family: 'Great Vibes', cursive;
              font-size: 58px;
              color: #c5a86a;
              margin: 0;
            }
            
            .divider {
              width: 200px;
              height: 2px;
              background: linear-gradient(to right, transparent, #c5a86a, transparent);
              margin: 10px 0;
            }
            
            .workshop-description {
              font-size: 15px;
              line-height: 1.6;
              color: #475569;
              max-width: 750px;
              margin: 10px 0;
            }
            
            .workshop-name {
              font-weight: 600;
              color: #1e293b;
            }
            
            .footer-row {
              display: flex;
              justify-content: space-between;
              width: 100%;
              margin-top: 25px;
              padding: 0 30px;
              box-sizing: border-box;
              align-items: flex-end;
            }
            
            .signature-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 220px;
            }
            
            .signature-line {
              width: 100%;
              border-bottom: 1px solid #cbd5e1;
              margin-bottom: 8px;
            }
            
            .signature-img {
              font-family: 'Great Vibes', cursive;
              font-size: 26px;
              color: #1e293b;
              height: 30px;
              margin-bottom: -5px;
            }
            
            .signature-title {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .seal-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
            }
            
            .seal-bg {
              width: 80px;
              height: 80px;
              background-color: #c5a86a;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #ffffff;
              box-shadow: 0 4px 10px rgba(197, 168, 106, 0.4);
              margin-bottom: 5px;
            }
            
            .verify-text {
              font-size: 9px;
              color: #94a3b8;
              margin-top: 5px;
              letter-spacing: 0.5px;
            }
            
            .cert-meta {
              position: absolute;
              bottom: 10px;
              left: 40px;
              right: 40px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #94a3b8;
              letter-spacing: 1px;
            }

            @page {
              size: landscape;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="cert-container">
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

  const formattedDate = new Date(certificate.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Visual Preview Container */}
      <div className="w-full overflow-x-auto p-4 flex justify-center bg-slate-950/40 rounded-xl border border-white/5">
        
        {/* Certificate Frame in screen preview */}
        <div 
          id="printable-certificate-container"
          className="w-[900px] h-[636px] bg-[#fcfbf7] text-slate-800 p-8 shadow-2xl relative select-none flex-shrink-0"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {/* Double Golden Borders */}
          <div className="border-[6px] double border-[#c5a86a] h-full w-full p-2 relative box-border">
            <div className="border border-[#c5a86a] h-full w-full p-8 flex flex-col items-center justify-between text-center box-border relative">
              
              {/* Corner Accents */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#c5a86a]" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#c5a86a]" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#c5a86a]" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#c5a86a]" />
              
              {/* Medal/Award Icon */}
              <div className="text-[#c5a86a] mb-1">
                <Award className="h-10 w-10 mx-auto" />
              </div>
              
              {/* Main Titles */}
              <div>
                <h1 className="text-3xl font-bold tracking-[6px] text-slate-800 uppercase font-serif" style={{ fontFamily: "'Cinzel', serif" }}>
                  Certificate of Achievement
                </h1>
                <p className="text-xs uppercase tracking-[4px] text-slate-500 font-semibold mt-2">
                  Live Workshop Assessment System
                </p>
              </div>
              
              {/* Presented To */}
              <div className="my-2">
                <p className="text-xs italic text-slate-500">This is proudly presented to</p>
                <h2 className="text-4xl font-normal text-[#c5a86a] my-2" style={{ fontFamily: "'Great Vibes', cursive" }}>
                  {student.full_name}
                </h2>
                <div className="w-40 h-[1px] bg-gradient-to-r from-transparent via-[#c5a86a] to-transparent mx-auto" />
              </div>

              {/* Workshop Details */}
              <div className="max-w-[600px] text-xs leading-relaxed text-slate-600">
                For successfully fulfilling all configured requirements, demonstrating practical hands-on proficiency, 
                and completing all assessment parameters in the professional training course
                <p className="font-semibold text-sm text-slate-800 mt-2 font-sans">
                  "{workshop.name}"
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Completed on {formattedDate}
                </p>
              </div>

              {/* Signatures & Seal */}
              <div className="flex justify-between items-end w-full px-8 mt-4">
                
                {/* Left signature (Trainer) */}
                <div className="flex flex-col items-center w-40">
                  <div className="text-lg text-slate-800 h-6 leading-none italic font-serif" style={{ fontFamily: "'Great Vibes', cursive" }}>
                    {trainerName}
                  </div>
                  <div className="w-full border-b border-slate-300 my-1" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Course Trainer</p>
                </div>

                {/* Center Seal */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-[#c5a86a] text-white flex items-center justify-center shadow-lg relative border-4 border-[#e2d5b7]">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">VERIFIED SEAL</p>
                </div>

                {/* Right signature (Director) */}
                <div className="flex flex-col items-center w-40">
                  <div className="text-lg text-slate-800 h-6 leading-none italic font-serif" style={{ fontFamily: "'Great Vibes', cursive" }}>
                    Sarah Connor
                  </div>
                  <div className="w-full border-b border-slate-300 my-1" />
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Workshop Director</p>
                </div>
              </div>

              {/* Certificate Details metadata footer */}
              <div className="w-full flex justify-between text-[8px] text-slate-400 font-mono tracking-wider pt-2 mt-2 border-t border-slate-100">
                <span>ID: {certificate.certificate_number}</span>
                <span>SECURITY BLOCK: {certificate.qr_code}</span>
                <span>VERIFY AT: verify.certifyflow.com</span>
              </div>
              
            </div>
          </div>
        </div>

      </div>

      {/* Action Buttons Panel */}
      <div className="flex space-x-3 w-full justify-center">
        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save as PDF</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium hover:text-white hover:bg-white/10 transition-colors"
          >
            <span>Close Preview</span>
          </button>
        )}
      </div>
    </div>
  );
}
