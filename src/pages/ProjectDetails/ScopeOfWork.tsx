import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, GripVertical, CornerDownRight, Layers, FileText, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { ScopeOfWork as ScopeType } from '../../types';
import { SaveButton } from '../../components/SaveButton';

const STANDARD_SCOPE_TEMPLATES = [
  {
    id: 'solar',
    titleTh: 'งานติดตั้งระบบ Solar Cell',
    titleEn: 'Solar Cell Installation',
    items: [
      { nameTh: 'สำรวจหน้างาน ประเมินโครงสร้าง และออกแบบระบบ', duration: 2 },
      { nameTh: 'จัดเตรียมอุปกรณ์ โครงสร้างจับยึด และแผงโซลาร์เซลล์', duration: 3 },
      { nameTh: 'ติดตั้งโครงสร้างและติดตั้งแผงโซลาร์เซลล์บนหลังคา', duration: 5 },
      { nameTh: 'เดินสายไฟระบบ AC/DC และติดตั้ง Inverter/ตู้ไฟ', duration: 4 },
      { nameTh: 'ทดสอบระบบการทำงาน เชื่อมต่อ Monitoring และตรวจสอบความปลอดภัย', duration: 2 },
      { nameTh: 'ส่งมอบงาน เอกสารรับประกัน และแนะนำการใช้งาน', duration: 1 },
    ]
  },
  {
    id: 'electrical',
    titleTh: 'งานระบบไฟฟ้าและสื่อสาร',
    titleEn: 'Electrical & Communication System',
    items: [
      { nameTh: 'สำรวจจุดติดตั้ง วางแนวท่อ และติดตั้งตู้ไฟหลัก (MDB)', duration: 3 },
      { nameTh: 'เดินท่อร้อยสายไฟ (Conduit) และสายเคเบิลไฟฟ้า/สื่อสาร', duration: 7 },
      { nameTh: 'ติดตั้งสวิตช์ ปลั๊กไฟ โคมไฟฟ้า และอุปกรณ์แสงสว่าง', duration: 4 },
      { nameTh: 'วัดค่าความต้านทานสายดิน และทดสอบระบบป้องกันไฟรั่ว/กระแสเกิน', duration: 2 },
      { nameTh: 'ตรวจรับงานระบบไฟฟ้าและจัดทำสเปกดิสตรีบิวชัน', duration: 1 },
    ]
  },
  {
    id: 'renovation',
    titleTh: 'งานปรับปรุงอาคารและตกแต่งภายใน',
    titleEn: 'Building Renovation & Interior',
    items: [
      { nameTh: 'รื้อถอนสิ่งปลูกสร้างเดิม เคลียร์พื้นที่ และขนย้ายเศษวัสดุ', duration: 3 },
      { nameTh: 'งานกั้นผนังเบา ผนังอิฐ และติดตั้งโครงฝ้าเพดาน', duration: 6 },
      { nameTh: 'งานระบบประปา สานสุขภัณฑ์ และระบบระบายน้ำ', duration: 4 },
      { nameTh: 'งานทำสีผนัง ฝ้าเพดาน และงานปูพื้น', duration: 5 },
      { nameTh: 'งานติดตั้งเฟอร์นิเจอร์ Built-in และตรวจรับงานงวดสุดท้าย', duration: 4 },
    ]
  }
];

