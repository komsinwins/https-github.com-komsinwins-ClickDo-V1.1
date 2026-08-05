import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { differenceInDays, parseISO, isValid, addDays, format, min, max } from 'date-fns';
import { Download, Plus, Trash2, BarChart, Table as TableIcon, CornerDownRight, Clock, Eye, FileText, CheckSquare, Sliders, Printer, Zap, Calculator, Sparkles, Users, AlertTriangle, CalendarX, CheckCircle2, ListPlus, Check, Calendar, ArrowRight, FileSpreadsheet, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ScopeOfWork as ScopeType } from '../../types';
import { SaveButton } from '../../components/SaveButton';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function SchedulePlan({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const [view, setView] = useState<'table' | 'gantt'>('table');
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [showSubInput, setShowSubInput] = useState<Record<string, boolean>>({});
  const [ganttNewTaskName, setGanttNewTaskName] = useState('');
  const [ganttNewTaskDuration, setGanttNewTaskDuration] = useState<number>(1);
  
  // Pre-Work Assessment States
  const [preWorkManpower, setPreWorkManpower] = useState<number>(4);
  const [preWorkRiskLevel, setPreWorkRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [estimationPreset, setEstimationPreset] = useState<'standard' | 'fast' | 'buffer'>('standard');
  
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  
  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const mainScopes = projectScopes.filter(s => !s.parentId);

  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [pdfIncludeMode, setPdfIncludeMode] = useState<'both' | 'table' | 'gantt'>('both');
  const [pdfIncludeSignatures, setPdfIncludeSignatures] = useState<boolean>(true);
  const [pdfNotesText, setPdfNotesText] = useState<string>(
    '1. แผนงานนี้ประเมินจากขอบเขตงานและสภาวะการทำงานปกติ\n2. การปรับเปลี่ยนระยะเวลาอาจเกิดขึ้นได้ตามสภาพแวดล้อมหรือการเปลี่ยนแปลงขอบเขตงาน'
  );
  const [showPdfPreview, setShowPdfPreview] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Scope Selection Modal States
  const [showScopePickerModal, setShowScopePickerModal] = useState<boolean>(false);
  const [activeScopeTab, setActiveScopeTab] = useState<'defined' | 'templates' | 'custom'>('defined');
  const [selectedScopeCheckboxes, setSelectedScopeCheckboxes] = useState<string[]>([]);
  const [customScopeInput, setCustomScopeInput] = useState<string>('');
  const [importTargetParentId, setImportTargetParentId] = useState<string>('new_main');

  const reportRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  // Calculate dates sequentially for main tasks and sub-tasks
  const projectStartDate = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();
  const projectEndDate = project.endDate && isValid(parseISO(project.endDate)) 
    ? parseISO(project.endDate) 
    : addDays(projectStartDate, 30);
  const projectContractDuration = Math.max(1, differenceInDays(projectEndDate, projectStartDate) + 1);

  // We compute date windows for all items
  const itemCalculatedDates: Record<string, { start: Date; end: Date; duration: number }> = {};
  let currentPointer = projectStartDate;

  mainScopes.forEach(main => {
    const subScopes = projectScopes.filter(s => s.parentId === main.id);
    const explicitMainStart = main.baselineStartDate && isValid(parseISO(main.baselineStartDate)) ? parseISO(main.baselineStartDate) : null;
    const explicitMainEnd = main.baselineEndDate && isValid(parseISO(main.baselineEndDate)) ? parseISO(main.baselineEndDate) : null;

    if (subScopes.length === 0) {
      const dur = Math.max(1, main.durationDays || 1);
      const start = explicitMainStart || currentPointer;
      const end = explicitMainEnd || addDays(start, dur - 1);
      itemCalculatedDates[main.id] = { start, end, duration: dur };
      currentPointer = addDays(end, 1);
    } else {
      let mainStart = explicitMainStart || currentPointer;
      let totalDur = 0;
      let subPointer = mainStart;

      subScopes.forEach(sub => {
        const explicitSubStart = sub.baselineStartDate && isValid(parseISO(sub.baselineStartDate)) ? parseISO(sub.baselineStartDate) : null;
        const explicitSubEnd = sub.baselineEndDate && isValid(parseISO(sub.baselineEndDate)) ? parseISO(sub.baselineEndDate) : null;
        const dur = Math.max(1, sub.durationDays || 1);
        const start = explicitSubStart || subPointer;
        const end = explicitSubEnd || addDays(start, dur - 1);
        itemCalculatedDates[sub.id] = { start, end, duration: dur };
        totalDur += dur;
        subPointer = addDays(end, 1);
      });

      const subEnds = subScopes.map(s => itemCalculatedDates[s.id]?.end).filter(Boolean);
      const subStarts = subScopes.map(s => itemCalculatedDates[s.id]?.start).filter(Boolean);
      const calculatedMainStart = subStarts.length > 0 ? min(subStarts) : mainStart;
      const calculatedMainEnd = subEnds.length > 0 ? max(subEnds) : addDays(mainStart, totalDur > 0 ? totalDur - 1 : 0);

      const finalMainStart = explicitMainStart || calculatedMainStart;
      const finalMainEnd = explicitMainEnd || calculatedMainEnd;

      itemCalculatedDates[main.id] = { start: finalMainStart, end: finalMainEnd, duration: totalDur };
      currentPointer = addDays(finalMainEnd, 1);
    }
  });

  // Bounds for Gantt view
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
  maxDate = addDays(maxDate, 2);
  const totalDays = Math.max(1, differenceInDays(maxDate, minDate));

  // Helper to calculate task progress % based on dates vs current date
  const calculateProgressFromDates = (scope: ScopeType): number => {
    const today = new Date();

    // 1. If actual end date is set and valid
    if (scope.actualEndDate && isValid(parseISO(scope.actualEndDate))) {
      const actEnd = parseISO(scope.actualEndDate);
      if (today >= actEnd) return 100;
    }

    // 2. If actual start date is set
    if (scope.actualStartDate && isValid(parseISO(scope.actualStartDate))) {
      const actStart = parseISO(scope.actualStartDate);
      if (today < actStart) return 0; // Not started yet

      if (scope.actualEndDate && isValid(parseISO(scope.actualEndDate))) {
        const actEnd = parseISO(scope.actualEndDate);
        const totalActDur = Math.max(1, differenceInDays(actEnd, actStart) + 1);
        const elapsed = Math.max(1, differenceInDays(today, actStart) + 1);
        return Math.min(100, Math.max(0, Math.round((elapsed / totalActDur) * 100)));
      } else {
        const plannedDur = scope.durationDays || 1;
        const elapsed = Math.max(1, differenceInDays(today, actStart) + 1);
        return Math.min(99, Math.max(0, Math.round((elapsed / plannedDur) * 100)));
      }
    }

    // 3. Fallback: Baseline dates vs current date
    const calcDates = itemCalculatedDates[scope.id];
    if (calcDates && calcDates.start && calcDates.end) {
      if (today < calcDates.start) return 0;
      if (today >= calcDates.end) return 100;
      const totalDur = Math.max(1, calcDates.duration);
      const elapsed = Math.max(1, differenceInDays(today, calcDates.start) + 1);
      return Math.min(99, Math.max(0, Math.round((elapsed / totalDur) * 100)));
    }

    return scope.progress || 0;
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    updateData({
      scopes: data.scopes.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        // Auto-calculate progress when actual dates are updated
        if (field === 'actualEndDate' && value) {
          const actEnd = parseISO(value);
          if (isValid(actEnd) && new Date() >= actEnd) {
            updated.progress = 100;
          }
        } else if (field === 'actualStartDate' && value && (!s.progress || s.progress === 0)) {
          const actStart = parseISO(value);
          if (isValid(actStart)) {
            updated.progress = calculateProgressFromDates(updated);
          }
        }
        return updated;
      })
    });
  };

  // Helper to auto-calculate progress for all leaf scopes in this project
  const handleAutoCalculateAllProgress = () => {
    const updatedScopes = data.scopes.map(scope => {
      if (scope.projectId !== projectId) return scope;
      const subScopes = data.scopes.filter(s => s.parentId === scope.id && s.projectId === projectId);
      if (subScopes.length > 0) return scope; // parent scope calculated automatically
      const computedProg = calculateProgressFromDates(scope);
      return { ...scope, progress: computedProg };
    });

    updateData({ scopes: updatedScopes });
  };

  // Helper to auto-calculate progress for a single leaf scope
  const handleAutoCalculateSingleProgress = (scope: ScopeType) => {
    const computedProg = calculateProgressFromDates(scope);
    handleUpdate(scope.id, 'progress', computedProg);
  };

  // Total project planned duration across main tasks
  const totalProjectPlannedDuration = mainScopes.reduce((sum, main) => {
    const subScopes = projectScopes.filter(s => s.parentId === main.id);
    const dur = subScopes.length > 0
      ? subScopes.reduce((subSum, s) => subSum + (s.durationDays || 1), 0)
      : (main.durationDays || 1);
    return sum + dur;
  }, 0);

  // Helper to calculate task weight percentage relative to total project duration
  const getTaskWeight = (scope: ScopeType): number => {
    if (totalProjectPlannedDuration === 0) return 0;
    if (!scope.parentId) {
      const subScopes = projectScopes.filter(s => s.parentId === scope.id);
      const dur = subScopes.length > 0
        ? subScopes.reduce((sum, s) => sum + (s.durationDays || 1), 0)
        : (scope.durationDays || 1);
      return Math.round((dur / totalProjectPlannedDuration) * 100);
    } else {
      const parent = projectScopes.find(s => s.id === scope.parentId);
      if (!parent) return 0;
      const parentSubScopes = projectScopes.filter(s => s.parentId === parent.id);
      const parentTotalDur = parentSubScopes.reduce((sum, s) => sum + (s.durationDays || 1), 0);
      const parentWeight = getTaskWeight(parent);
      if (parentTotalDur === 0) return 0;
      return Math.round(((scope.durationDays || 1) / parentTotalDur) * parentWeight);
    }
  };

  // Helper to update baseline start date and auto-calculate duration / end date / shift subtasks
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

    // If main task with subtasks, shift subtasks sequentially
    const subScopes = projectScopes.filter(s => s.parentId === scope.id);
    const updatedSubMap: Record<string, { baselineStartDate: string; baselineEndDate: string }> = {};

    if (subScopes.length > 0) {
      let subCurrentStart = newStart;
      subScopes.forEach(sub => {
        const subDur = Math.max(1, sub.durationDays || 1);
        const subEnd = addDays(subCurrentStart, subDur - 1);
        updatedSubMap[sub.id] = {
          baselineStartDate: format(subCurrentStart, 'yyyy-MM-dd'),
          baselineEndDate: format(subEnd, 'yyyy-MM-dd')
        };
        subCurrentStart = addDays(subEnd, 1);
      });
      const totalSubDur = subScopes.reduce((sum, s) => sum + (s.durationDays || 1), 0);
      newDuration = totalSubDur;
      newEndDateStr = format(addDays(newStart, Math.max(1, totalSubDur) - 1), 'yyyy-MM-dd');
    }

    // If subtask, sync parent main task dates
    const parentUpdateMap: Record<string, { baselineStartDate: string; baselineEndDate: string }> = {};
    if (scope.parentId) {
      const parent = projectScopes.find(s => s.id === scope.parentId);
      if (parent) {
        const siblingSubs = projectScopes.filter(s => s.parentId === parent.id).map(s => {
          if (s.id === scope.id) {
            return { ...s, baselineStartDate: newStartDateStr, baselineEndDate: newEndDateStr };
          }
          return s;
        });
        const subStarts = siblingSubs.map(s => s.baselineStartDate).filter(Boolean).sort();
        const subEnds = siblingSubs.map(s => s.baselineEndDate).filter(Boolean).sort();
        if (subStarts.length > 0) {
          const earliestStart = subStarts[0];
          const latestEnd = subEnds.length > 0 ? subEnds[subEnds.length - 1] : earliestStart;
          parentUpdateMap[parent.id] = { baselineStartDate: earliestStart, baselineEndDate: latestEnd };
        }
      }
    }

    updateData({
      scopes: data.scopes.map(s => {
        if (s.id === scope.id) {
          return { ...s, baselineStartDate: newStartDateStr, baselineEndDate: newEndDateStr, durationDays: newDuration };
        }
        if (updatedSubMap[s.id]) {
          return { ...s, ...updatedSubMap[s.id] };
        }
        if (parentUpdateMap[s.id]) {
          return { ...s, ...parentUpdateMap[s.id] };
        }
        return s;
      })
    });
  };

  // Helper to update baseline end date and auto-calculate duration
  const handleBaselineEndChange = (scope: ScopeType, newEndDateStr: string) => {
    if (!newEndDateStr) {
      handleUpdate(scope.id, 'baselineEndDate', '');
      return;
    }
    const newEnd = parseISO(newEndDateStr);
    if (!isValid(newEnd)) return;

    let newStartDateStr = scope.baselineStartDate || format(projectStartDate, 'yyyy-MM-dd');
    let start = parseISO(newStartDateStr);
    if (!isValid(start)) start = projectStartDate;

    let newDuration = scope.durationDays || 1;
    if (newEnd >= start) {
      newDuration = differenceInDays(newEnd, start) + 1;
    } else {
      newStartDateStr = format(newEnd, 'yyyy-MM-dd');
      newDuration = 1;
    }

    // If subtask, sync parent main task dates
    const parentUpdateMap: Record<string, { baselineStartDate: string; baselineEndDate: string }> = {};
    if (scope.parentId) {
      const parent = projectScopes.find(s => s.id === scope.parentId);
      if (parent) {
        const siblingSubs = projectScopes.filter(s => s.parentId === parent.id).map(s => {
          if (s.id === scope.id) {
            return { ...s, baselineStartDate: newStartDateStr, baselineEndDate: newEndDateStr };
          }
          return s;
        });
        const subStarts = siblingSubs.map(s => s.baselineStartDate).filter(Boolean).sort();
        const subEnds = siblingSubs.map(s => s.baselineEndDate).filter(Boolean).sort();
        if (subStarts.length > 0) {
          const earliestStart = subStarts[0];
          const latestEnd = subEnds.length > 0 ? subEnds[subEnds.length - 1] : earliestStart;
          parentUpdateMap[parent.id] = { baselineStartDate: earliestStart, baselineEndDate: latestEnd };
        }
      }
    }

    updateData({
      scopes: data.scopes.map(s => {
        if (s.id === scope.id) {
          return { ...s, baselineStartDate: newStartDateStr, baselineEndDate: newEndDateStr, durationDays: newDuration };
        }
        if (parentUpdateMap[s.id]) {
          return { ...s, ...parentUpdateMap[s.id] };
        }
        return s;
      })
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

  // Calculate progress for a task (auto-calculates parent progress if subtasks exist)
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

  // Calculate overall project progress %
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

  const [taskType, setTaskType] = useState<'main' | 'sub'>('main');
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const handleAddTask = () => {
    if (!newTask.trim()) return;

    if (taskType === 'sub' && (selectedParentId || mainScopes[0]?.id)) {
      const parentId = selectedParentId || mainScopes[0]?.id;
      const subScope: ScopeType = {
        id: uuidv4(),
        projectId,
        parentId,
        taskName: newTask.trim(),
        order: projectScopes.length,
        durationDays: 1,
        progress: 0,
      };
      updateData({ scopes: [...data.scopes, subScope] });
      setNewTask('');
    } else {
      const newScope: ScopeType = {
        id: uuidv4(),
        projectId,
        taskName: newTask.trim(),
        order: projectScopes.length,
        durationDays: 1,
        progress: 0,
      };
      updateData({ scopes: [...data.scopes, newScope] });
      setNewTask('');
    }
  };

  const handleAddMain = () => {
    if (!newTask.trim()) return;
    const newScope: ScopeType = {
      id: uuidv4(),
      projectId,
      taskName: newTask.trim(),
      order: projectScopes.length,
      durationDays: 1,
      progress: 0,
    };
    updateData({ scopes: [...data.scopes, newScope] });
    setNewTask('');
  };

  const handleAddGanttMainTask = () => {
    if (!ganttNewTaskName.trim()) return;
    const newScope: ScopeType = {
      id: uuidv4(),
      projectId,
      taskName: ganttNewTaskName.trim(),
      order: projectScopes.length,
      durationDays: Math.max(1, ganttNewTaskDuration || 1),
      progress: 0,
    };
    updateData({ scopes: [...data.scopes, newScope] });
    setGanttNewTaskName('');
    setGanttNewTaskDuration(1);
  };

  const handleApplyAssessmentPreset = () => {
    let multiplier = 1.0;
    if (estimationPreset === 'fast') multiplier = 0.8;
    if (estimationPreset === 'buffer') multiplier = 1.15;
    if (preWorkRiskLevel === 'high') multiplier *= 1.1;
    if (preWorkRiskLevel === 'low') multiplier *= 0.95;

    const updatedScopes = data.scopes.map(s => {
      if (s.projectId !== projectId) return s;
      const baseDur = s.durationDays || 1;
      const newDur = Math.max(1, Math.round(baseDur * multiplier));
      return { ...s, durationDays: newDur };
    });

    updateData({ scopes: updatedScopes });
  };

  const handleAutoSyncProjectDates = () => {
    let currentStart = projectStartDate;
    const updatedScopesMap: Record<string, { baselineStartDate: string; baselineEndDate: string }> = {};

    mainScopes.forEach(main => {
      const subScopes = projectScopes.filter(s => s.parentId === main.id);
      if (subScopes.length === 0) {
        const dur = Math.max(1, main.durationDays || 1);
        const start = currentStart;
        const end = addDays(start, dur - 1);
        updatedScopesMap[main.id] = {
          baselineStartDate: format(start, 'yyyy-MM-dd'),
          baselineEndDate: format(end, 'yyyy-MM-dd')
        };
        currentStart = addDays(end, 1);
      } else {
        let mainStart = currentStart;
        let totalSubDur = 0;
        subScopes.forEach(sub => {
          const dur = Math.max(1, sub.durationDays || 1);
          const start = currentStart;
          const end = addDays(start, dur - 1);
          updatedScopesMap[sub.id] = {
            baselineStartDate: format(start, 'yyyy-MM-dd'),
            baselineEndDate: format(end, 'yyyy-MM-dd')
          };
          totalSubDur += dur;
          currentStart = addDays(end, 1);
        });
        const mainEnd = addDays(mainStart, totalSubDur > 0 ? totalSubDur - 1 : 0);
        updatedScopesMap[main.id] = {
          baselineStartDate: format(mainStart, 'yyyy-MM-dd'),
          baselineEndDate: format(mainEnd, 'yyyy-MM-dd')
        };
      }
    });

    const updatedScopes = data.scopes.map(s => {
      if (s.projectId !== projectId) return s;
      if (updatedScopesMap[s.id]) {
        return {
          ...s,
          baselineStartDate: updatedScopesMap[s.id].baselineStartDate,
          baselineEndDate: updatedScopesMap[s.id].baselineEndDate
        };
      }
      return s;
    });

    updateData({ scopes: updatedScopes });
  };

  const handleAddSub = (parentId: string) => {
    const name = subTaskInputs[parentId];
    if (!name || !name.trim()) return;
    const subScope: ScopeType = {
      id: uuidv4(),
      projectId,
      parentId,
      taskName: name.trim(),
      order: projectScopes.length,
      durationDays: 1,
      progress: 0,
    };
    updateData({ scopes: [...data.scopes, subScope] });
    setSubTaskInputs({ ...subTaskInputs, [parentId]: '' });
    setShowSubInput({ ...showSubInput, [parentId]: false });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' : 'Are you sure you want to delete this item?')) return;
    updateData({
      scopes: data.scopes.filter(s => s.id !== id && s.parentId !== id)
    });
  };

  // Quick Action Helpers for Actual Dates
  const handleSetStartToday = (scope: ScopeType) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    handleUpdate(scope.id, 'actualStartDate', todayStr);
  };

  const handleSetFinishToday = (scope: ScopeType) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    updateData({
      scopes: data.scopes.map(s => {
        if (s.id !== scope.id) return s;
        return {
          ...s,
          actualEndDate: todayStr,
          actualStartDate: s.actualStartDate || todayStr,
          progress: 100
        };
      })
    });
  };

  // Batch Import Scopes into Schedule Plan
  const handleBatchImportScopes = (scopeNamesToImport: string[], parentId: string) => {
    if (!scopeNamesToImport || scopeNamesToImport.length === 0) return;

    const newScopes: ScopeType[] = scopeNamesToImport.map((name, idx) => ({
      id: uuidv4(),
      projectId,
      parentId: parentId === 'new_main' ? undefined : parentId,
      taskName: name.trim(),
      order: projectScopes.length + idx,
      durationDays: 1,
      progress: 0,
    }));

    updateData({ scopes: [...data.scopes, ...newScopes] });
    setShowScopePickerModal(false);
    setSelectedScopeCheckboxes([]);
    setCustomScopeInput('');
  };

  const exportPDF = () => {
    window.print();
  };

  const exportPDFWithJsPDF = async () => {
    if (!reportRef.current) {
      window.print();
      return;
    }
    
    setIsExportingPdf(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const isA3 = paperSize === 'a3';
      const isLandscape = pdfOrientation === 'landscape';

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isA3 ? 'a3' : 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - (margin * 2));

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - (margin * 2));
      }

      const safeProjName = (project?.name || 'Project').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
      pdf.save(`Schedule_Plan_${safeProjName}_${paperSize.toUpperCase()}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      console.error('PDF generation error, falling back to window.print()', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Print CSS Styles */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize.toUpperCase()} landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .screen-only-view {
            display: none !important;
          }
        }
      `}</style>

      {/* Project Schedule Reference & Auto Sync Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 sm:p-4 rounded-xl shadow-md border border-blue-800/80 print:hidden mb-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 rounded-lg border border-blue-400/30 shrink-0">
              <Clock className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  {lang === 'th' ? 'กรอบเวลาอ้างอิงจากข้อมูลโครงการ' : 'Project Contract Reference Timeline'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {project.name}
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap mt-1 text-xs font-semibold text-slate-200">
                <span>
                  {lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start:'}{' '}
                  <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{format(projectStartDate, 'dd/MM/yyyy')}</strong>
                </span>
                <span>
                  {lang === 'th' ? 'วันที่สิ้นสุดโครงการ:' : 'End:'}{' '}
                  <strong className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">{format(projectEndDate, 'dd/MM/yyyy')}</strong>
                </span>
                <span className="text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                  {lang === 'th' ? `ระยะเวลาตามสัญญา: ${projectContractDuration} วัน` : `Contract Duration: ${projectContractDuration} days`}
                </span>
                <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30">
                  {lang === 'th' ? `ขอบเขตงานรวม: ${totalProjectPlannedDuration} วัน` : `Total Tasks Sum: ${totalProjectPlannedDuration} days`}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAutoSyncProjectDates}
            className="px-4 py-2.5 bg-[#0061FF] hover:bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm border border-blue-400/40 flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95"
            title={lang === 'th' ? 'คำนวณและอ้างอิงแจกแจงวันที่แผนงานของทุกขอบเขตงานเรียงต่อกันตามวันที่เริ่มโครงการ' : 'Auto-calculate timeline start and end dates based on project start date'}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>{lang === 'th' ? 'อ้างอิงและคำนวณวันที่จากโครงการ' : 'Auto-Sync Dates from Project'}</span>
          </button>
        </div>
      </div>

      {/* Controls Header */}
      <div className="flex flex-col space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Left: View Tabs and Add Task */}
          <div className="flex gap-3 w-full lg:w-auto flex-wrap items-center">
            <div className="flex bg-slate-100 p-1 rounded-md w-full sm:w-auto border border-slate-200">
              <button
                onClick={() => setView('table')}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded transition-colors ${view === 'table' ? 'bg-white shadow-xs text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <TableIcon className="w-4 h-4" />
                {lang === 'th' ? '1. ตารางประเมินและแผนงาน' : '1. Schedule Plan Table'}
              </button>
              <button
                onClick={() => setView('gantt')}
                className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded transition-colors ${view === 'gantt' ? 'bg-white shadow-xs text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <Calculator className="w-4 h-4 text-indigo-600" />
                {lang === 'th' ? '2. ประเมินการเข้าทำงาน & Gantt' : '2. Pre-Work Assessment & Gantt'}
              </button>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2 flex-1 min-w-[280px]">
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as 'main' | 'sub')}
                className="px-2 py-1.5 text-xs font-semibold border border-slate-300 rounded bg-slate-50 text-slate-700 outline-none focus:border-[#0061FF]"
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
                  className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700 max-w-[160px] truncate outline-none focus:border-[#0061FF]"
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
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder={
                  taskType === 'sub'
                    ? (lang === 'th' ? 'กรอกชื่อขอบเขตงานย่อย...' : 'Enter sub-task name...')
                    : (lang === 'th' ? 'กรอกชื่อขอบเขตงานหลัก...' : 'Enter main task name...')
                }
                className="flex-1 min-w-[150px] px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF]"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <button
                onClick={handleAddTask}
                className="px-3.5 py-1.5 bg-[#0061FF] text-white rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5 flex-shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {taskType === 'sub'
                    ? (lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task')
                    : (lang === 'th' ? 'เพิ่มงานหลัก' : 'Add Main Task')}
                </span>
              </button>

              <button
                onClick={() => setShowScopePickerModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded text-xs font-bold flex items-center gap-1.5 flex-shrink-0 shadow-xs border border-emerald-500/30"
                title={lang === 'th' ? 'เลือกขอบเขตงานหรือรายการ BOQ เข้ามาเป็น Task' : 'Import Scope of Work or BOQ Items as Tasks'}
              >
                <ListPlus className="w-4 h-4 text-emerald-200" />
                <span>{lang === 'th' ? 'เลือกขอบเขตงาน' : 'Pick Scopes'}</span>
              </button>
            </div>
          </div>

          <SaveButton successMessage={lang === 'th' ? 'บันทึกแผนงานเรียบร้อยแล้ว' : 'Schedule plan saved successfully'} />
        </div>

        {/* PDF Export Config Sub-Bar */}
        <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 p-2.5 rounded-md">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              {lang === 'th' ? 'ตั้งค่ารายงาน PDF:' : 'PDF Export Config:'}
            </span>

            {/* Paper Size */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">{lang === 'th' ? 'ขนาดกระดาษ:' : 'Paper Size:'}</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
                className="border border-slate-300 rounded px-2 py-1 bg-white font-bold text-slate-800 outline-none focus:border-[#0061FF]"
              >
                <option value="a4">{lang === 'th' ? 'กระดาษ A4' : 'A4 Paper'}</option>
                <option value="a3">{lang === 'th' ? 'กระดาษ A3 (แผ่นใหญ่)' : 'A3 Paper (Large Format)'}</option>
              </select>
            </div>

            {/* Paper Orientation */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">{lang === 'th' ? 'แนว:' : 'Orientation:'}</span>
              <select
                value={pdfOrientation}
                onChange={(e) => setPdfOrientation(e.target.value as 'landscape' | 'portrait')}
                className="border border-slate-300 rounded px-2 py-1 bg-white font-bold text-slate-800 outline-none focus:border-[#0061FF]"
              >
                <option value="landscape">{lang === 'th' ? 'แนวนอน (Landscape)' : 'Landscape'}</option>
                <option value="portrait">{lang === 'th' ? 'แนวตั้ง (Portrait)' : 'Portrait'}</option>
              </select>
            </div>

            {/* Export Content Mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">{lang === 'th' ? 'เนื้อหา:' : 'Content:'}</span>
              <select
                value={pdfIncludeMode}
                onChange={(e) => setPdfIncludeMode(e.target.value as 'both' | 'table' | 'gantt')}
                className="border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-700 outline-none focus:border-[#0061FF]"
              >
                <option value="both">{lang === 'th' ? 'ตารางข้อมูล + แกนต์ชาร์ต' : 'Table + Gantt'}</option>
                <option value="table">{lang === 'th' ? 'เฉพาะตารางข้อมูล' : 'Table Only'}</option>
                <option value="gantt">{lang === 'th' ? 'เฉพาะแกนต์ชาร์ต' : 'Gantt Only'}</option>
              </select>
            </div>

            {/* Signatures Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold bg-white px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={pdfIncludeSignatures}
                onChange={(e) => setPdfIncludeSignatures(e.target.checked)}
                className="rounded border-slate-300 text-[#0061FF] focus:ring-0"
              />
              <span>{lang === 'th' ? 'แสดงส่วนลงนาม 3 ฝ่าย' : 'Include Signatures'}</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPdfPreview(!showPdfPreview)}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                showPdfPreview 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              {showPdfPreview 
                ? (lang === 'th' ? 'ปิดตัวอย่าง PDF' : 'Close PDF Preview')
                : (lang === 'th' ? 'ดูตัวอย่าง PDF' : 'Preview PDF Report')}
            </button>

            <button
              onClick={exportPDFWithJsPDF}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded text-xs font-bold hover:opacity-90 flex items-center gap-1.5 transition-all shadow-xs border border-blue-700 disabled:opacity-50"
              title={lang === 'th' ? `ส่งออกเป็นไฟล์ PDF (${paperSize.toUpperCase()})` : `Export PDF (${paperSize.toUpperCase()})`}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'th' ? 'กำลังสร้าง PDF...' : 'Generating PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>{lang === 'th' ? `ดาวน์โหลด PDF (${paperSize.toUpperCase()})` : `Download PDF (${paperSize.toUpperCase()})`}</span>
                </>
              )}
            </button>

            <button
              onClick={exportPDF}
              className="px-3 py-1.5 bg-slate-700 text-white rounded text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
              title={lang === 'th' ? 'สั่งพิมพ์ผ่านเครื่องพิมพ์ของระบบ' : 'Print directly'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'พิมพ์' : 'Print'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white p-4 shadow-sm" ref={reportRef}>
        <div className="mb-4 pb-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'ตารางประเมินและประเมินระยะเวลาการทำงาน (Schedule Plan)' : 'Schedule & Duration Estimation Plan'}</h3>
            <p className="text-xs text-slate-500 mt-1">{project.name} | {lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start Date:'} {format(projectStartDate, 'dd/MM/yyyy')}</p>
          </div>

          {/* Overall Project Progress Banner & Auto Calculate */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-lg p-2.5 px-3 min-w-[220px]">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
                <span>{lang === 'th' ? 'ความคืบหน้ารวมของโครงการ:' : 'Overall Progress:'}</span>
                <span className="text-[#0061FF] font-bold text-sm">{overallProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-[#0061FF]'}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleAutoCalculateAllProgress}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5 shadow-xs transition-all border border-blue-700"
              title={lang === 'th' ? 'คำนวณ % คืบหน้าอัตโนมัติตามวันที่จริงและวันที่ตามแผน' : 'Auto-calculate task progress percentage from actual dates'}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{lang === 'th' ? 'คำนวณ % คืบหน้าอัตโนมัติ' : 'Auto-Calculate Progress'}</span>
            </button>
          </div>
        </div>
        
        {view === 'table' ? (
          <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[1000px]">
            <thead className="bg-[#F8FAFC] text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">{lang === 'th' ? 'ลำดับ' : 'No.'}</th>
                <th className="p-2 font-semibold border-r border-slate-200 w-1/3">{lang === 'th' ? 'ขอบเขตงาน / หัวข้อย่อย' : 'Scope / Sub-topic'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'ผลจริง (Actual)' : 'Actual'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200 w-20">{lang === 'th' ? 'น้ำหนัก (%)' : 'Weight (%)'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200 w-28">{lang === 'th' ? '% คืบหน้า' : '% Progress'}</th>
                <th className="p-2 font-semibold text-center w-20">{lang === 'th' ? 'จัดการ' : 'Action'}</th>
              </tr>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-600">
                <th className="p-1.5 border-r border-slate-200" colSpan={2}></th>
                <th className="p-1.5 text-center bg-blue-50/50 w-20">{lang === 'th' ? 'ระยะเวลา (วัน)' : 'Duration (Days)'}</th>
                <th className="p-1.5 text-center bg-blue-50/50">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
                <th className="p-1.5 text-center bg-blue-50/50 border-r border-slate-200">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
                <th className="p-1.5 text-center bg-orange-50/50">{lang === 'th' ? 'เริ่ม' : 'Start'}</th>
                <th className="p-1.5 text-center bg-orange-50/50">{lang === 'th' ? 'สิ้นสุด' : 'End'}</th>
                <th className="p-1.5 text-center bg-orange-50/50 border-r border-slate-200">{lang === 'th' ? 'จำนวนวัน' : 'Days'}</th>
                <th className="p-1.5 border-r border-slate-200"></th>
                <th className="p-1.5 border-r border-slate-200"></th>
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {mainScopes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    {lang === 'th' ? 'ยังไม่มีขอบเขตงาน กรุณากรอกชื่อขอบเขตงานหลักด้านบน' : 'No Scope of Work defined yet. Enter topic above.'}
                  </td>
                </tr>
              ) : (
                mainScopes.map((main, mainIdx) => {
                  const subScopes = projectScopes.filter(s => s.parentId === main.id);
                  const hasSubs = subScopes.length > 0;
                  const mainDates = itemCalculatedDates[main.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
                  const computedProgress = getItemProgress(main);

                  const mStartDayNum = Math.max(1, differenceInDays(mainDates.start, projectStartDate) + 1);
                  const mEndDayNum = Math.max(1, differenceInDays(mainDates.end, projectStartDate) + 1);

                  let mainActualDur = 0;
                  if (main.actualStartDate && main.actualEndDate && isValid(parseISO(main.actualStartDate)) && isValid(parseISO(main.actualEndDate))) {
                    mainActualDur = differenceInDays(parseISO(main.actualEndDate), parseISO(main.actualStartDate)) + 1;
                  }

                  return (
                    <React.Fragment key={main.id}>
                      {/* Main Task Row */}
                      <tr className="hover:bg-slate-50 bg-slate-100/70 font-semibold text-slate-900 border-t-2 border-slate-200">
                        <td className="p-2 text-center text-slate-800">{mainIdx + 1}</td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={main.taskName}
                            onChange={(e) => handleUpdate(main.id, 'taskName', e.target.value)}
                            className="w-full border-transparent border-b border-b-slate-300 focus:border-[#0061FF] focus:outline-none p-1 bg-transparent font-bold text-slate-900"
                          />
                          <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1 mt-0.5 pl-1">
                            <Clock className="w-3 h-3 text-[#0061FF] flex-shrink-0" />
                            <span>
                              {format(mainDates.start, 'dd/MM/yyyy')} - {format(mainDates.end, 'dd/MM/yyyy')}
                              <span className="text-[#0061FF] font-semibold ml-1">
                                ({lang === 'th' ? `วันที่ ${mStartDayNum} - ${mEndDayNum}` : `Day ${mStartDayNum} - ${mEndDayNum}`})
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* Baseline */}
                        <td className="p-2 text-center bg-blue-50/30">
                          {hasSubs ? (
                            <span className="font-bold text-[#0061FF]" title={lang === 'th' ? 'คำนวณจากงานย่อย' : 'Calculated from sub-tasks'}>
                              {mainDates.duration} {lang === 'th' ? 'วัน' : 'days'}
                            </span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              value={main.durationDays || 1}
                              onChange={(e) => handleDurationChange(main, parseInt(e.target.value) || 1)}
                              className="w-14 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white font-bold"
                              title={lang === 'th' ? 'กำหนดระยะเวลา (คำนวณวันสิ้นสุดให้อัตโนมัติ)' : 'Set duration (auto calculates end date)'}
                            />
                          )}
                        </td>
                        <td className="p-2 text-center bg-blue-50/30">
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="date"
                              value={main.baselineStartDate || ''}
                              onChange={(e) => handleBaselineStartChange(main, e.target.value)}
                              className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white text-slate-800 font-medium"
                              title={hasSubs ? (lang === 'th' ? 'กำหนดวันเริ่มงานหลัก (จะปรับวันของงานย่อยให้อัตโนมัติ)' : 'Set main task start date (auto shifts subtasks)') : undefined}
                            />
                            {!main.baselineStartDate ? (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-200" title={lang === 'th' ? 'คำนวณจากวันที่เริ่มโครงการ' : 'Calculated from project start date'}>
                                {lang === 'th' ? 'อ้างอิง:' : 'Ref:'} {format(mainDates.start, 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${mStartDayNum}` : `Day ${mStartDayNum}`})
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-blue-600 font-semibold">
                                  {format(parseISO(main.baselineStartDate), 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${mStartDayNum}` : `Day ${mStartDayNum}`})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdate(main.id, 'baselineStartDate', '');
                                    handleUpdate(main.id, 'baselineEndDate', '');
                                  }}
                                  className="text-[9px] text-red-500 hover:underline font-bold"
                                  title={lang === 'th' ? 'ลบวันที่' : 'Clear date'}
                                >
                                  {lang === 'th' ? 'ลบ' : 'Clear'}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center bg-blue-50/30 border-r border-slate-200">
                          <div className="flex flex-col items-center gap-0.5">
                            <input
                              type="date"
                              value={main.baselineEndDate || ''}
                              onChange={(e) => handleBaselineEndChange(main, e.target.value)}
                              className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white text-slate-800 font-medium"
                            />
                            {!main.baselineEndDate ? (
                              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium border border-blue-200" title={lang === 'th' ? 'คำนวณจากวันที่เริ่มโครงการ' : 'Calculated from project start date'}>
                                {lang === 'th' ? 'อ้างอิง:' : 'Ref:'} {format(mainDates.end, 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${mEndDayNum}` : `Day ${mEndDayNum}`})
                              </span>
                            ) : (
                              <span className="text-[10px] text-blue-600 font-semibold">
                                {format(parseISO(main.baselineEndDate), 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${mEndDayNum}` : `Day ${mEndDayNum}`})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actual */}
                        <td className="p-2 text-center bg-orange-50/20">
                          <input
                            type="date"
                            value={main.actualStartDate || ''}
                            onChange={(e) => handleUpdate(main.id, 'actualStartDate', e.target.value)}
                            className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                          />
                        </td>
                        <td className="p-2 text-center bg-orange-50/20">
                          <input
                            type="date"
                            value={main.actualEndDate || ''}
                            onChange={(e) => handleUpdate(main.id, 'actualEndDate', e.target.value)}
                            className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                          />
                        </td>
                        <td className="p-2 text-center border-r border-slate-200 text-slate-700 font-medium bg-orange-50/20">
                          {mainActualDur > 0 ? `${mainActualDur}` : '-'}
                        </td>

                        {/* Weight % */}
                        <td className="p-2 text-center border-r border-slate-200 bg-slate-50/50">
                          <span className="font-bold text-slate-700 text-xs">
                            {getTaskWeight(main)}%
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="p-2 text-center border-r border-slate-200">
                          {hasSubs ? (
                            <div className="flex flex-col items-center justify-center gap-1" title={lang === 'th' ? 'คำนวณอัตโนมัติถ่วงน้ำหนักจากงานย่อย' : 'Calculated automatically weighted from sub-tasks'}>
                              <span className="px-2 py-0.5 bg-blue-50 text-[#0061FF] rounded font-bold text-xs border border-blue-200">
                                {computedProgress}%
                              </span>
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${computedProgress === 100 ? 'bg-emerald-500' : 'bg-[#0061FF]'}`}
                                  style={{ width: `${computedProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={main.progress || 0}
                                  onChange={(e) => handleUpdate(main.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                  className="w-11 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white font-bold text-[#FF5E00]"
                                />
                                <span className="text-slate-500 text-[10px]">%</span>
                                <button
                                  type="button"
                                  onClick={() => handleAutoCalculateSingleProgress(main)}
                                  className="p-1 text-amber-600 hover:bg-amber-50 rounded border border-amber-200"
                                  title={lang === 'th' ? 'คำนวณ % คืบหน้าอัตโนมัติตามวันที่' : 'Auto-calculate progress from dates'}
                                >
                                  <Zap className="w-3 h-3 text-amber-500" />
                                </button>
                              </div>
                              <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${(main.progress || 0) === 100 ? 'bg-emerald-500' : 'bg-[#FF5E00]'}`}
                                  style={{ width: `${main.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setShowSubInput({ ...showSubInput, [main.id]: !showSubInput[main.id] })}
                              className="p-1 text-xs bg-blue-50 text-[#0061FF] hover:bg-blue-100 rounded font-semibold flex items-center gap-0.5"
                              title={lang === 'th' ? 'แทรกหัวข้อย่อย' : 'Add Sub-topic'}
                            >
                              <Plus className="w-3 h-3" />
                              <span className="text-[10px]">{lang === 'th' ? 'ย่อย' : 'Sub'}</span>
                            </button>
                            <button
                              onClick={() => handleDelete(main.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title={lang === 'th' ? 'ลบ' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-Task Rows */}
                      {subScopes.map((sub, subIdx) => {
                        const subDates = itemCalculatedDates[sub.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
                        const sStartDayNum = Math.max(1, differenceInDays(subDates.start, projectStartDate) + 1);
                        const sEndDayNum = Math.max(1, differenceInDays(subDates.end, projectStartDate) + 1);

                        let subActualDur = 0;
                        if (sub.actualStartDate && sub.actualEndDate && isValid(parseISO(sub.actualStartDate)) && isValid(parseISO(sub.actualEndDate))) {
                          subActualDur = differenceInDays(parseISO(sub.actualEndDate), parseISO(sub.actualStartDate)) + 1;
                        }

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 bg-white text-slate-700">
                            <td className="p-2 text-center text-slate-500 text-[10px] pl-4">{mainIdx + 1}.{subIdx + 1}</td>
                            <td className="p-2 pl-6 border-r border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <input
                                  type="text"
                                  value={sub.taskName}
                                  onChange={(e) => handleUpdate(sub.id, 'taskName', e.target.value)}
                                  className="w-full border-transparent border-b border-b-slate-200 focus:border-[#0061FF] focus:outline-none p-1 bg-transparent text-slate-800"
                                />
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1 pl-5 mt-0.5">
                                <span>
                                  {format(subDates.start, 'dd/MM/yyyy')} - {format(subDates.end, 'dd/MM/yyyy')}
                                  <span className="text-[#0061FF] font-semibold ml-1">
                                    ({lang === 'th' ? `วันที่ ${sStartDayNum} - ${sEndDayNum}` : `Day ${sStartDayNum} - ${sEndDayNum}`})
                                  </span>
                                </span>
                              </div>
                            </td>

                            {/* Baseline Sub-task */}
                            <td className="p-2 text-center bg-blue-50/10">
                              <input
                                type="number"
                                min="1"
                                value={sub.durationDays || 1}
                                onChange={(e) => handleDurationChange(sub, parseInt(e.target.value) || 1)}
                                className="w-12 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white text-xs"
                                title={lang === 'th' ? 'กำหนดระยะเวลา (วัน)' : 'Set duration'}
                              />
                            </td>
                            <td className="p-2 text-center bg-blue-50/10">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="date"
                                  value={sub.baselineStartDate || ''}
                                  onChange={(e) => handleBaselineStartChange(sub, e.target.value)}
                                  className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                                />
                                {!sub.baselineStartDate ? (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-medium border border-blue-200" title={lang === 'th' ? 'คำนวณจากวันที่เริ่มโครงการ' : 'Calculated from project start date'}>
                                    {lang === 'th' ? 'อ้างอิง:' : 'Ref:'} {format(subDates.start, 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${sStartDayNum}` : `Day ${sStartDayNum}`})
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-blue-600 font-medium">
                                      {format(parseISO(sub.baselineStartDate), 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${sStartDayNum}` : `Day ${sStartDayNum}`})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdate(sub.id, 'baselineStartDate', '');
                                        handleUpdate(sub.id, 'baselineEndDate', '');
                                      }}
                                      className="text-[9px] text-red-500 hover:underline font-bold"
                                      title={lang === 'th' ? 'ลบวันที่' : 'Clear date'}
                                    >
                                      {lang === 'th' ? 'ลบ' : 'Clear'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center bg-blue-50/10 border-r border-slate-200">
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="date"
                                  value={sub.baselineEndDate || ''}
                                  onChange={(e) => handleBaselineEndChange(sub, e.target.value)}
                                  className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                                />
                                {!sub.baselineEndDate ? (
                                  <span className="text-[10px] text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-medium border border-blue-200" title={lang === 'th' ? 'คำนวณจากวันที่เริ่มโครงการ' : 'Calculated from project start date'}>
                                    {lang === 'th' ? 'อ้างอิง:' : 'Ref:'} {format(subDates.end, 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${sEndDayNum}` : `Day ${sEndDayNum}`})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-blue-600 font-medium">
                                    {format(parseISO(sub.baselineEndDate), 'dd/MM/yyyy')} ({lang === 'th' ? `วันที่ ${sEndDayNum}` : `Day ${sEndDayNum}`})
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actual Sub-task */}
                            <td className="p-2 text-center bg-orange-50/10">
                              <input
                                type="date"
                                value={sub.actualStartDate || ''}
                                onChange={(e) => handleUpdate(sub.id, 'actualStartDate', e.target.value)}
                                className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                              />
                            </td>
                            <td className="p-2 text-center bg-orange-50/10">
                              <input
                                type="date"
                                value={sub.actualEndDate || ''}
                                onChange={(e) => handleUpdate(sub.id, 'actualEndDate', e.target.value)}
                                className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                              />
                            </td>
                            <td className="p-2 text-center border-r border-slate-200 text-slate-600 bg-orange-50/10">
                              {subActualDur > 0 ? `${subActualDur}` : '-'}
                            </td>

                            {/* Weight Sub-task */}
                            <td className="p-2 text-center border-r border-slate-200 bg-slate-50/30">
                              <span className="text-slate-600 text-xs">
                                {getTaskWeight(sub)}%
                              </span>
                            </td>

                            {/* Progress Sub-task */}
                            <td className="p-2 text-center border-r border-slate-200">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={sub.progress || 0}
                                    onChange={(e) => handleUpdate(sub.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                    className="w-11 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white text-xs font-semibold text-[#FF5E00]"
                                  />
                                  <span className="text-slate-400 text-[10px]">%</span>
                                  <button
                                    type="button"
                                    onClick={() => handleAutoCalculateSingleProgress(sub)}
                                    className="p-1 text-amber-600 hover:bg-amber-50 rounded border border-amber-200"
                                    title={lang === 'th' ? 'คำนวณ % คืบหน้าอัตโนมัติตามวันที่' : 'Auto-calculate progress from dates'}
                                  >
                                    <Zap className="w-3 h-3 text-amber-500" />
                                  </button>
                                </div>
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-300 ${(sub.progress || 0) === 100 ? 'bg-emerald-500' : 'bg-[#FF5E00]'}`}
                                    style={{ width: `${sub.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Delete */}
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleDelete(sub.id)}
                                className="p-1 text-red-400 hover:bg-red-50 rounded"
                                title={lang === 'th' ? 'ลบหัวข้อย่อย' : 'Delete Sub-topic'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Quick Sub-topic input */}
                      {showSubInput[main.id] ? (
                        <tr className="bg-blue-50/30 border-t border-b border-blue-100">
                          <td className="p-2 text-center text-xs text-blue-500 font-bold">{mainIdx + 1}.{subScopes.length + 1}</td>
                          <td className="p-2 pl-6" colSpan={8}>
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <input
                                type="text"
                                value={subTaskInputs[main.id] || ''}
                                onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [main.id]: e.target.value })}
                                placeholder={lang === 'th' ? 'แทรกหัวข้อย่อยใหม่ แล้วกด Enter...' : 'Enter sub-topic name and hit Enter...'}
                                className="flex-1 px-3 py-1 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSub(main.id)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddSub(main.id)}
                                className="px-3 py-1 bg-[#0061FF] text-white rounded text-xs font-semibold hover:bg-blue-700"
                              >
                                {lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task'}
                              </button>
                              <button
                                onClick={() => setShowSubInput({ ...showSubInput, [main.id]: false })}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                              >
                                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            </div>
                          </td>
                          <td className="p-2"></td>
                        </tr>
                      ) : (
                        <tr className="bg-slate-50/30 hover:bg-slate-100/50">
                          <td className="p-1"></td>
                          <td className="p-1.5 pl-6" colSpan={9}>
                            <button
                              onClick={() => setShowSubInput({ ...showSubInput, [main.id]: true })}
                              className="text-[11px] text-[#0061FF] hover:text-blue-800 font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{lang === 'th' ? `เพิ่มงานย่อยใน ${main.taskName}` : `Add sub-task to ${main.taskName}`}</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* Gantt Chart View - Pre-Work Assessment & Timeline Estimation */
          <div className="p-4 min-w-[850px] space-y-5">
            {/* Pre-Work Assessment Workspace Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-xl shadow-md border border-indigo-800/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-indigo-800/60">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ระบบประเมินการเข้าทำงานก่อนจัดทำแผนงาน' : 'Pre-Work Assessment & Workday Estimator'}</span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white">
                    {lang === 'th' ? 'การประเมินกำลังคน กรอบเวลา และระดับความเสี่ยง' : 'Workforce, Duration & Risk Level Assessment'}
                  </h4>
                  <p className="text-xs text-indigo-200/90 mt-0.5">
                    {lang === 'th' 
                      ? 'จำลองและประเมินระยะเวลาการทำงาน (Workdays) ก่อนระบุวันที่เริ่มงานจริงในตาราง' 
                      : 'Simulate workday sequence and team sizing before setting baseline calendar dates'}
                  </p>
                </div>

                <button
                  onClick={handleApplyAssessmentPreset}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 shrink-0 border border-blue-400/40 transition-all"
                  title={lang === 'th' ? 'นำค่าประเมินตามโหมดจำลองไปตั้งเป็นระยะเวลาแผนงานจริง' : 'Sync estimation into baseline schedule'}
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>{lang === 'th' ? 'นำผลประเมินบันทึกเข้าแผนงานจริง' : 'Sync Assessment to Baseline'}</span>
                </button>
              </div>

              {/* Assessment Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {/* Metric 1: Total Estimated Days */}
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {lang === 'th' ? 'ระยะเวลาประเมินรวม' : 'Est. Total Days'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-200 font-bold">
                      {estimationPreset === 'fast' ? '-20% Fast Track' : estimationPreset === 'buffer' ? '+15% Buffer' : '100% Standard'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-white">
                      {Math.max(1, Math.round(totalProjectPlannedDuration * (estimationPreset === 'fast' ? 0.8 : estimationPreset === 'buffer' ? 1.15 : 1.0) * (preWorkRiskLevel === 'high' ? 1.1 : preWorkRiskLevel === 'low' ? 0.95 : 1.0)))}
                    </span>
                    <span className="text-xs text-indigo-200 font-bold">{lang === 'th' ? 'วันดำเนินงาน' : 'Workdays'}</span>
                  </div>
                  <div className="text-[10px] text-indigo-300 mt-1">
                    {lang === 'th' ? `ระยะเวลาเดิมตามงาน: ${totalProjectPlannedDuration} วัน` : `Original scope: ${totalProjectPlannedDuration} days`}
                  </div>
                </div>

                {/* Metric 2: Estimated Workforce / Man-Days */}
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      {lang === 'th' ? 'ประเมินกำลังคนเข้าทำงาน' : 'Workforce Estimate'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={preWorkManpower}
                      onChange={(e) => setPreWorkManpower(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1 text-sm text-center font-bold bg-slate-900 border border-indigo-400/50 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs text-white font-bold">{lang === 'th' ? 'คน/วัน' : 'workers/day'}</span>
                      <span className="text-[10px] text-emerald-300 font-semibold">
                        = {Math.max(1, Math.round(totalProjectPlannedDuration * (estimationPreset === 'fast' ? 0.8 : estimationPreset === 'buffer' ? 1.15 : 1.0) * (preWorkRiskLevel === 'high' ? 1.1 : preWorkRiskLevel === 'low' ? 0.95 : 1.0))) * preWorkManpower} Man-Days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric 3: Risk Level */}
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      {lang === 'th' ? 'ระดับความซับซ้อน/ความเสี่ยง' : 'Risk & Complexity'}
                    </span>
                  </div>
                  <select
                    value={preWorkRiskLevel}
                    onChange={(e) => setPreWorkRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-2 py-1 text-xs font-bold bg-slate-900 border border-indigo-400/50 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-400 mt-1"
                  >
                    <option value="low">{lang === 'th' ? 'ต่ำ (Low - 0.95x)' : 'Low Risk (0.95x)'}</option>
                    <option value="medium">{lang === 'th' ? 'ปานกลาง (Medium - 1.0x)' : 'Medium Risk (1.0x)'}</option>
                    <option value="high">{lang === 'th' ? 'สูง (High - 1.1x เผื่อเสี่ยง)' : 'High Risk (1.1x)'}</option>
                  </select>
                </div>

                {/* Metric 4: Simulation Preset */}
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
                  <div className="text-indigo-200 text-xs font-semibold mb-1.5">
                    {lang === 'th' ? 'โหมดจำลองกรอบเวลาเข้าทำงาน' : 'Simulation Mode'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => setEstimationPreset('standard')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${
                        estimationPreset === 'standard' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800/80 text-indigo-200 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'th' ? 'ปกติ' : 'Standard'}
                    </button>
                    <button
                      onClick={() => setEstimationPreset('fast')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${
                        estimationPreset === 'fast' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800/80 text-indigo-200 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'th' ? 'เร่งด่วน' : 'Fast'}
                    </button>
                    <button
                      onClick={() => setEstimationPreset('buffer')}
                      className={`px-1.5 py-1 text-[10px] font-bold rounded transition-all ${
                        estimationPreset === 'buffer' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800/80 text-indigo-200 hover:bg-slate-700'
                      }`}
                    >
                      {lang === 'th' ? 'สำรอง' : 'Buffer'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Add Main Task in Gantt View */}
            <div className="p-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-lg border border-blue-200/90 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Plus className="w-4 h-4 text-[#0061FF]" />
                <span>{lang === 'th' ? 'เพิ่มขอบเขตงานประเมินเข้าทำงาน:' : 'Add Main Scope for Pre-Work Assessment:'}</span>
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-xl">
                <input
                  type="text"
                  value={ganttNewTaskName}
                  onChange={(e) => setGanttNewTaskName(e.target.value)}
                  placeholder={lang === 'th' ? 'พิมพ์ชื่อขอบเขตงานประเมินที่ต้องการเพิ่ม...' : 'Enter scope name for assessment...'}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGanttMainTask()}
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    value={ganttNewTaskDuration}
                    onChange={(e) => setGanttNewTaskDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 text-xs text-center border border-slate-300 rounded bg-white font-bold text-slate-800"
                    title={lang === 'th' ? 'จำนวนวันทำงาน' : 'Duration (days)'}
                  />
                  <span className="text-xs text-slate-600 font-medium">{lang === 'th' ? 'วัน' : 'days'}</span>
                </div>
                <button
                  onClick={handleAddGanttMainTask}
                  className="px-3.5 py-1.5 bg-[#0061FF] text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1 shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'th' ? 'เพิ่มงานหลัก' : 'Add Main Task'}</span>
                </button>
              </div>
            </div>

            {mainScopes.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <p className="text-slate-500 text-sm font-medium">{lang === 'th' ? 'ยังไม่มีขอบเขตงานในตาราง' : 'No tasks available.'}</p>
                <p className="text-xs text-slate-400 mt-1">{lang === 'th' ? 'ใช้กล่องด้านบนเพื่อเพิ่มขอบเขตงานหลักแรกของคุณ' : 'Use the form above to add your first task.'}</p>
              </div>
            ) : (
              <div className="relative pt-2">
                {/* Timeline Header (Days Numbers Header - No Calendar Dates) */}
                <div className="flex border-b-2 border-slate-300 pb-2 mb-4 text-[10px] text-slate-700 relative pl-[240px] bg-slate-100/60 p-2 rounded-t-lg">
                  <div className="absolute left-3 bottom-2 w-[230px] font-bold text-slate-800 text-xs">
                    {lang === 'th' ? 'รายการขอบเขตงาน / งานย่อย' : 'Task Scope'}
                  </div>
                  <div className="flex-1 relative h-6 font-mono">
                    {Array.from({ length: totalDays }, (_, i) => i + 1)
                      .filter(dayNum => {
                        if (totalDays <= 25) return true;
                        if (totalDays <= 50) return dayNum === 1 || dayNum % 2 === 0 || dayNum === totalDays;
                        if (totalDays <= 100) return dayNum === 1 || dayNum % 5 === 0 || dayNum === totalDays;
                        return dayNum === 1 || dayNum % 10 === 0 || dayNum === totalDays;
                      })
                      .map((dayNum) => {
                        const percent = totalDays > 1 ? ((dayNum - 1) / (totalDays - 1)) * 100 : 0;
                        return (
                          <div
                            key={dayNum}
                            className="absolute flex flex-col items-center transform -translate-x-1/2"
                            style={{ left: `${percent}%` }}
                          >
                            <span className="font-bold text-[10px] text-slate-800 whitespace-nowrap">
                              {lang === 'th' ? `วันที่ ${dayNum}` : `Day ${dayNum}`}
                            </span>
                            <div className="h-2 w-0.5 bg-slate-400 mt-0.5 rounded-full" />
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Tasks Bars */}
                <div className="space-y-3">
                  {mainScopes.map((main, mainIdx) => {
                    const subScopes = projectScopes.filter(s => s.parentId === main.id);
                    const hasSubs = subScopes.length > 0;
                    const mainDates = itemCalculatedDates[main.id] || { start: minDate, end: maxDate, duration: 1 };
                    
                    const mStartOffset = differenceInDays(mainDates.start, minDate);
                    const mStart = Math.max(0, (mStartOffset / totalDays) * 100);
                    const mWidth = Math.min(100 - mStart, (mainDates.duration / totalDays) * 100);

                    const mStartDayNum = Math.max(1, differenceInDays(mainDates.start, minDate) + 1);
                    const mEndDayNum = Math.max(1, differenceInDays(mainDates.end, minDate) + 1);

                    const mainProgress = hasSubs 
                      ? (subScopes.length > 0 ? Math.round(subScopes.reduce((acc, s) => acc + (s.progress || 0), 0) / subScopes.length) : 0)
                      : (main.progress || 0);

                    let mAStart = 0;
                    let mAWidth = 0;
                    if (main.actualStartDate && isValid(parseISO(main.actualStartDate))) {
                      const actualEnd = main.actualEndDate && isValid(parseISO(main.actualEndDate)) 
                        ? parseISO(main.actualEndDate) 
                        : new Date();
                      const actualStartOffset = differenceInDays(parseISO(main.actualStartDate), minDate);
                      const actualDur = differenceInDays(actualEnd, parseISO(main.actualStartDate)) + 1;
                      mAStart = Math.max(0, (actualStartOffset / totalDays) * 100);
                      mAWidth = Math.min(100 - mAStart, (actualDur / totalDays) * 100);
                    }

                    return (
                      <div key={main.id} className="space-y-2">
                        {/* Parent Bar */}
                        <div className="relative flex items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                          <div className="w-[230px] flex-shrink-0 text-xs text-slate-900 font-bold truncate pr-2 flex items-center justify-between">
                            <div className="flex items-center truncate">
                              <span className="w-5 text-slate-500 text-[11px] text-center flex-shrink-0">{mainIdx + 1}.</span>
                              <span title={main.taskName} className="truncate">{main.taskName}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setShowSubInput({ ...showSubInput, [main.id]: !showSubInput[main.id] })}
                                className="px-1.5 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-[#0061FF] rounded font-semibold flex items-center gap-0.5"
                                title={lang === 'th' ? 'เพิ่มขอบเขตงานย่อย' : 'Add Sub Task'}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{lang === 'th' ? 'ย่อย' : 'Sub'}</span>
                              </button>
                              <button
                                onClick={() => handleDelete(main.id)}
                                className="p-0.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title={lang === 'th' ? 'ลบงาน' : 'Delete task'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex-1 h-7 relative bg-white rounded border border-slate-100 overflow-hidden">
                            {/* Baseline Container Bar */}
                            {mWidth > 0 && (
                              <div 
                                className="absolute top-1 h-5 rounded bg-blue-100 border border-blue-400/70 overflow-hidden flex items-center shadow-xs"
                                style={{ left: `${mStart}%`, width: `${mWidth}%` }}
                                title={`${lang === 'th' ? 'แผนงาน' : 'Baseline'} ${main.taskName}: ${lang === 'th' ? `วันที่ ${mStartDayNum} - ${mEndDayNum}` : `Day ${mStartDayNum} - ${mEndDayNum}`} (${mainDates.duration} ${lang === 'th' ? 'วัน' : 'days'})`}
                              >
                                {/* Inner Actual Progress Fill inside Baseline */}
                                {mAWidth === 0 && mainProgress > 0 && (
                                  <div 
                                    className={`h-full transition-all ${mainProgress === 100 ? 'bg-emerald-500' : 'bg-[#0061FF]'}`}
                                    style={{ width: `${mainProgress}%` }}
                                  />
                                )}
                                <span className="absolute left-2 text-[10px] font-bold text-slate-800 whitespace-nowrap drop-shadow-xs z-10">
                                  {lang === 'th' ? `วันที่ ${mStartDayNum}-${mEndDayNum}` : `Day ${mStartDayNum}-${mEndDayNum}`} ({mainDates.duration}d | {mainProgress}%)
                                </span>
                              </div>
                            )}

                            {/* Actual Dates Bar Overlay if custom actual dates provided */}
                            {mAWidth > 0 && (
                              <div 
                                className={`absolute top-1.5 h-4 rounded opacity-90 shadow-sm flex items-center px-1.5 ${mainProgress === 100 ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}
                                style={{ left: `${mAStart}%`, width: `${mAWidth}%` }}
                                title={`${lang === 'th' ? 'ผลจริง' : 'Actual'} ${main.taskName}: ${mainProgress}%`}
                              >
                                <span className="text-[9px] font-bold truncate">
                                  {lang === 'th' ? 'จริง' : 'Act'}: {mainProgress}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sub Tasks Bars */}
                        {subScopes.map((sub, subIdx) => {
                          const subDates = itemCalculatedDates[sub.id] || { start: minDate, end: maxDate, duration: 1 };
                          const sStartOffset = differenceInDays(subDates.start, minDate);
                          const sStart = Math.max(0, (sStartOffset / totalDays) * 100);
                          const sWidth = Math.min(100 - sStart, (subDates.duration / totalDays) * 100);

                          const sStartDayNum = Math.max(1, differenceInDays(subDates.start, minDate) + 1);
                          const sEndDayNum = Math.max(1, differenceInDays(subDates.end, minDate) + 1);

                          let aStart = 0;
                          let aWidth = 0;
                          if (sub.actualStartDate && isValid(parseISO(sub.actualStartDate))) {
                            const actualEnd = sub.actualEndDate && isValid(parseISO(sub.actualEndDate)) 
                              ? parseISO(sub.actualEndDate) 
                              : new Date();
                              
                            const actualStartOffset = differenceInDays(parseISO(sub.actualStartDate), minDate);
                            const actualDur = differenceInDays(actualEnd, parseISO(sub.actualStartDate)) + 1;
                            
                            aStart = Math.max(0, (actualStartOffset / totalDays) * 100);
                            aWidth = Math.min(100 - aStart, (actualDur / totalDays) * 100);
                          }

                          return (
                            <div key={sub.id} className="relative flex items-center pl-4">
                              <div className="w-[214px] flex-shrink-0 text-xs text-slate-600 font-medium truncate pr-2 flex items-center justify-between">
                                <div className="flex items-center truncate">
                                  <CornerDownRight className="w-3 h-3 text-slate-400 mr-1 flex-shrink-0" />
                                  <span className="text-[10px] text-slate-400 mr-1">{mainIdx + 1}.{subIdx + 1}</span>
                                  <span title={sub.taskName} className="truncate">{sub.taskName}</span>
                                </div>
                                <button
                                  onClick={() => handleDelete(sub.id)}
                                  className="p-0.5 text-slate-300 hover:text-red-600 rounded"
                                  title={lang === 'th' ? 'ลบงานย่อย' : 'Delete sub task'}
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                              
                              <div className="flex-1 h-7 relative bg-slate-50/50 rounded border border-slate-100 overflow-hidden">
                                {/* Baseline Container Bar */}
                                {sWidth > 0 && (
                                  <div 
                                    className="absolute top-1 h-5 rounded bg-blue-100/90 border border-blue-400/80 overflow-hidden flex items-center"
                                    style={{ left: `${sStart}%`, width: `${sWidth}%` }}
                                    title={`${lang === 'th' ? 'แผนงาน' : 'Baseline'} ${sub.taskName}: ${lang === 'th' ? `วันที่ ${sStartDayNum} - ${sEndDayNum}` : `Day ${sStartDayNum} - ${sEndDayNum}`} (${subDates.duration} ${lang === 'th' ? 'วัน' : 'days'})`}
                                  >
                                    {/* Inner Actual Progress Fill inside Baseline when no custom actual date bar */}
                                    {aWidth === 0 && (sub.progress || 0) > 0 && (
                                      <div 
                                        className={`h-full transition-all ${sub.progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                        style={{ width: `${sub.progress}%` }}
                                      />
                                    )}
                                    <span className="absolute left-1.5 text-[9px] font-bold text-slate-800 whitespace-nowrap z-10">
                                      {lang === 'th' ? `วันที่ ${sStartDayNum}-${sEndDayNum}` : `D${sStartDayNum}-${sEndDayNum}`} ({sub.progress}%)
                                    </span>
                                  </div>
                                )}
                                
                                {/* Actual Dates Bar Overlay if custom actual dates provided */}
                                {aWidth > 0 && (
                                  <div 
                                    className={`absolute top-1.5 h-4 rounded opacity-90 shadow-xs flex items-center px-1 ${sub.progress === 100 ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}
                                    style={{ left: `${aStart}%`, width: `${aWidth}%` }}
                                    title={`${lang === 'th' ? 'ผลจริง' : 'Actual'} ${sub.taskName}: ${sub.progress}%`}
                                  >
                                    <span className="text-[9px] font-bold truncate">
                                      {sub.progress}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Inline subtask input for Gantt view */}
                        {showSubInput[main.id] && (
                          <div className="flex items-center pl-4 py-1.5 bg-blue-50/80 rounded-lg border border-blue-200 my-1 text-xs shadow-2xs">
                            <div className="w-[214px] flex-shrink-0 flex items-center gap-1 pr-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="text-[10px] text-blue-700 font-bold">{mainIdx + 1}.{subScopes.length + 1}</span>
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={subTaskInputs[main.id] || ''}
                                onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [main.id]: e.target.value })}
                                placeholder={lang === 'th' ? 'กรอกชื่อขอบเขตงานย่อย แล้วกด Enter...' : 'Enter sub-task name...'}
                                className="flex-1 px-2.5 py-1 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSub(main.id)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddSub(main.id)}
                                className="px-3 py-1 bg-[#0061FF] text-white rounded text-xs font-semibold hover:bg-blue-700 flex-shrink-0 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task'}</span>
                              </button>
                              <button
                                onClick={() => setShowSubInput({ ...showSubInput, [main.id]: false })}
                                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 flex-shrink-0"
                              >
                                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Quick Add Sub/Main Trigger */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-start">
                  <button
                    onClick={() => {
                      const el = document.querySelector('input[placeholder*="ขอบเขตงานหลัก"]') as HTMLInputElement;
                      if (el) el.focus();
                    }}
                    className="text-xs font-bold text-[#0061FF] hover:text-blue-800 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200/60 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'th' ? '+ เพิ่มขอบเขตงานหลักใหม่' : '+ Add New Main Task Scope'}</span>
                  </button>
                </div>

                
                {/* Legend */}
                <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-slate-600 border-t pt-4 border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-blue-100 border border-blue-400 rounded-sm"></div>
                    <span>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-orange-500 rounded-sm"></div>
                    <span>{lang === 'th' ? 'ผลจริง (กำลังดำเนินการ)' : 'Actual (In Progress)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-emerald-500 rounded-sm"></div>
                    <span>{lang === 'th' ? 'ผลจริง (เสร็จสมบูรณ์)' : 'Actual (Completed)'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable PDF Report Container (Hidden on screen, visible during browser print) */}
      <div className="hidden print:block font-sans text-slate-800">
        <SchedulePlanPDFReport
          project={project}
          mainScopes={mainScopes}
          projectScopes={projectScopes}
          itemCalculatedDates={itemCalculatedDates}
          projectStartDate={projectStartDate}
          minDate={minDate}
          maxDate={maxDate}
          totalDays={totalDays}
          overallProgress={overallProgress}
          lang={lang}
          pdfIncludeMode={pdfIncludeMode}
          pdfIncludeSignatures={pdfIncludeSignatures}
          pdfNotesText={pdfNotesText}
          getItemProgress={getItemProgress}
        />
      </div>

      {/* Scope Picker / Import Modal */}
      {showScopePickerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'th' ? 'เลือกขอบเขตงานเข้ามาเป็น Task' : 'Pick Scope of Work as Tasks'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'th' ? 'เลือกจากรายการขอบเขตงานโครงการ ชุดแม่แบบมาตรฐาน หรือพิมพ์เพิ่มเอง' : 'Select from defined project scopes, industry templates, or custom input'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowScopePickerModal(false);
                  setSelectedScopeCheckboxes([]);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0">
              <button
                onClick={() => setActiveScopeTab('defined')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeScopeTab === 'defined'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? `ขอบเขตงานในโครงการ (${projectScopes.length})` : `Project Scopes (${projectScopes.length})`}</span>
              </button>

              <button
                onClick={() => setActiveScopeTab('templates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeScopeTab === 'templates'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ชุดแม่แบบงานมาตรฐาน' : 'Standard Industry Templates'}</span>
              </button>

              <button
                onClick={() => setActiveScopeTab('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeScopeTab === 'custom'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'พิมพ์รายการเพิ่มเอง' : 'Custom Input'}</span>
              </button>
            </div>

            {/* Target Import Location */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                {lang === 'th' ? 'ตำแหน่งที่ต้องการนำเข้า:' : 'Import Target Position:'}
              </span>
              <select
                value={importTargetParentId}
                onChange={(e) => setImportTargetParentId(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="new_main">{lang === 'th' ? '📌 สร้างเป็น "งานหลัก" ใหม่ (Main Task)' : '📌 Create as New Main Task'}</option>
                {mainScopes.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    ↳ {lang === 'th' ? `สร้างเป็น "งานย่อย" ใต้: ${idx + 1}. ${m.taskName}` : `Sub-task under: ${idx + 1}. ${m.taskName}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
              {/* TAB 1: Defined Project Scopes */}
              {activeScopeTab === 'defined' && (
                <div className="space-y-3">
                  {projectScopes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg space-y-2">
                      <p className="text-xs font-medium text-slate-500">
                        {lang === 'th' ? 'ยังไม่มีรายการขอบเขตงานที่บันทึกไว้ในเมนูกำหนดขอบเขตงาน' : 'No defined scope items found in this project yet.'}
                      </p>
                      <button
                        onClick={() => setActiveScopeTab('templates')}
                        className="text-xs text-emerald-600 font-bold hover:underline"
                      >
                        {lang === 'th' ? '👉 คลิกที่นี่เพื่อเลือกจากชุดแม่แบบงานมาตรฐาน' : '👉 Click here to select from standard templates'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-slate-100 p-2 rounded text-xs font-semibold text-slate-700">
                        <span>{lang === 'th' ? 'รายการขอบเขตงานทั้งหมดในโครงการ:' : 'All Project Scope Items:'}</span>
                        <button
                          onClick={() => {
                            const allNames = projectScopes.map(s => s.taskName);
                            if (selectedScopeCheckboxes.length === allNames.length) {
                              setSelectedScopeCheckboxes([]);
                            } else {
                              setSelectedScopeCheckboxes(allNames);
                            }
                          }}
                          className="text-emerald-700 hover:underline font-bold text-[11px]"
                        >
                          {selectedScopeCheckboxes.length === projectScopes.length
                            ? (lang === 'th' ? 'ยกเลิกการเลือกทั้งหมด' : 'Deselect All')
                            : (lang === 'th' ? 'เลือกทั้งหมด' : 'Select All')}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 max-h-[280px] overflow-y-auto border border-slate-200 p-2 rounded-lg bg-white">
                        {projectScopes.map((scope) => {
                          const isChecked = selectedScopeCheckboxes.includes(scope.taskName);
                          const isSub = !!scope.parentId;
                          return (
                            <label
                              key={scope.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer border text-xs transition-colors ${
                                isChecked ? 'bg-emerald-50 border-emerald-300 font-bold text-slate-900' : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                              } ${isSub ? 'ml-4 border-l-2 border-l-blue-400' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedScopeCheckboxes([...selectedScopeCheckboxes, scope.taskName]);
                                  } else {
                                    setSelectedScopeCheckboxes(selectedScopeCheckboxes.filter(n => n !== scope.taskName));
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="flex-1">
                                {isSub ? '↳ ' : ''}{scope.taskName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                                {isSub ? (lang === 'th' ? 'งานย่อย' : 'Sub-task') : (lang === 'th' ? 'งานหลัก' : 'Main Task')}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Standard Templates */}
              {activeScopeTab === 'templates' && (
                <div className="space-y-3">
                  {[
                    {
                      cat: lang === 'th' ? '1. งานโยธาและโครงสร้างอาคาร' : '1. Civil & Structural Works',
                      items: [
                        'งานจัดเตรียมพื้นที่และสิ่งอำนวยความสะดวกชั่วคราว',
                        'งานตอกเสาเข็ม/เสาเข็มเจาะ และฐานราก',
                        'งานโครงสร้าง ค.ส.ล. (เสา, คาน, พื้น)',
                        'งานโครงสร้างเหล็กรูปพรรณและหลังคา'
                      ]
                    },
                    {
                      cat: lang === 'th' ? '2. งานระบบไฟฟ้าและสื่อสาร' : '2. Electrical & Communication',
                      items: [
                        'งานติดตั้งตู้เมนสวิตช์ MDB และตู้ย่อย DB',
                        'งานเดินท่อร้อยสายไฟฟ้าและสายเมน',
                        'งานติดตั้งดวงโคม โคมไฟ และสวิตช์เต้ารับ',
                        'งานติดตั้งระบบแจ้งเหตุเพลิงไหม้ (Fire Alarm)',
                        'งานติดตั้งระบบสื่อสาร สัญญาณทีวี และ LAN'
                      ]
                    },
                    {
                      cat: lang === 'th' ? '3. งานระบบสุขาภิบาลและส่งมอบ' : '3. Sanitary & Water Supply',
                      items: [
                        'งานระบบท่อน้ำดี (PPR/Galvanized) และน้ำเสีย (PVC)',
                        'งานติดตั้งถังเก็บน้ำ ถังดักไขมัน และปั๊มน้ำ',
                        'งานติดตั้งสุขภัณฑ์และอุปกรณ์ห้องน้ำ'
                      ]
                    },
                    {
                      cat: lang === 'th' ? '4. งานระบบปรับอากาศ (HVAC)' : '4. Air Conditioning (HVAC)',
                      items: [
                        'งานติดตั้งเครื่องปรับอากาศชนิด Split Type / VRV',
                        'งานเดินท่อน้ำยา ท่อน้ำทิ้ง และท่อลมระบายอากาศ'
                      ]
                    },
                    {
                      cat: lang === 'th' ? '5. งานสถาปัตยกรรมและตกแต่ง' : '5. Architectural & Interior',
                      items: [
                        'งานก่ออิฐฉาบปูนและแต่งผิว',
                        'งานติดตั้งฝ้าเพดานยิปซัม / แผ่นเรียบ',
                        'งานปูกระเบื้องพื้นและผนัง',
                        'งานทาสีน้ำอะคริลิกภายในและภายนอก',
                        'งานติดตั้งประตู หน้าต่าง และกระจก'
                      ]
                    },
                    {
                      cat: lang === 'th' ? '6. งานติดตั้งระบบโซลาร์เซลล์ (Solar PV)' : '6. Solar PV System',
                      items: [
                        'งานสำรวจโครงสร้างและติดตั้งระบบ Mounting',
                        'งานติดตั้งแผงโซลาร์เซลล์ (Solar Panels)',
                        'งานติดตั้งอินเวอร์เตอร์ ตู้ DC/AC Combiner',
                        'งานเชื่อมต่อระบบไฟฟ้าและทดสอบระบบ (Commissioning)'
                      ]
                    }
                  ].map((group, gIdx) => (
                    <div key={gIdx} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 border-b border-slate-200 pb-1">
                        <span>{group.cat}</span>
                        <button
                          onClick={() => {
                            const newCheck = Array.from(new Set([...selectedScopeCheckboxes, ...group.items]));
                            setSelectedScopeCheckboxes(newCheck);
                          }}
                          className="text-[11px] text-emerald-700 hover:underline"
                        >
                          {lang === 'th' ? '+ เลือกหมวดนี้ทั้งหมด' : '+ Select Category'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 pt-1">
                        {group.items.map((item, iIdx) => {
                          const isChecked = selectedScopeCheckboxes.includes(item);
                          return (
                            <label
                              key={iIdx}
                              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs border ${
                                isChecked ? 'bg-emerald-50 border-emerald-300 font-bold text-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedScopeCheckboxes([...selectedScopeCheckboxes, item]);
                                  } else {
                                    setSelectedScopeCheckboxes(selectedScopeCheckboxes.filter(n => n !== item));
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="flex-1 truncate">{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: Custom Input */}
              {activeScopeTab === 'custom' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>{lang === 'th' ? 'พิมพ์รายการขอบเขตงานที่ต้องการนำเข้า (บรรทัดละ 1 รายการ):' : 'Type scope items to import (1 item per line):'}</span>
                  </label>
                  <textarea
                    value={customScopeInput}
                    onChange={(e) => setCustomScopeInput(e.target.value)}
                    placeholder={lang === 'th' ? 'เช่น:\n- งานติดตั้งระบบตู้ควบคุมไฟฟ้า\n- งานเดินสายไฟและติดตั้งดวงโคม\n- งานทดสอบระบบและส่งมอบ' : 'e.g.:\n- Electrical cabinet installation\n- Wiring & lighting installation\n- System testing & handover'}
                    className="w-full h-36 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono bg-slate-50"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 shrink-0">
              <div className="text-xs font-bold text-slate-700">
                {activeScopeTab === 'custom' ? (
                  <span>
                    {lang === 'th' 
                      ? `เตรียมนำเข้า: ${customScopeInput.split('\n').filter(l => l.trim()).length} รายการ`
                      : `Custom Items: ${customScopeInput.split('\n').filter(l => l.trim()).length}`}
                  </span>
                ) : (
                  <span>
                    {lang === 'th' 
                      ? `เลือกแล้ว: ${selectedScopeCheckboxes.length} รายการ`
                      : `Selected: ${selectedScopeCheckboxes.length} items`}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowScopePickerModal(false);
                    setSelectedScopeCheckboxes([]);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>

                {activeScopeTab === 'custom' ? (
                  <button
                    onClick={() => {
                      const items = customScopeInput
                        .split('\n')
                        .map(line => line.trim().replace(/^[-•*]\s*/, ''))
                        .filter(line => line.length > 0);
                      if (items.length > 0) {
                        handleBatchImportScopes(items, importTargetParentId);
                      } else {
                        alert(lang === 'th' ? 'กรุณากรอกรายการขอบเขตงานอย่างน้อย 1 บรรทัด' : 'Please enter at least 1 scope item');
                      }
                    }}
                    disabled={!customScopeInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{lang === 'th' ? 'นำเข้าขอบเขตงานที่พิมพ์' : 'Import Typed Items'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (selectedScopeCheckboxes.length > 0) {
                        handleBatchImportScopes(selectedScopeCheckboxes, importTargetParentId);
                      } else {
                        alert(lang === 'th' ? 'กรุณาทำเครื่องหมายเลือกขอบเขตงานอย่างน้อย 1 รายการ' : 'Please select at least 1 scope item');
                      }
                    }}
                    disabled={selectedScopeCheckboxes.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {lang === 'th'
                        ? `นำเข้า ${selectedScopeCheckboxes.length} รายการที่เลือก`
                        : `Import ${selectedScopeCheckboxes.length} Selected`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Modal Preview on Screen */}
      {showPdfPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">
                  {lang === 'th' ? 'ตัวอย่างรายงาน PDF (PDF Document Preview)' : 'PDF Document Preview'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={exportPDF}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  {lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : 'Print PDF'}
                </button>
                <button
                  onClick={() => setShowPdfPreview(false)}
                  className="text-slate-300 hover:text-white text-sm font-bold px-2 py-1 bg-white/10 rounded"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Editable Remarks in Preview */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs shrink-0 flex items-start gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap mt-1">
                {lang === 'th' ? 'หมายเหตุท้ายเอกสาร:' : 'Remarks:'}
              </span>
              <textarea
                value={pdfNotesText}
                onChange={(e) => setPdfNotesText(e.target.value)}
                rows={2}
                className="flex-1 text-xs border border-slate-300 rounded p-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                placeholder={lang === 'th' ? 'เพิ่มหมายเหตุหรือเงื่อนไขการทำงาน...' : 'Add notes or conditions...'}
              />
            </div>

            {/* PDF Render Preview Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-200">
              <div className="bg-white shadow-lg mx-auto max-w-4xl rounded-sm p-2">
                <SchedulePlanPDFReport
                  project={project}
                  mainScopes={mainScopes}
                  projectScopes={projectScopes}
                  itemCalculatedDates={itemCalculatedDates}
                  projectStartDate={projectStartDate}
                  minDate={minDate}
                  maxDate={maxDate}
                  totalDays={totalDays}
                  overallProgress={overallProgress}
                  lang={lang}
                  pdfIncludeMode={pdfIncludeMode}
                  pdfIncludeSignatures={pdfIncludeSignatures}
                  pdfNotesText={pdfNotesText}
                  getItemProgress={getItemProgress}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for rendering official, beautiful PDF Report
function SchedulePlanPDFReport({
  project,
  mainScopes,
  projectScopes,
  itemCalculatedDates,
  projectStartDate,
  minDate,
  maxDate,
  totalDays,
  overallProgress,
  lang,
  pdfIncludeMode,
  pdfIncludeSignatures,
  pdfNotesText,
  getItemProgress,
}: {
  project: any;
  mainScopes: ScopeType[];
  projectScopes: ScopeType[];
  itemCalculatedDates: Record<string, { start: Date; end: Date; duration: number }>;
  projectStartDate: Date;
  minDate: Date;
  maxDate: Date;
  totalDays: number;
  overallProgress: number;
  lang: string;
  pdfIncludeMode: 'both' | 'table' | 'gantt';
  pdfIncludeSignatures: boolean;
  pdfNotesText: string;
  getItemProgress: (s: ScopeType) => number;
}) {
  const subTasksCount = projectScopes.filter(s => s.parentId).length;
  const totalPlannedDays = Math.max(1, differenceInDays(maxDate, projectStartDate) + 1);

  return (
    <div className="bg-white p-6 text-slate-800 space-y-5 border border-slate-200 rounded">
      {/* Official Header */}
      <div className="border-b-2 border-slate-800 pb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-sm font-black">WIN</span>
              <span>WIN SECURITY SERVICE COMPANY LIMITED</span>
            </div>
            <div className="text-xs text-slate-600 font-medium mt-0.5">บริษัท วิน เซคคิวริตี้ เซอร์วิส จำกัด | ClickDo Project Management System</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-blue-800 uppercase bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block">
              {lang === 'th' ? 'เอกสารประเมินแผนงาน' : 'Schedule Estimation Report'}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {lang === 'th' ? 'วันที่พิมพ์:' : 'Issued:'} {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
        </div>

        <div className="mt-3 text-center bg-slate-900 text-white py-2 rounded shadow-xs">
          <h2 className="text-base font-black tracking-wide uppercase">
            {lang === 'th' ? 'ตารางประเมินและประเมินระยะเวลาการทำงาน (SCHEDULE & DURATION ESTIMATION PLAN)' : 'SCHEDULE & DURATION ESTIMATION PLAN'}
          </h2>
        </div>
      </div>

      {/* Project Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'ชื่อโครงการ' : 'Project Name'}</span>
          <span className="font-bold text-slate-900">{project.name}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'รหัสโครงการ' : 'Project Code'}</span>
          <span className="font-mono font-bold text-slate-800">{project.projectNumber || `PRJ-${project.id.slice(0, 6).toUpperCase()}`}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'ผู้ว่าจ้าง / ลูกค้า' : 'Client / Owner'}</span>
          <span className="font-semibold text-slate-800">{project.clientName || 'WIN SECURITY SERVICE'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'สถานที่ดำเนินงาน' : 'Location'}</span>
          <span className="font-semibold text-slate-800">{project.location || 'ไม่ระบุ'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'วันที่เริ่มโครงการ' : 'Start Date'}</span>
          <span className="font-bold text-blue-700">{format(projectStartDate, 'dd/MM/yyyy')}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'วันที่คาดว่าแล้วเสร็จ' : 'Est. Completion'}</span>
          <span className="font-bold text-blue-700">{format(maxDate, 'dd/MM/yyyy')}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'ระยะเวลารวมตามแผน' : 'Total Planned Duration'}</span>
          <span className="font-bold text-slate-900">{totalPlannedDays} {lang === 'th' ? 'วัน' : 'days'}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase font-bold">{lang === 'th' ? 'ความคืบหน้ารวม' : 'Overall Progress'}</span>
          <span className="font-black text-emerald-600">{overallProgress}%</span>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-blue-50/80 border border-blue-200 p-2 rounded">
          <div className="text-slate-500 text-[10px] font-medium">{lang === 'th' ? 'หมวดงานหลัก' : 'Main Scopes'}</div>
          <div className="text-sm font-black text-blue-900 mt-0.5">{mainScopes.length} {lang === 'th' ? 'หมวด' : 'Scopes'}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2 rounded">
          <div className="text-slate-500 text-[10px] font-medium">{lang === 'th' ? 'งานย่อยทั้งหมด' : 'Sub Tasks'}</div>
          <div className="text-sm font-black text-slate-800 mt-0.5">{subTasksCount} {lang === 'th' ? 'รายการ' : 'Items'}</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-2 rounded">
          <div className="text-slate-500 text-[10px] font-medium">{lang === 'th' ? 'จำนวนวันทำงาน' : 'Planned Days'}</div>
          <div className="text-sm font-black text-slate-800 mt-0.5">{totalPlannedDays} {lang === 'th' ? 'วัน' : 'Days'}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-2 rounded">
          <div className="text-slate-500 text-[10px] font-medium">{lang === 'th' ? 'ความคืบหน้าโครงการ' : 'Overall Progress'}</div>
          <div className="text-sm font-black text-emerald-700 mt-0.5">{overallProgress}%</div>
        </div>
      </div>

      {/* Table Section */}
      {(pdfIncludeMode === 'both' || pdfIncludeMode === 'table') && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 bg-blue-600 rounded-full inline-block"></span>
              {lang === 'th' ? '1. ตารางประเมินและแผนงานดำเนินงาน (Schedule Plan Table)' : '1. Schedule Plan Table'}
            </h3>
          </div>

          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold text-center">
                <th className="p-1.5 border border-slate-600 w-8">#</th>
                <th className="p-1.5 border border-slate-600 text-left w-2/5">{lang === 'th' ? 'รายการขอบเขตงาน / หัวข้อย่อย' : 'Scope / Sub-topic'}</th>
                <th className="p-1.5 border border-slate-600 w-12">{lang === 'th' ? 'วัน' : 'Days'}</th>
                <th className="p-1.5 border border-slate-600">{lang === 'th' ? 'เริ่มตามแผน' : 'Baseline Start'}</th>
                <th className="p-1.5 border border-slate-600">{lang === 'th' ? 'สิ้นสุดตามแผน' : 'Baseline End'}</th>
                <th className="p-1.5 border border-slate-600">{lang === 'th' ? 'เริ่มจริง' : 'Actual Start'}</th>
                <th className="p-1.5 border border-slate-600">{lang === 'th' ? 'สิ้นสุดจริง' : 'Actual End'}</th>
                <th className="p-1.5 border border-slate-600 w-14">{lang === 'th' ? '% คืบหน้า' : 'Progress'}</th>
                <th className="p-1.5 border border-slate-600 w-20">{lang === 'th' ? 'สถานะ' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {mainScopes.map((main, mainIdx) => {
                const subScopes = projectScopes.filter(s => s.parentId === main.id);
                const mainDates = itemCalculatedDates[main.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
                const computedProgress = getItemProgress(main);

                const mStartDayNum = Math.max(1, differenceInDays(mainDates.start, projectStartDate) + 1);
                const mEndDayNum = Math.max(1, differenceInDays(mainDates.end, projectStartDate) + 1);

                return (
                  <React.Fragment key={main.id}>
                    {/* Main Task Row */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-300">
                      <td className="p-1.5 text-center border-r border-slate-300">{mainIdx + 1}</td>
                      <td className="p-1.5 border-r border-slate-300 font-bold">
                        {main.taskName}
                        <span className="block text-[9px] text-blue-700 font-normal">
                          ({lang === 'th' ? `วันที่ ${mStartDayNum} - ${mEndDayNum}` : `Day ${mStartDayNum} - ${mEndDayNum}`})
                        </span>
                      </td>
                      <td className="p-1.5 text-center border-r border-slate-300 text-blue-800">{mainDates.duration}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{format(mainDates.start, 'dd/MM/yyyy')}</td>
                      <td className="p-1.5 text-center border-r border-slate-300">{format(mainDates.end, 'dd/MM/yyyy')}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 text-slate-700">{main.actualStartDate ? format(parseISO(main.actualStartDate), 'dd/MM/yyyy') : '-'}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 text-slate-700">{main.actualEndDate ? format(parseISO(main.actualEndDate), 'dd/MM/yyyy') : '-'}</td>
                      <td className="p-1.5 text-center border-r border-slate-300 font-black text-blue-700">{computedProgress}%</td>
                      <td className="p-1.5 text-center">
                        {computedProgress === 100 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                            {lang === 'th' ? 'เสร็จสมบูรณ์' : 'Done'}
                          </span>
                        ) : computedProgress > 0 ? (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                            {lang === 'th' ? 'กำลังดำเนินงาน' : 'Ongoing'}
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-medium px-1.5 py-0.5 rounded border border-slate-300">
                            {lang === 'th' ? 'ยังไม่เริ่ม' : 'Pending'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Subtasks */}
                    {subScopes.map((sub, subIdx) => {
                      const subDates = itemCalculatedDates[sub.id] || { start: projectStartDate, end: projectStartDate, duration: 1 };
                      const sStartDayNum = Math.max(1, differenceInDays(subDates.start, projectStartDate) + 1);
                      const sEndDayNum = Math.max(1, differenceInDays(subDates.end, projectStartDate) + 1);
                      const subProg = sub.progress || 0;

                      return (
                        <tr key={sub.id} className="bg-white text-slate-700 border-b border-slate-200">
                          <td className="p-1 text-center text-slate-400 text-[9px] border-r border-slate-200">{mainIdx + 1}.{subIdx + 1}</td>
                          <td className="p-1 pl-5 border-r border-slate-200">
                            <span className="font-medium text-slate-800">└ {sub.taskName}</span>
                            <span className="text-[8px] text-slate-500 block pl-2">
                              ({lang === 'th' ? `วันที่ ${sStartDayNum} - ${sEndDayNum}` : `Day ${sStartDayNum} - ${sEndDayNum}`})
                            </span>
                          </td>
                          <td className="p-1 text-center border-r border-slate-200">{subDates.duration}</td>
                          <td className="p-1 text-center border-r border-slate-200">{format(subDates.start, 'dd/MM/yyyy')}</td>
                          <td className="p-1 text-center border-r border-slate-200">{format(subDates.end, 'dd/MM/yyyy')}</td>
                          <td className="p-1 text-center border-r border-slate-200 text-slate-600">{sub.actualStartDate ? format(parseISO(sub.actualStartDate), 'dd/MM/yyyy') : '-'}</td>
                          <td className="p-1 text-center border-r border-slate-200 text-slate-600">{sub.actualEndDate ? format(parseISO(sub.actualEndDate), 'dd/MM/yyyy') : '-'}</td>
                          <td className="p-1 text-center border-r border-slate-200 font-bold text-slate-800">{subProg}%</td>
                          <td className="p-1 text-center">
                            {subProg === 100 ? (
                              <span className="text-emerald-700 text-[8px] font-bold">✓ {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}</span>
                            ) : subProg > 0 ? (
                              <span className="text-amber-700 text-[8px] font-bold">⏱ {subProg}%</span>
                            ) : (
                              <span className="text-slate-400 text-[8px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-[10px]">
                <td colSpan={2} className="p-1.5 text-right">{lang === 'th' ? 'สรุปภาพรวมแผนงาน (Project Summary)' : 'Project Summary'}</td>
                <td className="p-1.5 text-center">{totalPlannedDays} {lang === 'th' ? 'วัน' : 'D'}</td>
                <td className="p-1.5 text-center">{format(projectStartDate, 'dd/MM/yyyy')}</td>
                <td className="p-1.5 text-center">{format(maxDate, 'dd/MM/yyyy')}</td>
                <td colSpan={2} className="p-1.5 text-center"></td>
                <td className="p-1.5 text-center text-emerald-400 font-black">{overallProgress}%</td>
                <td className="p-1.5 text-center"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Gantt Chart Section */}
      {(pdfIncludeMode === 'both' || pdfIncludeMode === 'gantt') && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
              <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block"></span>
              {lang === 'th' ? '2. แผนผังระยะเวลาทำงาน (Gantt Chart Timeline)' : '2. Gantt Chart Timeline'}
            </h3>
          </div>

          <div className="border border-slate-300 rounded p-2 bg-slate-50/50">
            {/* Timeline Header (Day Numbers) */}
            <div className="flex justify-between text-[9px] text-slate-700 font-mono font-bold border-b border-slate-300 pb-1 mb-1.5 pl-[150px]">
              <span>{lang === 'th' ? 'วันที่ 1' : 'Day 1'}</span>
              <span>{lang === 'th' ? `วันที่ ${totalDays} (รวม ${totalDays} วัน)` : `Day ${totalDays} (${totalDays} days)`}</span>
            </div>

            {/* Task Timeline Bars */}
            <div className="space-y-1 text-[10px]">
              {mainScopes.map((main, mainIdx) => {
                const subScopes = projectScopes.filter(s => s.parentId === main.id);
                const mainDates = itemCalculatedDates[main.id] || { start: minDate, end: maxDate, duration: 1 };
                const mStartOffset = differenceInDays(mainDates.start, minDate);
                const mStart = Math.max(0, (mStartOffset / totalDays) * 100);
                const mWidth = Math.min(100 - mStart, (mainDates.duration / totalDays) * 100);
                const computedProg = getItemProgress(main);

                return (
                  <div key={main.id} className="space-y-0.5">
                    <div className="flex items-center">
                      <div className="w-[150px] shrink-0 font-bold text-slate-900 truncate pr-2 text-[10px]">
                        {mainIdx + 1}. {main.taskName}
                      </div>
                      <div className="flex-1 h-4 relative bg-white border border-slate-200 rounded overflow-hidden">
                        {mWidth > 0 && (
                          <div
                            className="absolute top-0.5 h-3 bg-blue-500 rounded text-[8px] font-bold text-white flex items-center px-1"
                            style={{ left: `${mStart}%`, width: `${mWidth}%` }}
                          >
                            <span className="truncate">{mainDates.duration}d ({computedProg}%)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks Gantt */}
                    {subScopes.map((sub, subIdx) => {
                      const subDates = itemCalculatedDates[sub.id] || { start: minDate, end: maxDate, duration: 1 };
                      const sStartOffset = differenceInDays(subDates.start, minDate);
                      const sStart = Math.max(0, (sStartOffset / totalDays) * 100);
                      const sWidth = Math.min(100 - sStart, (subDates.duration / totalDays) * 100);

                      return (
                        <div key={sub.id} className="flex items-center pl-2">
                          <div className="w-[142px] shrink-0 text-slate-600 font-medium truncate pr-2 text-[9px]">
                            {mainIdx + 1}.{subIdx + 1} {sub.taskName}
                          </div>
                          <div className="flex-1 h-3 relative bg-white border border-slate-200 rounded overflow-hidden">
                            {sWidth > 0 && (
                              <div
                                className={`absolute top-0.5 h-2 rounded text-[7px] font-bold text-white flex items-center px-0.5 ${sub.progress === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`}
                                style={{ left: `${sStart}%`, width: `${sWidth}%` }}
                              >
                                <span className="truncate">{sub.progress || 0}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Gantt Legend */}
            <div className="mt-2 pt-1 border-t border-slate-200 flex justify-center gap-4 text-[9px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-blue-500 rounded-xs"></span> {lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-amber-500 rounded-xs"></span> {lang === 'th' ? 'กำลังดำเนินการ' : 'In Progress'}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2 bg-emerald-600 rounded-xs"></span> {lang === 'th' ? 'เสร็จสมบูรณ์' : 'Completed'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {pdfNotesText && (
        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[10px] space-y-0.5">
          <span className="font-bold text-slate-800 block text-[10px]">{lang === 'th' ? 'หมายเหตุและเงื่อนไข:' : 'Remarks & Conditions:'}</span>
          <pre className="whitespace-pre-wrap font-sans text-slate-600 text-[10px] leading-snug">{pdfNotesText}</pre>
        </div>
      )}

      {/* Signatures & Approvals Section */}
      {pdfIncludeSignatures && (
        <div className="pt-2">
          <div className="text-[10px] font-bold text-slate-800 mb-2 border-b border-slate-300 pb-0.5 uppercase tracking-wider">
            {lang === 'th' ? 'ส่วนการลงนามอนุมัติเอกสาร (Approvals & Signatures)' : 'Approvals & Signatures'}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-[10px]">
            {/* Prepared By */}
            <div className="border border-slate-300 rounded p-3 bg-slate-50/50 flex flex-col justify-between h-32">
              <div className="font-bold text-slate-800">{lang === 'th' ? 'ผู้จัดทำแผนงาน' : 'Prepared By'}</div>
              <div className="border-b border-dashed border-slate-400 my-2 mx-3"></div>
              <div className="text-slate-600 text-[10px]">
                <div>(............................................................)</div>
                <div className="mt-0.5 font-semibold text-[9px]">{lang === 'th' ? 'วิศวกร / ผู้จัดการโครงการ' : 'Project Engineer / Manager'}</div>
                <div className="text-[8px] text-slate-400 mt-0.5">{lang === 'th' ? 'วันที่:' : 'Date:'} ......./......./.......</div>
              </div>
            </div>

            {/* Checked By */}
            <div className="border border-slate-300 rounded p-3 bg-slate-50/50 flex flex-col justify-between h-32">
              <div className="font-bold text-slate-800">{lang === 'th' ? 'ผู้ตรวจสอบแผนงาน' : 'Checked By'}</div>
              <div className="border-b border-dashed border-slate-400 my-2 mx-3"></div>
              <div className="text-slate-600 text-[10px]">
                <div>(............................................................)</div>
                <div className="mt-0.5 font-semibold text-[9px]">{lang === 'th' ? 'หัวหน้าฝ่ายปฏิบัติการ' : 'Operations Head'}</div>
                <div className="text-[8px] text-slate-400 mt-0.5">{lang === 'th' ? 'วันที่:' : 'Date:'} ......./......./.......</div>
              </div>
            </div>

            {/* Approved By */}
            <div className="border border-slate-300 rounded p-3 bg-slate-50/50 flex flex-col justify-between h-32">
              <div className="font-bold text-slate-800">{lang === 'th' ? 'ผู้อนุมัติ / เจ้าของโครงการ' : 'Approved By / Client'}</div>
              <div className="border-b border-dashed border-slate-400 my-2 mx-3"></div>
              <div className="text-slate-600 text-[10px]">
                <div>(............................................................)</div>
                <div className="mt-0.5 font-semibold text-[9px]">{lang === 'th' ? 'ตัวแทนผู้ว่าจ้าง / เจ้าของโครงการ' : 'Client Representative'}</div>
                <div className="text-[8px] text-slate-400 mt-0.5">{lang === 'th' ? 'วันที่:' : 'Date:'} ......./......./.......</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between">
        <div>Win Security Service Co., Ltd. | ClickDo Project Management</div>
        <div>Page 1 of 1</div>
      </div>
    </div>
  );
}
