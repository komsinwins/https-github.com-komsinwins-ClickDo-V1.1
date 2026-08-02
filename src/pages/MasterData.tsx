import { useState } from 'react';
import { useAppStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';

export function MasterData() {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [activeTab, setActiveTab] = useState<'customers' | 'owners' | 'salespersons' | 'projectManagers' | 'contractorMaster' | 'projectStatuses'>('customers');
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

  const handleAddLocation = (ownerId: string) => {
    const loc = newLocation[ownerId]?.trim();
    if (!loc) return;
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
      const newItem = { id: uuidv4(), ...contractorForm };
      updateData({
        contractorMaster: [...(data.contractorMaster || []), newItem]
      });
      setContractorForm({ company: '', firstName: '', lastName: '', phone: '', note: '' });
      return;
    }

    if (!newItemName.trim()) return;
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
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">{lang === 'th' ? 'ข้อมูลหลัก' : 'Master Data'}</h2>
          <p className="text-slate-500 mt-1">{lang === 'th' ? 'จัดการข้อมูลอ้างอิงสำหรับโครงการของคุณ' : 'Manage reference data for your projects.'}</p>
        </div>
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
              data[activeTab].map((item: any) => (
                <div key={item.id} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    {activeTab === 'contractorMaster' ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {item.firstName} {item.lastName}
                        </span>
                        <div className="text-sm text-slate-500 flex gap-4 mt-1">
                          {item.company && <span>{lang === 'th' ? 'บริษัท:' : 'Company:'} {item.company}</span>}
                          {item.phone && <span>{lang === 'th' ? 'โทร:' : 'Tel:'} {item.phone}</span>}
                        </div>
                        {item.note && <div className="text-xs text-slate-400 mt-1">{item.note}</div>}
                      </div>
                    ) : activeTab === 'projectStatuses' ? (
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border border-slate-200" 
                          style={{ backgroundColor: item.color || '#0061FF' }}
                        />
                        <span className="font-medium text-slate-700">{item.name}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-700">{item.name}</span>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title={lang === 'th' ? 'ลบ' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {activeTab === 'owners' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 pl-2">
                      <p className="text-sm font-semibold text-slate-600 mb-3">{lang === 'th' ? 'สถานที่ติดตั้งที่ลงทะเบียน' : 'Registered Installation Locations'}</p>
                      <div className="space-y-2 mb-3">
                        {(item.installationLocations || []).map((loc: string, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-slate-200 text-sm">
                            <span className="text-slate-700">{loc}</span>
                            <button 
                              onClick={() => handleRemoveLocation(item.id, idx)}
                              className="text-red-500 hover:text-red-700"
                              title={lang === 'th' ? 'ลบสถานที่' : 'Delete Location'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newLocation[item.id] || ''}
                          onChange={(e) => setNewLocation({ ...newLocation, [item.id]: e.target.value })}
                          placeholder={lang === 'th' ? 'เพิ่มสถานที่ติดตั้งใหม่...' : 'Add new installation location...'}
                          className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddLocation(item.id)}
                        />
                        <button
                          onClick={() => handleAddLocation(item.id)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded text-sm font-medium transition-colors"
                        >
                          {lang === 'th' ? 'เพิ่ม' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
