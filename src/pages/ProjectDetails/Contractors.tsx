import { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Contractor, Installment } from '../../types';

export function Contractors({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const projectContractors = data.contractors.filter(c => c.projectId === projectId);

  const handleAddContractor = () => {
    const newContractor: Contractor = {
      id: uuidv4(),
      projectId,
      headFirstName: lang === 'th' ? 'ผู้รับเหมา' : 'New',
      headLastName: lang === 'th' ? 'ใหม่' : 'Contractor',
      company: '',
      phone: '',
      totalWage: 0,
      installments: [],
    };
    updateData({ contractors: [...data.contractors, newContractor] });
    setExpandedId(newContractor.id);
  };

  const handleUpdateContractor = (id: string, field: string, value: any) => {
    updateData({
      contractors: data.contractors.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
    });
  };

  const handleDeleteContractor = (id: string) => {
    updateData({
      contractors: data.contractors.filter(c => c.id !== id)
    });
  };

  const handleAddInstallment = (contractorId: string) => {
    const c = data.contractors.find(c => c.id === contractorId);
    if (!c) return;

    const newInstallment: Installment = {
      id: uuidv4(),
      periodNumber: c.installments.length + 1,
      amount: 0,
      dueDate: '',
    };

    handleUpdateContractor(contractorId, 'installments', [...c.installments, newInstallment]);
  };

  const handleUpdateInstallment = (contractorId: string, instId: string, field: string, value: any) => {
    const c = data.contractors.find(c => c.id === contractorId);
    if (!c) return;

    const newInsts = c.installments.map(i => 
      i.id === instId ? { ...i, [field]: value } : i
    );
    handleUpdateContractor(contractorId, 'installments', newInsts);
  };

  const handleDeleteInstallment = (contractorId: string, instId: string) => {
    const c = data.contractors.find(c => c.id === contractorId);
    if (!c) return;

    const newInsts = c.installments.filter(i => i.id !== instId);
    handleUpdateContractor(contractorId, 'installments', newInsts);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'จัดการผู้รับเหมา' : 'Contractor Management'}</h3>
        <button
          onClick={handleAddContractor}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          {lang === 'th' ? 'เพิ่มผู้รับเหมา' : 'Add Contractor'}
        </button>
      </div>

      {projectContractors.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          {lang === 'th' ? 'ยังไม่ได้เพิ่มผู้รับเหมา' : 'No contractors added yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {projectContractors.map(contractor => {
            const isExpanded = expandedId === contractor.id;
            const totalAllocated = contractor.installments.reduce((sum, i) => sum + i.amount, 0);
            
            return (
              <div key={contractor.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div 
                  className="bg-white p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : contractor.id)}
                >
                  <div className="text-slate-400 mt-5">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4" onClick={e => e.stopPropagation()}>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'เลือกจากข้อมูลหลัก' : 'Select Master'}</label>
                      <select
                        value={contractor.contractorMasterId || ''}
                        onChange={e => {
                          const masterId = e.target.value;
                          const masterData = data.contractorMaster?.find(m => m.id === masterId);
                          if (masterData) {
                            updateData({
                              contractors: data.contractors.map(c => 
                                c.id === contractor.id ? { 
                                  ...c, 
                                  contractorMasterId: masterId,
                                  company: masterData.company || c.company,
                                  headFirstName: masterData.firstName,
                                  headLastName: masterData.lastName,
                                  phone: masterData.phone || c.phone
                                } : c
                              )
                            });
                          } else {
                            handleUpdateContractor(contractor.id, 'contractorMasterId', '');
                          }
                        }}
                        className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      >
                        <option value="">{lang === 'th' ? 'เลือก...' : 'Select...'}</option>
                        {data.contractorMaster?.map(m => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName} {m.company ? `(${m.company})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'บริษัท' : 'Company'}</label>
                      <input
                        type="text"
                        value={contractor.company || ''}
                        placeholder={lang === 'th' ? 'บริษัท...' : 'Company...'}
                        onChange={e => handleUpdateContractor(contractor.id, 'company', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'ชื่อ' : 'First Name'}</label>
                      <input
                        type="text"
                        value={contractor.headFirstName}
                        onChange={e => handleUpdateContractor(contractor.id, 'headFirstName', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</label>
                      <input
                        type="text"
                        value={contractor.headLastName}
                        onChange={e => handleUpdateContractor(contractor.id, 'headLastName', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
                      <input
                        type="text"
                        value={contractor.phone || ''}
                        onChange={e => handleUpdateContractor(contractor.id, 'phone', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                      />
                    </div>
                    <div className="lg:col-span-1">
                      <label className="text-xs text-slate-500">{lang === 'th' ? 'ค่าจ้างรวม' : 'Total Wage'}</label>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-medium">฿</span>
                        <input
                          type="number"
                          value={contractor.totalWage || ''}
                          onChange={e => handleUpdateContractor(contractor.id, 'totalWage', parseFloat(e.target.value) || 0)}
                          className="w-full font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteContractor(contractor.id); }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 p-4 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-slate-700">{lang === 'th' ? 'งวดการชำระเงิน' : 'Installments'}</h4>
                      <button
                        onClick={() => handleAddInstallment(contractor.id)}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 flex items-center gap-1 text-sm font-medium"
                      >
                        <Plus className="w-3 h-3" />
                        {lang === 'th' ? 'เพิ่มงวด' : 'Add Installment'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      {contractor.installments.map((inst, idx) => (
                        <div key={inst.id} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
                          <div className="w-16 font-medium text-slate-500 text-sm">
                            {lang === 'th' ? 'งวดที่' : 'Period'} {idx + 1}
                          </div>
                          <div className="flex-1">
                            <input
                              type="date"
                              value={inst.dueDate}
                              onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'dueDate', e.target.value)}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-slate-400 text-sm">฿</span>
                            <input
                              type="number"
                              value={inst.amount || ''}
                              onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <button
                            onClick={() => handleDeleteInstallment(contractor.id, inst.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-6 text-sm">
                        <div className="text-slate-500">
                          {lang === 'th' ? 'จัดสรรแล้วรวม:' : 'Total Allocated:'} <span className="font-bold text-slate-700">฿{totalAllocated.toLocaleString()}</span>
                        </div>
                        <div className={totalAllocated === contractor.totalWage ? "text-emerald-600 font-medium" : "text-orange-600 font-medium"}>
                          {lang === 'th' ? 'คงเหลือ:' : 'Remaining:'} ฿{(contractor.totalWage - totalAllocated).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
