import { useState } from 'react';
import { useAppStore } from '../../store';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, ChevronDown, ChevronRight, Calculator, CheckCircle2, Clock, Percent, DollarSign, Calendar, Layers } from 'lucide-react';
import { Contractor, Installment } from '../../types';
import { SaveButton } from '../../components/SaveButton';

export function Contractors({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customPeriodInput, setCustomPeriodInput] = useState<{ [key: string]: string }>({});

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
    const c = data.contractors.find(item => item.id === id);
    if (!c) return;

    // If totalWage changes, automatically recalculate installment amounts based on percentages
    if (field === 'totalWage') {
      const newTotal = parseFloat(value) || 0;
      const updatedInstallments = c.installments.map(inst => {
        const pct = inst.percentage ?? (c.totalWage > 0 ? (inst.amount / c.totalWage) * 100 : 0);
        const calculatedAmount = Math.round((newTotal * pct) / 100);
        return {
          ...inst,
          percentage: Number(pct.toFixed(2)),
          amount: calculatedAmount
        };
      });

      updateData({
        contractors: data.contractors.map(item =>
          item.id === id ? { ...item, totalWage: newTotal, installments: updatedInstallments } : item
        )
      });
      return;
    }

    updateData({
      contractors: data.contractors.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleDeleteContractor = (id: string) => {
    if (window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้รับเหมาคนนี้?' : 'Are you sure you want to delete this contractor?')) {
      updateData({
        contractors: data.contractors.filter(c => c.id !== id)
      });
    }
  };

  const handleAddInstallment = (contractorId: string) => {
    const c = data.contractors.find(c => c.id === contractorId);
    if (!c) return;

    const currentTotalAllocated = c.installments.reduce((sum, i) => sum + i.amount, 0);
    const currentTotalPct = c.installments.reduce((sum, i) => sum + (i.percentage || 0), 0);

    const remainingAmount = Math.max(0, c.totalWage - currentTotalAllocated);
    const remainingPct = Math.max(0, Number((100 - currentTotalPct).toFixed(2)));

    const newInstallment: Installment = {
      id: uuidv4(),
      periodNumber: c.installments.length + 1,
      note: lang === 'th' ? `งวดที่ ${c.installments.length + 1}` : `Period ${c.installments.length + 1}`,
      percentage: remainingPct > 0 ? remainingPct : 0,
      amount: remainingAmount > 0 ? remainingAmount : 0,
      dueDate: '',
      status: 'pending'
    };

    handleUpdateContractor(contractorId, 'installments', [...c.installments, newInstallment]);
  };

  const handleUpdateInstallment = (contractorId: string, instId: string, field: string, value: any) => {
    const c = data.contractors.find(c => c.id === contractorId);
    if (!c) return;

    const newInsts = c.installments.map(i => {
      if (i.id !== instId) return i;

      if (field === 'percentage') {
        const pct = parseFloat(value) || 0;
        const calculatedAmount = Math.round((c.totalWage * pct) / 100);
        return { ...i, percentage: pct, amount: calculatedAmount };
      }

      if (field === 'amount') {
        const amt = parseFloat(value) || 0;
        const calculatedPct = c.totalWage > 0 ? Number(((amt / c.totalWage) * 100).toFixed(2)) : 0;
        return { ...i, amount: amt, percentage: calculatedPct };
      }

      return { ...i, [field]: value };
    });

    // Re-index period numbers
    const reindexed = newInsts.map((inst, index) => ({
      ...inst,
      periodNumber: index + 1
    }));

    updateData({
      contractors: data.contractors.map(item =>
        item.id === contractorId ? { ...item, installments: reindexed } : item
      )
    });
  };

  const handleDivideEqually = (contractorId: string) => {
    const c = data.contractors.find(item => item.id === contractorId);
    if (!c || c.installments.length === 0) return;

    const count = c.installments.length;
    const equalPct = Number((100 / count).toFixed(2));
    const equalAmount = Math.floor(c.totalWage / count);

    let allocatedAmt = 0;
    let allocatedPct = 0;

    const updated = c.installments.map((inst, idx) => {
      if (idx === count - 1) {
        // Last installment takes remainder to ensure exact 100% and exact totalWage sum
        const lastAmt = Math.max(0, c.totalWage - allocatedAmt);
        const lastPct = Number((100 - allocatedPct).toFixed(2));
        return {
          ...inst,
          percentage: lastPct,
          amount: lastAmt
        };
      }
      allocatedAmt += equalAmount;
      allocatedPct += equalPct;
      return {
        ...inst,
        percentage: equalPct,
        amount: equalAmount
      };
    });

    updateData({
      contractors: data.contractors.map(item =>
        item.id === contractorId ? { ...item, installments: updated } : item
      )
    });
  };

  const handleGeneratePeriods = (contractorId: string, periodCount: number) => {
    const c = data.contractors.find(item => item.id === contractorId);
    if (!c || periodCount <= 0) return;

    const count = Math.min(24, Math.max(1, periodCount));
    const totalWage = c.totalWage || 0;
    const equalPct = Number((100 / count).toFixed(2));
    const equalAmount = Math.floor(totalWage / count);

    let allocatedAmt = 0;
    let allocatedPct = 0;

    const newInstallments: Installment[] = [];

    for (let i = 0; i < count; i++) {
      const existing = c.installments[i];
      let amt = equalAmount;
      let pct = equalPct;

      if (i === count - 1) {
        amt = Math.max(0, totalWage - allocatedAmt);
        pct = Number((100 - allocatedPct).toFixed(2));
      } else {
        allocatedAmt += equalAmount;
        allocatedPct += equalPct;
      }

      newInstallments.push({
        id: existing ? existing.id : uuidv4(),
        periodNumber: i + 1,
        note: existing?.note || (lang === 'th' ? `งวดที่ ${i + 1}` : `Period ${i + 1}`),
        percentage: pct,
        amount: amt,
        dueDate: existing?.dueDate || '',
        status: existing?.status || 'pending'
      });
    }

    updateData({
      contractors: data.contractors.map(item =>
        item.id === contractorId ? { ...item, installments: newInstallments } : item
      )
    });
  };

  const handleDeleteInstallment = (contractorId: string, instId: string) => {
    const c = data.contractors.find(item => item.id === contractorId);
    if (!c) return;

    const filtered = c.installments.filter(i => i.id !== instId);
    const reindexed = filtered.map((inst, index) => ({
      ...inst,
      periodNumber: index + 1
    }));

    updateData({
      contractors: data.contractors.map(item =>
        item.id === contractorId ? { ...item, installments: reindexed } : item
      )
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{lang === 'th' ? 'จัดการผู้รับเหมาและงวดค่าแรง' : 'Contractors & Wage Installments'}</h3>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'จัดการข้อมูลผู้รับเหมา ยอดค่าแรงรวม และแบ่งคำนวณงวดการจ่ายค่าแรง' : 'Manage contractor profiles, total wages, and calculated installment payments.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddContractor}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium text-xs sm:text-sm transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            {lang === 'th' ? 'เพิ่มผู้รับเหมา' : 'Add Contractor'}
          </button>
          <SaveButton successMessage={lang === 'th' ? 'บันทึกข้อมูลผู้รับเหมาเรียบร้อยแล้ว' : 'Contractor data saved successfully'} />
        </div>
      </div>

      {projectContractors.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          {lang === 'th' ? 'ยังไม่ได้เพิ่มผู้รับเหมาในโครงการนี้' : 'No contractors added to this project yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {projectContractors.map(contractor => {
            const isExpanded = expandedId === contractor.id;
            const totalWage = contractor.totalWage || 0;
            const totalAllocated = contractor.installments.reduce((sum, i) => sum + (i.amount || 0), 0);
            const totalAllocatedPct = contractor.installments.reduce((sum, i) => sum + (i.percentage || 0), 0);
            const totalPaid = contractor.installments.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
            const totalPending = totalAllocated - totalPaid;
            const unallocatedBalance = totalWage - totalAllocated;

            return (
              <div key={contractor.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {/* Contractor Header */}
                <div 
                  className="p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : contractor.id)}
                >
                  <div className="text-slate-400 mt-4 shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 text-xs" onClick={e => e.stopPropagation()}>
                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{lang === 'th' ? 'เลือกจากข้อมูลหลัก' : 'Master Record'}</label>
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
                        className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg p-2 text-xs"
                      >
                        <option value="">{lang === 'th' ? '-- เลือกผู้รับเหมา --' : '-- Select Contractor --'}</option>
                        {data.contractorMaster?.map(m => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName} {m.company ? `(${m.company})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{lang === 'th' ? 'บริษัท / ทีมช่าง' : 'Company / Team'}</label>
                      <input
                        type="text"
                        value={contractor.company || ''}
                        placeholder={lang === 'th' ? 'ชื่อบริษัทหรือทีมช่าง...' : 'Company name...'}
                        onChange={e => handleUpdateContractor(contractor.id, 'company', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{lang === 'th' ? 'ชื่อหัวหน้าทีม' : 'First Name'}</label>
                      <input
                        type="text"
                        value={contractor.headFirstName}
                        onChange={e => handleUpdateContractor(contractor.id, 'headFirstName', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{lang === 'th' ? 'นามสกุล' : 'Last Name'}</label>
                      <input
                        type="text"
                        value={contractor.headLastName}
                        onChange={e => handleUpdateContractor(contractor.id, 'headLastName', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">{lang === 'th' ? 'เบอร์โทรศัพท์' : 'Phone'}</label>
                      <input
                        type="text"
                        value={contractor.phone || ''}
                        onChange={e => handleUpdateContractor(contractor.id, 'phone', e.target.value)}
                        className="w-full font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="text-[11px] font-bold text-blue-700 mb-1 block">{lang === 'th' ? 'ยอดค่าแรงรวม (บาท)' : 'Total Wage (THB)'}</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-semibold text-xs">฿</span>
                        <input
                          type="number"
                          value={contractor.totalWage || ''}
                          onChange={e => handleUpdateContractor(contractor.id, 'totalWage', e.target.value)}
                          placeholder="0"
                          className="w-full font-bold text-blue-900 bg-blue-50/60 border border-blue-200 focus:border-blue-500 focus:bg-white rounded-lg p-2 pl-6 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteContractor(contractor.id); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-4 shrink-0"
                    title={lang === 'th' ? 'ลบผู้รับเหมา' : 'Delete contractor'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Collapsed Brief Summary Bar */}
                {!isExpanded && (
                  <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-4 text-slate-600">
                      <span>{lang === 'th' ? 'งวดชำระ:' : 'Installments:'} <strong className="text-slate-800">{contractor.installments.length} {lang === 'th' ? 'งวด' : 'periods'}</strong></span>
                      <span>{lang === 'th' ? 'ยอดค่าแรงรวม:' : 'Total Wage:'} <strong className="text-blue-700">฿{totalWage.toLocaleString()}</strong></span>
                      <span>{lang === 'th' ? 'จัดสรรแล้ว:' : 'Allocated:'} <strong className="text-slate-800">฿{totalAllocated.toLocaleString()} ({totalAllocatedPct.toFixed(0)}%)</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'th' ? 'จ่ายแล้ว:' : 'Paid:'} ฿{totalPaid.toLocaleString()}
                      </span>
                      {totalPending > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {lang === 'th' ? 'ค้างจ่าย:' : 'Pending:'} ฿{totalPending.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Installments Details */}
                {isExpanded && (
                  <div className="bg-slate-50/50 p-5 border-t border-slate-200 space-y-4">
                    {/* Header & Tools for Installments */}
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-slate-800 text-sm">
                          {lang === 'th' ? 'งวดการจ่ายค่าแรง (คำนวณจากยอดค่าแรงรวม)' : 'Wage Installment Payments (Calculated from Total Wage)'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {contractor.installments.length > 0 && totalWage > 0 && (
                          <button
                            onClick={() => handleDivideEqually(contractor.id)}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 text-xs font-semibold shadow-2xs transition-colors"
                            title={lang === 'th' ? 'คำนวณแบ่งจ่ายเปอร์เซ็นต์งวดให้เท่าๆ กัน' : 'Divide wage equally among installments'}
                          >
                            <Percent className="w-3.5 h-3.5 text-blue-600" />
                            <span>{lang === 'th' ? 'แบ่งจ่ายเท่าๆ กัน' : 'Divide Equally'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleAddInstallment(contractor.id)}
                          className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'เพิ่มงวดการจ่าย' : 'Add Installment'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Period Preset Generator Bar */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>{lang === 'th' ? 'ระบุจำนวนงวดการจ่ายค่าแรง:' : 'Specify Number of Wage Periods:'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[2, 3, 4, 5, 6].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleGeneratePeriods(contractor.id, num)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                contractor.installments.length === num
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={lang === 'th' ? `ตั้งค่าจำนวนงวดเป็น ${num} งวด (แบ่งจ่ายเท่ากัน)` : `Set to ${num} periods`}
                            >
                              {num} {lang === 'th' ? 'งวด' : 'periods'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">{lang === 'th' ? 'หรือระบุจำนวนงวด:' : 'Custom Periods:'}</span>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          placeholder={lang === 'th' ? 'เช่น 8' : 'e.g. 8'}
                          value={customPeriodInput[contractor.id] || ''}
                          onChange={e => setCustomPeriodInput({ ...customPeriodInput, [contractor.id]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const count = parseInt(customPeriodInput[contractor.id] || '0', 10);
                              if (count > 0) handleGeneratePeriods(contractor.id, count);
                            }
                          }}
                          className="w-16 px-2.5 py-1 border border-slate-300 rounded-lg text-center font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const count = parseInt(customPeriodInput[contractor.id] || '0', 10);
                            if (count > 0) handleGeneratePeriods(contractor.id, count);
                          }}
                          disabled={!customPeriodInput[contractor.id] || parseInt(customPeriodInput[contractor.id] || '0', 10) <= 0}
                          className="px-3 py-1 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-40"
                        >
                          {lang === 'th' ? 'สร้าง/คำนวณงวด' : 'Apply'}
                        </button>
                      </div>
                    </div>

                    {/* Installments Table */}
                    {contractor.installments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 text-xs">
                        {lang === 'th' ? 'ยังไม่มีงวดการจ่ายค่าแรง คลิก "เพิ่มงวดการจ่าย" เพื่อเริ่มตั้งงวด' : 'No installments created yet. Click "Add Installment" to begin.'}
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                              <tr>
                                <th className="p-3 w-16 text-center">{lang === 'th' ? 'งวดที่' : 'Period'}</th>
                                <th className="p-3 min-w-[200px]">{lang === 'th' ? 'งวดงาน / รายละเอียดเงื่อนไข' : 'Work Milestone / Note'}</th>
                                <th className="p-3 w-28 text-right">{lang === 'th' ? 'สัดส่วน (%)' : 'Share (%)'}</th>
                                <th className="p-3 w-40 text-right">{lang === 'th' ? 'ยอดเงินค่าแรง (บาท)' : 'Amount (THB)'}</th>
                                <th className="p-3 w-36">{lang === 'th' ? 'กำหนดชำระ' : 'Due Date'}</th>
                                <th className="p-3 w-32 text-center">{lang === 'th' ? 'สถานะการจ่าย' : 'Status'}</th>
                                <th className="p-3 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {contractor.installments.map((inst, idx) => {
                                const isPaid = inst.status === 'paid';

                                return (
                                  <tr key={inst.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-3 text-center font-bold text-slate-700">
                                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 inline-flex items-center justify-center text-xs">
                                        {idx + 1}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <input
                                        type="text"
                                        value={inst.note || ''}
                                        onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'note', e.target.value)}
                                        placeholder={lang === 'th' ? 'ระบุเงื่อนไขหรืองวดงาน...' : 'e.g. Deposit / Initial work...'}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                                      />
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={inst.percentage ?? ''}
                                          onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'percentage', e.target.value)}
                                          placeholder="0"
                                          className="w-20 px-2 py-1.5 text-right font-medium border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                                        />
                                        <span className="text-slate-400 font-medium">%</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-slate-400 font-medium">฿</span>
                                        <input
                                          type="number"
                                          value={inst.amount ?? ''}
                                          onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'amount', e.target.value)}
                                          placeholder="0"
                                          className="w-32 px-2.5 py-1.5 text-right font-bold border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs text-blue-900 bg-blue-50/30"
                                        />
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      <div className="relative flex items-center">
                                        <input
                                          type="date"
                                          value={inst.dueDate || ''}
                                          onChange={e => handleUpdateInstallment(contractor.id, inst.id, 'dueDate', e.target.value)}
                                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none text-xs text-slate-800"
                                        />
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateInstallment(contractor.id, inst.id, 'status', isPaid ? 'pending' : 'paid')}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-colors ${
                                          isPaid
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                        }`}
                                      >
                                        {isPaid ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            <span>{lang === 'th' ? 'จ่ายแล้ว' : 'Paid'}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="w-3 h-3 text-amber-600" />
                                            <span>{lang === 'th' ? 'ยังไม่จ่าย' : 'Pending'}</span>
                                          </>
                                        )}
                                      </button>
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => handleDeleteInstallment(contractor.id, inst.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title={lang === 'th' ? 'ลบงวดนี้' : 'Delete installment'}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Wage Calculation Summary Bar */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-6 flex-wrap">
                          <div>
                            <span className="text-slate-500 block text-[11px]">{lang === 'th' ? 'ยอดค่าแรงรวม:' : 'Total Wage:'}</span>
                            <span className="font-bold text-slate-800 text-sm">฿{totalWage.toLocaleString()}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[11px]">{lang === 'th' ? 'รวมงวดที่ตั้งไว้:' : 'Total Allocated:'}</span>
                            <span className={`font-bold text-sm ${totalAllocated === totalWage ? 'text-emerald-600' : 'text-blue-700'}`}>
                              ฿{totalAllocated.toLocaleString()} ({totalAllocatedPct.toFixed(1)}%)
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[11px]">{lang === 'th' ? 'จ่ายแล้ว:' : 'Paid:'}</span>
                            <span className="font-bold text-emerald-600 text-sm">฿{totalPaid.toLocaleString()}</span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[11px]">{lang === 'th' ? 'คงเหลือค้างจ่าย:' : 'Pending:'}</span>
                            <span className="font-bold text-amber-600 text-sm">฿{totalPending.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Unallocated balance badge */}
                        <div className="text-right">
                          <span className="text-slate-500 block text-[11px]">{lang === 'th' ? 'คงเหลือที่ยังไม่ได้ตั้งงวด:' : 'Unallocated Balance:'}</span>
                          {unallocatedBalance === 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {lang === 'th' ? 'ตั้งงวดครบ 100%' : '100% Allocated'}
                            </span>
                          ) : unallocatedBalance > 0 ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
                              ฿{unallocatedBalance.toLocaleString()} ({((unallocatedBalance / (totalWage || 1)) * 100).toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full font-bold border border-red-200">
                              {lang === 'th' ? 'เกินยอดรวม:' : 'Over:'} ฿{Math.abs(unallocatedBalance).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Allocation Progress Bar */}
                      {totalWage > 0 && (
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${Math.min(100, (totalPaid / totalWage) * 100)}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Paid: ฿${totalPaid.toLocaleString()}`}
                          />
                          <div
                            style={{ width: `${Math.min(100 - (totalPaid / totalWage) * 100, (totalPending / totalWage) * 100)}%` }}
                            className="bg-amber-400 h-full transition-all"
                            title={`Pending: ฿${totalPending.toLocaleString()}`}
                          />
                        </div>
                      )}
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

