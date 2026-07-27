import { useAppStore } from '../../store';
import { differenceInDays, parseISO } from 'date-fns';

export function ProjectInfo({ projectId }: { projectId: string }) {
  const { data, updateData } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);

  if (!project) return null;

  const handleChange = (field: string, value: string) => {
    updateData({
      projects: data.projects.map(p => 
        p.id === projectId ? { ...p, [field]: value } : p
      )
    });
  };

  const duration = project.startDate && project.endDate 
    ? differenceInDays(parseISO(project.endDate), parseISO(project.startDate)) 
    : 0;

  const actualDuration = project.startDate && project.actualCompletionDate
    ? differenceInDays(parseISO(project.actualCompletionDate), parseISO(project.startDate))
    : 0;

  const projectScopes = data.scopes.filter(s => s.projectId === project.id);
  const progress = projectScopes.length > 0 
    ? Math.round(projectScopes.reduce((sum, s) => sum + s.progress, 0) / projectScopes.length)
    : 0;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="space-y-1 md:col-span-12">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'ชื่อโครงการ' : 'Project Name'}</label>
          <input
            type="text"
            value={project.name}
            onChange={e => handleChange('name', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent"
          />
        </div>

        <div className="space-y-1 md:col-span-12">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'สถานที่ติดตั้ง' : 'Installation Location'}</label>
          <textarea
            value={project.location}
            onChange={e => handleChange('location', e.target.value)}
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent resize-none"
          />
        </div>

        <div className="space-y-1 md:col-span-4">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'วันที่เริ่มโครงการ' : 'Start Date'}</label>
          <input
            type="date"
            value={project.startDate}
            onChange={e => handleChange('startDate', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent"
          />
        </div>

        <div className="space-y-1 md:col-span-4">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'วันที่สิ้นสุด (แผนงาน)' : 'End Date (Planned)'}</label>
          <input
            type="date"
            value={project.endDate}
            onChange={e => handleChange('endDate', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent"
          />
        </div>

        <div className="space-y-1 md:col-span-4">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'วันที่สิ้นสุดจริง' : 'Actual Completion Date'}</label>
          <input
            type="date"
            value={project.actualCompletionDate || ''}
            onChange={e => handleChange('actualCompletionDate', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent"
          />
        </div>

        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'ลูกค้า' : 'Customer Company'}</label>
          <select
            value={project.customerId}
            onChange={e => handleChange('customerId', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent bg-white"
          >
            <option value="">{lang === 'th' ? 'เลือกลูกค้า...' : 'Select Customer...'}</option>
            {data.customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'เจ้าของโครงการ' : 'Owner Company'}</label>
          <select
            value={project.ownerId}
            onChange={e => handleChange('ownerId', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent bg-white"
          >
            <option value="">{lang === 'th' ? 'เลือกเจ้าของโครงการ...' : 'Select Owner...'}</option>
            {data.owners.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'พนักงานขาย' : 'Salesperson'}</label>
          <select
            value={project.salespersonId}
            onChange={e => handleChange('salespersonId', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent bg-white"
          >
            <option value="">{lang === 'th' ? 'เลือกพนักงานขาย...' : 'Select Salesperson...'}</option>
            {data.salespersons.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'ผู้จัดการโครงการ' : 'Project Manager'}</label>
          <select
            value={project.managerId}
            onChange={e => handleChange('managerId', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent bg-white"
          >
            <option value="">{lang === 'th' ? 'เลือกผู้จัดการโครงการ...' : 'Select PM...'}</option>
            {data.projectManagers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-700">{lang === 'th' ? 'ผู้รับเหมาหลัก' : 'Main Contractor'}</label>
          <select
            value={project.contractorId || ''}
            onChange={e => handleChange('contractorId', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-[#0061FF] focus:border-transparent bg-white"
          >
            <option value="">{lang === 'th' ? 'เลือกผู้รับเหมา...' : 'Select Contractor...'}</option>
            {data.contractorMaster?.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName} {c.company ? `(${c.company})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 p-4 bg-slate-50 rounded border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">{lang === 'th' ? 'สรุปข้อมูลโครงการ' : 'Project Summary'}</h3>
        <div className="flex gap-8">
          <div className="border-l-4 border-[#0061FF] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ระยะเวลาตามแผน' : 'Planned Duration'}</p>
            <p className="text-[18px] font-bold text-slate-800">{duration} {lang === 'th' ? 'วัน' : 'days'}</p>
          </div>
          <div className="border-l-4 border-[#22C55E] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ระยะเวลาจริง' : 'Actual Duration'}</p>
            <p className="text-[18px] font-bold text-slate-800">{actualDuration} {lang === 'th' ? 'วัน' : 'days'}</p>
          </div>
          <div className="border-l-4 border-[#FF5E00] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ความคืบหน้าโครงการ' : 'Overall Progress'}</p>
            <p className="text-[18px] font-bold text-slate-800">{progress}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
