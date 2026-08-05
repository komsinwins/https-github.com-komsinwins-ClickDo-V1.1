import { useState } from 'react';
import { useAppStore, DEFAULT_CONTACT_ROLES } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit3, Check, X, ShieldCheck, UserCheck } from 'lucide-react';
import { Contact, ContactRole } from '../../types';
import { SaveButton } from '../../components/SaveButton';

export function Contacts({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const contacts = data.contacts.filter(c => c.projectId === projectId);
  
  const roles: ContactRole[] = (data.contactRoles && data.contactRoles.length > 0) 
    ? data.contactRoles 
    : DEFAULT_CONTACT_ROLES;

  // Role Management Modal States
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [newRoleInput, setNewRoleInput] = useState<string>('');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState<string>('');

  const addContact = () => {
    const defaultRole = roles[0]?.name || 'Site Engineer';
    const newContact: Contact = { 
      id: uuidv4(), 
      projectId, 
      firstName: '', 
      lastName: '', 
      role: defaultRole, 
      phone: '', 
      email: '', 
      lineId: '' 
    };
    updateData({ contacts: [...data.contacts, newContact] });
  };

  const updateContact = (id: string, field: string, value: string) => {
    updateData({ contacts: data.contacts.map(c => c.id === id ? { ...c, [field]: value } : c) });
  };

  const deleteContact = (id: string) => {
    if (window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ติดต่อนี้?' : 'Are you sure you want to delete this contact?')) {
      updateData({ contacts: data.contacts.filter(c => c.id !== id) });
    }
  };

  const handleRoleSelectChange = (contactId: string, value: string) => {
    if (value === '__MANAGE_ROLES__') {
      setShowRoleModal(true);
      return;
    }
    updateContact(contactId, 'role', value);
  };

  // Role Management Functions
  const handleAddRole = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;

    if (roles.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(lang === 'th' ? 'บทบาทนี้มีอยู่แล้วในระบบ' : 'Role already exists.');
      return;
    }

    const newRoleObj: ContactRole = { id: uuidv4(), name: trimmed };
    const updatedRoles = [...roles, newRoleObj];
    updateData({ contactRoles: updatedRoles });
    setNewRoleInput('');
  };

  const handleStartEditRole = (role: ContactRole) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
  };

  const handleSaveEditRole = (roleId: string) => {
    const trimmed = editingRoleName.trim();
    if (!trimmed) {
      alert(lang === 'th' ? 'กรุณากรอกชื่อบทบาท' : 'Please enter role name');
      return;
    }

    const targetRole = roles.find(r => r.id === roleId);
    if (!targetRole) return;

    const oldName = targetRole.name;
    const updatedRoles = roles.map(r => r.id === roleId ? { ...r, name: trimmed } : r);

    // Sync updated role name across all project contacts using old name
    const updatedContacts = data.contacts.map(c => 
      c.role === oldName ? { ...c, role: trimmed } : c
    );

    updateData({
      contactRoles: updatedRoles,
      contacts: updatedContacts,
    });

    setEditingRoleId(null);
    setEditingRoleName('');
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (roles.length <= 1) {
      alert(lang === 'th' ? 'ต้องมีบทบาทอย่างน้อย 1 รายการในระบบ' : 'Must keep at least 1 role in the system.');
      return;
    }

    const isUsedInContacts = data.contacts.some(c => c.role === roleName);
    const confirmMsg = isUsedInContacts 
      ? (lang === 'th' 
          ? `บทบาท "${roleName}" มีผู้ติดต่อใช้งานอยู่ คุณแน่ใจหรือไม่ว่าต้องการลบบทบาทนี้?` 
          : `Role "${roleName}" is currently assigned to contacts. Are you sure you want to delete it?`)
      : (lang === 'th' ? `คุณแน่ใจหรือไม่ว่าต้องการลบบทบาท "${roleName}"?` : `Are you sure you want to delete role "${roleName}"?`);

    if (window.confirm(confirmMsg)) {
      const updatedRoles = roles.filter(r => r.id !== roleId);
      updateData({ contactRoles: updatedRoles });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>{lang === 'th' ? 'ผู้ติดต่อโครงการ' : 'Project Contacts'}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
              {contacts.length} {lang === 'th' ? 'คน' : 'contacts'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'th' ? 'จัดการรายชื่อ เบอร์โทร และบทบาทผู้ติดต่อสำหรับโครงการนี้' : 'Manage contact names, phones, and customizable roles.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 font-bold transition-all text-xs border border-slate-300 shadow-2xs"
            title={lang === 'th' ? 'เพิ่ม ลบ แก้ไข รายการบทบาท/ตำแหน่งผู้ติดต่อ' : 'Add, edit, or remove contact roles'}
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>{lang === 'th' ? 'จัดการบทบาท' : 'Manage Roles'}</span>
          </button>

          <button
            onClick={addContact}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 font-bold transition-all text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'th' ? 'เพิ่มผู้ติดต่อ' : 'Add Contact'}</span>
          </button>

          <SaveButton successMessage={lang === 'th' ? 'บันทึกรายชื่อผู้ติดต่อเรียบร้อยแล้ว' : 'Contacts saved successfully'} />
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">{lang === 'th' ? 'ยังไม่ได้เพิ่มผู้ติดต่อในโครงการนี้' : 'No contacts added to this project yet.'}</p>
            <button
              onClick={addContact}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'th' ? 'เพิ่มผู้ติดต่อคนแรก' : 'Add First Contact'}</span>
            </button>
          </div>
        ) : (
          contacts.map(contact => {
            // Check if contact's role is in roles list
            const isCustomRoleNotInList = contact.role && !roles.some(r => r.name === contact.role);

            return (
              <div key={contact.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative group hover:border-blue-300 transition-all">
                <button 
                  onClick={() => deleteContact(contact.id)}
                  className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-80 sm:opacity-0 group-hover:opacity-100"
                  title={lang === 'th' ? 'ลบผู้ติดต่อ' : 'Delete contact'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 pr-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-500">{lang === 'th' ? 'ชื่อ' : 'First Name'}</label>
                      <input 
                        type="text" 
                        value={contact.firstName} 
                        onChange={e => updateContact(contact.id, 'firstName', e.target.value)} 
                        placeholder={lang === 'th' ? 'ชื่อ' : 'First Name'}
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 text-sm" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</label>
                      <input 
                        type="text" 
                        value={contact.lastName} 
                        onChange={e => updateContact(contact.id, 'lastName', e.target.value)} 
                        placeholder={lang === 'th' ? 'นามสกุล' : 'Last Name'}
                        className="w-full font-bold text-slate-800 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1 text-sm" 
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>{lang === 'th' ? 'บทบาท / ตำแหน่ง' : 'Role / Position'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRoleModal(true)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{lang === 'th' ? 'จัดการบทบาท' : 'Manage Roles'}</span>
                      </button>
                    </div>

                    <select 
                      value={contact.role} 
                      onChange={e => handleRoleSelectChange(contact.id, e.target.value)}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    >
                      {isCustomRoleNotInList && (
                        <option value={contact.role}>{contact.role} ({lang === 'th' ? 'กำหนดเอง' : 'Custom'})</option>
                      )}
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                      <option value="__MANAGE_ROLES__" className="text-blue-600 font-bold">
                        + {lang === 'th' ? 'จัดการ / เพิ่มบทบาทใหม่...' : 'Manage / Add New Role...'}
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
                      <input 
                        type="text" 
                        value={contact.phone} 
                        onChange={e => updateContact(contact.id, 'phone', e.target.value)} 
                        placeholder={lang === 'th' ? '08x-xxx-xxxx' : 'Phone number'}
                        className="w-full text-xs font-mono text-slate-700 bg-slate-50/60 border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:bg-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">{lang === 'th' ? 'อีเมล' : 'Email'}</label>
                      <input 
                        type="email" 
                        value={contact.email} 
                        onChange={e => updateContact(contact.id, 'email', e.target.value)} 
                        placeholder={lang === 'th' ? 'email@example.com' : 'Email address'}
                        className="w-full text-xs text-slate-700 bg-slate-50/60 border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:bg-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium">{lang === 'th' ? 'Line ID (ไม่บังคับ)' : 'Line ID (Optional)'}</label>
                      <input 
                        type="text" 
                        value={contact.lineId} 
                        onChange={e => updateContact(contact.id, 'lineId', e.target.value)} 
                        placeholder={lang === 'th' ? 'Line ID' : 'Line ID'}
                        className="w-full text-xs text-slate-700 bg-slate-50/60 border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:bg-white focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Role Management Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {lang === 'th' ? 'จัดการบทบาท / ตำแหน่งผู้ติดต่อ' : 'Manage Contact Roles'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'th' ? 'เพิ่ม แก้ไข หรือลบบทบาทสำหรับเลือกใช้งานในรายชื่อผู้ติดต่อ' : 'Add, edit, or delete roles for project contact selection'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRoleId(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Role Form */}
            <form onSubmit={handleAddRole} className="flex items-center gap-2 bg-blue-50/60 p-3 rounded-lg border border-blue-200">
              <input
                type="text"
                value={newRoleInput}
                onChange={e => setNewRoleInput(e.target.value)}
                placeholder={lang === 'th' ? 'พิมพ์ชื่อบทบาทใหม่ เช่น ผู้ช่วยวิศวกร, ช่างไฟ...' : 'Enter new role name...'}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newRoleInput.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'th' ? 'เพิ่มบทบาท' : 'Add Role'}</span>
              </button>
            </form>

            {/* Roles List Table */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                {lang === 'th' ? 'รายการบทบาททั้งหมด' : 'All Roles'} ({roles.length})
              </label>

              {roles.map((role, index) => {
                const isEditing = editingRoleId === role.id;

                return (
                  <div 
                    key={role.id} 
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      isEditing 
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300' 
                        : 'bg-slate-50 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 mr-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">
                        {index + 1}.
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingRoleName}
                          onChange={e => setEditingRoleName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEditRole(role.id)}
                          className="flex-1 px-2 py-1 text-xs font-bold text-slate-800 bg-white border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500"
                          autoFocus
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {role.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEditRole(role.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 shadow-2xs"
                            title={lang === 'th' ? 'บันทึก' : 'Save'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRoleId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs"
                            title={lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditRole(role)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title={lang === 'th' ? 'แก้ไขชื่อบทบาท' : 'Edit role name'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title={lang === 'th' ? 'ลบบทบาทนี้' : 'Delete this role'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRoleModal(false);
                  setEditingRoleId(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
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
