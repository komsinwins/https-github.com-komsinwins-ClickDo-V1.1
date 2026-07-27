import { useAppStore } from '../store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { differenceInDays, parseISO } from 'date-fns';

const COLORS = ['#2563eb', '#f97316', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

export function Dashboard() {
  const { data } = useAppStore();
  const lang = data.language || 'th';

  const totalProjects = data.projects.length;
  const activeProjects = data.projects.filter(p => !p.actualCompletionDate).length;
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#0061FF] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'โครงการที่กำลังดำเนินการ' : 'Active Projects'}</p>
            <p className="text-[20px] font-bold text-slate-800">{activeProjects}</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#FF5E00] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ลูกค้าทั้งหมด' : 'Total Clients'}</p>
            <p className="text-[20px] font-bold text-slate-800">{totalClients}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#22C55E] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'โครงการทั้งหมด' : 'Total Projects'}</p>
            <p className="text-[20px] font-bold text-slate-800">{totalProjects}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="border-l-4 border-[#EF4444] pl-3">
            <p className="text-[11px] font-bold uppercase text-slate-500 mb-1">{lang === 'th' ? 'ใกล้ถึงกำหนด (<7 วัน)' : 'Upcoming Deadlines (<7d)'}</p>
            <p className="text-[20px] font-bold text-red-600">{endingSoon.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">{lang === 'th' ? 'สัดส่วนโครงการตามลูกค้า' : 'Projects by Customer'}</h3>
          <div className="h-[300px]">
            {projectsByCustomer.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectsByCustomer}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {projectsByCustomer.map((entry, index) => (
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

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">{lang === 'th' ? 'โครงการแยกตามผู้จัดการ' : 'Projects by Project Manager'}</h3>
          <div className="h-[300px]">
            {projectsByPM.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByPM}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">{lang === 'th' ? 'ไม่มีข้อมูล' : 'No data available'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
