import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Report } from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function Closeout({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  const scopes = data.scopes.filter(s => s.projectId === projectId);
  
  // Find or create closeout report
  let closeoutReport = data.reports.find(r => r.projectId === projectId && r.type === 'closeout');

  const [problems, setProblems] = useState(closeoutReport?.problems || '');
  const [solutions, setSolutions] = useState(closeoutReport?.solutions || ''); // reusing solutions as "Operations Summary"
  const [photos, setPhotos] = useState<{url: string, caption: string}[]>(closeoutReport?.photos || []);
  
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
    const reportData: Report = {
      id: closeoutReport?.id || uuidv4(),
      projectId,
      type: 'closeout',
      date: new Date().toISOString().split('T')[0],
      progressDesc: '',
      problems,
      solutions, // Summary
      nextSteps: '',
      remarks: '',
      photos
    };
    
    if (closeoutReport) {
      updateData({ reports: data.reports.map(r => r.id === reportData.id ? reportData : r) });
    } else {
      updateData({ reports: [...data.reports, reportData] });
    }
    alert(lang === 'th' ? 'บันทึกรายงานสรุปโครงการแล้ว' : 'Closeout report saved.');
  };

  const exportPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFontSize(22);
    pdf.text(lang === 'th' ? `Project Summary Report` : `Project Summary Report`, 20, 20);
    pdf.setFontSize(12);
    pdf.text(`${lang === 'th' ? 'โครงการ:' : 'Project:'} ${project?.name}`, 20, 30);
    pdf.text(`${lang === 'th' ? 'วันที่:' : 'Date:'} ${new Date().toLocaleDateString()}`, 20, 38);
    
    let y = 50;
    const addSection = (title: string, content: string) => {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(content || '-', pageWidth - 40);
      pdf.text(lines, 20, y);
      y += (lines.length * 5) + 10;
    };

    // SOW Status
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(lang === 'th' ? '1. สถานะขอบเขตงาน' : '1. Scope of Work Status', 20, y);
    y += 8;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    scopes.forEach(s => {
      const statusText = s.progress === 100 ? (lang === 'th' ? '[เสร็จสมบูรณ์]' : '[Completed]') : `[${s.progress}%]`;
      const line = `${statusText} ${s.taskName}`;
      pdf.text(line, 20, y);
      y += 6;
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });
    y += 10;

    addSection(lang === 'th' ? '2. ปัญหาและอุปสรรค' : '2. Problems & Obstacles', problems);
    addSection(lang === 'th' ? '3. สรุปผลการดำเนินงาน' : '3. Operations Summary', solutions);

    // Photos (6 per page)
    if (photos.length > 0) {
      const photosPerPage = 6;
      for (let i = 0; i < photos.length; i += photosPerPage) {
        pdf.addPage();
        const pagePhotos = photos.slice(i, i + photosPerPage);
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(lang === 'th' ? 'รูปภาพประกอบ' : 'Attached Photos', 20, 20);
        pdf.setFont('helvetica', 'normal');
        
        let py = 30;
        pagePhotos.forEach((photo, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const px = 20 + (col * 90);
          const currentY = py + (row * 80);
          
          try {
            pdf.addImage(photo.url, 'JPEG', px, currentY, 80, 60);
            pdf.setFontSize(10);
            pdf.text(photo.caption || (lang === 'th' ? 'ไม่มีคำบรรยาย' : 'No caption'), px, currentY + 65, { maxWidth: 80 });
          } catch (e) {
            console.error(e);
          }
        });
      }
    }

    pdf.save(`Summary_Report_${project?.name}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}</h3>
          <p className="text-slate-500">{lang === 'th' ? 'รายงานและสถานะสุดท้าย' : 'Final report and status.'}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleSave} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">{lang === 'th' ? 'บันทึกร่าง' : 'Save Draft'}</button>
          <button onClick={exportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium">
            <Download className="w-4 h-4" /> {lang === 'th' ? 'ส่งออก PDF' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4">{lang === 'th' ? '1. สถานะขอบเขตงาน' : '1. Scope of Work Status'}</h4>
        <div className="space-y-2">
          {scopes.length === 0 ? <p className="text-slate-500">{lang === 'th' ? 'ไม่ได้กำหนดขอบเขตงาน' : 'No scope defined.'}</p> : 
            scopes.map(s => (
              <div key={s.id} className="flex items-center gap-3">
                {s.progress === 100 ? (
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">!</span>
                )}
                <span className={`text-sm ${s.progress === 100 ? 'text-slate-700' : 'text-slate-500'}`}>{s.taskName}</span>
                <span className="text-xs font-mono text-slate-400 ml-auto">{s.progress}%</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '2. ปัญหาและอุปสรรค' : '2. Problems & Obstacles'}</label>
          <textarea rows={4} value={problems} onChange={e => setProblems(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'อธิบายปัญหาที่พบ...' : 'Describe any problems encountered...'}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '3. สรุปผลการดำเนินงาน' : '3. Operations Summary'}</label>
          <textarea rows={4} value={solutions} onChange={e => setSolutions(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'สรุปผลการดำเนินงานโดยรวม...' : 'Summarize the overall operations...'}/>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-700">{lang === 'th' ? 'รูปภาพประกอบ (สูงสุด 6 รูปต่อหน้าใน PDF)' : 'Photos (Max 6 per page in PDF)'}</h4>
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
    </div>
  );
}
