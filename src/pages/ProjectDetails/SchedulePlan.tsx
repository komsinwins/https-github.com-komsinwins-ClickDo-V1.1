import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { differenceInDays, parseISO, isValid, addDays, format, min, max } from 'date-fns';
import { Download, Plus, Trash2, BarChart, Table as TableIcon, CornerDownRight, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ScopeOfWork as ScopeType } from '../../types';
import { SaveButton } from '../../components/SaveButton';

export function SchedulePlan({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const [view, setView] = useState<'table' | 'gantt'>('table');
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [showSubInput, setShowSubInput] = useState<Record<string, boolean>>({});
  
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);
  
  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const mainScopes = projectScopes.filter(s => !s.parentId);

  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const reportRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  // Calculate dates sequentially for main tasks and sub-tasks
  const projectStartDate = isValid(parseISO(project.startDate)) ? parseISO(project.startDate) : new Date();

  // We compute date windows for all items
  const itemCalculatedDates: Record<string, { start: Date; end: Date; duration: number }> = {};
  let currentPointer = projectStartDate;

  mainScopes.forEach(main => {
    const subScopes = projectScopes.filter(s => s.parentId === main.id);
    if (subScopes.length === 0) {
      const dur = Math.max(1, main.durationDays || 1);
      const start = currentPointer;
      const end = addDays(start, dur - 1);
      itemCalculatedDates[main.id] = { start, end, duration: dur };
      currentPointer = addDays(end, 1);
    } else {
      let mainStart = currentPointer;
      let totalDur = 0;
      subScopes.forEach(sub => {
        const dur = Math.max(1, sub.durationDays || 1);
        const start = currentPointer;
        const end = addDays(start, dur - 1);
        itemCalculatedDates[sub.id] = { start, end, duration: dur };
        totalDur += dur;
        currentPointer = addDays(end, 1);
      });
      const mainEnd = addDays(mainStart, totalDur > 0 ? totalDur - 1 : 0);
      itemCalculatedDates[main.id] = { start: mainStart, end: mainEnd, duration: totalDur };
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

  const handleUpdate = (id: string, field: string, value: any) => {
    updateData({
      scopes: data.scopes.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    });
  };

  // Helper to update baseline start date and auto-calculate duration / end date
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

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-md mb-2 sm:mb-0 w-full sm:w-auto">
            <button
              onClick={() => setView('table')}
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'table' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              {lang === 'th' ? 'ตารางข้อมูล' : 'Table View'}
            </button>
            <button
              onClick={() => setView('gantt')}
              className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${view === 'gantt' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <BarChart className="w-3.5 h-3.5" />
              {lang === 'th' ? 'แกนต์ชาร์ต' : 'Gantt Chart'}
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
              className="px-4 py-1.5 bg-[#0061FF] text-white rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-1.5 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>
                {taskType === 'sub'
                  ? (lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task')
                  : (lang === 'th' ? 'เพิ่มงานหลัก' : 'Add Main Task')}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <style>{`
            @media print {
              @page {
                size: ${paperSize.toUpperCase()} landscape;
                margin: 8mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              input {
                border: none !important;
                background: transparent !important;
              }
            }
          `}</style>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">{lang === 'th' ? 'ขนาดกระดาษ PDF:' : 'PDF Paper Size:'}</span>
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
              className="border border-slate-300 rounded px-2.5 py-1 bg-white font-medium text-slate-700 outline-none focus:border-[#0061FF]"
            >
              <option value="a4">{lang === 'th' ? 'A4 (แนวนอน)' : 'A4 (Landscape)'}</option>
              <option value="a3">{lang === 'th' ? 'A3 (แนวนอน)' : 'A3 (Landscape)'}</option>
            </select>
          </div>
          <button
            onClick={exportPDF}
            className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-2 transition-colors print:hidden shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : 'Print / Export PDF'}
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกแผนงานเรียบร้อยแล้ว' : 'Schedule plan saved successfully'} />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white p-4 shadow-sm" ref={reportRef}>
        <div className="mb-4 pb-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'ตารางประเมินและประเมินระยะเวลาการทำงาน (Schedule Plan)' : 'Schedule & Duration Estimation Plan'}</h3>
            <p className="text-xs text-slate-500 mt-1">{project.name} | {lang === 'th' ? 'วันที่เริ่มโครงการ:' : 'Start Date:'} {format(projectStartDate, 'dd/MM/yyyy')}</p>
          </div>

          {/* Overall Project Progress Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-lg p-3 min-w-[240px]">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1.5">
              <span>{lang === 'th' ? 'ความคืบหน้ารวมของโครงการ:' : 'Overall Project Progress:'}</span>
              <span className="text-[#0061FF] font-bold text-sm">{overallProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${overallProgress === 100 ? 'bg-emerald-500' : 'bg-[#0061FF]'}`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
        
        {view === 'table' ? (
          <table className="w-full text-left text-[11px] sm:text-xs border-collapse min-w-[950px]">
            <thead className="bg-[#F8FAFC] text-slate-700 border-b-2 border-slate-300">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">{lang === 'th' ? 'ลำดับ' : 'No.'}</th>
                <th className="p-2 font-semibold border-r border-slate-200 w-1/3">{lang === 'th' ? 'ขอบเขตงาน / หัวข้อย่อย' : 'Scope / Sub-topic'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'แผนงาน (Baseline)' : 'Baseline'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200" colSpan={3}>{lang === 'th' ? 'ผลจริง (Actual)' : 'Actual'}</th>
                <th className="p-2 font-semibold text-center border-r border-slate-200">{lang === 'th' ? '% คืบหน้า' : '% Progress'}</th>
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
                  const mainDates = itemCalculatedDates[main.id] || { start: new Date(), end: new Date(), duration: 1 };
                  const computedProgress = getItemProgress(main);

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
                          {hasSubs ? (
                            <span className="text-slate-700 font-medium">{format(mainDates.start, 'dd/MM/yyyy')}</span>
                          ) : (
                            <input
                              type="date"
                              value={main.baselineStartDate || ''}
                              onChange={(e) => handleBaselineStartChange(main, e.target.value)}
                              className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white text-slate-800 font-medium"
                            />
                          )}
                        </td>
                        <td className="p-2 text-center bg-blue-50/30 border-r border-slate-200">
                          {hasSubs ? (
                            <span className="text-slate-700 font-medium">{format(mainDates.end, 'dd/MM/yyyy')}</span>
                          ) : (
                            <input
                              type="date"
                              value={main.baselineEndDate || ''}
                              onChange={(e) => handleBaselineEndChange(main, e.target.value)}
                              className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white text-slate-800 font-medium"
                            />
                          )}
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

                        {/* Progress */}
                        <td className="p-2 text-center border-r border-slate-200">
                          {hasSubs ? (
                            <div className="flex items-center justify-center gap-1" title={lang === 'th' ? 'คำนวณอัตโนมัติจากงานย่อย' : 'Calculated automatically from sub-tasks'}>
                              <span className="px-2 py-1 bg-blue-50 text-[#0061FF] rounded font-bold text-xs border border-blue-200">
                                {computedProgress}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={main.progress || 0}
                                onChange={(e) => handleUpdate(main.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                className="w-12 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white font-bold text-[#FF5E00]"
                              />
                              <span className="text-slate-500">%</span>
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
                              <input
                                type="date"
                                value={sub.baselineStartDate || ''}
                                onChange={(e) => handleBaselineStartChange(sub, e.target.value)}
                                className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                              />
                            </td>
                            <td className="p-2 text-center bg-blue-50/10 border-r border-slate-200">
                              <input
                                type="date"
                                value={sub.baselineEndDate || ''}
                                onChange={(e) => handleBaselineEndChange(sub, e.target.value)}
                                className="w-full border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-[11px] bg-white"
                              />
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

                            {/* Progress Sub-task */}
                            <td className="p-2 text-center border-r border-slate-200">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={sub.progress || 0}
                                  onChange={(e) => handleUpdate(sub.id, 'progress', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                  className="w-12 border border-slate-300 rounded focus:border-[#0061FF] focus:outline-none p-1 text-center bg-white text-xs font-semibold text-[#FF5E00]"
                                />
                                <span className="text-slate-400 text-[10px]">%</span>
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
          /* Gantt Chart View */
          <div className="p-4 min-w-[800px]">
            {mainScopes.length === 0 ? (
              <p className="text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลงาน' : 'No tasks available.'}</p>
            ) : (
              <div className="relative pt-6">
                {/* Timeline Header */}
                <div className="flex border-b border-slate-200 pb-2 mb-4 text-[10px] text-slate-500 relative pl-[240px]">
                  <div className="absolute left-0 bottom-2 w-[230px] font-semibold text-slate-700 text-xs">{lang === 'th' ? 'ขอบเขตงาน / หัวข้อย่อย' : 'Task Scope'}</div>
                  <div className="flex-1 flex justify-between font-mono">
                    <span>{format(minDate, 'dd MMM yyyy')}</span>
                    <span>{format(maxDate, 'dd MMM yyyy')}</span>
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
                        <div className="relative flex items-center bg-slate-50 p-1 rounded border border-slate-200">
                          <div className="w-[230px] flex-shrink-0 text-xs text-slate-900 font-bold truncate pr-2 flex items-center justify-between">
                            <div className="flex items-center truncate">
                              <span className="w-5 text-slate-500 text-[11px] text-center flex-shrink-0">{mainIdx + 1}.</span>
                              <span title={main.taskName} className="truncate">{main.taskName}</span>
                            </div>
                            <button
                              onClick={() => setShowSubInput({ ...showSubInput, [main.id]: !showSubInput[main.id] })}
                              className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-50 hover:bg-blue-100 text-[#0061FF] rounded font-semibold flex items-center gap-0.5 flex-shrink-0"
                              title={lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task'}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{lang === 'th' ? 'ย่อย' : 'Sub'}</span>
                            </button>
                          </div>
                          
                          <div className="flex-1 h-7 relative bg-white rounded border border-slate-100 overflow-hidden">
                            {/* Baseline Container Bar */}
                            {mWidth > 0 && (
                              <div 
                                className="absolute top-1 h-5 rounded bg-blue-100 border border-blue-400/70 overflow-hidden flex items-center shadow-xs"
                                style={{ left: `${mStart}%`, width: `${mWidth}%` }}
                                title={`${lang === 'th' ? 'แผนงาน' : 'Baseline'} ${main.taskName}: ${format(mainDates.start, 'dd/MM/yyyy')} - ${format(mainDates.end, 'dd/MM/yyyy')} (${mainDates.duration} ${lang === 'th' ? 'วัน' : 'days'})`}
                              >
                                {/* Inner Actual Progress Fill inside Baseline */}
                                {mAWidth === 0 && mainProgress > 0 && (
                                  <div 
                                    className={`h-full transition-all ${mainProgress === 100 ? 'bg-emerald-500' : 'bg-[#0061FF]'}`}
                                    style={{ width: `${mainProgress}%` }}
                                  />
                                )}
                                <span className="absolute left-2 text-[10px] font-bold text-slate-800 whitespace-nowrap drop-shadow-xs z-10">
                                  {mainDates.duration} {lang === 'th' ? 'วัน' : 'd'} ({mainProgress}%)
                                </span>
                              </div>
                            )}

                            {/* Actual Dates Bar Overlay if custom actual dates provided */}
                            {mAWidth > 0 && (
                              <div 
                                className={`absolute top-1.5 h-4 rounded opacity-90 shadow-sm flex items-center px-1.5 ${mainProgress === 100 ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}`}
                                style={{ left: `${mAStart}%`, width: `${mAWidth}%` }}
                                title={`${lang === 'th' ? 'ผลจริง' : 'Actual'} ${main.taskName}: ${main.actualStartDate} - ${main.actualEndDate || 'Ongoing'}`}
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
                              <div className="w-[214px] flex-shrink-0 text-xs text-slate-600 font-medium truncate pr-3 flex items-center">
                                <CornerDownRight className="w-3 h-3 text-slate-400 mr-1 flex-shrink-0" />
                                <span className="text-[10px] text-slate-400 mr-1">{mainIdx + 1}.{subIdx + 1}</span>
                                <span title={sub.taskName} className="truncate">{sub.taskName}</span>
                              </div>
                              
                              <div className="flex-1 h-7 relative bg-slate-50/50 rounded border border-slate-100 overflow-hidden">
                                {/* Baseline Container Bar */}
                                {sWidth > 0 && (
                                  <div 
                                    className="absolute top-1 h-5 rounded bg-blue-100/90 border border-blue-400/80 overflow-hidden flex items-center"
                                    style={{ left: `${sStart}%`, width: `${sWidth}%` }}
                                    title={`${lang === 'th' ? 'แผนงาน' : 'Baseline'} ${sub.taskName}: ${format(subDates.start, 'dd/MM/yyyy')} - ${format(subDates.end, 'dd/MM/yyyy')}`}
                                  >
                                    {/* Inner Actual Progress Fill inside Baseline when no custom actual date bar */}
                                    {aWidth === 0 && (sub.progress || 0) > 0 && (
                                      <div 
                                        className={`h-full transition-all ${sub.progress === 100 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                                        style={{ width: `${sub.progress}%` }}
                                      />
                                    )}
                                    <span className="absolute left-1.5 text-[9px] font-bold text-slate-800 whitespace-nowrap z-10">
                                      {sub.progress}%
                                    </span>
                                  </div>
                                )}
                                
                                {/* Actual Dates Bar Overlay if custom actual dates provided */}
                                {aWidth > 0 && (
                                  <div 
                                    className={`absolute top-1.5 h-4 rounded opacity-90 shadow-xs flex items-center px-1 ${sub.progress === 100 ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}
                                    style={{ left: `${aStart}%`, width: `${aWidth}%` }}
                                    title={`${lang === 'th' ? 'ผลจริง' : 'Actual'} ${sub.taskName}: ${sub.actualStartDate} - ${sub.actualEndDate || 'Ongoing'}`}
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
                          <div className="flex items-center pl-4 py-1 bg-blue-50/60 rounded border border-blue-100 my-1 text-xs">
                            <div className="w-[214px] flex-shrink-0 flex items-center gap-1 pr-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="text-[10px] text-blue-600 font-bold">{mainIdx + 1}.{subScopes.length + 1}</span>
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={subTaskInputs[main.id] || ''}
                                onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [main.id]: e.target.value })}
                                placeholder={lang === 'th' ? 'กรอกชื่อขอบเขตงานย่อย แล้วกด Enter...' : 'Enter sub-task name...'}
                                className="flex-1 px-2.5 py-1 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSub(main.id)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddSub(main.id)}
                                className="px-3 py-1 bg-[#0061FF] text-white rounded text-xs font-semibold hover:bg-blue-700 flex-shrink-0"
                              >
                                {lang === 'th' ? 'เพิ่มงานย่อย' : 'Add Sub Task'}
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
    </div>
  );
}