export function ScopeOfWork({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const [newTask, setNewTask] = useState('');
  const [addingSubForId, setAddingSubForId] = useState<string | null>(null);
  const [newSubTaskName, setNewSubTaskName] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const lang = data.language || 'th';

  const projectScopes = data.scopes
    .filter(s => s.projectId === projectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const mainScopes = projectScopes.filter(s => !s.parentId);
  const subScopesCount = projectScopes.filter(s => !!s.parentId).length;

  const updateScopes = (newScopes: ScopeType[]) => {
    updateData({
      scopes: newScopes,
    });
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
    updateScopes([...data.scopes, newScope]);
    setNewTask('');
  };

  const handleConfirmAddSub = (parentId: string) => {
    if (!newSubTaskName.trim()) return;
    const newSub: ScopeType = {
      id: uuidv4(),
      projectId,
      parentId,
      taskName: newSubTaskName.trim(),
      order: projectScopes.length,
      durationDays: 1,
      progress: 0,
    };
    updateScopes([...data.scopes, newSub]);
    setAddingSubForId(null);
    setNewSubTaskName('');
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    const updated = data.scopes.map(s => {
      if (s.id !== id) return s;
      return { ...s, [field]: value };
    });

    updateScopes(updated);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' : 'Are you sure you want to delete this item?')) return;
    // also delete sub-tasks if main task deleted
    const updated = data.scopes.filter(s => s.id !== id && s.parentId !== id);
    updateScopes(updated);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const mainList = [...mainScopes];
    const idx = mainList.findIndex(s => s.id === id);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= mainList.length) return;

    const [moved] = mainList.splice(idx, 1);
    mainList.splice(targetIdx, 0, moved);

    const updatedScopes = data.scopes.map(s => {
      if (s.projectId === projectId) {
        const newOrder = mainList.findIndex(m => m.id === s.id);
        if (newOrder !== -1) {
          return { ...s, order: newOrder };
        }
      }
      return s;
    });

    updateScopes(updatedScopes);
  };

  const handleApplyTemplate = (templateId: string) => {
    const tmpl = STANDARD_SCOPE_TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;

    if (projectScopes.length > 0) {
      if (!window.confirm(lang === 'th' ? 'การเขียนทับจะเพิ่มรายการแม่แบบนี้เข้าไปในขอบเขตงาน ยืนยันหรือไม่?' : 'Append template items to scope of work?')) {
        return;
      }
    }

    const currentLength = projectScopes.length;
    const newItems: ScopeType[] = tmpl.items.map((item, index) => ({
      id: uuidv4(),
      projectId,
      taskName: item.nameTh,
      order: currentLength + index,
      durationDays: item.duration,
      progress: 0,
    }));

    updateScopes([...data.scopes, ...newItems]);
    setShowTemplateModal(false);
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
    
    updateScopes(updatedScopes);
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>{lang === 'th' ? 'ขอบเขตงาน (Scope of Work)' : 'Scope of Work'}</span>
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'th' ? 'กำหนดและแก้ไขรายการขอบเขตงานหลักและหัวข้อย่อยของโครงการ' : 'Define and manage main topics and sub-scopes of work.'}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'th' ? 'ชุดแม่แบบมาตรฐาน' : 'Scope Templates'}</span>
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกขอบเขตงานเรียบร้อยแล้ว' : 'Scope of work saved successfully'} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-0.5">{lang === 'th' ? 'รายการงานหลัก:' : 'Main Scope Topics:'}</span>
          <span className="text-base font-bold text-slate-800">{mainScopes.length} {lang === 'th' ? 'หัวข้อ' : 'topics'}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-slate-500 block mb-0.5">{lang === 'th' ? 'หัวข้อย่อยทั้งหมด:' : 'Total Sub-topics:'}</span>
          <span className="text-base font-bold text-slate-800">{subScopesCount} {lang === 'th' ? 'หัวข้อ' : 'items'}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-slate-500 block mb-0.5">{lang === 'th' ? 'รวมขอบเขตงานทั้งหมด:' : 'Total Scope Items:'}</span>
          <span className="text-base font-bold text-blue-700">{mainScopes.length + subScopesCount} {lang === 'th' ? 'รายการ' : 'items'}</span>
        </div>
      </div>

      {/* Add Main Scope Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {lang === 'th' ? '+ เพิ่มหัวข้อขอบเขตงานหลักใหม่' : '+ Add New Main Scope Item'}
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={lang === 'th' ? 'ระบุชื่อหัวข้อขอบเขตงาน เช่น งานติดตั้งระบบไฟฟ้า, งานรื้อถอน...' : 'Enter scope title...'}
            className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddMain()}
          />
          <button
            onClick={handleAddMain}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? 'เพิ่มขอบเขตงาน' : 'Add Scope Item'}</span>
          </button>
        </div>
      </div>

      {/* Scope Table */}
      <div className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[500px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center"></th>
                <th className="p-3 w-14 text-center">{lang === 'th' ? 'ลำดับ' : 'No.'}</th>
                <th className="p-3 font-semibold">{lang === 'th' ? 'รายการขอบเขตงาน (Scope of Work Item)' : 'Scope Topic / Description'}</th>
                <th className="p-3 w-36 text-right print:hidden">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mainScopes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-400 bg-slate-50/50">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">{lang === 'th' ? 'ยังไม่ได้กำหนดขอบเขตงานในโครงการนี้' : 'No Scope of Work defined yet.'}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{lang === 'th' ? 'พิมพ์หัวข้อด้านบน หรือเลือกจาก "ชุดแม่แบบมาตรฐาน"' : 'Enter topic above or select from templates.'}</p>
                  </td>
                </tr>
              ) : (
                mainScopes.map((mainScope, mainIdx) => {
                  const subScopes = projectScopes.filter(s => s.parentId === mainScope.id);
                  const isAddingSub = addingSubForId === mainScope.id;

                  return (
                    <React.Fragment key={mainScope.id}>
                      {/* Main Scope Row */}
                      <tr 
                        draggable
                        onDragStart={(e) => handleDragStart(e, mainScope.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, mainScope.id)}
                        className={`hover:bg-slate-50/80 transition-colors bg-white font-medium ${draggedId === mainScope.id ? 'opacity-40 bg-blue-50' : ''}`}
                      >
                        <td className="p-3 cursor-grab active:cursor-grabbing text-slate-400 text-center">
                          <GripVertical className="w-4 h-4 mx-auto hover:text-slate-600" />
                        </td>
                        <td className="p-3 text-center text-slate-900 font-bold text-xs">
                          {mainIdx + 1}.
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                              {lang === 'th' ? 'หลัก' : 'Main'}
                            </span>
                            <input
                              type="text"
                              value={mainScope.taskName}
                              onChange={(e) => handleUpdate(mainScope.id, 'taskName', e.target.value)}
                              placeholder={lang === 'th' ? 'ชื่อขอบเขตงานหลัก...' : 'Main scope title...'}
                              className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-blue-50/30 focus:outline-none px-1 py-0.5 font-bold text-slate-800 text-xs sm:text-sm rounded transition-colors"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right print:hidden">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                if (isAddingSub) {
                                  setAddingSubForId(null);
                                } else {
                                  setAddingSubForId(mainScope.id);
                                  setNewSubTaskName('');
                                }
                              }}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                              title={lang === 'th' ? 'เพิ่มหัวข้อย่อย' : 'Add sub-topic'}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{lang === 'th' ? '+ ย่อย' : '+ Sub'}</span>
                            </button>
                            <button
                              onClick={() => handleMove(mainScope.id, 'up')}
                              disabled={mainIdx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30"
                              title={lang === 'th' ? 'ย้ายขึ้น' : 'Move Up'}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMove(mainScope.id, 'down')}
                              disabled={mainIdx === mainScopes.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30"
                              title={lang === 'th' ? 'ย้ายลง' : 'Move Down'}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(mainScope.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={lang === 'th' ? 'ลบรายการ' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Sub-Task Rows */}
                      {subScopes.map((subScope, subIdx) => (
                        <tr key={subScope.id} className="hover:bg-slate-50 transition-colors bg-slate-50/40">
                          <td className="p-2"></td>
                          <td className="p-2 text-center text-slate-500 font-semibold text-[11px] pl-4">
                            {mainIdx + 1}.{subIdx + 1}
                          </td>
                          <td className="p-2 pl-6">
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="px-1.5 py-0.2 text-[9px] rounded bg-slate-200 text-slate-700 font-bold shrink-0">
                                {lang === 'th' ? 'ย่อย' : 'Sub'}
                              </span>
                              <input
                                type="text"
                                value={subScope.taskName}
                                onChange={(e) => handleUpdate(subScope.id, 'taskName', e.target.value)}
                                className="w-full border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none px-1 py-0.5 text-xs text-slate-800 rounded transition-colors"
                                placeholder={lang === 'th' ? 'ชื่อหัวข้อย่อย...' : 'Sub-topic title...'}
                              />
                            </div>
                          </td>
                          <td className="p-2 text-right print:hidden">
                            <button
                              onClick={() => handleDelete(subScope.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={lang === 'th' ? 'ลบหัวข้อย่อย' : 'Delete sub-task'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      {/* Inline Add Sub-Task Form */}
                      {isAddingSub && (
                        <tr className="bg-blue-50/60 border-t border-b border-blue-200">
                          <td className="p-2"></td>
                          <td className="p-2 text-center font-bold text-blue-600 text-xs">
                            {mainIdx + 1}.{subScopes.length + 1}
                          </td>
                          <td className="p-2 pl-6">
                            <div className="flex items-center gap-2">
                              <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <input
                                type="text"
                                value={newSubTaskName}
                                onChange={(e) => setNewSubTaskName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddSub(mainScope.id)}
                                placeholder={lang === 'th' ? 'พิมพ์ชื่อหัวข้อย่อยใหม่...' : 'Enter new sub-topic title...'}
                                className="w-full px-2.5 py-1 text-xs border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleConfirmAddSub(mainScope.id)}
                                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                              >
                                {lang === 'th' ? 'เพิ่ม' : 'Add'}
                              </button>
                              <button
                                onClick={() => {
                                  setAddingSubForId(null);
                                  setNewSubTaskName('');
                                }}
                                className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300"
                              >
                                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                              </button>
                            </div>
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

      {/* Scope Templates Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-800 text-white p-4 px-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">{lang === 'th' ? 'เลือกชุดขอบเขตงานมาตรฐาน (Scope Templates)' : 'Select Scope Template'}</h3>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-500">
                {lang === 'th' 
                  ? 'เลือกชุดขอบเขตงานมาตรฐานเพื่อนำมาลงในโครงการของคุณโดยอัตโนมัติ คุณสามารถแก้ไขหรือลบหัวข้อทีหลังได้ตามต้องการ'
                  : 'Select a standard scope template to populate items into your project. You can edit or remove items anytime.'}
              </p>

              <div className="space-y-4">
                {STANDARD_SCOPE_TEMPLATES.map((tmpl) => (
                  <div key={tmpl.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-blue-50/30 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-slate-800 text-sm">{tmpl.titleTh}</h4>
                      <button
                        onClick={() => handleApplyTemplate(tmpl.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs"
                      >
                        {lang === 'th' ? 'เลือกชุดนี้' : 'Use Template'}
                      </button>
                    </div>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-slate-600">
                      {tmpl.items.map((it, idx) => (
                        <li key={idx}>
                          <span>{it.nameTh}</span>
                          <span className="text-slate-400 text-[11px] ml-1.5">({it.duration} {lang === 'th' ? 'วัน' : 'days'})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors"
              >
                {lang === 'th' ? 'ปิด' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

