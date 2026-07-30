import { useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

export function Dashboard() {
  const { data } = useAppStore();
  const lang = data.language || 'th';

  const totalProjects = data.projects.length;
  const closedProjects = data.projects.filter(p => p.actualCompletionDate || (p.statusId && data.projectStatuses?.find(s => s.id === p.statusId)?.name === 'ปิดโครงการ')).length;
  const activeProjects = totalProjects - closedProjects;
  const totalClients = data.customers.length;
  
  const projectsByCustomer = data.customers.map(c => ({
    name: c.name,
    count: data.projects.filter(p => p.customerId === c.id).length
  })).filter(item => item.count > 0);

  const projectsByPM = data.projectManagers.map(pm => ({
    name: pm.name,
    count: data.projects.filter(p => p.managerId === pm.id).length
  })).filter(item => item.count > 0);

  const today = new Date();
  const endingSoon = data.projects.filter(p => {
    if (!p.endDate || p.actualCompletionDate) return false;
    const daysLeft = differenceInDays(parseISO(p.endDate), today);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-end border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'แผงควบคุม' : 'Dashboard Overview'}</h2>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'สรุปการดำเนินงานและโครงการ' : 'Operations and project summaries.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#0061FF] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'กำลังดำเนินการ' : 'Active'}</p>
            <p className="text-[20px] font-bold text-slate-800">{activeProjects}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#22C55E] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ปิดโครงการแล้ว' : 'Closed'}</p>
            <p className="text-[20px] font-bold text-slate-800">{closedProjects}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#FF5E00] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'บริษัททั้งหมด' : 'Companies'}</p>
            <p className="text-[20px] font-bold text-slate-800">{totalClients}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#8B5CF6] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'โครงการทั้งหมด' : 'Total'}</p>
            <p className="text-[20px] font-bold text-slate-800">{totalProjects}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center col-span-2 md:col-span-1 lg:col-span-1">
          <div className="border-l-4 border-[#EF4444] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ใกล้ถึงกำหนด (<7 วัน)' : 'Deadlines (<7d)'}</p>
            <p className="text-[20px] font-bold text-red-600">{endingSoon.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">{lang === 'th' ? 'สัดส่วนโครงการตามบริษัท' : 'Projects by Company'}</h3>
          <div className="h-[300px]">
            {projectsByCustomer.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByCustomer}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data available'}</div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">{lang === 'th' ? 'โครงการแยกตามผู้จัดการ' : 'Projects by Project Manager'}</h3>
          <div className="h-[300px]">
            {projectsByPM.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectsByPM}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#2563eb"
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {projectsByPM.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data available'}</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          {lang === 'th' ? 'โครงการที่ใกล้ครบกำหนด (< 7 วัน)' : 'Projects Nearing Deadline (< 7 days)'}
        </h3>
        <div className="overflow-x-auto">
          {endingSoon.length > 0 ? (
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่อโครงการ' : 'Project Name'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่อบริษัท' : 'Company'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'วันที่สิ้นสุดโครงการ' : 'End Date'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'เหลือเวลา' : 'Time Left'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {endingSoon.map(project => {
                  const daysLeft = differenceInDays(parseISO(project.endDate), today);
                  return (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{project.name}</td>
                      <td className="p-3 text-slate-600">
                        {data.customers.find(c => c.id === project.customerId)?.name || '-'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {project.endDate}
                      </td>
                      <td className="p-3 text-red-600 font-medium">
                        {daysLeft} {lang === 'th' ? 'วัน' : 'days'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-slate-400">
              {lang === 'th' ? 'ไม่มีโครงการที่ใกล้ครบกำหนด' : 'No projects nearing deadline'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">{lang === 'th' ? 'โครงการที่ปิดแล้ว' : 'Closed Projects'}</h3>
        <div className="overflow-x-auto">
          {data.projects.filter(p => p.actualCompletionDate || (p.statusId && data.projectStatuses?.find(s => s.id === p.statusId)?.name === 'ปิดโครงการ')).length > 0 ? (
            <table className="w-full text-left text-sm border-collapse min-w-[600px]">
              <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่อโครงการ' : 'Project Name'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่อบริษัท' : 'Company'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'วันที่ปิดโครงการ' : 'Completion Date'}</th>
                  <th className="p-3 font-semibold">{lang === 'th' ? 'ระยะเวลาจริง' : 'Actual Duration'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.projects
                  .filter(p => p.actualCompletionDate || (p.statusId && data.projectStatuses?.find(s => s.id === p.statusId)?.name === 'ปิดโครงการ'))
                  .map(project => {
                    let actualDuration = '-';
                    if (project.startDate) {
                       const end = project.actualCompletionDate ? parseISO(project.actualCompletionDate) : new Date();
                       actualDuration = `${differenceInDays(end, parseISO(project.startDate))} ${lang === 'th' ? 'วัน' : 'days'}`;
                    }
                    return (
                      <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-800">{project.name}</td>
                        <td className="p-3 text-slate-600">
                          {data.customers.find(c => c.id === project.customerId)?.name || '-'}
                        </td>
                        <td className="p-3 text-slate-600">
                          {project.actualCompletionDate ? project.actualCompletionDate : (lang === 'th' ? 'ปิดโครงการ (ตามสถานะ)' : 'Closed (By status)')}
                        </td>
                        <td className="p-3 text-slate-600">
                          {actualDuration}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-6 text-slate-400">
              {lang === 'th' ? 'ไม่มีโครงการที่ปิดแล้ว' : 'No closed projects yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
