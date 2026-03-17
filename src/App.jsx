import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, FileText, X, Upload } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

const MESSAGES = [
  "Analyzing layout...",
  "Applying OCR...",
  "Extracting text...",
  "Optimizing images..."
];

function App() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, error
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Status message rotation
  useEffect(() => {
    let interval;
    if (status === 'uploading' || status === 'processing') {
      interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setProgress(0);
      setErrorMsg('');
    }
  };

  const startConversion = async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(10); // initial progress

    try {
      const formData = new FormData();
      formData.append('model', 'PaddleOCR-VL-1.5');
      formData.append('optionalPayload', JSON.stringify({
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      }));
      formData.append('file', file);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.code !== 0 || !data.data || !data.data.jobId) {
        throw new Error(data.message || 'Failed to get job ID');
      }

      setJobId(data.data.jobId);
      setStatus('processing');
      setProgress(30);

      // Start polling
      pollJobStatus(data.data.jobId);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during upload.');
      setStatus('error');
    }
  };

  const pollJobStatus = (id) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/ocr/${id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch job status');
        }

        const data = await response.json();
        const state = data.data.state;

        if (state === 'pending') {
          setProgress(40);
        } else if (state === 'running') {
          const extractProgress = data.data.extractProgress;
          if (extractProgress) {
            const { totalPages, extractedPages } = extractProgress;
            // Scale progress from 40% to 90%
            const calculatedProgress = 40 + (extractedPages / Math.max(totalPages, 1)) * 50;
            setProgress(calculatedProgress);
          } else {
            setProgress(50);
          }
        } else if (state === 'done') {
          clearInterval(pollingIntervalRef.current);
          setProgress(95);
          await downloadAndGenerateDocx(data.data.resultUrl.jsonUrl);
        } else if (state === 'failed') {
          clearInterval(pollingIntervalRef.current);
          throw new Error(data.data.errorMsg || 'Job failed during processing');
        }

      } catch (err) {
        clearInterval(pollingIntervalRef.current);
        console.error(err);
        setErrorMsg(err.message || 'An error occurred while polling status.');
        setStatus('error');
      }
    }, 5000); // poll every 5 seconds
  };

  const downloadAndGenerateDocx = async (jsonlUrl) => {
    try {
      // Fetch the jsonl file directly or through another proxy if CORS is an issue.
      // Usually these s3 urls support CORS.
      const response = await fetch(jsonlUrl);
      if (!response.ok) {
        throw new Error('Failed to download result JSONL');
      }
      const text = await response.text();

      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const paragraphs = [];

      lines.forEach(line => {
        try {
          const parsed = JSON.parse(line);
          const results = parsed.result?.layoutParsingResults || [];
          results.forEach(res => {
            const markdownText = res.markdown?.text || "";
            // Very naive markdown to docx conversion for simple text blocks.
            // Split by newlines and create docx paragraphs.
            const textLines = markdownText.split('\n');
            textLines.forEach(tLine => {
              if (tLine.trim()) {
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun(tLine)],
                  })
                );
              }
            });
          });
        } catch (e) {
          console.warn('Failed to parse a JSONL line', e);
        }
      });

      if (paragraphs.length === 0) {
        paragraphs.push(new Paragraph({ children: [new TextRun("No text found.")] }));
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, file.name.replace(/\.[^/.]+$/, "") + ".docx");

      setStatus('done');
      setProgress(100);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate document.');
      setStatus('error');
    }
  };

  const handleCancel = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    setStatus('idle');
    setJobId(null);
    setProgress(0);
  };

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

        {status === 'idle' ? (
          <div className="w-full max-w-sm flex flex-col items-center">
             <div
              className="w-full h-48 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors mb-6"
              onClick={() => fileInputRef.current?.click()}
             >
                <Upload className="h-10 w-10 text-blue-500 mb-2" />
                <p className="text-sm font-medium text-slate-600">Click to upload PDF</p>
                <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                />
             </div>
             {file && (
               <button
                onClick={startConversion}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
               >
                 Start Conversion
               </button>
             )}
          </div>
        ) : status === 'done' ? (
           <div className="w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="h-10 w-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Conversion Complete!</h2>
              <p className="text-slate-500 font-medium mb-8">Your DOCX file has been downloaded.</p>
              <button
                onClick={() => setStatus('idle')}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Convert Another File
              </button>
           </div>
        ) : status === 'error' ? (
           <div className="w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <X className="h-10 w-10 text-red-500" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Conversion Failed</h2>
              <p className="text-slate-500 font-medium mb-8">{errorMsg}</p>
              <button
                onClick={() => setStatus('idle')}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl shadow-sm hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Try Again
              </button>
           </div>
        ) : (
          <>
            {/* File Preview Thumbnail */}
            <section className="mb-12 relative flex items-center justify-center flex-col" data-purpose="file-preview">
              <div className="w-32 h-44 bg-white rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col items-center justify-center relative overflow-hidden animate-pulse-soft">
                {/* PDF Icon Placeholder */}
                <div className="bg-red-50 p-3 rounded-full mb-3">
                  <FileText className="h-8 w-8 text-red-500" strokeWidth={2} />
                </div>
                <div className="px-4 text-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Preview</p>
                  <p className="text-xs font-medium text-slate-600 truncate w-24">{file?.name || 'document.pdf'}</p>
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
                <div className="h-full bg-blue-600 rounded-full relative transition-all duration-500 ease-out" id="progress-bar" style={{ width: `${progress}%` }}>
                  {/* Glossy effect on progress bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-progress-glow"></div>
                </div>
              </div>

              <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
                <span>{Math.round(progress)}%</span>
                <span>{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '...'}</span>
              </div>
            </section>
          </>
        )}

      </main>

      {/* Footer */}
      {(status === 'uploading' || status === 'processing') && (
        <footer className="p-8 flex flex-col gap-4" data-purpose="action-controls">
          <button
            onClick={handleCancel}
            className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-semibold rounded-2xl shadow-sm active:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            data-purpose="cancel-button"
          >
            <X className="h-5 w-5" />
            Cancel Conversion
          </button>
          <p className="text-center text-[11px] text-slate-400 px-8">
            Your files are encrypted and will be deleted automatically after conversion.
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;