import { useState } from 'react';
import { useAppStore, DEFAULT_WORKER_ROLES } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Download, Settings, Edit3, Check, X } from 'lucide-react';
import { Worker, Vehicle } from '../../types';
import { SaveButton } from '../../components/SaveButton';

export function WorkersVehicles({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);

  const workers = data.workers.filter(w => w.projectId === projectId);
  const vehicles = data.vehicles.filter(v => v.projectId === projectId);
  const workerRoles = data.workerRoles || DEFAULT_WORKER_ROLES;

  const [isManagingRoles, setIsManagingRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');

  const addWorker = () => {
    const newWorker: Worker = { id: uuidv4(), projectId, firstName: '', lastName: '', phone: '', role: '' };
    updateData({ workers: [...data.workers, newWorker] });
  };

  const updateWorker = (id: string, field: string, value: string) => {
    updateData({ workers: data.workers.map(w => w.id === id ? { ...w, [field]: value } : w) });
  };

  const deleteWorker = (id: string) => {
    updateData({ workers: data.workers.filter(w => w.id !== id) });
  };

  const addVehicle = () => {
    const newVehicle: Vehicle = { id: uuidv4(), projectId, type: '', licensePlate: '', model: '', brand: '', color: '' };
    updateData({ vehicles: [...data.vehicles, newVehicle] });
  };

  const updateVehicle = (id: string, field: string, value: string) => {
    updateData({ vehicles: data.vehicles.map(v => v.id === id ? { ...v, [field]: value } : v) });
  };

  const deleteVehicle = (id: string) => {
    updateData({ vehicles: data.vehicles.filter(v => v.id !== id) });
  };

  // Role Management Handlers
  const handleAddRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;

    if (workerRoles.some(r => r.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      alert(lang === 'th' ? 'มีชื่อหน้าที่นี้อยู่แล้ว' : 'Role already exists');
      return;
    }

    const newRole = { id: uuidv4(), name: trimmed };
    updateData({ workerRoles: [...workerRoles, newRole] });
    setNewRoleName('');
  };

  const handleStartEditRole = (id: string, currentName: string) => {
    setEditingRoleId(id);
    setEditingRoleName(currentName);
  };

  const handleSaveEditRole = (id: string) => {
    const trimmed = editingRoleName.trim();
    if (!trimmed) return;

    const oldRole = workerRoles.find(r => r.id === id);
    const updatedRoles = workerRoles.map(r => r.id === id ? { ...r, name: trimmed } : r);

    // Sync workers with the old role name to the new role name
    let updatedWorkers = data.workers;
    if (oldRole && oldRole.name !== trimmed) {
      updatedWorkers = data.workers.map(w => w.role === oldRole.name ? { ...w, role: trimmed } : w);
    }

    updateData({ workerRoles: updatedRoles, workers: updatedWorkers });
    setEditingRoleId(null);
    setEditingRoleName('');
  };

  const handleDeleteRole = (id: string) => {
    const roleToDelete = workerRoles.find(r => r.id === id);
    if (!roleToDelete) return;

    if (window.confirm(lang === 'th' ? `คุณแน่ใจหรือไม่ว่าต้องการลบหน้าที่ "${roleToDelete.name}"?` : `Are you sure you want to delete role "${roleToDelete.name}"?`)) {
      updateData({
        workerRoles: workerRoles.filter(r => r.id !== id)
      });
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 print:hidden">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ผู้ปฏิบัติงานและยานพาหนะ' : 'Workers & Vehicles'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'บันทึกรายชื่อผู้ปฏิบัติงานและทะเบียนยานพาหนะเข้าพื้นที่' : 'Log workers and vehicles entering site.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 flex items-center gap-2 font-medium transition-colors text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" />
            {lang === 'th' ? 'พิมพ์ / ส่งออก PDF' : 'Print / Export PDF'}
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกข้อมูลผู้ปฏิบัติงานและยานพาหนะเรียบร้อยแล้ว' : 'Workers & vehicles saved successfully'} />
        </div>
      </div>

      <div id="export-container" className="space-y-8 bg-white p-2">
        <div className="text-center mb-6 hidden print:block">
          <h2 className="text-2xl font-bold">{lang === 'th' ? 'บันทึกผู้ปฎิบัติงานและยานพาหนะ' : 'Workers & Vehicles Log'}</h2>
          <p className="text-slate-500">{lang === 'th' ? 'โครงการ:' : 'Project:'} {project?.name}</p>
        </div>

        {/* Workers Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-bold text-slate-800">{lang === 'th' ? 'รายชื่อผู้ปฎิบัติงาน' : 'Workers'}</h3>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={() => setIsManagingRoles(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                title={lang === 'th' ? 'เพิ่ม / ลบ / แก้ไข รายการหน้าที่' : 'Add / Delete / Edit Role Options'}
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'th' ? 'จัดการตัวเลือกหน้าที่' : 'Manage Roles'}</span>
              </button>
              <button onClick={addWorker} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-medium">{lang === 'th' ? 'ชื่อ' : 'First Name'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'หน้าที่ในโครงการ' : 'Project Role'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'เบอร์โทรศัพท์ (ไม่บังคับ)' : 'Phone (Optional)'}</th>
                <th className="p-3 font-medium text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลผู้ปฎิบัติงาน' : 'No workers added.'}</td></tr>
              ) : workers.map(w => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="p-2"><input type="text" value={w.firstName} onChange={e => updateWorker(w.id, 'firstName', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ชื่อ' : 'First Name'}/></td>
                  <td className="p-2"><input type="text" value={w.lastName} onChange={e => updateWorker(w.id, 'lastName', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'นามสกุล' : 'Last Name'}/></td>
                  <td className="p-2">
                    <select
                      value={w.role || ''}
                      onChange={e => {
                        if (e.target.value === '__manage__') {
                          setIsManagingRoles(true);
                        } else {
                          updateWorker(w.id, 'role', e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-transparent border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded cursor-pointer text-slate-800 font-medium text-xs sm:text-sm"
                    >
                      <option value="">{lang === 'th' ? '-- เลือกหน้าที่ในโครงการ --' : '-- Select Role --'}</option>
                      {workerRoles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                      {w.role && !workerRoles.some(r => r.name === w.role) && (
                        <option value={w.role}>{w.role} ({lang === 'th' ? 'กำหนดเอง' : 'Custom'})</option>
                      )}
                      <option value="__manage__" className="text-blue-600 font-bold">
                        ⚙️ {lang === 'th' ? '+ เพิ่ม / จัดการรายการหน้าที่...' : '+ Add / Manage Roles...'}
                      </option>
                    </select>
                  </td>
                  <td className="p-2"><input type="text" value={w.phone || ''} onChange={e => updateWorker(w.id, 'phone', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}/></td>
                  <td className="p-2 text-right">
                    <button onClick={() => deleteWorker(w.id)} className="p-2 text-red-500 hover:bg-red-50 rounded print:hidden"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vehicles Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">{lang === 'th' ? 'ยานพาหนะ' : 'Vehicles'}</h3>
            <button onClick={addVehicle} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg print:hidden">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="p-3 font-medium">{lang === 'th' ? 'ประเภท' : 'Type'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'ทะเบียนรถ & จังหวัด' : 'License Plate & Prov.'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'ยี่ห้อ' : 'Brand'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'รุ่น' : 'Model'}</th>
                <th className="p-3 font-medium">{lang === 'th' ? 'สี' : 'Color'}</th>
                <th className="p-3 font-medium text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">{lang === 'th' ? 'ไม่มีข้อมูลยานพาหนะ' : 'No vehicles added.'}</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-2"><input type="text" value={v.type} onChange={e => updateVehicle(v.id, 'type', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'กระบะ' : 'Pickup'}/></td>
                  <td className="p-2"><input type="text" value={v.licensePlate} onChange={e => updateVehicle(v.id, 'licensePlate', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? '1กข 1234 กทม' : '1กข 1234 BKK'}/></td>
                  <td className="p-2"><input type="text" value={v.brand} onChange={e => updateVehicle(v.id, 'brand', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'โตโยต้า' : 'Toyota'}/></td>
                  <td className="p-2"><input type="text" value={v.model} onChange={e => updateVehicle(v.id, 'model', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ไฮลักซ์' : 'Hilux'}/></td>
                  <td className="p-2"><input type="text" value={v.color} onChange={e => updateVehicle(v.id, 'color', e.target.value)} className="w-full p-2 bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 rounded" placeholder={lang === 'th' ? 'ขาว' : 'White'}/></td>
                  <td className="p-2 text-right">
                    <button onClick={() => deleteVehicle(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded print:hidden"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Management Modal */}
      {isManagingRoles && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-800 text-white p-4 px-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">{lang === 'th' ? 'จัดการรายการหน้าที่ในโครงการ' : 'Manage Project Worker Roles'}</h3>
              </div>
              <button
                onClick={() => {
                  setIsManagingRoles(false);
                  setEditingRoleId(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Add New Role Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {lang === 'th' ? 'เพิ่มตัวเลือกหน้าที่ใหม่' : 'Add New Role Option'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddRole()}
                    placeholder={lang === 'th' ? 'เช่น ช่างเชื่อม, ช่างไฟฟ้า, หัวหน้าทีม...' : 'e.g. Welder, Electrician...'}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'th' ? 'เพิ่ม' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Roles List */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  {lang === 'th' ? 'รายการหน้าที่ทั้งหมดในระบบ' : 'All Role Options in System'} ({workerRoles.length})
                </label>
                <div className="space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50 divide-y divide-slate-200/60 max-h-60 overflow-y-auto">
                  {workerRoles.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      {lang === 'th' ? 'ยังไม่มีรายการหน้าที่' : 'No roles defined yet.'}
                    </div>
                  ) : (
                    workerRoles.map(r => {
                      const isEditing = editingRoleId === r.id;

                      if (isEditing) {
                        return (
                          <div key={r.id} className="pt-2 first:pt-0 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingRoleName}
                              onChange={e => setEditingRoleName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEditRole(r.id)}
                              className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-xs font-semibold bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEditRole(r.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{lang === 'th' ? 'บันทึก' : 'Save'}</span>
                            </button>
                            <button
                              onClick={() => setEditingRoleId(null)}
                              className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div key={r.id} className="pt-2 first:pt-0 flex justify-between items-center px-2 py-1 hover:bg-white rounded-lg transition-colors">
                          <span className="text-xs font-semibold text-slate-800">{r.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEditRole(r.id, r.name)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg text-xs transition-colors"
                              title={lang === 'th' ? 'แก้ไข' : 'Edit'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs transition-colors"
                              title={lang === 'th' ? 'ลบ' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setIsManagingRoles(false);
                  setEditingRoleId(null);
                }}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
              >
                {lang === 'th' ? 'เสร็จสิ้น' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
