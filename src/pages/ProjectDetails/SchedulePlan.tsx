import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { differenceInDays, parseISO, isValid, addDays, format } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function SchedulePlan({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');
  
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  
  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
    
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'p' | 'l'>('l');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  // Calculate sequential dates based on order and durationDays
  const sequentialDates = projectScopes.reduce((acc, scope, index) => {
    let start = index === 0 
      ? (isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date())
      : addDays(acc[projectScopes[index - 1].id].end, 1);
      
    const duration = scope.durationDays || 1;
    const end = addDays(start, duration > 0 ? duration - 1 : 0);
    
    acc[scope.id] = { start, end };
    return acc;
  }, {} as Record<string, { start: Date, end: Date }>);

  const handleUpdate = (id: string, field: string, value: any) => {
    updateData({
      scopes: data.scopes.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    });
  };

  const handleAdd = () => {
    if (!newTask.trim()) return;
    const newScope = {
      id: uuidv4(),
      projectId,
      taskName: newTask,
      order: projectScopes.length,
      durationDays: 1,
      progress: 0,
    };
    updateData({ scopes: [...data.scopes, newScope] });
    setNewTask('');
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' : 'Are you sure you want to delete this item?')) return;
    updateData({
      scopes: data.scopes.filter(s => s.id !== id)
    });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentScopes = [...projectScopes];
    const draggedIdx = currentScopes.findIndex(s => s.id === draggedId);
    const targetIdx = currentScopes.findIndex(s => s.id === targetId);
    
    const [draggedItem] = currentScopes.splice(draggedIdx, 1);
    currentScopes.splice(targetIdx, 0, draggedItem);
    
    const updatedScopes = data.scopes.map(s => {
      if (s.projectId === projectId) {
        const newOrder = currentScopes.findIndex(cs => cs.id === s.id);
        return { ...s, order: newOrder !== -1 ? newOrder : (s.order || 0) };
      }
      return s;
    });
    
    updateData({ scopes: updatedScopes });
    setDraggedId(null);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      const element = reportRef.current;
      const originalWidth = element.style.width;
      
      const pxPerMm = 3.7795275591;
      const widthMm = paperSize === 'a4' ? (orientation === 'p' ? 210 : 297) : (orientation === 'p' ? 297 : 420);
      element.style.width = `${widthMm * pxPerMm}px`;
      
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
    } catch (e) {
      console.error("PDF Export failed", e);
    }
    
    setIsExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={lang === 'th' ? 'กรอกชื่องาน / หัวข้อ...' : 'Enter task/topic name...'}
            className="flex-1 sm:w-64 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF]"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-1.5 bg-[#0061FF] text-white rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'th' ? 'เพิ่มหัวข้อ' : 'Add Topic'}
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

      <div className="overflow-x-auto border border-slate-200 rounded bg-white" ref={reportRef} style={{ background: 'white', padding: '16px' }}>
        <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">{lang === 'th' ? 'แผนงานและผลการดำเนินงาน' : 'Schedule & Actual Progress'}</h3>
        
        <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[900px]">
          <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-2 font-semibold w-8"></th>
              <th className="p-2 font-semibold border-r border-slate-200 w-1/4">{lang === 'th' ? 'ชื่องาน' : 'Task Name'}</th>
              <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</th>
              <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'จริง (Actual)' : 'Actual'}</th>
              <th className="p-2 font-semibold text-center border-r border-slate-200">{lang === 'th' ? '% คืบหน้า' : '% Progress'}</th>
              <th className="p-2 font-semibold text-center w-10"></th>
            </tr>
            <tr className="bg-white border-b border-slate-200 text-[10px]">
              <th className="p-1.5 border-r border-slate-200" colSpan={2}></th>
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'ระยะเวลา (วัน)' : 'Duration'}</th>
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9] border-r border-slate-200">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
              
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9] border-r border-slate-200">{lang === 'th' ? 'ระยะเวลา' : 'Duration'}</th>
              
              <th className="p-1.5 text-center text-slate-500 bg-[#F1F5F9]" colSpan={2}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {projectScopes.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-500">
                  {lang === 'th' ? 'ยังไม่มีขอบเขตงาน' : 'No Scope of Work defined yet.'}
                </td>
              </tr>
            ) : (
              projectScopes.map(scope => {
                const calculatedDates = sequentialDates[scope.id];
                
                let actualDuration = 0;
                if (scope.actualStartDate && scope.actualEndDate && isValid(parseISO(scope.actualStartDate)) && isValid(parseISO(scope.actualEndDate))) {
                  actualDuration = differenceInDays(parseISO(scope.actualEndDate), parseISO(scope.actualStartDate)) + 1;
                }

                return (
                  <tr 
                    key={scope.id} 
                    className={`hover:bg-slate-50 transition-colors ${draggedId === scope.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, scope.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, scope.id)}
                  >
                    <td className="p-2 cursor-grab active:cursor-grabbing text-slate-400">
                      <GripVertical className="w-3 h-3 mx-auto" />
                    </td>
                    <td className="p-2 font-medium text-slate-800 border-r border-slate-200">
                      <input
                        type="text"
                        value={scope.taskName}
                        onChange={(e) => handleUpdate(scope.id, 'taskName', e.target.value)}
                        className="w-full border-transparent border-b border-b-slate-200 hover:border-slate-300 focus:border-[#0061FF] focus:outline-none p-1 bg-transparent"
                      />
                    </td>
                    
                    {/* Baseline */}
                    <td className="p-2 text-center bg-slate-50/50">
                      <input
                        type="number"
                        min="1"
                        value={scope.durationDays || 1}
                        onChange={(e) => handleUpdate(scope.id, 'durationDays', parseInt(e.target.value) || 1)}
                        className="w-12 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white mx-auto"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-500 bg-slate-50/50">{format(calculatedDates.start, 'dd/MM/yyyy')}</td>
                    <td className="p-2 text-center text-slate-500 bg-slate-50/50 border-r border-slate-200">{format(calculatedDates.end, 'dd/MM/yyyy')}</td>
                    
                    {/* Actual */}
                    <td className="p-2 text-center">
                      <input
                        type="date"
                        value={scope.actualStartDate || ''}
                        onChange={(e) => handleUpdate(scope.id, 'actualStartDate', e.target.value)}
                        className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1 text-xs bg-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="date"
                        value={scope.actualEndDate || ''}
                        onChange={(e) => handleUpdate(scope.id, 'actualEndDate', e.target.value)}
                        className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1 text-xs bg-white"
                      />
                    </td>
                    <td className="p-2 text-center border-r border-slate-200 text-slate-500">
                      {actualDuration > 0 ? `${actualDuration}` : '-'}
                    </td>
                    
                    <td className="p-2 text-center border-r border-slate-200">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={scope.progress}
                          onChange={(e) => handleUpdate(scope.id, 'progress', parseInt(e.target.value) || 0)}
                          className="w-12 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white text-[#FF5E00] font-bold"
                        />
                        <span className="text-slate-500 text-[10px]">%</span>
                      </div>
                    </td>
                    
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDelete(scope.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title={lang === 'th' ? 'ลบ' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
