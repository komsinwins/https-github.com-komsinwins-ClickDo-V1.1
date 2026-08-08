import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical, CornerDownRight } from 'lucide-react';
import { ScopeOfWork as ScopeType } from '../../types';
import { SaveButton } from '../../components/SaveButton';

export function ScopeOfWork({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});
  const [showSubInput, setShowSubInput] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const lang = data.language || 'th';

  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const mainScopes = projectScopes.filter(s => !s.parentId);

  const [taskType, setTaskType] = useState<'main' | 'sub'>('main');
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const updateScopesAndSchedule = (newScopes: ScopeType[]) => {
    const projectNewScopes = newScopes.filter(s => s.projectId === projectId);
    const otherScheduleTasks = (data.scheduleTasks || []).filter(s => s.projectId !== projectId);

    updateData({
      scopes: newScopes,
      scheduleTasks: [...otherScheduleTasks, ...projectNewScopes]
    });
  };

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
      updateScopesAndSchedule([...data.scopes, subScope]);
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
      updateScopesAndSchedule([...data.scopes, newScope]);
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
    updateScopesAndSchedule([...data.scopes, newScope]);
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
    updateScopesAndSchedule([...data.scopes, subScope]);
    setSubTaskInputs({ ...subTaskInputs, [parentId]: '' });
    setShowSubInput({ ...showSubInput, [parentId]: false });
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    const updated = data.scopes.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    updateScopesAndSchedule(updated);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' : 'Are you sure you want to delete this item?')) return;
    // also delete sub-tasks if main task deleted
    const updated = data.scopes.filter(s => s.id !== id && s.parentId !== id);
    updateScopesAndSchedule(updated);
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
    
    updateScopesAndSchedule(updatedScopes);
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ขอบเขตงาน (Scope of Work)' : 'Scope of Work'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'กำหนดหัวข้อหลักและหัวข้อย่อยขอบเขตงาน' : 'Define main and sub topics for scope of work.'}</p>
        </div>
        <SaveButton successMessage={lang === 'th' ? 'บันทึกขอบเขตงานเรียบร้อยแล้ว' : 'Scope of work saved successfully'} />
      </div>

      {/* Add Main / Sub Topic Header */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as 'main' | 'sub')}
          className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-[#0061FF]"
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
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 max-w-[200px] truncate outline-none focus:ring-2 focus:ring-[#0061FF]"
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
              ? (lang === 'th' ? 'กรอกชื่อขอบเขตงานย่อย...' : 'Enter sub-topic name...')
              : (lang === 'th' ? 'กรอกชื่อขอบเขตงานหลัก...' : 'Enter main topic name...')
          }
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0061FF] focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
        />
        <button
          onClick={handleAddTask}
          className="px-4 py-2 bg-[#0061FF] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          {taskType === 'sub'
            ? (lang === 'th' ? 'เพิ่มขอบเขตงานย่อย' : 'Add Sub Topic')
            : (lang === 'th' ? 'เพิ่มขอบเขตงานหลัก' : 'Add Main Topic')}
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
        <table className="w-full text-left text-sm border-collapse min-w-[500px]">
          <thead className="bg-[#F8FAFC] text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-3 font-semibold w-10"></th>
              <th className="p-3 font-semibold w-16 text-center">{lang === 'th' ? 'ลำดับ' : 'No.'}</th>
              <th className="p-3 font-semibold">{lang === 'th' ? 'หัวข้อขอบเขตงาน (Scope of Work)' : 'Topic / Scope'}</th>
              <th className="p-3 font-semibold w-36 text-right">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mainScopes.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500 bg-slate-50">
                  {lang === 'th' ? 'ยังไม่มีการกำหนดขอบเขตงาน คลิกด้านบนเพื่อเริ่มเพิ่มขอบเขตงานหลัก' : 'No Scope of Work defined yet. Click above to add a main topic.'}
                </td>
              </tr>
            ) : (
              mainScopes.map((mainScope, mainIdx) => {
                const subScopes = projectScopes.filter(s => s.parentId === mainScope.id);

                return (
                  <React.Fragment key={mainScope.id}>
                    {/* Main Task Row */}
                    <tr 
                      draggable
                      onDragStart={(e) => handleDragStart(e, mainScope.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, mainScope.id)}
                      className={`hover:bg-slate-50 transition-colors bg-slate-50/60 font-medium ${draggedId === mainScope.id ? 'opacity-50' : ''}`}
                    >
                      <td className="p-3 cursor-grab active:cursor-grabbing text-slate-400">
                        <GripVertical className="w-4 h-4" />
                      </td>
                      <td className="p-3 text-center text-slate-900 font-bold">{mainIdx + 1}.</td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={mainScope.taskName}
                          onChange={(e) => handleUpdate(mainScope.id, 'taskName', e.target.value)}
                          className="w-full border-transparent border-b border-b-slate-300 focus:border-[#0061FF] focus:outline-none p-1 bg-transparent font-semibold text-slate-900"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setShowSubInput({ ...showSubInput, [mainScope.id]: !showSubInput[mainScope.id] })}
                            className="px-2 py-1 text-xs bg-blue-50 text-[#0061FF] hover:bg-blue-100 rounded font-semibold flex items-center gap-1 transition-colors"
                            title={lang === 'th' ? 'เพิ่มหัวข้อย่อย' : 'Add Sub-topic'}
                          >
                            <Plus className="w-3 h-3" />
                            {lang === 'th' ? 'หัวข้อย่อย' : 'Sub-topic'}
                          </button>
                          <button
                            onClick={() => handleDelete(mainScope.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title={lang === 'th' ? 'ลบ' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-Task Rows */}
                    {subScopes.map((subScope, subIdx) => (
                      <tr key={subScope.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                        <td className="p-3"></td>
                        <td className="p-3 text-center text-slate-500 text-xs pl-6">{mainIdx + 1}.{subIdx + 1}</td>
                        <td className="p-3 pl-8">
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <input
                              type="text"
                              value={subScope.taskName}
                              onChange={(e) => handleUpdate(subScope.id, 'taskName', e.target.value)}
                              className="w-full border-transparent border-b border-b-slate-200 hover:border-slate-300 focus:border-[#0061FF] focus:outline-none p-1 bg-transparent text-slate-700 text-xs"
                              placeholder={lang === 'th' ? 'ชื่อหัวข้อย่อย...' : 'Sub-topic name...'}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDelete(subScope.id)}
                            className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                            title={lang === 'th' ? 'ลบหัวข้อย่อย' : 'Delete Sub-topic'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Quick Add Sub-Topic Input Row */}
                    {showSubInput[mainScope.id] ? (
                      <tr className="bg-blue-50/30 border-t border-b border-blue-100">
                        <td className="p-2"></td>
                        <td className="p-2 text-center text-xs text-blue-500 font-semibold">{mainIdx + 1}.{subScopes.length + 1}</td>
                        <td className="p-2 pl-8">
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                            <input
                              type="text"
                              value={subTaskInputs[mainScope.id] || ''}
                              onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [mainScope.id]: e.target.value })}
                              placeholder={lang === 'th' ? 'พิมพ์ชื่อหัวข้อย่อย แล้วกด Enter หรือคลิกเพิ่ม...' : 'Type sub-topic name and hit Enter...'}
                              className="w-full px-3 py-1 text-xs border border-blue-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0061FF]"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSub(mainScope.id)}
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddSub(mainScope.id)}
                              className="px-3 py-1 bg-[#0061FF] text-white rounded text-xs font-medium hover:bg-blue-700 whitespace-nowrap"
                            >
                              {lang === 'th' ? 'เพิ่ม' : 'Add'}
                            </button>
                            <button
                              onClick={() => setShowSubInput({ ...showSubInput, [mainScope.id]: false })}
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
                        <td className="p-1.5 pl-6" colSpan={3}>
                          <button
                            onClick={() => setShowSubInput({ ...showSubInput, [mainScope.id]: true })}
                            className="text-xs text-[#0061FF] hover:text-blue-800 font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{lang === 'th' ? `เพิ่มงานย่อยใน ${mainScope.taskName}` : `Add sub-task to ${mainScope.taskName}`}</span>
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
      </div>
    </div>
  );
}
