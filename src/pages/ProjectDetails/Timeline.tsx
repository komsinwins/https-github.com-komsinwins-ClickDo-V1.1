import { useAppStore } from '../../store';
import { differenceInDays, parseISO, addDays, format, isValid, min, max } from 'date-fns';
import React, { useState } from 'react';
import { GripVertical, CornerDownRight } from 'lucide-react';
import { SaveButton } from '../../components/SaveButton';
import { ScopeOfWork as ScopeType } from '../../types';

export function Timeline({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const lang = data.language || 'th';
  
  const project = data.projects.find(p => p.id === projectId);
  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!project) return null;

  const projectStartDate = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();
  const mainScopes = projectScopes.filter(s => !s.parentId);

  // Helper to calculate baseline date range for items
  const getItemDates = (scope: ScopeType): { start: Date; end: Date; duration: number } => {
    const subScopes = projectScopes.filter(s => s.parentId === scope.id);
    if (subScopes.length > 0) {
      let minStart: Date | null = null;
      let maxEnd: Date | null = null;
      let totalDur = 0;

      subScopes.forEach(sub => {
        const d = getItemDates(sub);
        if (!minStart || d.start < minStart) minStart = d.start;
        if (!maxEnd || d.end > maxEnd) maxEnd = d.end;
        totalDur += d.duration;
      });

      const start = minStart || projectStartDate;
      const end = maxEnd || addDays(start, totalDur > 0 ? totalDur - 1 : 0);
      const duration = Math.max(1, differenceInDays(end, start) + 1);

      return { start, end, duration };
    } else {
      let start = projectStartDate;
      if (scope.baselineStartDate && isValid(parseISO(scope.baselineStartDate))) {
        start = parseISO(scope.baselineStartDate);
      }

      let duration = scope.durationDays && scope.durationDays > 0 ? scope.durationDays : 1;
      let end: Date;

      if (scope.baselineEndDate && isValid(parseISO(scope.baselineEndDate))) {
        const explicitEnd = parseISO(scope.baselineEndDate);
        if (explicitEnd >= start) {
          end = explicitEnd;
          duration = differenceInDays(end, start) + 1;
        } else {
          end = addDays(start, duration - 1);
        }
      } else {
        end = addDays(start, duration - 1);
      }

      return { start, end, duration };
    }
  };

  // Precompute calculated dates for all scopes
  const itemCalculatedDates: Record<string, { start: Date; end: Date; duration: number }> = {};
  projectScopes.forEach(scope => {
    itemCalculatedDates[scope.id] = getItemDates(scope);
  });

  // Bounds for Timeline Gantt
  let minDate = projectStartDate;
  let maxDate = projectStartDate;

  const calculatedEndDates = Object.values(itemCalculatedDates).map(d => d.end);
  if (calculatedEndDates.length > 0) {
    maxDate = max([projectStartDate, ...calculatedEndDates]);
  }

  const validDates: Date[] = [minDate, maxDate];
  projectScopes.forEach(s => {
    if (s.baselineStartDate && isValid(parseISO(s.baselineStartDate))) validDates.push(parseISO(s.baselineStartDate));
    if (s.baselineEndDate && isValid(parseISO(s.baselineEndDate))) validDates.push(parseISO(s.baselineEndDate));
    if (s.actualStartDate && isValid(parseISO(s.actualStartDate))) validDates.push(parseISO(s.actualStartDate));
    if (s.actualEndDate && isValid(parseISO(s.actualEndDate))) validDates.push(parseISO(s.actualEndDate));
  });

  minDate = min(validDates);
  maxDate = max(validDates);

  minDate = addDays(minDate, -1);
  maxDate = addDays(maxDate, 2);
  const totalDays = Math.max(1, differenceInDays(maxDate, minDate));
  const dayWidth = 44; // px per day

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

  // Helper to update baseline start date and auto-calculate end date/duration
  const handleBaselineStartChange = (scope: ScopeType, newStartDateStr: string) => {
    if (!newStartDateStr) {
      handleUpdate(scope.id, 'baselineStartDate', '');
      return;
    }
    const newStart = parseISO(newStartDateStr);
    if (!isValid(newStart)) return;

    let newEndDateStr = scope.baselineEndDate || '';
    let newDuration = scope.durationDays || 1;

    if (scope.baselineEndDate && isValid(parseISO(scope.baselineEndDate))) {
      const currentEnd = parseISO(scope.baselineEndDate);
      if (currentEnd >= newStart) {
        newDuration = differenceInDays(currentEnd, newStart) + 1;
      } else {
        const calculatedEnd = addDays(newStart, newDuration - 1);
        newEndDateStr = format(calculatedEnd, 'yyyy-MM-dd');
      }
    } else {
      const calculatedEnd = addDays(newStart, newDuration - 1);
      newEndDateStr = format(calculatedEnd, 'yyyy-MM-dd');
    }

    updateData({
      scopes: data.scopes.map(s => 
        s.id === scope.id 
          ? { ...s, baselineStartDate: newStartDateStr, baselineEndDate: newEndDateStr, durationDays: newDuration }
          : s
      )
    });
  };

  // Helper to update duration and auto-calculate baseline end date
  const handleDurationChange = (scope: ScopeType, newDuration: number) => {
    const dur = Math.max(1, newDuration);
    let newEndDateStr = scope.baselineEndDate || '';

    if (scope.baselineStartDate && isValid(parseISO(scope.baselineStartDate))) {
      const start = parseISO(scope.baselineStartDate);
      const calculatedEnd = addDays(start, dur - 1);
      newEndDateStr = format(calculatedEnd, 'yyyy-MM-dd');
    }

    updateData({
      scopes: data.scopes.map(s => 
        s.id === scope.id 
          ? { ...s, durationDays: dur, baselineEndDate: newEndDateStr }
          : s
      )
    });
  };

  // Progress calculation
  const getItemProgress = (scope: ScopeType): number => {
    const subScopes = projectScopes.filter(s => s.parentId === scope.id);
    if (subScopes.length === 0) {
      return scope.progress || 0;
    }
    const totalSubDur = subScopes.reduce((sum, sub) => sum + (sub.durationDays || 1), 0);
    if (totalSubDur > 0) {
      const weightedSum = subScopes.reduce((sum, sub) => sum + ((sub.progress || 0) * (sub.durationDays || 1)), 0);
      return Math.round(weightedSum / totalSubDur);
    }
    const totalProg = subScopes.reduce((sum, sub) => sum + (sub.progress || 0), 0);
    return Math.round(totalProg / subScopes.length);
  };

  const calculateOverallProjectProgress = (): number => {
    if (mainScopes.length === 0) return 0;
    let totalWeightedProg = 0;
    let totalDur = 0;

    mainScopes.forEach(main => {
      const prog = getItemProgress(main);
      const subScopes = projectScopes.filter(s => s.parentId === main.id);
      const dur = subScopes.length > 0 
        ? subScopes.reduce((sum, s) => sum + (s.durationDays || 1), 0)
        : (main.durationDays || 1);

      totalWeightedProg += prog * dur;
      totalDur += dur;
    });

    return totalDur > 0 ? Math.round(totalWeightedProg / totalDur) : 0;
  };

  const overallProgress = calculateOverallProjectProgress();

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

  // Flatten scopes in order (main task followed by its sub-tasks)
  const orderedScopes: { scope: ScopeType; isSub: boolean; mainIndex: number; subIndex?: number }[] = [];
  mainScopes.forEach((main, mIdx) => {
    orderedScopes.push({ scope: main, isSub: false, mainIndex: mIdx + 1 });
    const subScopes = projectScopes.filter(s => s.parentId === main.id);
    subScopes.forEach((sub, sIdx) => {
      orderedScopes.push({ scope: sub, isSub: true, mainIndex: mIdx + 1, subIndex: sIdx + 1 });
    });
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ตารางเวลาและแผนผังวันดำเนินงาน (Timeline Gantt Chart)' : 'Timeline & Schedule Gantt Chart'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'กำหนดระยะเวลา (วัน) และวันเริ่มทำ เพื่อกำหนดช่วงหมายเลขวันที่ทำบนผัง Gantt' : 'Specify planned duration (days) and start date to position on Gantt chart.'}</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2.5 px-4 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'ความคืบหน้ารวม:' : 'Overall Progress:'}</span>
            <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#0061FF] transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="text-sm font-bold text-[#0061FF]">{overallProgress}%</span>
          </div>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกตารางเวลาเรียบร้อยแล้ว' : 'Timeline saved successfully'} />
        </div>
      </div>

      <div className="overflow-x-auto pb-4 border border-slate-200 rounded-lg bg-white shadow-sm">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex border-b border-slate-200 bg-[#F1F5F9] sticky top-0 z-10">
            <div className="w-[380px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-[#F1F5F9] z-20">
              <div className="w-8"></div>
              <div className="flex-1 p-2 font-semibold text-xs text-slate-700">{lang === 'th' ? 'งาน / ขอบเขตงาน' : 'Task / Scope'}</div>
              <div className="w-24 p-2 font-semibold text-xs text-slate-700 text-center border-l border-slate-200">{lang === 'th' ? 'เริ่มวันที่' : 'Start Date'}</div>
              <div className="w-20 p-2 font-semibold text-xs text-slate-700 text-center border-l border-slate-200">{lang === 'th' ? 'ระยะเวลา (วัน)' : 'Duration'}</div>
            </div>
            <div className="flex relative" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
              {days.map((day, i) => {
                const dayNum = differenceInDays(day, projectStartDate) + 1;
                const isProjectDay = dayNum >= 1;

                return (
                  <div 
                    key={i} 
                    className={`absolute top-0 bottom-0 border-r border-slate-200 text-center font-medium flex flex-col justify-center py-1 ${isProjectDay ? 'bg-blue-50/30' : 'bg-slate-100/50'}`}
                    style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px`, height: '100%' }}
                  >
                    <div className="text-[10px] font-bold text-[#0061FF]">
                      {isProjectDay ? `${lang === 'th' ? 'วัน ' : 'Day '}${dayNum}` : `-`}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {format(day, 'dd/MM')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          {orderedScopes.map(({ scope, isSub, mainIndex, subIndex }) => {
            const calculatedDates = itemCalculatedDates[scope.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
            const isParent = !isSub && projectScopes.some(s => s.parentId === scope.id);
            const progress = getItemProgress(scope);
            
            const startDayNum = Math.max(1, differenceInDays(calculatedDates.start, projectStartDate) + 1);
            const endDayNum = startDayNum + calculatedDates.duration - 1;

            const baselineLeft = differenceInDays(calculatedDates.start, minDate) * dayWidth;
            const baselineWidth = calculatedDates.duration * dayWidth;

            // Actual calculations
            let actualLeft = 0;
            let actualWidth = 0;
            if (scope.actualStartDate && isValid(parseISO(scope.actualStartDate))) {
              const actStart = parseISO(scope.actualStartDate);
              const actEnd = scope.actualEndDate && isValid(parseISO(scope.actualEndDate)) 
                ? parseISO(scope.actualEndDate) 
                : actStart;
              
              actualLeft = differenceInDays(actStart, minDate) * dayWidth;
              actualWidth = (differenceInDays(actEnd, actStart) + 1) * dayWidth;
            }

            return (
              <div 
                key={scope.id} 
                className={`flex border-b border-slate-100 hover:bg-slate-50/80 relative group transition-colors ${isSub ? 'bg-white' : 'bg-slate-50/50 font-semibold'} ${draggedId === scope.id ? 'opacity-50' : ''}`}
                draggable={!isSub}
                onDragStart={(e) => handleDragStart(e, scope.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, scope.id)}
              >
                {/* Left Task Control Column */}
                <div className="w-[380px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-20">
                  <div className="w-8 p-1 flex justify-center cursor-grab active:cursor-grabbing text-slate-400">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  <div className={`flex-1 p-2 text-xs truncate flex items-center gap-1.5 ${isSub ? 'pl-6 text-slate-700' : 'text-slate-900 font-bold'}`}>
                    {isSub && <CornerDownRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                    <span className="text-slate-500 font-mono text-[10px]">
                      {isSub ? `${mainIndex}.${subIndex}` : `${mainIndex}.`}
                    </span>
                    <span className="truncate" title={scope.taskName}>{scope.taskName}</span>
                  </div>

                  {/* Start Date Column */}
                  <div className="w-24 p-1 border-l border-slate-200 text-center">
                    {isParent ? (
                      <span className="text-[10px] text-slate-600 font-medium">{format(calculatedDates.start, 'dd/MM/yy')}</span>
                    ) : (
                      <input
                        type="date"
                        value={scope.baselineStartDate || ''}
                        onChange={(e) => handleBaselineStartChange(scope, e.target.value)}
                        className="w-full border border-slate-200 rounded p-0.5 text-[10px] text-center focus:border-[#0061FF] focus:outline-none bg-white"
                      />
                    )}
                  </div>

                  {/* Duration Column */}
                  <div className="w-20 p-1 border-l border-slate-200 flex flex-col items-center justify-center">
                    {isParent ? (
                      <span className="text-xs font-bold text-[#0061FF]" title={lang === 'th' ? 'คำนวณจากงานย่อย' : 'Calculated from sub-tasks'}>
                        {calculatedDates.duration} {lang === 'th' ? 'วัน' : 'd'}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={scope.durationDays || 1}
                          onChange={(e) => handleDurationChange(scope, parseInt(e.target.value) || 1)}
                          className="w-12 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-0.5 text-xs text-center font-bold"
                        />
                        <span className="text-[10px] text-slate-400">{lang === 'th' ? 'วัน' : 'd'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Gantt Canvas */}
                <div className="flex relative py-2.5 items-center" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
                  {/* Grid lines */}
                  {days.map((day, i) => {
                    const dayNum = differenceInDays(day, projectStartDate) + 1;
                    const isProjectDay = dayNum >= 1;
                    return (
                      <div 
                        key={i} 
                        className={`absolute top-0 bottom-0 border-r pointer-events-none ${isProjectDay ? 'border-slate-100 bg-blue-50/10' : 'border-slate-100 bg-slate-50/30'}`} 
                        style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px` }} 
                      />
                    );
                  })}
                  
                  {/* Baseline Gantt Bar */}
                  {baselineWidth > 0 && (
                    <div 
                      className={`absolute h-6 rounded-md shadow-sm transition-all flex items-center px-2 text-[10px] font-bold text-white overflow-hidden ${
                        isParent ? 'bg-indigo-600 border border-indigo-700' : 'bg-[#0061FF]'
                      }`}
                      style={{ left: `${baselineLeft}px`, width: `${baselineWidth}px` }}
                      title={`${scope.taskName} (${lang === 'th' ? 'วันที่' : 'Days'} ${startDayNum} - ${endDayNum}): ${format(calculatedDates.start, 'dd/MM/yyyy')} - ${format(calculatedDates.end, 'dd/MM/yyyy')}`}
                    >
                      {/* Inner Progress Overlay */}
                      {progress > 0 && (
                        <div 
                          className="absolute top-0 bottom-0 left-0 bg-emerald-500 opacity-90 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      )}
                      
                      <span className="relative z-10 truncate drop-shadow-sm">
                        {baselineWidth >= 60 ? `${lang === 'th' ? 'วัน' : 'Day'} ${startDayNum}-${endDayNum} (${progress}%)` : `${progress}%`}
                      </span>
                    </div>
                  )}

                  {/* Actual Progress Bar (if actual dates entered) */}
                  {actualWidth > 0 && (
                    <div 
                      className="absolute top-7 h-2 bg-orange-500 rounded-full opacity-80"
                      style={{ left: `${actualLeft}px`, width: `${actualWidth}px` }}
                      title={`${lang === 'th' ? 'ผลจริง:' : 'Actual:'} ${scope.actualStartDate} - ${scope.actualEndDate || ''}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer Legend */}
        <div className="p-3 flex flex-wrap gap-6 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 mt-2 rounded-b">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-[#0061FF] rounded"></div>
            <span>{lang === 'th' ? 'แผนงาน (Baseline Task)' : 'Baseline Task'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-indigo-600 rounded"></div>
            <span>{lang === 'th' ? 'หมวดงานหลัก (Main Category)' : 'Main Category'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-emerald-500 rounded"></div>
            <span>{lang === 'th' ? 'ความคืบหน้า (% Progress)' : '% Progress Fill'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-orange-500 rounded-full"></div>
            <span>{lang === 'th' ? 'ผลงานจริง (Actual Duration)' : 'Actual Execution'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

