import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { differenceInDays, parseISO, isValid, min, max, format, addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Table as TableIcon, Download, Loader2 } from 'lucide-react';

export function SchedulePlan({ projectId }: { projectId: string }) {
  const { data } = useAppStore();
  const scopes = data.scopes.filter(s => s.projectId === projectId);
  const lang = data.language || 'th';
  
  const [view, setView] = useState<'table' | 'gantt'>('table');
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'p' | 'l'>('p');
  const [isExporting, setIsExporting] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Compute Gantt Chart Bounds
  let minDate = new Date();
  let maxDate = addDays(new Date(), 30);
  
  const validDates: Date[] = [];
  scopes.forEach(s => {
    if (s.baselineStartDate && isValid(parseISO(s.baselineStartDate))) validDates.push(parseISO(s.baselineStartDate));
    if (s.baselineEndDate && isValid(parseISO(s.baselineEndDate))) validDates.push(parseISO(s.baselineEndDate));
    if (s.actualStartDate && isValid(parseISO(s.actualStartDate))) validDates.push(parseISO(s.actualStartDate));
    if (s.actualEndDate && isValid(parseISO(s.actualEndDate))) validDates.push(parseISO(s.actualEndDate));
  });

  if (validDates.length > 0) {
    minDate = min(validDates);
    maxDate = max(validDates);
  }
  
  // Add some padding to dates
  minDate = addDays(minDate, -2);
  maxDate = addDays(maxDate, 2);
  const totalDays = Math.max(1, differenceInDays(maxDate, minDate));

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const element = reportRef.current;
      // Set to appropriate size for capture
      const originalWidth = element.style.width;
      const originalPadding = element.style.padding;
      
      const pxPerMm = 3.7795275591; // ~96dpi
      const widthMm = paperSize === 'a4' ? (orientation === 'p' ? 210 : 297) : (orientation === 'p' ? 297 : 420);
      element.style.width = `${widthMm * pxPerMm}px`;
      element.style.padding = '20px';
      
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF(orientation, 'mm', paperSize);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Schedule_${projectId}_${paperSize}.pdf`);
      
      element.style.width = originalWidth;
      element.style.padding = originalPadding;
    } catch (e) {
      console.error("PDF Export failed", e);
    }
    
    setIsExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'table' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            {lang === 'th' ? 'ตารางข้อมูล' : 'Table View'}
          </button>
          <button
            onClick={() => setView('gantt')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'gantt' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <BarChart className="w-3.5 h-3.5" />
            {lang === 'th' ? 'แกนต์ชาร์ต' : 'Gantt Chart'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{lang === 'th' ? 'กระดาษ:' : 'Paper:'}</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
              className="border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-[#0061FF]"
            >
              <option value="a4">A4</option>
              <option value="a3">A3</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{lang === 'th' ? 'แนว:' : 'Orient:'}</span>
            <select
              value={orientation}
              onChange={(e) => setOrientation(e.target.value as 'p' | 'l')}
              className="border border-slate-200 rounded px-2 py-1 bg-white outline-none focus:border-[#0061FF]"
            >
              <option value="p">{lang === 'th' ? 'ตั้ง' : 'Portrait'}</option>
              <option value="l">{lang === 'th' ? 'นอน' : 'Landscape'}</option>
            </select>
          </div>
          <button
            onClick={exportPDF}
            disabled={isExporting}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {lang === 'th' ? 'ส่งออก PDF' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded bg-white" ref={reportRef} style={{ background: 'white' }}>
        {view === 'table' ? (
          <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
            <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-2 font-semibold border-r border-slate-200">{lang === 'th' ? 'ชื่องาน' : 'Task Name'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'แผนงาน' : 'Baseline'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'จริง' : 'Actual'}</th>
                <th className="p-2 font-semibold text-center">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
              </tr>
              <tr className="bg-white border-b border-slate-200 text-[10px]">
                <th className="p-1.5 border-r border-slate-200"></th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9] border-r border-slate-200">{lang === 'th' ? 'ระยะเวลา' : 'Duration'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9] border-r border-slate-200">{lang === 'th' ? 'ระยะเวลา' : 'Duration'}</th>
                <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'ความคลาดเคลื่อน' : 'Variance'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {scopes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    {lang === 'th' ? 'ยังไม่มีขอบเขตงาน' : 'No Scope of Work defined yet.'}
                  </td>
                </tr>
              ) : (
                scopes.map(scope => {
                  let baselineDuration = 0;
                  let actualDuration = 0;
                  let variance = 0;

                  if (scope.baselineStartDate && scope.baselineEndDate && isValid(parseISO(scope.baselineStartDate)) && isValid(parseISO(scope.baselineEndDate))) {
                    baselineDuration = differenceInDays(parseISO(scope.baselineEndDate), parseISO(scope.baselineStartDate)) + 1;
                  }

                  if (scope.actualStartDate && scope.actualEndDate && isValid(parseISO(scope.actualStartDate)) && isValid(parseISO(scope.actualEndDate))) {
                    actualDuration = differenceInDays(parseISO(scope.actualEndDate), parseISO(scope.actualStartDate)) + 1;
                  }

                  if (scope.baselineEndDate && scope.actualEndDate && isValid(parseISO(scope.baselineEndDate)) && isValid(parseISO(scope.actualEndDate))) {
                    variance = differenceInDays(parseISO(scope.baselineEndDate), parseISO(scope.actualEndDate));
                  }

                  return (
                    <tr key={scope.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-medium text-slate-800 border-r border-slate-200">
                        {scope.taskName}
                      </td>
                      <td className="p-2 text-center">{scope.baselineStartDate ? format(parseISO(scope.baselineStartDate), 'dd/MM/yy') : '-'}</td>
                      <td className="p-2 text-center">{scope.baselineEndDate ? format(parseISO(scope.baselineEndDate), 'dd/MM/yy') : '-'}</td>
                      <td className="p-2 text-center border-r border-slate-200">{baselineDuration > 0 ? `${baselineDuration}d` : '-'}</td>
                      
                      <td className="p-2 text-center">{scope.actualStartDate ? format(parseISO(scope.actualStartDate), 'dd/MM/yy') : '-'}</td>
                      <td className="p-2 text-center">{scope.actualEndDate ? format(parseISO(scope.actualEndDate), 'dd/MM/yy') : '-'}</td>
                      <td className="p-2 text-center border-r border-slate-200">{actualDuration > 0 ? `${actualDuration}d` : '-'}</td>
                      
                      <td className="p-2 text-center font-medium">
                        {scope.progress === 100 ? (
                          variance < 0 ? (
                            <span className="text-[#EF4444] font-bold">{Math.abs(variance)}d {lang === 'th' ? 'ล่าช้า' : 'late'}</span>
                          ) : variance > 0 ? (
                            <span className="text-[#22C55E] font-bold">{variance}d {lang === 'th' ? 'เร็วกว่าแผน' : 'ahead'}</span>
                          ) : (
                            <span className="text-[#0061FF] font-bold">{lang === 'th' ? 'ตรงเวลา' : 'On time'}</span>
                          )
                        ) : (
                          <span className="text-[#FF5E00]">{scope.progress}%</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <div className="p-4 min-w-[800px]">
            <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">{lang === 'th' ? 'แผนภูมิแกนต์ชาร์ตโครงการ' : 'Project Gantt Chart'}</h3>
            
            {scopes.length === 0 ? (
              <p className="text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลงาน' : 'No tasks available.'}</p>
            ) : (
              <div className="relative pt-6">
                {/* Timeline Header */}
                <div className="flex border-b border-slate-200 pb-2 mb-4 text-[10px] text-slate-500 relative pl-[200px]">
                  <div className="absolute left-0 bottom-2 w-[190px] font-semibold text-slate-700 text-xs">{lang === 'th' ? 'ชื่องาน' : 'Task'}</div>
                  <div className="flex-1 flex justify-between">
                    <span>{format(minDate, 'dd MMM yyyy')}</span>
                    <span>{format(maxDate, 'dd MMM yyyy')}</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-4">
                  {scopes.map(scope => {
                    let bStart = 0;
                    let bWidth = 0;
                    
                    if (scope.baselineStartDate && scope.baselineEndDate && isValid(parseISO(scope.baselineStartDate)) && isValid(parseISO(scope.baselineEndDate))) {
                      const startOffset = differenceInDays(parseISO(scope.baselineStartDate), minDate);
                      const duration = differenceInDays(parseISO(scope.baselineEndDate), parseISO(scope.baselineStartDate)) + 1;
                      
                      bStart = Math.max(0, (startOffset / totalDays) * 100);
                      bWidth = Math.min(100 - bStart, (duration / totalDays) * 100);
                    }

                    let aStart = 0;
                    let aWidth = 0;
                    if (scope.actualStartDate && scope.actualEndDate && isValid(parseISO(scope.actualStartDate)) && isValid(parseISO(scope.actualEndDate))) {
                      const startOffset = differenceInDays(parseISO(scope.actualStartDate), minDate);
                      const duration = differenceInDays(parseISO(scope.actualEndDate), parseISO(scope.actualStartDate)) + 1;
                      
                      aStart = Math.max(0, (startOffset / totalDays) * 100);
                      aWidth = Math.min(100 - aStart, (duration / totalDays) * 100);
                    }

                    return (
                      <div key={scope.id} className="relative flex items-center group">
                        <div className="w-[190px] flex-shrink-0 text-xs text-slate-700 font-medium truncate pr-4" title={scope.taskName}>
                          {scope.taskName}
                        </div>
                        
                        <div className="flex-1 h-10 relative bg-slate-50 rounded border border-slate-100">
                          {bWidth > 0 && (
                            <div 
                              className="absolute top-1 h-3 rounded-full bg-[#0061FF]/30 border border-[#0061FF]/50"
                              style={{ left: `${bStart}%`, width: `${bWidth}%` }}
                              title={`${lang === 'th' ? 'แผน:' : 'Baseline:'} ${scope.baselineStartDate} - ${scope.baselineEndDate}`}
                            />
                          )}
                          
                          {aWidth > 0 && (
                            <div 
                              className={`absolute bottom-1 h-3 rounded-full ${scope.progress === 100 ? 'bg-[#22C55E]' : 'bg-[#FF5E00]'}`}
                              style={{ left: `${aStart}%`, width: `${aWidth}%` }}
                              title={`${lang === 'th' ? 'จริง:' : 'Actual:'} ${scope.actualStartDate} - ${scope.actualEndDate}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-[#0061FF]/30 border border-[#0061FF]/50 rounded-sm"></div>
                    <span>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-[#FF5E00] rounded-sm"></div>
                    <span>{lang === 'th' ? 'กำลังดำเนินการ' : 'In Progress'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-[#22C55E] rounded-sm"></div>
                    <span>{lang === 'th' ? 'เสร็จสมบูรณ์' : 'Completed'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
