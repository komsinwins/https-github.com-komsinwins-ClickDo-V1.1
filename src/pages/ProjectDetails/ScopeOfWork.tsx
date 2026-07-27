import { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';
import { ScopeOfWork as ScopeType } from '../../types';

export function ScopeOfWork({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const lang = data.language || 'th';

  const projectScopes = data.scopes.filter(s => s.projectId === projectId);

  const handleAdd = () => {
    if (!newTask.trim()) return;
    const newScope: ScopeType = {
      id: uuidv4(),
      projectId,
      taskName: newTask,
      baselineStartDate: '',
      baselineEndDate: '',
      actualStartDate: '',
      actualEndDate: '',
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

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={lang === 'th' ? 'กรอกชื่องาน...' : 'Enter task name...'}
          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF]"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="px-4 py-1.5 bg-[#0061FF] text-white rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {lang === 'th' ? 'เพิ่มงาน' : 'Add Task'}
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
          <thead className="bg-[#F1F5F9] text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-2 font-semibold w-[25%]">{lang === 'th' ? 'ชื่องาน' : 'Task Name'}</th>
              <th className="p-2 font-semibold">{lang === 'th' ? 'วันที่เริ่ม (แผน)' : 'Baseline Start'}</th>
              <th className="p-2 font-semibold">{lang === 'th' ? 'วันที่สิ้นสุด (แผน)' : 'Baseline End'}</th>
              <th className="p-2 font-semibold">{lang === 'th' ? 'วันที่เริ่ม (จริง)' : 'Actual Start'}</th>
              <th className="p-2 font-semibold">{lang === 'th' ? 'วันที่สิ้นสุด (จริง)' : 'Actual End'}</th>
              <th className="p-2 font-semibold">{lang === 'th' ? '% ความคืบหน้า' : '% Progress'}</th>
              <th className="p-2 font-semibold text-right">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectScopes.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  {lang === 'th' ? 'ยังไม่มีการกำหนดขอบเขตงาน' : 'No Scope of Work defined yet.'}
                </td>
              </tr>
            ) : (
              projectScopes.map(scope => (
                <tr key={scope.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2">
                    <input
                      type="text"
                      value={scope.taskName}
                      onChange={(e) => handleUpdate(scope.id, 'taskName', e.target.value)}
                      className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={scope.baselineStartDate}
                      onChange={(e) => handleUpdate(scope.id, 'baselineStartDate', e.target.value)}
                      className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={scope.baselineEndDate}
                      onChange={(e) => handleUpdate(scope.id, 'baselineEndDate', e.target.value)}
                      className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={scope.actualStartDate || ''}
                      onChange={(e) => handleUpdate(scope.id, 'actualStartDate', e.target.value)}
                      className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      value={scope.actualEndDate || ''}
                      onChange={(e) => handleUpdate(scope.id, 'actualEndDate', e.target.value)}
                      className="w-full border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={scope.progress}
                        onChange={(e) => handleUpdate(scope.id, 'progress', parseInt(e.target.value) || 0)}
                        className="w-16 border border-slate-200 rounded focus:border-[#0061FF] focus:outline-none p-1.5 text-xs bg-white text-right"
                      />
                      <span className="text-slate-500">%</span>
                    </div>
                  </td>
                  <td className="p-2 text-right">
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
