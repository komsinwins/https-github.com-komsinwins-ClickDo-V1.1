import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Download, Image as ImageIcon, X, Printer, Loader2 } from 'lucide-react';
import { Report } from '../../types';
import { SaveButton } from '../../components/SaveButton';

const PrintableReport = ({ report, project, id, lang }: { report: Report, project: any, id: string, lang: string }) => (
  <div id={id} className="bg-white text-black mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
    <div className="border-b-2 border-slate-800 pb-6 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900">{lang === 'th' ? `รายงาน ${report.type === 'daily' ? 'รายวัน' : report.type === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน'}` : `${report.type} Report`}</h1>
          <p className="text-lg text-slate-600 mt-1">{project?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{lang === 'th' ? 'วันที่' : 'Date'}</p>
          <p className="text-lg font-medium text-slate-800">{report.date}</p>
        </div>
      </div>
    </div>

    <div className="space-y-6">
      {report.progressDesc && (
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">{lang === 'th' ? '1. ความคืบหน้า' : '1. Progress'}</h2>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{report.progressDesc}</p>
        </section>
      )}
      
      {report.problems && (
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">{lang === 'th' ? '2. ปัญหาและอุปสรรค' : '2. Problems & Obstacles'}</h2>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{report.problems}</p>
        </section>
      )}

      {report.solutions && (
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">{lang === 'th' ? '3. การแก้ไข' : '3. Solutions'}</h2>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{report.solutions}</p>
        </section>
      )}

      {report.nextSteps && (
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">{lang === 'th' ? '4. ขั้นตอนต่อไป' : '4. Next Steps'}</h2>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{report.nextSteps}</p>
        </section>
      )}

      {report.remarks && (
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">{lang === 'th' ? '5. หมายเหตุ' : '5. Remarks'}</h2>
          <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{report.remarks}</p>
        </section>
      )}
    </div>

    {report.photos && report.photos.length > 0 && (
      <div className="mt-10" style={{ pageBreakBefore: 'always' }}>
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-200 pb-1">{lang === 'th' ? 'รูปภาพแนบ' : 'Attached Photos'}</h2>
        <div className="grid grid-cols-2 gap-6">
          {report.photos.map((photo, i) => (
            <div key={i} className="break-inside-avoid shadow-sm rounded-lg border border-slate-200 p-2">
              <div className="aspect-[4/3] w-full rounded overflow-hidden bg-slate-50 mb-2">
                <img src={photo.url} className="w-full h-full object-contain" alt={`Attachment ${i+1}`} />
              </div>
              {photo.caption && <p className="text-sm text-slate-600 text-center font-medium">{photo.caption}</p>}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export function Reports({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [isCreating, setIsCreating] = useState(false);
  const [reportType, setReportType] = useState<'daily'|'weekly'|'monthly'>('daily');
  
  const project = data.projects.find(p => p.id === projectId);
  const reports = data.reports.filter(r => r.projectId === projectId && r.type !== 'closeout');

  // Form state
  const [date, setDate] = useState('');
  const [progressDesc, setProgressDesc] = useState('');
  const [problems, setProblems] = useState('');
  const [solutions, setSolutions] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<{url: string, caption: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map((file: File) => {
        return new Promise<{url: string, caption: string}>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({ url: ev.target?.result as string, caption: '' });
          reader.readAsDataURL(file);
        });
      });
      Promise.all(newPhotos).then(results => setPhotos([...photos, ...results]));
    }
  };

  const handleSave = () => {
    const newReport: Report = {
      id: uuidv4(),
      projectId,
      type: reportType,
      date,
      progressDesc,
      problems,
      solutions,
      nextSteps,
      remarks,
      photos
    };
    updateData({ reports: [...data.reports, newReport] });
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setDate(''); setProgressDesc(''); setProblems(''); setSolutions(''); setNextSteps(''); setRemarks(''); setPhotos([]);
  };

  const deleteReport = (id: string) => {
    updateData({ reports: data.reports.filter(r => r.id !== id) });
  };

  const [printingReport, setPrintingReport] = React.useState<Report | null>(null);
  const [isExportingPDF, setIsExportingPDF] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleAfterPrint = () => setPrintingReport(null);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handlePrint = (report: Report) => {
    setPrintingReport(report);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const exportPDF = async (report: Report) => {
    window.print();
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5"/></button>
          <h3 className="text-xl font-bold">{lang === 'th' ? 'สร้างรายงานใหม่' : 'New Report'}</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? 'ประเภทรายงาน' : 'Report Type'}</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="w-full mt-1 p-2 border border-slate-300 rounded-lg">
              <option value="daily">{lang === 'th' ? 'รายวัน' : 'Daily'}</option>
              <option value="weekly">{lang === 'th' ? 'รายสัปดาห์' : 'Weekly'}</option>
              <option value="monthly">{lang === 'th' ? 'รายเดือน' : 'Monthly'}</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? 'วันที่' : 'Date'}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded-lg" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '1. ความคืบหน้า' : '1. Progress'}</label>
            <textarea rows={3} value={progressDesc} onChange={e => setProgressDesc(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '2. ปัญหาและอุปสรรค' : '2. Problems & Obstacles'}</label>
            <textarea rows={3} value={problems} onChange={e => setProblems(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '3. การแก้ไข' : '3. Solutions'}</label>
            <textarea rows={3} value={solutions} onChange={e => setSolutions(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '4. ขั้นตอนต่อไป' : '4. Next Steps'}</label>
            <textarea rows={3} value={nextSteps} onChange={e => setNextSteps(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '5. หมายเหตุ' : '5. Remarks'}</label>
            <textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-slate-700">{lang === 'th' ? 'รูปภาพ (สูงสุด 6 รูปต่อหน้าใน PDF)' : 'Photos (Max 6 per page in PDF)'}</h4>
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4" /> {lang === 'th' ? 'เพิ่มรูปภาพ' : 'Add Photos'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo, i) => (
              <div key={i} className="border border-slate-200 rounded-lg overflow-hidden relative">
                <button onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"><Trash2 className="w-3 h-3" /></button>
                <img src={photo.url} alt={`Upload ${i}`} className="w-full h-32 object-cover" />
                <input 
                  type="text" 
                  value={photo.caption} 
                  onChange={e => {
                    const newPhotos = [...photos];
                    newPhotos[i].caption = e.target.value;
                    setPhotos(newPhotos);
                  }}
                  placeholder={lang === 'th' ? 'คำบรรยาย...' : 'Caption...'}
                  className="w-full p-2 text-sm border-t border-slate-200 focus:outline-none focus:bg-slate-50"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-200">
          <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">{lang === 'th' ? 'บันทึกรายงาน' : 'Save Report'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}
      </style>

      {printingReport && (
        <div id="print-area">
          <PrintableReport report={printingReport} project={project} id="current-print" lang={lang} />
        </div>
      )}

      <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'รายงานโครงการ' : 'Project Reports'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'สรุปรายงานการปฏิบัติงาน รายวัน รายสัปดาห์ และรายเดือน' : 'Daily, weekly, and monthly project progress reports.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            {lang === 'th' ? 'สร้างรายงาน' : 'Create Report'}
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกรายงานโครงการเรียบร้อยแล้ว' : 'Reports saved successfully'} />
        </div>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {lang === 'th' ? 'ยังไม่ได้สร้างรายงาน' : 'No reports created yet.'}
          </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded uppercase tracking-wider">{report.type}</span>
                  <span className="font-bold text-slate-800">{report.date}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">{report.progressDesc || (lang === 'th' ? 'ไม่มีรายละเอียด' : 'No description provided')}</p>
                <div className="text-xs text-slate-400 mt-2">{lang === 'th' ? `แนบรูปภาพ ${report.photos.length} รูป` : `${report.photos.length} photos attached`}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handlePrint(report)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors" title={lang === 'th' ? 'พิมพ์ขนาด A4' : "Print to A4"}>
                  <Printer className="w-4 h-4" /> {lang === 'th' ? 'พิมพ์' : 'Print'}
                </button>
                <button onClick={() => handlePrint(report)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors" title={lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : "Print / Export PDF"}>
                  <Download className="w-4 h-4" /> PDF
                </button>
                <button onClick={() => deleteReport(report.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2" title={lang === 'th' ? 'ลบรายงาน' : "Delete Report"}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
