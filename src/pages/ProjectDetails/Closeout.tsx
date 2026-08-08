import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Image as ImageIcon, Trash2, Eraser, Printer } from 'lucide-react';
import { Report } from '../../types';
import { format, parseISO } from 'date-fns';
import SignatureCanvas from 'react-signature-canvas';
import { SaveButton } from '../../components/SaveButton';

export function Closeout({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  const masterProjectScopes = (data.scopes || [])
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const scheduleProjectTasks = (data.scheduleTasks || [])
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const rawTasks = scheduleProjectTasks.length > 0
    ? scheduleProjectTasks
    : masterProjectScopes;

  const projectTasks = [...rawTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  
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
  
  const [clientSigUrl, setClientSigUrl] = useState<string | undefined>(closeoutReport?.clientSignatureUrl || closeoutReport?.signatureUrl);
  const [officerSigUrl, setOfficerSigUrl] = useState<string | undefined>(closeoutReport?.officerSignatureUrl);

  // Display toggles for PDF report export
  const [showProblemsInExport, setShowProblemsInExport] = useState(true);
  const [showSignaturesInExport, setShowSignaturesInExport] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientSigPad = useRef<SignatureCanvas>(null);
  const officerSigPad = useRef<SignatureCanvas>(null);

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
    let finalClientSig = clientSigUrl;
    let finalOfficerSig = officerSigUrl;

    if (clientSigPad.current && !clientSigPad.current.isEmpty()) {
      try {
        finalClientSig = clientSigPad.current.getCanvas().toDataURL('image/png');
        setClientSigUrl(finalClientSig);
      } catch (e) {
        console.error(e);
      }
    }

    if (officerSigPad.current && !officerSigPad.current.isEmpty()) {
      try {
        finalOfficerSig = officerSigPad.current.getCanvas().toDataURL('image/png');
        setOfficerSigUrl(finalOfficerSig);
      } catch (e) {
        console.error(e);
      }
    }

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
      photos,
      signatureUrl: finalOfficerSig || finalClientSig,
      clientSignatureUrl: finalClientSig,
      officerSignatureUrl: finalOfficerSig
    };
    
    if (closeoutReport) {
      updateData({ reports: data.reports.map(r => r.id === reportData.id ? reportData : r) });
    } else {
      updateData({ reports: [...data.reports, reportData] });
    }
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
    window.print();
  };

  return (
    <div>
      {/* Main UI - hidden when printing */}
      <div className="space-y-8 print:hidden">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}</h3>
            <p className="text-slate-500 text-xs sm:text-sm">{lang === 'th' ? 'รายงานและสถานะสุดท้าย' : 'Final report and status.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportPDF} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium text-xs sm:text-sm">
              <Download className="w-4 h-4" /> {lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : 'Print / Export PDF'}
            </button>
            <SaveButton onSave={handleSave} successMessage={lang === 'th' ? 'บันทึกรายงานสรุปโครงการเรียบร้อยแล้ว' : 'Closeout report saved'} />
          </div>
        </div>

        {/* PDF Export Display Options Banner */}
        <div className="bg-blue-50/70 p-3.5 px-4 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm shadow-sm">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>{lang === 'th' ? 'ตัวเลือกการแสดงผลเมื่อพิมพ์ / ส่งออก PDF:' : 'PDF Export Display Options:'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium hover:text-blue-700 transition-colors">
              <input 
                type="checkbox" 
                checked={showProblemsInExport} 
                onChange={e => setShowProblemsInExport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>{lang === 'th' ? 'แสดงส่วน "ปัญหาและอุปสรรค"' : 'Show "Problems & Obstacles"'}</span>
            </label>
            <label className="flex items-center gap-2 text-slate-700 cursor-pointer font-medium hover:text-blue-700 transition-colors">
              <input 
                type="checkbox" 
                checked={showSignaturesInExport} 
                onChange={e => setShowSignaturesInExport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>{lang === 'th' ? 'แสดงส่วน "ลายมือชื่อยืนยัน"' : 'Show "Signatures"'}</span>
            </label>
          </div>
        </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? 'รายละเอียดโครงการ' : 'Project Details'}</h4>
        
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
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? 'ผู้เกี่ยวข้องในโครงการ' : 'Project Stakeholders'}</h4>
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
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Workers'}</h4>
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
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{lang === 'th' ? 'รายละเอียดโครงการ' : 'Project Details'}</h4>
        <p className="text-slate-800 text-sm bg-white p-4 border border-slate-200 rounded-lg whitespace-pre-wrap min-h-[100px]">{project?.projectDetails || (lang === 'th' ? 'ไม่มีรายละเอียดโครงการ' : 'No project details available.')}</p>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
          {lang === 'th' ? 'ขอบเขตงานและขั้นตอนการทำงาน (อ้างอิงจากแผนการดำเนินงาน)' : 'Scope of Work & Work Steps (From Operational Plan)'}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse bg-white border border-slate-200 rounded">
            <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold">{lang === 'th' ? 'รายการขอบเขตงาน / ขั้นตอน' : 'Task / Work Step'}</th>
                <th className="p-3 font-semibold text-center w-52">{lang === 'th' ? 'สถานะงาน' : 'Task Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectTasks.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-slate-500">
                    {lang === 'th' ? 'ไม่มีข้อมูลงานในแผนการดำเนินงาน' : 'No tasks defined in operational plan.'}
                  </td>
                </tr>
              ) : (
                projectTasks.map(t => {
                  const isSubTask = !!t.parentId;
                  const progressVal = t.progress ?? 0;
                  return (
                    <tr key={t.id} className={isSubTask ? "bg-slate-50/50 hover:bg-slate-100/50" : "hover:bg-slate-50 font-medium"}>
                      <td className={`p-3 text-slate-700 ${isSubTask ? 'pl-8 text-xs text-slate-600' : ''}`}>
                        {isSubTask && <span className="mr-1.5 text-slate-400">↳</span>}
                        {t.taskName}
                      </td>
                      <td className="p-3 text-center">
                        {progressVal === 100 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            {lang === 'th' ? 'เสร็จสิ้น (100%)' : 'Completed (100%)'}
                          </span>
                        ) : progressVal > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {lang === 'th' ? `กำลังดำเนินการ (${progressVal}%)` : `In Progress (${progressVal}%)`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            {lang === 'th' ? 'ยังไม่เริ่ม (0%)' : 'Not Started (0%)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-slate-700">{lang === 'th' ? 'ปัญหาและอุปสรรค' : 'Problems & Obstacles'}</label>
            <label className="flex items-center gap-2 text-xs text-slate-600 font-normal cursor-pointer select-none bg-slate-100 px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors">
              <input 
                type="checkbox" 
                checked={showProblemsInExport} 
                onChange={e => setShowProblemsInExport(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>{lang === 'th' ? 'แสดงใน PDF / รายงาน' : 'Show in PDF / Report'}</span>
            </label>
          </div>
          <textarea rows={3} value={problems} onChange={e => setProblems(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'อธิบายปัญหาที่พบ...' : 'Describe any problems encountered...'}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? 'สรุปผลการดำเนินงาน' : 'Operations Summary'}</label>
          <textarea rows={3} value={solutions} onChange={e => setSolutions(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'สรุปผลการดำเนินงานโดยรวม...' : 'Summarize the overall operations...'}/>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</label>
          <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full mt-1 p-3 border border-slate-300 rounded-lg resize-none" placeholder={lang === 'th' ? 'หมายเหตุเพิ่มเติม...' : 'Additional notes...'}/>
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
      
      {/* Signature Section - Dual Column (Left: Customer, Right: Officer) */}
      <div className="space-y-4 pt-6 border-t border-slate-200">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h4 className="font-bold text-slate-800 text-base">{lang === 'th' ? 'ลายมือชื่อยืนยัน' : 'Signatures'}</h4>
          <label className="flex items-center gap-2 text-xs text-slate-600 font-normal cursor-pointer select-none bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
            <input 
              type="checkbox" 
              checked={showSignaturesInExport} 
              onChange={e => setShowSignaturesInExport(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="font-medium text-slate-700">{lang === 'th' ? 'แสดงใน PDF / รายงาน' : 'Show in PDF / Report'}</span>
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Customer Signature */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-slate-800">{lang === 'th' ? 'ช่องด้านซ้าย: ลายมือชื่อลูกค้า / ผู้ว่าจ้าง' : 'Left Box: Customer Signature'}</span>
              <button 
                onClick={() => {
                  clientSigPad.current?.clear();
                  setClientSigUrl(undefined);
                }} 
                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-100 flex items-center gap-1 text-xs font-medium"
              >
                <Eraser className="w-3 h-3" />
                {lang === 'th' ? 'ล้าง' : 'Clear'}
              </button>
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner">
              <SignatureCanvas 
                ref={clientSigPad} 
                canvasProps={{ className: 'w-full h-36 bg-white' }}
                onEnd={() => {
                  if (clientSigPad.current) {
                    try {
                      setClientSigUrl(clientSigPad.current.getCanvas().toDataURL('image/png'));
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
              />
            </div>
            {clientSigUrl ? (
              <div className="text-xs text-emerald-600 font-medium">
                ✓ {lang === 'th' ? 'บันทึกลายมือชื่อลูกค้าแล้ว' : 'Customer signature saved'}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">{lang === 'th' ? 'ใช้เมาส์ หรือนิ้วลงลายมือชื่อในช่องด้านบน' : 'Sign above using mouse or touch'}</p>
            )}
          </div>

          {/* Right Column: Officer Signature */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm text-slate-800">{lang === 'th' ? 'ช่องด้านขวา: ลายมือชื่อเจ้าหน้าที่ / ผู้รายงาน' : 'Right Box: Officer Signature'}</span>
              <button 
                onClick={() => {
                  officerSigPad.current?.clear();
                  setOfficerSigUrl(undefined);
                }} 
                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-100 flex items-center gap-1 text-xs font-medium"
              >
                <Eraser className="w-3 h-3" />
                {lang === 'th' ? 'ล้าง' : 'Clear'}
              </button>
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-inner">
              <SignatureCanvas 
                ref={officerSigPad} 
                canvasProps={{ className: 'w-full h-36 bg-white' }}
                onEnd={() => {
                  if (officerSigPad.current) {
                    try {
                      setOfficerSigUrl(officerSigPad.current.getCanvas().toDataURL('image/png'));
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
              />
            </div>
            {officerSigUrl ? (
              <div className="text-xs text-emerald-600 font-medium">
                ✓ {lang === 'th' ? 'บันทึกลายมือชื่อเจ้าหน้าที่แล้ว' : 'Officer signature saved'}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">{lang === 'th' ? 'ใช้เมาส์ หรือนิ้วลงลายมือชื่อในช่องด้านบน' : 'Sign above using mouse or touch'}</p>
            )}
          </div>
        </div>
      </div>

      </div>

      {/* Hidden PDF Export Template */}
      <div className="hidden print:block w-full bg-white text-black font-sans p-2">
        
        {/* Document Header Banner */}
        <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-xl shadow-md border-l-8 border-blue-500 mb-8">
          <div>
            <span className="text-xs font-semibold tracking-widest text-blue-300 uppercase block mb-1">
              {lang === 'th' ? 'เอกสารสรุปปิดโครงการ' : 'Project Closeout Document'}
            </span>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-white">
              {lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report'}
            </h1>
            <p className="text-blue-100 mt-1 text-sm font-medium">{project?.name}</p>
          </div>
          <div className="text-right border-l border-blue-800/80 pl-6">
            <p className="text-xs text-blue-300">{lang === 'th' ? 'วันที่พิมพ์รายงาน' : 'Report Date'}</p>
            <p className="text-sm font-bold text-white mt-0.5">{formatDate(new Date().toISOString())}</p>
          </div>
        </div>
        
        {/* Section: Project Details */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-base font-bold bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-2.5 px-4 mb-0 rounded-t-lg shadow-sm border-b-2 border-blue-500">
            {lang === 'th' ? 'รายละเอียดโครงการ' : 'Project Details'}
          </h2>
          <div className="border border-blue-200 rounded-b-lg p-5 bg-white shadow-sm">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 w-1/4 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'ชื่อโครงการ:' : 'Project Name:'}</td>
                  <td className="py-2.5 pr-4 w-1/4 align-top px-3">{project?.name || '-'}</td>
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 w-1/4 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'เจ้าของโครงการ:' : 'Owner:'}</td>
                  <td className="py-2.5 w-1/4 align-top px-3">{ownerName}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'สถานที่ติดตั้ง:' : 'Location:'}</td>
                  <td className="py-2.5 pr-4 align-top px-3">{project?.location || '-'}</td>
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'พื้นที่ติดตั้ง:' : 'Area:'}</td>
                  <td className="py-2.5 align-top px-3">{project?.installationArea || '-'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'ผู้จัดการโครงการ:' : 'Project Manager:'}</td>
                  <td className="py-2.5 pr-4 align-top px-3">{managerName}</td>
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start Date:'}</td>
                  <td className="py-2.5 align-top px-3">{formatDate(project?.startDate)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'วันที่สิ้นสุด (แผนงาน):' : 'Planned End:'}</td>
                  <td className="py-2.5 pr-4 align-top px-3">{formatDate(project?.endDate)}</td>
                  <td className="py-2.5 pr-4 font-semibold text-blue-950 align-top bg-blue-50/40 px-3 rounded-l">{lang === 'th' ? 'วันที่สิ้นสุด (จริง):' : 'Actual End:'}</td>
                  <td className="py-2.5 align-top px-3">{formatDate(project?.actualCompletionDate)}</td>
                </tr>
              </tbody>
            </table>
            {project?.projectDetails && (
              <div className="mt-4 pt-4 border-t border-slate-200 text-sm">
                <p className="font-semibold text-blue-950 mb-2">{lang === 'th' ? 'รายละเอียดเพิ่มเติม:' : 'Additional Details:'}</p>
                <p className="whitespace-pre-wrap text-slate-800 bg-slate-50/80 p-3.5 rounded-lg border border-slate-200">{project.projectDetails}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section: Stakeholders (Full Width) */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-base font-bold bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-2.5 px-4 mb-0 rounded-t-lg shadow-sm border-b-2 border-blue-500">
            {lang === 'th' ? 'ผู้เกี่ยวข้องในโครงการ' : 'Project Stakeholders'}
          </h2>
          <div className="border border-blue-200 rounded-b-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-blue-50/90 text-blue-950 border-b border-blue-200">
                <tr>
                  <th className="p-3 font-bold">{lang === 'th' ? 'ชื่อ - นามสกุล' : 'Name'}</th>
                  <th className="p-3 font-bold">{lang === 'th' ? 'หน้าที่' : 'Role'}</th>
                  <th className="p-3 font-bold">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectContacts.length > 0 ? projectContacts.map((c, idx) => (
                  <tr key={c.id} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="p-3 font-medium text-slate-900">{c.firstName} {c.lastName}</td>
                    <td className="p-3 text-slate-700">{c.role || '-'}</td>
                    <td className="p-3 text-slate-700">{c.phone || '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูลผู้เกี่ยวข้อง' : 'No stakeholder data'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Workers (Stacked Below Stakeholders) */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-base font-bold bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-2.5 px-4 mb-0 rounded-t-lg shadow-sm border-b-2 border-blue-500">
            {lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Workers'}
          </h2>
          <div className="border border-blue-200 rounded-b-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-blue-50/90 text-blue-950 border-b border-blue-200">
                <tr>
                  <th className="p-3 font-bold">{lang === 'th' ? 'ชื่อ - นามสกุล' : 'Name'}</th>
                  <th className="p-3 font-bold">{lang === 'th' ? 'หน้าที่ / ตำแหน่ง' : 'Role / Position'}</th>
                  <th className="p-3 font-bold">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectWorkers.length > 0 ? projectWorkers.map((w, idx) => (
                  <tr key={w.id} className={idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="p-3 font-medium text-slate-900">{w.firstName} {w.lastName}</td>
                    <td className="p-3 text-slate-700">{w.role || (lang === 'th' ? 'ผู้ปฏิบัติงาน' : 'Worker')}</td>
                    <td className="p-3 text-slate-700">{w.phone || '-'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูลผู้ปฏิบัติงาน' : 'No worker data'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Scopes & Schedule */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-base font-bold bg-gradient-to-r from-blue-900 to-indigo-800 text-white p-2.5 px-4 mb-0 rounded-t-lg shadow-sm border-b-2 border-blue-500">
            {lang === 'th' ? 'ขอบเขตงานและขั้นตอนการทำงาน (อ้างอิงสถานะจากแผนการดำเนินงาน)' : 'Scope of Work & Work Steps (Status from Schedule Plan)'}
          </h2>
          <div className="border border-blue-200 rounded-b-lg overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-blue-50/90 text-blue-950 border-b border-blue-200">
                <tr>
                  <th className="p-3 font-bold">{lang === 'th' ? 'รายการขอบเขตงาน / ขั้นตอน' : 'Task / Work Step'}</th>
                  <th className="p-3 font-bold text-center w-52">{lang === 'th' ? 'สถานะงาน' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectTasks.length > 0 ? projectTasks.map((t, idx) => {
                  const isSubTask = !!t.parentId;
                  const progressVal = t.progress ?? 0;
                  return (
                    <tr key={t.id} className={idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"}>
                      <td className={`p-3 ${isSubTask ? 'pl-8 text-xs text-slate-700' : 'font-semibold text-slate-900'}`}>
                        {isSubTask && <span className="mr-1.5 text-blue-500">↳</span>}
                        {t.taskName}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                          progressVal === 100 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : progressVal > 0 
                            ? 'bg-blue-100 text-blue-800 border-blue-300' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {progressVal === 100 
                            ? (lang === 'th' ? 'เสร็จสิ้น 100%' : 'Completed 100%') 
                            : progressVal > 0 
                            ? (lang === 'th' ? `กำลังดำเนินการ ${progressVal}%` : `In Progress ${progressVal}%`) 
                            : (lang === 'th' ? 'ยังไม่เริ่ม 0%' : 'Not Started 0%')}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={2} className="p-4 text-center text-slate-500 italic">{lang === 'th' ? 'ไม่มีข้อมูลงานในแผนการดำเนินงาน' : 'No tasks available in schedule plan'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sections: Problems, Summary & Notes */}
        <div className="mb-8 grid grid-cols-1 gap-5 break-inside-avoid">
          {showProblemsInExport && (
            <div className="border-l-4 border-amber-500 bg-amber-50/40 rounded-r-xl border-t border-b border-r border-amber-200 p-4 shadow-sm">
              <h2 className="text-sm font-bold text-amber-900 mb-1.5 flex items-center gap-2">
                <span>{lang === 'th' ? 'ปัญหาและอุปสรรค' : 'Problems & Obstacles'}</span>
              </h2>
              <p className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">{problems || '-'}</p>
            </div>
          )}
          <div className="border-l-4 border-emerald-500 bg-emerald-50/40 rounded-r-xl border-t border-b border-r border-emerald-200 p-4 shadow-sm">
            <h2 className="text-sm font-bold text-emerald-900 mb-1.5 flex items-center gap-2">
              <span>{lang === 'th' ? 'สรุปผลการดำเนินงาน' : 'Operations Summary'}</span>
            </h2>
            <p className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">{solutions || '-'}</p>
          </div>
          <div className="border-l-4 border-blue-500 bg-blue-50/40 rounded-r-xl border-t border-b border-r border-blue-200 p-4 shadow-sm">
            <h2 className="text-sm font-bold text-blue-950 mb-1.5 flex items-center gap-2">
              <span>{lang === 'th' ? 'หมายเหตุ' : 'Notes'}</span>
            </h2>
            <p className="text-sm whitespace-pre-wrap text-slate-800 leading-relaxed">{remarks || '-'}</p>
          </div>
        </div>
        
        {/* PDF Dual Signatures */}
        {showSignaturesInExport && (
          <div className="mb-8 break-inside-avoid mt-10 pt-6 border-t-2 border-slate-200">
            <h2 className="text-sm font-bold text-blue-950 mb-4">{lang === 'th' ? 'ลายมือชื่อยืนยัน' : 'Signatures'}</h2>
            <div className="grid grid-cols-2 gap-12 text-center bg-slate-50/60 p-6 rounded-xl border border-slate-200">
              {/* Customer Signature Box (Left) */}
              <div className="flex flex-col items-center">
                <div className="h-24 w-full flex items-center justify-center border-b-2 border-slate-300 mb-2 bg-white rounded-t">
                  {clientSigUrl ? (
                    <img src={clientSigUrl} alt="Customer Signature" className="h-20 object-contain mix-blend-multiply mx-auto" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">{lang === 'th' ? '( ยังไม่ได้ลงนาม )' : '( Not Signed )'}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900">{lang === 'th' ? 'ลงชื่อ......................................................' : 'Signature......................................................'}</p>
                <p className="text-xs font-semibold text-blue-950 mt-1">{lang === 'th' ? '( ลายมือชื่อลูกค้า / ผู้ว่าจ้าง )' : '( Customer / Client Signature )'}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{lang === 'th' ? 'วันที่ ......... / ......... / .........' : 'Date ......... / ......... / .........'}</p>
              </div>

              {/* Officer Signature Box (Right) */}
              <div className="flex flex-col items-center">
                <div className="h-24 w-full flex items-center justify-center border-b-2 border-slate-300 mb-2 bg-white rounded-t">
                  {officerSigUrl ? (
                    <img src={officerSigUrl} alt="Officer Signature" className="h-20 object-contain mix-blend-multiply mx-auto" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">{lang === 'th' ? '( ยังไม่ได้ลงนาม )' : '( Not Signed )'}</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900">{lang === 'th' ? 'ลงชื่อ......................................................' : 'Signature......................................................'}</p>
                <p className="text-xs font-semibold text-blue-950 mt-1">{lang === 'th' ? '( ลายมือชื่อเจ้าหน้าที่ / ผู้รายงาน )' : '( Officer / Staff Signature )'}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{lang === 'th' ? 'วันที่ ......... / ......... / .........' : 'Date ......... / ......... / .........'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Photos (Appendix) */}
        {photos.length > 0 && (
          <div className="break-before-page pt-6">
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-xl shadow-md border-l-6 border-blue-500 mb-6">
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-white">{lang === 'th' ? 'ภาคผนวก' : 'Appendix'}</h1>
              <p className="text-blue-200 text-xs font-medium mt-0.5">{lang === 'th' ? 'รูปภาพประกอบการดำเนินงานโครงการ' : 'Attached Photos'}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {photos.map((p, i) => (
                <div key={i} className="mb-4 break-inside-avoid">
                  <div className="border border-blue-200 rounded-xl overflow-hidden bg-white p-3 shadow-sm">
                    <img src={p.url} alt={`รูป ${i+1}`} className="w-full h-60 object-cover border border-slate-200 mb-2.5 rounded-lg" />
                    <p className="text-xs text-center text-blue-950 font-bold px-2 py-0.5 bg-blue-50 rounded">{p.caption || (lang === 'th' ? `รูปที่ ${i+1}` : `Photo ${i+1}`)}</p>
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
