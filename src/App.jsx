import React, { useState, useEffect } from 'react';
import { MoreVertical, FileText, X } from 'lucide-react';

const MESSAGES = [
  "Analyzing layout...",
  "Applying OCR...",
  "Extracting text...",
  "Optimizing images..."
];

function App() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-mesh min-h-screen flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="p-6 flex items-center justify-between" data-purpose="app-header">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">PDFConvert</span>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <MoreVertical className="h-6 w-6" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-8 pb-20" data-purpose="conversion-status-container">

        {/* File Preview Thumbnail */}
        <section className="mb-12 relative flex items-center justify-center flex-col" data-purpose="file-preview">
          <div className="w-32 h-44 bg-white rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden animate-pulse-soft">
            {/* PDF Icon Placeholder */}
            <div className="bg-red-50 p-3 rounded-full mb-3">
              <FileText className="h-8 w-8 text-red-500" strokeWidth={2} />
            </div>
            <div className="px-4 text-center">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Preview</p>
              <p className="text-xs font-medium text-slate-600 truncate w-24">annual_report_2023.pdf</p>
            </div>

            {/* Decorative "Scanning" Line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30 blur-sm translate-y-20 animate-bounce"></div>
          </div>

          {/* Conversion Type Badge */}
          <div className="absolute -bottom-3 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
            PDF TO DOCX
          </div>
        </section>

        {/* Progress Information */}
        <section className="w-full max-w-sm text-center" data-purpose="progress-metrics">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Converting file...</h2>
          <p className="text-slate-500 font-medium mb-8 flex items-center justify-center gap-2" id="status-message">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
            {MESSAGES[currentMessageIndex]}
          </p>

          {/* Progress Bar Container */}
          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-4 relative" data-purpose="progress-bar-wrapper">
            <div className="h-full bg-blue-600 rounded-full animate-fill relative transition-all duration-500 ease-out" id="progress-bar" style={{ width: '65%' }}>
              {/* Glossy effect on progress bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-progress-glow"></div>
            </div>
          </div>

          <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
            <span>65%</span>
            <span>2.4 MB / 3.8 MB</span>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="p-8 flex flex-col gap-4" data-purpose="action-controls">
        <button className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl shadow-sm active:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2" data-purpose="cancel-button">
          <X className="h-5 w-5" />
          Cancel Conversion
        </button>
        <p className="text-center text-[11px] text-slate-400 px-8">
          Your files are encrypted and will be deleted automatically after conversion.
        </p>
      </footer>
    </div>
  );
}

export default App;