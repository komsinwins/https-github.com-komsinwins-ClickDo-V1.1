import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Report } from '../../types';
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

  const exportPDF = () => {
    // We use the browser's native print functionality which perfectly handles Thai fonts, colors, and pagination.
    // The Layout and components have been updated with `print:hidden` and `print:block` classes to format it correctly.
    window.print();
  };

  return (
    <div>
      {/* Main UI - hidden when printing */}
      <div className="space-y-8 print:hidden">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}</h3>
            <p className="text-slate-500">{lang === 'th' ? 'รายงานและสถานะสุดท้าย' : 'Final report and status.'}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handleSave} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">{lang === 'th' ? 'บันทึกร่าง' : 'Save Draft'}</button>
            <button onClick={exportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium">
              <Download className="w-4 h-4" /> {lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : 'Print / Export PDF'}
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
      </div>

      {/* Hidden PDF Export Template */}
      <div className="hidden print:block w-full bg-white text-black font-sans">
        
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-8">
          <div className="flex items-center gap-4">
            {/* Placeholder for Logo */}
            <div className="w-20 h-20 bg-slate-100 border-2 border-slate-300 rounded flex items-center justify-center text-slate-400 font-bold text-xs">LOGO</div>
            <div>
              <h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900">{lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}</h1>
              <p className="text-slate-600 mt-1 font-medium">{project?.name}</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-600 space-y-1">
            <p><span className="font-semibold">{lang === 'th' ? 'วันที่พิมพ์:' : 'Print Date:'}</span> {formatDate(new Date().toISOString())}</p>
            <p><span className="font-semibold">{lang === 'th' ? 'รหัสโครงการ:' : 'Project ID:'}</span> {project?.id?.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        {/* Section 1: Project Details */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-lg font-bold bg-slate-800 text-white p-2 px-4 mb-4 rounded-t">1. {lang === 'th' ? 'รายละเอียดโครงการ' : 'Project Details'}</h2>
          <div className="border-2 border-slate-800 rounded-b p-5 -mt-4 bg-white">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-slate-700 w-1/4 align-top">{lang === 'th' ? 'ชื่อโครงการ:' : 'Project Name:'}</td>
                  <td className="py-2 pr-4 w-1/4 align-top">{project?.name || '-'}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-700 w-1/4 align-top">{lang === 'th' ? 'เจ้าของโครงการ:' : 'Owner:'}</td>
                  <td className="py-2 w-1/4 align-top">{ownerName}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'สถานที่ติดตั้ง:' : 'Location:'}</td>
                  <td className="py-2 pr-4 align-top">{project?.location || '-'}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'พื้นที่ติดตั้ง:' : 'Area:'}</td>
                  <td className="py-2 align-top">{project?.installationArea || '-'}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'ผู้จัดการโครงการ:' : 'Project Manager:'}</td>
                  <td className="py-2 pr-4 align-top">{managerName}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start Date:'}</td>
                  <td className="py-2 align-top">{formatDate(project?.startDate)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'วันที่สิ้นสุด (แผนงาน):' : 'Planned End:'}</td>
                  <td className="py-2 pr-4 align-top">{formatDate(project?.endDate)}</td>
                  <td className="py-2 pr-4 font-semibold text-slate-700 align-top">{lang === 'th' ? 'วันที่สิ้นสุด (จริง):' : 'Actual End:'}</td>
                  <td className="py-2 align-top">{formatDate(project?.actualCompletionDate)}</td>
                </tr>
              </tbody>
            </table>
            {project?.projectDetails && (
              <div className="mt-4 pt-4 border-t-2 border-slate-200 text-sm">
                <p className="font-semibold text-slate-700 mb-2">{lang === 'th' ? 'รายละเอียดเพิ่มเติม:' : 'Additional Details:'}</p>
                <p className="whitespace-pre-wrap text-slate-800 bg-slate-50 p-3 rounded border border-slate-200">{project.projectDetails}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Section 2: Stakeholders */}
          <div className="break-inside-avoid">
            <h2 className="text-lg font-bold bg-slate-800 text-white p-2 px-4 mb-4 rounded-t">2. {lang === 'th' ? 'ผู้เกี่ยวข้องในโครงการ' : 'Stakeholders'}</h2>
            <div className="border-2 border-slate-800 rounded-b overflow-hidden -mt-4 bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 border-b-2 border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'ชื่อ - นามสกุล' : 'Name'}</th>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'หน้าที่' : 'Role'}</th>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projectContacts.length > 0 ? projectContacts.map(c => (
                    <tr key={c.id}>
                      <td className="p-3">{c.firstName} {c.lastName}</td>
                      <td className="p-3">{c.role || '-'}</td>
                      <td className="p-3">{c.phone || '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Workers */}
          <div className="break-inside-avoid">
            <h2 className="text-lg font-bold bg-slate-800 text-white p-2 px-4 mb-4 rounded-t">3. {lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Workers'}</h2>
            <div className="border-2 border-slate-800 rounded-b overflow-hidden -mt-4 bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 border-b-2 border-slate-800">
                  <tr>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'ชื่อ - นามสกุล' : 'Name'}</th>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'หน้าที่' : 'Role'}</th>
                    <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {projectWorkers.length > 0 ? projectWorkers.map(w => (
                    <tr key={w.id}>
                      <td className="p-3">{w.firstName} {w.lastName}</td>
                      <td className="p-3">{w.role || (lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Worker')}</td>
                      <td className="p-3">{w.phone || '-'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: Scopes */}
        <div className="mb-8 break-inside-avoid">
           <h2 className="text-lg font-bold bg-slate-800 text-white p-2 px-4 mb-4 rounded-t">4. {lang === 'th' ? 'ขอบเขตงานและขั้นตอนการทำงาน' : 'Scope of Work & Schedule'}</h2>
           <div className="border-2 border-slate-800 rounded-b overflow-hidden -mt-4 bg-white">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-100 border-b-2 border-slate-800">
                 <tr>
                   <th className="p-3 font-semibold text-slate-800">{lang === 'th' ? 'ชื่องาน' : 'Task'}</th>
                   <th className="p-3 font-semibold text-slate-800 text-center w-40">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-200">
                 {scopes.length > 0 ? scopes.map(s => (
                   <tr key={s.id}>
                     <td className="p-3">{s.taskName}</td>
                     <td className="p-3 text-center">
                       <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${s.progress === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                         {s.progress === 100 ? (lang === 'th' ? 'เสร็จสิ้น 100%' : 'Completed 100%') : `${s.progress}%`}
                       </span>
                     </td>
                   </tr>
                 )) : (
                   <tr><td colSpan={2} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูลงาน' : 'No tasks available'}</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Sections 5, 6, 7 */}
        <div className="mb-8 grid grid-cols-1 gap-6 break-inside-avoid">
          <div className="border-2 border-slate-800 rounded-lg p-5 bg-white relative mt-3">
            <h2 className="text-sm font-bold bg-white text-slate-800 px-2 absolute -top-3 left-4">5. {lang === 'th' ? 'ปัญหาและอุปสรรค' : 'Problems & Obstacles'}</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{problems || '-'}</p>
          </div>
          <div className="border-2 border-slate-800 rounded-lg p-5 bg-white relative mt-3">
            <h2 className="text-sm font-bold bg-white text-slate-800 px-2 absolute -top-3 left-4">6. {lang === 'th' ? 'สรุปผลการดำเนินงาน' : 'Operations Summary'}</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{solutions || '-'}</p>
          </div>
          <div className="border-2 border-slate-800 rounded-lg p-5 bg-white relative mt-3">
            <h2 className="text-sm font-bold bg-white text-slate-800 px-2 absolute -top-3 left-4">7. {lang === 'th' ? 'หมายเหตุ' : 'Notes'}</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{remarks || '-'}</p>
          </div>
        </div>
        
        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-16 break-inside-avoid">
          <div className="text-center">
            <div className="border-b-2 border-slate-400 w-48 mx-auto mb-2"></div>
            <p className="text-sm font-semibold">{ownerName || (lang === 'th' ? 'เจ้าของโครงการ' : 'Project Owner')}</p>
            <p className="text-xs text-slate-500">{lang === 'th' ? 'ผู้ส่งมอบงาน' : 'Submitted By'}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-400 w-48 mx-auto mb-2"></div>
            <p className="text-sm font-semibold">{managerName || (lang === 'th' ? 'ผู้จัดการโครงการ' : 'Project Manager')}</p>
            <p className="text-xs text-slate-500">{lang === 'th' ? 'ผู้รับมอบงาน' : 'Approved By'}</p>
          </div>
        </div>

        {/* Section 8: Photos (Appendix) */}
        {photos.length > 0 && (
          <div className="break-before-page pt-8">
            <div className="flex justify-between items-start border-b-4 border-slate-800 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 border-2 border-slate-300 rounded flex items-center justify-center text-slate-400 font-bold text-xs">LOGO</div>
                <div>
                  <h1 className="text-3xl font-extrabold uppercase tracking-tight text-slate-900">{lang === 'th' ? 'ภาคผนวก' : 'Appendix'}</h1>
                  <p className="text-slate-600 mt-1 font-medium">{lang === 'th' ? 'รูปภาพประกอบโครงการ' : 'Attached Photos'}</p>
                </div>
              </div>
              <div className="text-right text-sm text-slate-600 space-y-1">
                <p><span className="font-semibold">{lang === 'th' ? 'วันที่พิมพ์:' : 'Print Date:'}</span> {formatDate(new Date().toISOString())}</p>
                <p><span className="font-semibold">{lang === 'th' ? 'รหัสโครงการ:' : 'Project ID:'}</span> {project?.id?.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8">
              {photos.map((p, i) => (
                <div key={i} className="mb-6 break-inside-avoid">
                  <div className="border-2 border-slate-800 rounded-lg overflow-hidden bg-white p-3">
                    <img src={p.url} alt={`รูป ${i+1}`} className="w-full h-64 object-cover border border-slate-200 mb-3 rounded" />
                    <p className="text-sm text-center text-slate-800 font-bold px-2 pb-1">{p.caption || (lang === 'th' ? `รูปที่ ${i+1}` : `Photo ${i+1}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

