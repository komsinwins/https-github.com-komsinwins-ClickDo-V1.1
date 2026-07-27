import { useAppStore } from '../../store';
import { differenceInDays, parseISO, addDays, format, isValid } from 'date-fns';
import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export function Timeline({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const lang = data.language || 'th';
  
  const project = data.projects.find(p => p.id === projectId);
  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

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

  let minDate = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();
  let maxDate = minDate;
  
  if (projectScopes.length > 0) {
    const lastScope = projectScopes[projectScopes.length - 1];
    maxDate = sequentialDates[lastScope.id].end;
  }

  // Add some padding to dates
  minDate = addDays(minDate, -2);
  maxDate = addDays(maxDate, 2);
  const totalDays = differenceInDays(maxDate, minDate);
  const dayWidth = 40; // px per day

  const generateDays = () => {
    const days = [];
    for (let i = 0; i <= totalDays; i++) {
      days.push(addDays(minDate, i));
    }
    return days;
  };

  const days = generateDays();

  const handleUpdate = (id: string, field: string, value: any) => {
    updateData({
      scopes: data.scopes.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
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

  if (projectScopes.length === 0) {
    return <div className="text-center p-8 text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">{lang === 'th' ? 'กรุณาเพิ่มหัวข้อในขอบเขตงาน' : 'Please add topics in Scope of Work.'}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-4 border border-slate-200 rounded bg-white">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex border-b border-slate-200 bg-[#F1F5F9] sticky top-0 z-10">
            <div className="w-[320px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-[#F1F5F9] z-20">
              <div className="w-10"></div>
              <div className="flex-1 p-2 font-semibold text-xs text-slate-700">{lang === 'th' ? 'ชื่องาน' : 'Task Name'}</div>
              <div className="w-24 p-2 font-semibold text-xs text-slate-700 text-center border-l border-slate-200">{lang === 'th' ? 'จำนวนวัน' : 'Duration'}</div>
            </div>
            <div className="flex relative" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className="absolute top-0 bottom-0 border-r border-slate-200 text-[10px] text-slate-500 p-1 truncate text-center font-medium"
                  style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px`, height: '100%' }}
                >
                  {format(day, 'dd/MM')}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {projectScopes.map(scope => {
            const calculatedDates = sequentialDates[scope.id];
            
            const baselineLeft = differenceInDays(calculatedDates.start, minDate) * dayWidth;
            const baselineWidth = ((scope.durationDays || 1)) * dayWidth;

            // Actual calculations
            let actualLeft = 0;
            let actualWidth = 0;
            if (scope.actualStartDate && isValid(parseISO(scope.actualStartDate))) {
              const actEnd = scope.actualEndDate && isValid(parseISO(scope.actualEndDate)) 
                ? parseISO(scope.actualEndDate) 
                : new Date();
              
              actualLeft = differenceInDays(parseISO(scope.actualStartDate), minDate) * dayWidth;
              actualWidth = (differenceInDays(actEnd, parseISO(scope.actualStartDate)) + 1) * dayWidth;
            }

            return (
              <div 
                key={scope.id} 
                className={`flex border-b border-slate-100 hover:bg-slate-50 relative group transition-colors ${draggedId === scope.id ? 'opacity-50' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, scope.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, scope.id)}
              >
                <div className="w-[320px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-20">
                  <div className="w-10 p-2 flex justify-center cursor-grab active:cursor-grabbing text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-2 font-medium text-xs text-slate-800 truncate">
                    {scope.taskName}
                  </div>
                  <div className="w-24 p-1.5 border-l border-slate-200 flex justify-center">
                     <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={scope.durationDays || 1}
                          onChange={(e) => handleUpdate(scope.id, 'durationDays', parseInt(e.target.value) || 1)}
                          className="w-12 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1 text-xs text-center"
                        />
                     </div>
                  </div>
                </div>
                <div className="flex relative py-2" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
                  {/* Grid lines */}
                  {days.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100 pointer-events-none" style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px` }} />
                  ))}
                  
                  {/* Baseline Bar */}
                  {baselineWidth > 0 && (
                    <div 
                      className="absolute top-3 h-3 bg-[#0061FF] bg-opacity-80 rounded-full"
                      style={{ left: `${baselineLeft}px`, width: `${baselineWidth}px` }}
                      title={`${lang === 'th' ? 'แผน:' : 'Baseline:'} ${format(calculatedDates.start, 'dd/MM/yyyy')} - ${format(calculatedDates.end, 'dd/MM/yyyy')}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-3 flex gap-4 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 mt-2 rounded-b">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#0061FF] bg-opacity-80 rounded-full"></div>
            <span>{lang === 'th' ? 'ระยะเวลาที่วางแผน (วัน)' : 'Planned Duration (Days)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
