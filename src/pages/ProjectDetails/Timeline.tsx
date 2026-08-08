import { useAppStore } from '../../store';
import { differenceInDays, parseISO, addDays, format, isValid, min, max } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { GripVertical, CornerDownRight, ChevronUp, ChevronDown, MoveHorizontal, Plus, Trash2 } from 'lucide-react';
import { SaveButton } from '../../components/SaveButton';
import { ScopeOfWork as ScopeType } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export function Timeline({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [barDragInfo, setBarDragInfo] = useState<{
    scopeId: string;
    startMouseX: number;
    originalStart: Date;
    isParent: boolean;
    deltaDays: number;
  } | null>(null);

  // States for inserting/adding tasks in Timeline
  const [taskType, setTaskType] = useState<'main' | 'sub'>('main');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState<number>(1);
  const [newTaskStartDate, setNewTaskStartDate] = useState<string>('');
  const [showSubInput, setShowSubInput] = useState<Record<string, boolean>>({});
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});

  const lang = data.language || 'th';
  
  const project = data.projects.find(p => p.id === projectId);

  // Read tasks from scheduleTasks if present, otherwise fallback to scopes
  const masterProjectScopes = (data.scopes || [])
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const scheduleProjectTasks = (data.scheduleTasks || [])
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const rawProjectTasks = scheduleProjectTasks.length > 0
    ? scheduleProjectTasks
    : masterProjectScopes;

  const projectScopes = [...rawProjectTasks].sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (project && !newTaskStartDate) {
      const pStart = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();
      setNewTaskStartDate(format(pStart, 'yyyy-MM-dd'));
    }
  }, [project, newTaskStartDate]);

  if (!project) return null;

  const projectStartDate = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();
  const mainScopes = projectScopes.filter(s => !s.parentId);

  // Save tasks back to scheduleTasks to keep Schedule Plan and Timeline identical
  const saveTasks = (updatedProjectTasks: ScopeType[]) => {
    const otherProjectsScheduleTasks = (data.scheduleTasks || []).filter(s => s.projectId !== projectId);
    const normalized = updatedProjectTasks.map((s, idx) => ({
      ...s,
      order: idx,
    }));

    updateData({
      scheduleTasks: [...otherProjectsScheduleTasks, ...normalized],
    });
  };

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

  minDate = addDays(minDate, -2);
  maxDate = addDays(maxDate, 3);
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

  // Add Task Handler
  const handleAddTask = () => {
    if (!newTaskName.trim()) return;

    const dur = Math.max(1, newTaskDuration || 1);
    let startDateStr = newTaskStartDate;
    if (!startDateStr || !isValid(parseISO(startDateStr))) {
      startDateStr = format(projectStartDate, 'yyyy-MM-dd');
    }
    const start = parseISO(startDateStr);
    const endDateStr = format(addDays(start, dur - 1), 'yyyy-MM-dd');

    if (taskType === 'sub' && (selectedParentId || mainScopes[0]?.id)) {
      const parentId = selectedParentId || mainScopes[0]?.id;
      const subScope: ScopeType = {
        id: uuidv4(),
        projectId,
        parentId,
        taskName: newTaskName.trim(),
        order: projectScopes.length,
        durationDays: dur,
        baselineStartDate: startDateStr,
        baselineEndDate: endDateStr,
        progress: 0,
      };
      saveTasks([...projectScopes, subScope]);
      setNewTaskName('');
    } else {
      const newScope: ScopeType = {
        id: uuidv4(),
        projectId,
        taskName: newTaskName.trim(),
        order: projectScopes.length,
        durationDays: dur,
        baselineStartDate: startDateStr,
        baselineEndDate: endDateStr,
        progress: 0,
      };
      saveTasks([...projectScopes, newScope]);
      setNewTaskName('');
    }
  };

  const handleAddSubTaskInline = (parentId: string) => {
    const name = subTaskInputs[parentId];
    if (!name || !name.trim()) return;

    const parentCalculated = itemCalculatedDates[parentId] || { start: projectStartDate };
    const startDateStr = format(parentCalculated.start, 'yyyy-MM-dd');
    const endDateStr = format(addDays(parentCalculated.start, 0), 'yyyy-MM-dd');

    const subScope: ScopeType = {
      id: uuidv4(),
      projectId,
      parentId,
      taskName: name.trim(),
      order: projectScopes.length,
      durationDays: 1,
      baselineStartDate: startDateStr,
      baselineEndDate: endDateStr,
      progress: 0,
    };
    saveTasks([...projectScopes, subScope]);
    setSubTaskInputs({ ...subTaskInputs, [parentId]: '' });
    setShowSubInput({ ...showSubInput, [parentId]: false });
  };

  const handleDeleteTask = (id: string) => {
    const updated = projectScopes.filter(s => s.id !== id && s.parentId !== id);
    saveTasks(updated);
  };

  const handleUpdateField = (id: string, field: string, value: any) => {
    const updated = projectScopes.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    saveTasks(updated);
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

    const updated = projectScopes.map(s => 
      s.id === scope.id 
        ? { ...s, durationDays: dur, baselineEndDate: newEndDateStr }
        : s
    );
    saveTasks(updated);
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

  // Handle Bar Dragging across timeline
  const handleBarMouseDown = (e: React.MouseEvent, scope: ScopeType, currentStart: Date, isParent: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setBarDragInfo({
      scopeId: scope.id,
      startMouseX: e.clientX,
      originalStart: currentStart,
      isParent,
      deltaDays: 0,
    });
  };

  useEffect(() => {
    if (!barDragInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - barDragInfo.startMouseX;
      const deltaDays = Math.round(deltaX / dayWidth);
      setBarDragInfo(prev => prev ? { ...prev, deltaDays } : null);
    };

    const handleMouseUp = () => {
      if (barDragInfo.deltaDays !== 0) {
        const scope = projectScopes.find(s => s.id === barDragInfo.scopeId);
        if (scope) {
          const delta = barDragInfo.deltaDays;
          const subScopes = projectScopes.filter(s => s.parentId === scope.id);

          let updatedScopes: ScopeType[] = [];
          if (subScopes.length > 0) {
            // Shift all sub-tasks under this parent
            updatedScopes = projectScopes.map(s => {
              if (s.parentId === scope.id) {
                const curStart = itemCalculatedDates[s.id]?.start || projectStartDate;
                const newSubStart = addDays(curStart, delta);
                const dur = s.durationDays || 1;
                const newSubEnd = addDays(newSubStart, dur - 1);
                return {
                  ...s,
                  baselineStartDate: format(newSubStart, 'yyyy-MM-dd'),
                  baselineEndDate: format(newSubEnd, 'yyyy-MM-dd'),
                };
              }
              return s;
            });
          } else {
            // Shift single scope
            const curStart = itemCalculatedDates[scope.id]?.start || projectStartDate;
            const newStart = addDays(curStart, delta);
            const dur = scope.durationDays || 1;
            const newEnd = addDays(newStart, dur - 1);

            updatedScopes = projectScopes.map(s => 
              s.id === scope.id
                ? {
                    ...s,
                    baselineStartDate: format(newStart, 'yyyy-MM-dd'),
                    baselineEndDate: format(newEnd, 'yyyy-MM-dd'),
                  }
                : s
            );
          }
          saveTasks(updatedScopes);
        }
      }
      setBarDragInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [barDragInfo, dayWidth, projectScopes, projectStartDate]);

  // Reorder Tasks Logic
  const moveTask = (scopeId: string, direction: 'up' | 'down') => {
    const scope = projectScopes.find(s => s.id === scopeId);
    if (!scope) return;

    if (!scope.parentId) {
      const idx = mainScopes.findIndex(s => s.id === scopeId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= mainScopes.length) return;

      const currentItem = mainScopes[idx];
      const targetItem = mainScopes[targetIdx];

      const updatedScopes = projectScopes.map(s => {
        if (s.id === currentItem.id) return { ...s, order: targetIdx };
        if (s.id === targetItem.id) return { ...s, order: idx };
        return s;
      });
      saveTasks(updatedScopes);
    } else {
      const siblingSubs = projectScopes.filter(s => s.parentId === scope.parentId);
      const idx = siblingSubs.findIndex(s => s.id === scopeId);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= siblingSubs.length) return;

      const currentItem = siblingSubs[idx];
      const targetItem = siblingSubs[targetIdx];

      const updatedScopes = projectScopes.map(s => {
        if (s.id === currentItem.id) return { ...s, order: targetIdx };
        if (s.id === targetItem.id) return { ...s, order: idx };
        return s;
      });
      saveTasks(updatedScopes);
    }
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

    const draggedScope = projectScopes.find(s => s.id === draggedId);
    const targetScope = projectScopes.find(s => s.id === targetId);
    if (!draggedScope || !targetScope) return;

    if (!draggedScope.parentId && !targetScope.parentId) {
      const currentMains = [...mainScopes];
      const dIdx = currentMains.findIndex(s => s.id === draggedId);
      const tIdx = currentMains.findIndex(s => s.id === targetId);
      if (dIdx !== -1 && tIdx !== -1) {
        const [item] = currentMains.splice(dIdx, 1);
        currentMains.splice(tIdx, 0, item);

        const updatedScopes = projectScopes.map(s => {
          if (!s.parentId) {
            const newIdx = currentMains.findIndex(m => m.id === s.id);
            return { ...s, order: newIdx !== -1 ? newIdx : (s.order || 0) };
          }
          return s;
        });
        saveTasks(updatedScopes);
      }
    } else if (draggedScope.parentId === targetScope.parentId && draggedScope.parentId) {
      const siblings = projectScopes.filter(s => s.parentId === draggedScope.parentId);
      const dIdx = siblings.findIndex(s => s.id === draggedId);
      const tIdx = siblings.findIndex(s => s.id === targetId);
      if (dIdx !== -1 && tIdx !== -1) {
        const [item] = siblings.splice(dIdx, 1);
        siblings.splice(tIdx, 0, item);

        const updatedScopes = projectScopes.map(s => {
          if (s.parentId === draggedScope.parentId) {
            const newIdx = siblings.findIndex(sub => sub.id === s.id);
            return { ...s, order: newIdx !== -1 ? newIdx : (s.order || 0) };
          }
          return s;
        });
        saveTasks(updatedScopes);
      }
    }

    setDraggedId(null);
  };

  // Flatten scopes in order (main task followed by its sub-tasks)
  const orderedScopes: { scope: ScopeType; isSub: boolean; mainIndex: number; subIndex?: number; isFirst: boolean; isLast: boolean }[] = [];
  mainScopes.forEach((main, mIdx) => {
    const isFirstMain = mIdx === 0;
    const isLastMain = mIdx === mainScopes.length - 1;
    orderedScopes.push({ scope: main, isSub: false, mainIndex: mIdx + 1, isFirst: isFirstMain, isLast: isLastMain });

    const subScopes = projectScopes.filter(s => s.parentId === main.id);
    subScopes.forEach((sub, sIdx) => {
      const isFirstSub = sIdx === 0;
      const isLastSub = sIdx === subScopes.length - 1;
      orderedScopes.push({ scope: sub, isSub: true, mainIndex: mIdx + 1, subIndex: sIdx + 1, isFirst: isFirstSub, isLast: isLastSub });
    });
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ตารางเวลาและแผนผังวันดำเนินงาน (Timeline Gantt Chart)' : 'Timeline & Schedule Gantt Chart'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'แทรกงาน เพิ่มงาน สลับลำดับ และคลิกลากแถบ Gantt เพื่อปรับช่วงวันดำเนินงานได้โดยตรง' : 'Insert tasks, drag Gantt bars left/right to shift schedule dates, or swap task order.'}</p>
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

      {/* Insert / Add Task Control Box */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#0061FF]" />
            {lang === 'th' ? 'แทรกงาน / เพิ่มรายการงานในตารางเวลา' : 'Insert / Add Task in Timeline'}
          </span>
          <span className="text-[11px] text-slate-500">
            {lang === 'th' ? 'รายการงานจะซิงค์ตรงกับแผนการดำเนินงาน' : 'Synced with Execution & Operational Plan'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center">
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as 'main' | 'sub')}
            className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-[#0061FF]"
          >
            <option value="main">{lang === 'th' ? 'งานหลัก' : 'Main Task'}</option>
            {mainScopes.length > 0 && (
              <option value="sub">{lang === 'th' ? 'งานย่อย' : 'Sub Task'}</option>
            )}
          </select>

          {taskType === 'sub' && mainScopes.length > 0 && (
            <select
              value={selectedParentId || mainScopes[0]?.id}
              onChange={(e) => setSelectedParentId(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 max-w-[180px] truncate outline-none focus:ring-2 focus:ring-[#0061FF]"
            >
              {mainScopes.map((m, idx) => (
                <option key={m.id} value={m.id}>
                  {idx + 1}. {m.taskName}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder={
              taskType === 'sub'
                ? (lang === 'th' ? 'กรอกชื่อรายการงานย่อย...' : 'Enter sub-task name...')
                : (lang === 'th' ? 'กรอกชื่อรายการงานหลัก...' : 'Enter main task name...')
            }
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0061FF] focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />

          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{lang === 'th' ? 'ระยะเวลา:' : 'Days:'}</span>
            <input
              type="number"
              min="1"
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(parseInt(e.target.value) || 1)}
              className="w-12 px-1 py-0.5 text-xs font-bold text-center border border-slate-300 rounded bg-white"
            />
            <span className="text-[11px] text-slate-500">{lang === 'th' ? 'วัน' : 'd'}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{lang === 'th' ? 'เริ่ม:' : 'Start:'}</span>
            <input
              type="date"
              value={newTaskStartDate}
              onChange={(e) => setNewTaskStartDate(e.target.value)}
              className="px-1 py-0.5 text-xs border border-slate-300 rounded bg-white text-slate-700"
            />
          </div>

          <button
            onClick={handleAddTask}
            className="px-4 py-1.5 bg-[#0061FF] text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? 'แทรกงาน' : 'Insert Task'}</span>
          </button>
        </div>
      </div>

      {projectScopes.length === 0 ? (
        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded border border-dashed border-slate-200">
          {lang === 'th' ? 'ยังไม่มีรายการงาน กรอกข้อมูลด้านบนเพื่อเริ่มแทรกงานในตารางเวลา' : 'No tasks defined yet. Enter details above to insert a task.'}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 border border-slate-200 rounded-lg bg-white shadow-sm">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="flex border-b border-slate-200 bg-[#F1F5F9] sticky top-0 z-10">
              <div className="w-[340px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-[#F1F5F9] z-20">
                <div className="w-10 text-center font-semibold text-[11px] text-slate-500">{lang === 'th' ? 'สลับ' : 'Order'}</div>
                <div className="flex-1 p-2 font-semibold text-xs text-slate-700">{lang === 'th' ? 'งาน / รายการดำเนินงาน' : 'Task Name'}</div>
                <div className="w-16 p-2 font-semibold text-xs text-slate-700 text-center border-l border-slate-200">{lang === 'th' ? 'ระยะเวลา' : 'Duration'}</div>
                <div className="w-16 p-2 font-semibold text-xs text-slate-700 text-center border-l border-slate-200">{lang === 'th' ? 'จัดการ' : 'Actions'}</div>
              </div>
              <div className="flex relative" style={{ width: `${(totalDays + 1) * dayWidth}px` }}>
                {days.map((day, i) => {
                  const dayNum = differenceInDays(day, projectStartDate) + 1;
                  const isProjectDay = dayNum >= 1;

                  return (
                    <div 
                      key={i} 
                      className={`absolute top-0 bottom-0 border-r border-slate-200 text-center font-medium flex items-center justify-center py-1 select-none ${isProjectDay ? 'bg-blue-50/30' : 'bg-slate-100/50'}`}
                      style={{ left: `${i * dayWidth}px`, width: `${dayWidth}px`, height: '100%' }}
                    >
                      <div className="text-[10px] font-bold text-[#0061FF]">
                        {isProjectDay ? `${lang === 'th' ? 'วันที่ ' : 'Day '}${dayNum}` : `-`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {orderedScopes.map(({ scope, isSub, mainIndex, subIndex, isFirst, isLast }) => {
              const calculatedDates = itemCalculatedDates[scope.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
              const isParent = !isSub && projectScopes.some(s => s.parentId === scope.id);
              const progress = getItemProgress(scope);
              
              const isBeingDragged = barDragInfo?.scopeId === scope.id;
              const currentDelta = isBeingDragged ? barDragInfo.deltaDays : 0;

              const effectiveStart = addDays(calculatedDates.start, currentDelta);

              const startDayNum = Math.max(1, differenceInDays(effectiveStart, projectStartDate) + 1);
              const endDayNum = startDayNum + calculatedDates.duration - 1;

              const baselineLeft = (differenceInDays(effectiveStart, minDate)) * dayWidth;
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
                <React.Fragment key={scope.id}>
                  <div 
                    className={`flex border-b border-slate-100 hover:bg-slate-50/80 relative group transition-colors ${isSub ? 'bg-white' : 'bg-slate-50/50 font-semibold'} ${draggedId === scope.id ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, scope.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, scope.id)}
                  >
                    {/* Left Task Control Column */}
                    <div className="w-[340px] flex-shrink-0 flex items-center border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-20">
                      {/* Reorder controls (Drag Handle + Up/Down arrows) */}
                      <div className="w-10 py-1 px-0.5 flex flex-col items-center justify-center border-r border-slate-100 flex-shrink-0">
                        <div className="flex items-center text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-0.5" title={lang === 'th' ? 'คลิกลากเพื่อสลับลำดับงาน' : 'Drag to reorder'}>
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <button
                            onClick={() => moveTask(scope.id, 'up')}
                            disabled={isFirst}
                            className="p-0.5 text-slate-400 hover:text-[#0061FF] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title={lang === 'th' ? 'เลื่อนขึ้น' : 'Move Up'}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveTask(scope.id, 'down')}
                            disabled={isLast}
                            className="p-0.5 text-slate-400 hover:text-[#0061FF] disabled:opacity-20 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title={lang === 'th' ? 'เลื่อนลง' : 'Move Down'}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Task Name Editable Input */}
                      <div className={`flex-1 p-1.5 text-xs flex items-center gap-1 ${isSub ? 'pl-3 text-slate-700' : 'text-slate-900 font-bold'}`}>
                        {isSub && <CornerDownRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
                        <span className="text-slate-500 font-mono text-[10px] flex-shrink-0">
                          {isSub ? `${mainIndex}.${subIndex}` : `${mainIndex}.`}
                        </span>
                        <input
                          type="text"
                          value={scope.taskName}
                          onChange={(e) => handleUpdateField(scope.id, 'taskName', e.target.value)}
                          className="w-full px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-[#0061FF] rounded focus:outline-none bg-transparent focus:bg-white text-xs truncate"
                          title={scope.taskName}
                        />
                      </div>

                      {/* Duration Column */}
                      <div className="w-16 p-1 border-l border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
                        {isParent ? (
                          <span className="text-xs font-bold text-[#0061FF]" title={lang === 'th' ? 'คำนวณจากงานย่อย' : 'Calculated from sub-tasks'}>
                            {calculatedDates.duration}d
                          </span>
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min="1"
                              value={scope.durationDays || 1}
                              onChange={(e) => handleDurationChange(scope, parseInt(e.target.value) || 1)}
                              className="w-10 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-0.5 text-xs text-center font-bold bg-white"
                            />
                            <span className="text-[10px] text-slate-400">d</span>
                          </div>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="w-16 p-1 border-l border-slate-200 flex items-center justify-center gap-1 flex-shrink-0">
                        {!isSub && (
                          <button
                            onClick={() => setShowSubInput({ ...showSubInput, [scope.id]: !showSubInput[scope.id] })}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title={lang === 'th' ? 'แทรกงานย่อย' : 'Insert Sub-task'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTask(scope.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title={lang === 'th' ? 'ลบรายการงาน' : 'Delete task'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                      
                      {/* Baseline Gantt Bar (Draggable) */}
                      {baselineWidth > 0 && (
                        <div 
                          onMouseDown={(e) => handleBarMouseDown(e, scope, calculatedDates.start, isParent)}
                          className={`absolute h-7 rounded-md shadow-sm transition-shadow flex items-center px-2 text-[10px] font-bold text-white overflow-hidden cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-blue-400 select-none ${
                            isBeingDragged ? 'ring-2 ring-blue-500 opacity-90 scale-[1.02] z-30 shadow-md' : ''
                          } ${
                            isParent ? 'bg-indigo-600 border border-indigo-700' : 'bg-[#0061FF]'
                          }`}
                          style={{ left: `${baselineLeft}px`, width: `${baselineWidth}px` }}
                          title={lang === 'th' ? 'คลิกลากซ้าย-ขวาเพื่อย้ายวันดำเนินงานบนตาราง' : 'Click & drag left/right to move dates'}
                        >
                          {/* Drag icon */}
                          <MoveHorizontal className="w-3 h-3 text-white/80 mr-1 flex-shrink-0" />

                          {/* Inner Progress Overlay */}
                          {progress > 0 && (
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-emerald-500 opacity-90 transition-all pointer-events-none"
                              style={{ width: `${progress}%` }}
                            />
                          )}
                          
                          <span className="relative z-10 truncate drop-shadow-sm pointer-events-none">
                            {baselineWidth >= 70 
                              ? `${lang === 'th' ? 'วันที่ ' : 'Day '}${startDayNum}-${endDayNum} (${progress}%)` 
                              : `${progress}%`}
                          </span>
                        </div>
                      )}

                      {/* Actual Progress Bar (if actual dates entered) */}
                      {actualWidth > 0 && (
                        <div 
                          className="absolute top-8 h-1.5 bg-orange-500 rounded-full opacity-80 pointer-events-none"
                          style={{ left: `${actualLeft}px`, width: `${actualWidth}px` }}
                          title={`${lang === 'th' ? 'ผลจริง:' : 'Actual:'} ${scope.actualStartDate} - ${scope.actualEndDate || ''}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Inline Quick Add Sub-Task row */}
                  {showSubInput[scope.id] && (
                    <div className="flex border-b border-blue-200 bg-blue-50/40 relative z-20">
                      <div className="w-[340px] p-2 pl-8 flex items-center gap-2 border-r border-blue-200 bg-blue-50/80 sticky left-0 z-20">
                        <CornerDownRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <input
                          type="text"
                          value={subTaskInputs[scope.id] || ''}
                          onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [scope.id]: e.target.value })}
                          placeholder={lang === 'th' ? 'พิมพ์ชื่อรายการงานย่อย แล้วกด Enter...' : 'Type sub-task name...'}
                          className="w-full px-2 py-1 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSubTaskInline(scope.id)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleAddSubTaskInline(scope.id)}
                          className="px-2.5 py-1 bg-[#0061FF] text-white rounded text-xs font-semibold hover:bg-blue-700 whitespace-nowrap cursor-pointer"
                        >
                          {lang === 'th' ? 'เพิ่ม' : 'Add'}
                        </button>
                        <button
                          onClick={() => setShowSubInput({ ...showSubInput, [scope.id]: false })}
                          className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          
          {/* Footer Legend */}
          <div className="p-3 flex flex-wrap gap-6 text-xs text-slate-600 bg-slate-50 border-t border-slate-200 mt-2 rounded-b">
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-[#0061FF] rounded flex items-center justify-center">
                <MoveHorizontal className="w-2.5 h-2.5 text-white" />
              </div>
              <span>{lang === 'th' ? 'แผนงาน (คลิกลากแถบเพื่อย้ายช่วงวัน)' : 'Baseline Task (Drag bar to shift days)'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-indigo-600 rounded"></div>
              <span>{lang === 'th' ? 'หมวดงานหลัก' : 'Main Category'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-emerald-500 rounded"></div>
              <span>{lang === 'th' ? 'ความคืบหน้า (% Progress)' : '% Progress Fill'}</span>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'th' ? 'สลับลำดับงาน (ลาก หรือ กดลูกศร ขึ้น-ลง)' : 'Reorder tasks (Drag handle or Up/Down arrows)'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
