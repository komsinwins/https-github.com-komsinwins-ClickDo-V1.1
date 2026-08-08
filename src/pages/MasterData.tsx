import { useState } from 'react';
import { useAppStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';

import { SaveButton } from '../components/SaveButton';

export function MasterData() {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [activeTab, setActiveTab] = useState<'customers' | 'owners' | 'salespersons' | 'projectManagers' | 'contractorMaster' | 'projectStatuses' | 'contactRoles' | 'workerRoles'>('customers');
  const [newItemName, setNewItemName] = useState('');
  const [statusColor, setStatusColor] = useState('#0061FF');
  const [contractorForm, setContractorForm] = useState({
    company: '',
    firstName: '',
    lastName: '',
    phone: '',
    note: ''
  });

  const [newLocation, setNewLocation] = useState<Record<string, string>>({});

  // Editing state for main items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Editing state for owner installation locations
  const [editingLocation, setEditingLocation] = useState<{ ownerId: string; index: number; text: string } | null>(null);

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    if (activeTab === 'contractorMaster') {
      if (!editForm.firstName?.trim() || !editForm.lastName?.trim()) {
        alert(lang === 'th' ? 'กรุณากรอกชื่อและนามสกุล' : 'First and Last name are required');
        return;
      }
    } else if (activeTab === 'projectStatuses') {
      if (!editForm.name?.trim()) {
        alert(lang === 'th' ? 'กรุณากรอกชื่อสถานะ' : 'Status name is required');
        return;
      }
    } else {
      if (!editForm.name?.trim()) {
        alert(lang === 'th' ? 'กรุณากรอกชื่อ' : 'Name is required');
        return;
      }
    }

    const list = data[activeTab] || [];
    const oldItem = list.find((item: any) => item.id === editingId);
    const updatedList = list.map((item: any) =>
      item.id === editingId ? { ...item, ...editForm } : item
    );

    const updates: any = { [activeTab]: updatedList };

    if (activeTab === 'contactRoles' && oldItem && 'name' in oldItem && (oldItem as any).name !== editForm.name) {
      const updatedContacts = (data.contacts || []).map((c: any) =>
        c.role === (oldItem as any).name ? { ...c, role: editForm.name.trim() } : c
      );
      updates.contacts = updatedContacts;
    }

    if (activeTab === 'workerRoles' && oldItem && 'name' in oldItem && (oldItem as any).name !== editForm.name) {
      const updatedWorkers = (data.workers || []).map((w: any) =>
        w.role === (oldItem as any).name ? { ...w, role: editForm.name.trim() } : w
      );
      updates.workers = updatedWorkers;
    }

    updateData(updates);
    setEditingId(null);
    setEditForm({});
  };

  const handleStartEditLocation = (ownerId: string, index: number, currentText: string) => {
    setEditingLocation({ ownerId, index, text: currentText });
  };

  const handleSaveEditLocation = () => {
    if (!editingLocation) return;
    const { ownerId, index, text } = editingLocation;
    if (!text.trim()) return;

    const owners = data.owners.map(o => {
      if (o.id === ownerId) {
        const locs = [...(o.installationLocations || [])];
        locs[index] = text.trim();
        return { ...o, installationLocations: locs };
      }
      return o;
    });

    updateData({ owners });
    setEditingLocation(null);
  };

  const handleAddLocation = (ownerId: string) => {
    const loc = newLocation[ownerId]?.trim();
    if (!loc) return;
    
    const owner = data.owners.find(o => o.id === ownerId);
    if (owner?.installationLocations?.some(l => l.trim().toLowerCase() === loc.toLowerCase())) {
      alert(lang === 'th' ? 'มีสถานที่นี้อยู่แล้ว ไม่สามารถเพิ่มข้อมูลซ้ำได้' : 'Duplicate location. Cannot add duplicate data.');
      return;
    }

    const owners = data.owners.map(o => {
      if (o.id === ownerId) {
        return { ...o, installationLocations: [...(o.installationLocations || []), loc] };
      }
      return o;
    });
    updateData({ owners });
    setNewLocation({ ...newLocation, [ownerId]: '' });
  };

  const handleRemoveLocation = (ownerId: string, index: number) => {
    if (window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบสถานที่นี้?' : 'Are you sure you want to delete this location?')) {
      const owners = data.owners.map(o => {
        if (o.id === ownerId) {
           const newLocs = [...(o.installationLocations || [])];
           newLocs.splice(index, 1);
           return { ...o, installationLocations: newLocs };
        }
        return o;
      });
      updateData({ owners });
    }
  };

  const handleAdd = () => {
    if (activeTab === 'contractorMaster') {
      if (!contractorForm.firstName.trim() || !contractorForm.lastName.trim()) return;
      
      const isDuplicate = (data.contractorMaster || []).some(
        (c: any) => c.firstName.trim().toLowerCase() === contractorForm.firstName.trim().toLowerCase() && 
                    c.lastName.trim().toLowerCase() === contractorForm.lastName.trim().toLowerCase()
      );
      if (isDuplicate) {
        alert(lang === 'th' ? 'มีชื่อและนามสกุลนี้อยู่แล้ว ไม่สามารถเพิ่มข้อมูลซ้ำได้' : 'Duplicate name. Cannot add duplicate data.');
        return;
      }

      const newItem = { id: uuidv4(), ...contractorForm };
      updateData({
        contractorMaster: [...(data.contractorMaster || []), newItem]
      });
      setContractorForm({ company: '', firstName: '', lastName: '', phone: '', note: '' });
      return;
    }

    if (!newItemName.trim()) return;
    
    const isDuplicate = (data[activeTab] || []).some(
      (item: any) => item.name.trim().toLowerCase() === newItemName.trim().toLowerCase()
    );
    if (isDuplicate) {
      alert(lang === 'th' ? 'มีชื่อนี้อยู่แล้ว ไม่สามารถเพิ่มข้อมูลซ้ำได้' : 'Duplicate name. Cannot add duplicate data.');
      return;
    }

    const newItem = activeTab === 'projectStatuses' 
      ? { id: uuidv4(), name: newItemName, color: statusColor }
      : { id: uuidv4(), name: newItemName };
      
    updateData({
      [activeTab]: [...data[activeTab], newItem]
    });
    setNewItemName('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' : 'Are you sure you want to delete this item?')) {
      const arr = data[activeTab] || [];
      updateData({
        [activeTab]: arr.filter((item: any) => item.id !== id)
      });
    }
  };

  const tabs = [
    { id: 'customers', label: lang === 'th' ? 'ลูกค้า' : 'Customers' },
    { id: 'owners', label: lang === 'th' ? 'เจ้าของโครงการ' : 'Owners' },
    { id: 'salespersons', label: lang === 'th' ? 'พนักงานขาย' : 'Salespersons' },
    { id: 'projectManagers', label: lang === 'th' ? 'ผู้จัดการโครงการ' : 'Project Managers' },
    { id: 'contractorMaster', label: lang === 'th' ? 'ผู้รับเหมา' : 'Contractors' },
    { id: 'projectStatuses', label: lang === 'th' ? 'สถานะโครงการ' : 'Project Statuses' },
    { id: 'contactRoles', label: lang === 'th' ? 'บทบาทผู้ติดต่อ' : 'Contact Roles' },
    { id: 'workerRoles', label: lang === 'th' ? 'หน้าที่ผู้ปฏิบัติงาน' : 'Worker Roles' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{lang === 'th' ? 'ข้อมูลหลัก' : 'Master Data'}</h2>
          <p className="text-slate-500 mt-1">{lang === 'th' ? 'จัดการข้อมูลอ้างอิงสำหรับโครงการของคุณ' : 'Manage reference data for your projects.'}</p>
        </div>
        <SaveButton successMessage={lang === 'th' ? 'บันทึกข้อมูลหลักเรียบร้อยแล้ว' : 'Master data saved successfully'} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 text-sm font-medium text-center transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="p-6">
          {activeTab === 'contractorMaster' ? (
            <div className="mb-6 space-y-4">
              {/* ... existing contractor form ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={contractorForm.company}
                  onChange={(e) => setContractorForm({ ...contractorForm, company: e.target.value })}
                  placeholder={lang === 'th' ? 'บริษัท (ถ้ามี)...' : 'Company (Optional)...'}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={contractorForm.phone}
                  onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })}
                  placeholder={lang === 'th' ? 'เบอร์โทรติดต่อ...' : 'Phone Number...'}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={contractorForm.firstName}
                  onChange={(e) => setContractorForm({ ...contractorForm, firstName: e.target.value })}
                  placeholder={lang === 'th' ? 'ชื่อ *' : 'First Name *'}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={contractorForm.lastName}
                  onChange={(e) => setContractorForm({ ...contractorForm, lastName: e.target.value })}
                  placeholder={lang === 'th' ? 'นามสกุล *' : 'Last Name *'}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={contractorForm.note}
                  onChange={(e) => setContractorForm({ ...contractorForm, note: e.target.value })}
                  placeholder={lang === 'th' ? 'หมายเหตุ...' : 'Note / Remarks...'}
                  className="md:col-span-2 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAdd}
                  disabled={!contractorForm.firstName || !contractorForm.lastName}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'th' ? 'เพิ่ม' : 'Add'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={lang === 'th' ? `ป้อนชื่อ${tabs.find(t => t.id === activeTab)?.label}ใหม่...` : `Enter new ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()} name...`}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              {activeTab === 'projectStatuses' && (
                <input
                  type="color"
                  value={statusColor}
                  onChange={(e) => setStatusColor(e.target.value)}
                  className="w-12 h-[42px] p-1 border border-slate-300 rounded-lg cursor-pointer"
                  title={lang === 'th' ? 'เลือกสีสถานะ' : 'Select status color'}
                />
              )}
              <button
                onClick={handleAdd}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                {lang === 'th' ? 'เพิ่ม' : 'Add'}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {(!data[activeTab] || data[activeTab].length === 0) ? (
              <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {lang === 'th' ? 'ไม่พบข้อมูล กรุณาเพิ่มข้อมูลด้านบน' : 'No items found. Add one above.'}
              </div>
            ) : (
              data[activeTab].map((item: any) => {
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <div key={item.id} className="p-4 bg-blue-50/70 rounded-xl border-2 border-blue-400 shadow-sm transition-all">
                      <div className="flex justify-between items-center border-b border-blue-200 pb-2.5 mb-3">
                        <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                          {lang === 'th' ? 'แก้ไขข้อมูล' : 'Edit Item'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleSaveEdit}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'บันทึก' : 'Save'}</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{lang === 'th' ? 'ยกเลิก' : 'Cancel'}</span>
                          </button>
                        </div>
                      </div>

                      {activeTab === 'contractorMaster' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'ชื่อ' : 'First Name'} *</label>
                            <input
                              type="text"
                              value={editForm.firstName || ''}
                              onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'นามสกุล' : 'Last Name'} *</label>
                            <input
                              type="text"
                              value={editForm.lastName || ''}
                              onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'บริษัท' : 'Company'}</label>
                            <input
                              type="text"
                              value={editForm.company || ''}
                              onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'เบอร์โทร' : 'Phone'}</label>
                            <input
                              type="text"
                              value={editForm.phone || ''}
                              onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'หมายเหตุ' : 'Note'}</label>
                            <input
                              type="text"
                              value={editForm.note || ''}
                              onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs"
                            />
                          </div>
                        </div>
                      ) : activeTab === 'projectStatuses' ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={editForm.color || '#0061FF'}
                            onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                            className="w-10 h-9 p-1 border border-slate-300 rounded cursor-pointer shrink-0"
                            title={lang === 'th' ? 'เลือกสีสถานะ' : 'Select color'}
                          />
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-medium"
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 mb-0.5 block">{lang === 'th' ? 'ชื่อรายการ' : 'Item Name'}</label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-medium"
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-blue-300 transition-all">
                    <div className="flex justify-between items-center gap-3">
                      {activeTab === 'contractorMaster' ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-sm">
                            {item.firstName} {item.lastName}
                          </span>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {item.company && <span>{lang === 'th' ? 'บริษัท:' : 'Company:'} <strong className="text-slate-700">{item.company}</strong></span>}
                            {item.phone && <span>{lang === 'th' ? 'โทร:' : 'Tel:'} <strong className="text-slate-700">{item.phone}</strong></span>}
                          </div>
                          {item.note && <div className="text-xs text-slate-400 mt-1 italic">{item.note}</div>}
                        </div>
                      ) : activeTab === 'projectStatuses' ? (
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-xs shrink-0" 
                            style={{ backgroundColor: item.color || '#0061FF' }}
                          />
                          <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="px-2.5 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          title={lang === 'th' ? 'แก้ไขข้อมูล' : 'Edit item'}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'แก้ไข' : 'Edit'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title={lang === 'th' ? 'ลบ' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {activeTab === 'owners' && (
                      <div className="mt-4 pt-4 border-t border-slate-200 pl-1">
                        <p className="text-xs font-bold text-slate-600 mb-2.5 uppercase tracking-wider">{lang === 'th' ? 'สถานที่ติดตั้งที่ลงทะเบียน' : 'Registered Installation Locations'}</p>
                        <div className="space-y-2 mb-3">
                          {(item.installationLocations || []).map((loc: string, idx: number) => {
                            const isEditingThisLoc = editingLocation?.ownerId === item.id && editingLocation?.index === idx;

                            if (isEditingThisLoc) {
                              return (
                                <div key={idx} className="flex gap-2 items-center p-1.5 bg-blue-50 rounded-lg border border-blue-300">
                                  <input
                                    type="text"
                                    value={editingLocation.text}
                                    onChange={e => setEditingLocation({ ...editingLocation, text: e.target.value })}
                                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded bg-white font-medium focus:ring-1 focus:ring-blue-500"
                                    onKeyDown={e => e.key === 'Enter' && handleSaveEditLocation()}
                                  />
                                  <button
                                    onClick={handleSaveEditLocation}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{lang === 'th' ? 'บันทึก' : 'Save'}</span>
                                  </button>
                                  <button
                                    onClick={() => setEditingLocation(null)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                <span className="text-slate-700 font-medium">{loc}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEditLocation(item.id, idx, loc)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                    title={lang === 'th' ? 'แก้ไขสถานที่' : 'Edit Location'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveLocation(item.id, idx)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    title={lang === 'th' ? 'ลบสถานที่' : 'Delete Location'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newLocation[item.id] || ''}
                            onChange={(e) => setNewLocation({ ...newLocation, [item.id]: e.target.value })}
                            placeholder={lang === 'th' ? 'เพิ่มสถานที่ติดตั้งใหม่...' : 'Add new installation location...'}
                            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation(item.id)}
                          />
                          <button
                            onClick={() => handleAddLocation(item.id)}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-xs font-medium transition-colors"
                          >
                            {lang === 'th' ? 'เพิ่ม' : 'Add'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
