import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { ScopeOfWork as ScopeType } from '../../types';

export function ScopeOfWork({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const lang = data.language || 'th';

  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleAdd = () => {
    if (!newTask.trim()) return;
    const newScope: ScopeType = {
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

  const handleUpdate = (id: string, field: string, value: any) => {
    updateData({
      scopes: data.scopes.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    });
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

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={lang === 'th' ? 'กรอกชื่องาน / หัวข้อ...' : 'Enter task/topic name...'}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF]"
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

      <div className="overflow-x-auto border border-slate-200 rounded bg-white">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#F1F5F9] text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-3 font-semibold w-10"></th>
              <th className="p-3 font-semibold">{lang === 'th' ? 'หัวข้องาน (Scope of Work)' : 'Topic / Scope'}</th>
              <th className="p-3 font-semibold w-24 text-right">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectScopes.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500 bg-slate-50">
                  {lang === 'th' ? 'ยังไม่มีการกำหนดขอบเขตงาน' : 'No Scope of Work defined yet.'}
                </td>
              </tr>
            ) : (
              projectScopes.map((scope, index) => (
                <tr 
                  key={scope.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, scope.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, scope.id)}
                  className={`hover:bg-slate-50 transition-colors ${draggedId === scope.id ? 'opacity-50' : ''}`}
                >
                  <td className="p-3 cursor-grab active:cursor-grabbing text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={scope.taskName}
                      onChange={(e) => handleUpdate(scope.id, 'taskName', e.target.value)}
                      className="w-full border-transparent border-b border-b-slate-200 hover:border-slate-300 focus:border-[#0061FF] focus:outline-none p-1.5 bg-transparent"
                    />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(scope.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title={lang === 'th' ? 'ลบ' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

