import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Report } from '../../types';
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';

export function Closeout({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  const scopes = data.scopes.filter(s => s.projectId === projectId).sort((a, b) => (a.order || 0) - (b.order || 0));
  
  const ownerName = data.owners.find(o => o.id === project?.ownerId)?.name || '-';
  const managerName = data.projectManagers.find(m => m.id === project?.managerId)?.name || '-';
  const projectContacts = data.contacts.filter(c => c.projectId === projectId);
  const projectWorkers = data.workers.filter(w => w.projectId === projectId);

  // Find or create closeout report
  let closeoutReport = data.reports.find(r => r.projectId === projectId && r.type === 'closeout');

  const [problems, setProblems] = useState(closeoutReport?.problems || '');
  const [solutions, setSolutions] = useState(closeoutReport?.solutions || ''); // reusing solutions as "Operations Summary"
  const [remarks, setRemarks] = useState(closeoutReport?.remarks || '');
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
      solutions, 
      nextSteps: '',
      remarks,
      photos
    };
    
    if (closeoutReport) {
      updateData({ reports: data.reports.map(r => r.id === reportData.id ? reportData : r) });
    } else {
      updateData({ reports: [...data.reports, reportData] });
    }
    alert(lang === 'th' ? 'บันทึกรายงานสรุปโครงการแล้ว' : 'Closeout report saved.');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      // Briefly make the print area visible but off-screen to ensure proper rendering
      const printElement = printRef.current;
      printElement.style.display = 'block';
      
      const canvas = await html2canvas(printElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 794 // A4 width at 96 DPI
      });
      
      printElement.style.display = 'none';

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const totalPdfHeight = imgHeight * ratio;
      
      let heightLeft = totalPdfHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - totalPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, totalPdfHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Summary_Report_${project?.name || 'Project'}.pdf`);
    } catch (err) {
      console.error(err);
      alert(lang === 'th' ? 'เกิดข้อผิดพลาดในการสร้าง PDF' : 'Error generating PDF');
    } finally {
      setIsExporting(false);
    }
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
          <button disabled={isExporting} onClick={exportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 font-medium">
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} /> {isExporting ? (lang === 'th' ? 'กำลังส่งออก...' : 'Exporting...') : (lang === 'th' ? 'ส่งออก PDF' : 'Export PDF')}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? '1. รายละเอียดโครงการ' : '1. Project Details'}</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'ชื่อโครงการ:' : 'Project Name:'}</span> <span className="text-slate-800">{project?.name || '-'}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'เจ้าของโครงการ:' : 'Owner:'}</span> <span className="text-slate-800">{ownerName}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'สถานที่ติดตั้ง:' : 'Location:'}</span> <span className="text-slate-800">{project?.location || '-'}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'พื้นที่ติดตั้ง:' : 'Area:'}</span> <span className="text-slate-800">{project?.installationArea || '-'}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'ผู้จัดการโครงการ:' : 'Project Manager:'}</span> <span className="text-slate-800">{managerName}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start Date:'}</span> <span className="text-slate-800">{formatDate(project?.startDate)}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'วันที่สิ้นสุด (แผนงาน):' : 'Planned End Date:'}</span> <span className="text-slate-800">{formatDate(project?.endDate)}</span></div>
          <div><span className="font-medium text-slate-600">{lang === 'th' ? 'วันที่สิ้นสุดการดำเนินงาน:' : 'Actual End Date:'}</span> <span className="text-slate-800">{formatDate(project?.actualCompletionDate)}</span></div>
        </div>

        {project?.projectDetails && (
          <div className="mt-4">
            <span className="font-medium text-slate-600 mb-1 block">{lang === 'th' ? 'รายละเอียดเพิ่มเติม:' : 'Additional Details:'}</span>
            <p className="text-slate-800 text-sm bg-white p-3 border border-slate-200 rounded whitespace-pre-wrap">{project.projectDetails}</p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? '2. ผู้เกี่ยวข้องในโครงการ' : '2. Project Stakeholders'}</h4>
        {projectContacts.length === 0 ? (
          <p className="text-slate-500 text-sm">{lang === 'th' ? 'ไม่มีข้อมูลผู้เกี่ยวข้อง' : 'No stakeholders available.'}</p>
        ) : (
          <ul className="list-disc list-inside space-y-2">
            {projectContacts.map(c => (
              <li key={c.id} className="text-sm text-slate-700">
                <span className="font-semibold">{c.firstName} {c.lastName}</span>
                <span className="text-slate-500 ml-2">({c.role || '-'})</span>
                <span className="text-slate-600 ml-4">{lang === 'th' ? 'โทร:' : 'Tel:'} {c.phone || '-'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? '3. ผู้ปฏิบัติงาน' : '3. Workers'}</h4>
        {projectWorkers.length === 0 ? (
          <p className="text-slate-500 text-sm">{lang === 'th' ? 'ไม่มีข้อมูลผู้ปฏิบัติงาน' : 'No workers available.'}</p>
        ) : (
          <ul className="list-disc list-inside space-y-2">
            {projectWorkers.map(w => (
              <li key={w.id} className="text-sm text-slate-700">
                <span className="font-semibold">{w.firstName} {w.lastName}</span>
                <span className="text-slate-500 ml-2">({w.role || (lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Worker')})</span>
                <span className="text-slate-600 ml-4">{lang === 'th' ? 'โทร:' : 'Tel:'} {w.phone || '-'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? '4. ขอบเขตงานและขั้นตอนการทำงาน' : '4. Scope of Work & Schedule'}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse bg-white border border-slate-200 rounded">
            <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่องาน' : 'Task'}</th>
                <th className="p-3 font-semibold text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scopes.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-slate-500">
                    {lang === 'th' ? 'ไม่มีข้อมูลงาน' : 'No tasks defined.'}
                  </td>
                </tr>
              ) : (
                scopes.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-700">{s.taskName}</td>
                    <td className="p-3 text-center">
                      {s.progress === 100 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                          {lang === 'th' ? 'เสร็จสิ้น' : 'Completed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {s.progress}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '5. ปัญหาและอุปสรรค' : '5. Problems & Obstacles'}</label>
          <textarea rows={3} value={problems} onChange={e => setProblems(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'อธิบายปัญหาที่พบ...' : 'Describe any problems encountered...'}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '6. สรุปผลการดำเนินงาน' : '6. Operations Summary'}</label>
          <textarea rows={3} value={solutions} onChange={e => setSolutions(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'สรุปผลการดำเนินงานโดยรวม...' : 'Summarize the overall operations...'}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? '7. หมายเหตุ' : '7. Notes'}</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'หมายเหตุเพิ่มเติม...' : 'Additional notes...'}/>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-slate-700">{lang === 'th' ? '8. รูปภาพประกอบ (สูงสุด 6 รูปต่อหน้าใน PDF)' : '8. Photos (Max 6 per page in PDF)'}</h4>
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

      {/* Hidden PDF Export Template */}
      <div 
        ref={printRef} 
        style={{ 
          display: 'none', 
          position: 'absolute', 
          top: '-9999px', 
          left: 0, 
          width: '210mm', 
          backgroundColor: '#fff',
          color: '#000',
          padding: '20mm',
          fontFamily: 'sans-serif'
        }}
      >
        <h1 className="text-2xl font-bold text-center mb-8">{lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}</h1>
        
        {/* Section 1 */}
        <div className="mb-6">
          <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-4 pb-1">1. รายละเอียดโครงการ</h2>
          <table className="w-full text-sm mb-4">
            <tbody>
              <tr>
                <td className="py-2 font-semibold w-1/4">ชื่อโครงการ:</td>
                <td className="py-2 w-1/4">{project?.name || '-'}</td>
                <td className="py-2 font-semibold w-1/4">เจ้าของโครงการ:</td>
                <td className="py-2 w-1/4">{ownerName}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">สถานที่ติดตั้ง:</td>
                <td className="py-2">{project?.location || '-'}</td>
                <td className="py-2 font-semibold">พื้นที่ติดตั้ง:</td>
                <td className="py-2">{project?.installationArea || '-'}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">ผู้จัดการโครงการ:</td>
                <td className="py-2">{managerName}</td>
                <td className="py-2 font-semibold">วันที่เริ่มโครงการ:</td>
                <td className="py-2">{formatDate(project?.startDate)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold">วันที่สิ้นสุด (แผนงาน):</td>
                <td className="py-2">{formatDate(project?.endDate)}</td>
                <td className="py-2 font-semibold">วันที่สิ้นสุดการดำเนินงาน:</td>
                <td className="py-2">{formatDate(project?.actualCompletionDate)}</td>
              </tr>
            </tbody>
          </table>
          {project?.projectDetails && (
            <div className="mt-2 text-sm">
              <p className="font-semibold mb-1">รายละเอียดเพิ่มเติม:</p>
              <p className="whitespace-pre-wrap">{project.projectDetails}</p>
            </div>
          )}
        </div>

        {/* Section 2 & 3: Stakeholders and Workers */}
        <div className="mb-6">
           <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-4 pb-1">2. ผู้เกี่ยวข้องและผู้ปฏิบัติงาน</h2>
           <table className="w-full text-sm border-collapse border border-gray-300">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-gray-300 p-2 text-left">ชื่อ - นามสกุล</th>
                 <th className="border border-gray-300 p-2 text-left">หน้าที่</th>
                 <th className="border border-gray-300 p-2 text-left">เบอร์โทร</th>
               </tr>
             </thead>
             <tbody>
               {projectContacts.map(c => (
                 <tr key={c.id}>
                   <td className="border border-gray-300 p-2">{c.firstName} {c.lastName}</td>
                   <td className="border border-gray-300 p-2">{c.role || '-'}</td>
                   <td className="border border-gray-300 p-2">{c.phone || '-'}</td>
                 </tr>
               ))}
               {projectWorkers.map(w => (
                 <tr key={w.id}>
                   <td className="border border-gray-300 p-2">{w.firstName} {w.lastName}</td>
                   <td className="border border-gray-300 p-2">{w.role || 'ผู้ปฏิบัติงาน'}</td>
                   <td className="border border-gray-300 p-2">{w.phone || '-'}</td>
                 </tr>
               ))}
               {projectContacts.length === 0 && projectWorkers.length === 0 && (
                 <tr>
                   <td colSpan={3} className="border border-gray-300 p-2 text-center text-gray-500">ไม่มีข้อมูล</td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>

        {/* Section 4: Scopes */}
        <div className="mb-6">
           <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-4 pb-1">3. ขอบเขตงานและขั้นตอนการทำงาน</h2>
           <table className="w-full text-sm border-collapse border border-gray-300">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border border-gray-300 p-2 text-left">ชื่องาน</th>
                 <th className="border border-gray-300 p-2 text-center w-32">สถานะ</th>
               </tr>
             </thead>
             <tbody>
               {scopes.map(s => (
                 <tr key={s.id}>
                   <td className="border border-gray-300 p-2">{s.taskName}</td>
                   <td className="border border-gray-300 p-2 text-center">{s.progress === 100 ? 'เสร็จสิ้น' : `${s.progress}%`}</td>
                 </tr>
               ))}
               {scopes.length === 0 && (
                 <tr>
                   <td colSpan={2} className="border border-gray-300 p-2 text-center text-gray-500">ไม่มีข้อมูลงาน</td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>

        {/* Sections 5, 6, 7 */}
        <div className="mb-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-2 pb-1">4. ปัญหาและอุปสรรค</h2>
            <p className="text-sm whitespace-pre-wrap">{problems || '-'}</p>
          </div>
          <div>
            <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-2 pb-1">5. สรุปผลการดำเนินงาน</h2>
            <p className="text-sm whitespace-pre-wrap">{solutions || '-'}</p>
          </div>
          <div>
            <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-2 pb-1">6. หมายเหตุ</h2>
            <p className="text-sm whitespace-pre-wrap">{remarks || '-'}</p>
          </div>
        </div>

        {/* Section 8: Photos */}
        {photos.length > 0 && (
          <div className="mt-8" style={{ pageBreakBefore: 'always' }}>
            <h2 className="text-lg font-bold border-b-2 border-gray-800 mb-4 pb-1">7. รูปภาพประกอบ</h2>
            <div className="grid grid-cols-2 gap-6">
              {photos.map((p, i) => (
                <div key={i} className="mb-4">
                  <img src={p.url} alt={`รูป ${i+1}`} className="w-full h-48 object-cover border border-gray-300 rounded mb-2" />
                  <p className="text-sm text-center text-gray-700">{p.caption || `รูปที่ ${i+1}`}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

