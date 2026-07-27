import { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';
import { Contact } from '../../types';

const COMMON_ROLES = ['Project Manager', 'Site Engineer', 'Foreman', 'Safety Officer', 'Client Representative', 'Other'];

export function Contacts({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const contacts = data.contacts.filter(c => c.projectId === projectId);

  const addContact = () => {
    const newContact: Contact = { 
      id: uuidv4(), 
      projectId, 
      firstName: '', 
      lastName: '', 
      role: 'Site Engineer', 
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
    updateData({ contacts: data.contacts.filter(c => c.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'ผู้ติดต่อโครงการ' : 'Project Contacts'}</h3>
        <button
          onClick={addContact}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {lang === 'th' ? 'เพิ่มผู้ติดต่อ' : 'Add Contact'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contacts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {lang === 'th' ? 'ยังไม่ได้เพิ่มผู้ติดต่อ' : 'No contacts added yet.'}
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative group">
              <button 
                onClick={() => deleteContact(contact.id)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 pr-8">
                  <div>
                    <label className="text-xs text-slate-500">{lang === 'th' ? 'ชื่อ' : 'First Name'}</label>
                    <input type="text" value={contact.firstName} onChange={e => updateContact(contact.id, 'firstName', e.target.value)} className="w-full font-medium text-slate-800 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</label>
                    <input type="text" value={contact.lastName} onChange={e => updateContact(contact.id, 'lastName', e.target.value)} className="w-full font-medium text-slate-800 bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:outline-none py-1" />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500">{lang === 'th' ? 'บทบาท' : 'Role'}</label>
                  <select 
                    value={contact.role} 
                    onChange={e => updateContact(contact.id, 'role', e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-blue-500"
                  >
                    {COMMON_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs text-slate-500">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
                    <input type="text" value={contact.phone} onChange={e => updateContact(contact.id, 'phone', e.target.value)} className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{lang === 'th' ? 'อีเมล' : 'Email'}</label>
                    <input type="email" value={contact.email} onChange={e => updateContact(contact.id, 'email', e.target.value)} className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">{lang === 'th' ? 'Line ID (ไม่บังคับ)' : 'Line ID (Optional)'}</label>
                    <input type="text" value={contact.lineId} onChange={e => updateContact(contact.id, 'lineId', e.target.value)} className="w-full text-sm text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
