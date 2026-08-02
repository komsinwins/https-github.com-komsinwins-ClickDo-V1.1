import { useState } from 'react';
import { useAppStore } from '../store';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

interface ProjectSummaryProps {
  navigate?: (route: string) => void;
}

export function ProjectSummary({ navigate }: ProjectSummaryProps) {
  const { data } = useAppStore();
  const lang = data.language || 'th';
  
  const [summaryTab, setSummaryTab] = useState<'customer'|'salesperson'|'pm'|'mainContractor'>('customer');
  const [summarySearch, setSummarySearch] = useState('');
  const [expandedSummaryItem, setExpandedSummaryItem] = useState<string | null>(null);

  const projectsByCustomer = data.customers.map(c => ({
    id: c.id,
    name: c.name,
    projects: data.projects.filter(p => p.customerId === c.id),
    count: data.projects.filter(p => p.customerId === c.id).length
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

  const projectsByPM = data.projectManagers.map(pm => ({
    id: pm.id,
    name: pm.name,
    projects: data.projects.filter(p => p.managerId === pm.id),
    count: data.projects.filter(p => p.managerId === pm.id).length
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

  const projectsBySalesperson = data.salespersons.map(s => ({
    id: s.id,
    name: s.name,
    projects: data.projects.filter(p => p.salespersonId === s.id),
    count: data.projects.filter(p => p.salespersonId === s.id).length
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

  const projectsByMainContractor = (data.contractorMaster || []).map(c => ({
    id: c.id,
    name: `${c.firstName} ${c.lastName} ${c.company ? `(${c.company})` : ''}`,
    projects: data.projects.filter(p => p.contractorId === c.id),
    count: data.projects.filter(p => p.contractorId === c.id).length
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

  let currentSummaryData: {id: string, name: string, count: number, projects: any[]}[] = [];
  if (summaryTab === 'customer') currentSummaryData = projectsByCustomer;
  else if (summaryTab === 'pm') currentSummaryData = projectsByPM;
  else if (summaryTab === 'salesperson') currentSummaryData = projectsBySalesperson;
  else if (summaryTab === 'mainContractor') currentSummaryData = projectsByMainContractor;

  if (summarySearch) {
    currentSummaryData = currentSummaryData.filter(item => item.name.toLowerCase().includes(summarySearch.toLowerCase()));
  }

  const handleTabChange = (val: any) => {
    setSummaryTab(val);
    setExpandedSummaryItem(null);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-end border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'สรุปปริมาณโครงการ' : 'Project Quantity Summary'}</h2>
          <p className="text-xs text-slate-500">{lang === 'th' ? 'ดูข้อมูลสรุปจำนวนโครงการตามหมวดหมู่ต่างๆ' : 'View summary of project quantities by categories.'}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-slate-100 pb-4">
          <h3 className="text-sm font-semibold text-slate-800">{lang === 'th' ? 'ปริมาณโครงการแยกตามหมวดหมู่' : 'Projects by Category'}</h3>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <select
              value={summaryTab}
              onChange={(e) => handleTabChange(e.target.value)}
              className="text-sm border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="customer">{lang === 'th' ? 'ลูกค้า' : 'Customers'}</option>
              <option value="salesperson">{lang === 'th' ? 'พนักงานขาย' : 'Salespersons'}</option>
              <option value="pm">{lang === 'th' ? 'ผู้จัดการโครงการ' : 'Project Managers'}</option>
              <option value="mainContractor">{lang === 'th' ? 'ผู้รับเหมาหลัก' : 'Main Contractors'}</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'th' ? 'ค้นหา...' : 'Search...'}
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="text-sm border border-slate-300 rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-48"
              />
            </div>
          </div>
        </div>
        <div className="h-[600px] overflow-y-auto pr-2">
          {currentSummaryData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {currentSummaryData.map((item, index) => {
                const isExpanded = expandedSummaryItem === item.id;
                return (
                  <div key={item.id || index} className="flex flex-col bg-slate-50 rounded-md border border-slate-100 hover:border-blue-200 overflow-hidden transition-colors">
                    <div 
                      className={`flex items-center justify-between p-3 cursor-pointer ${isExpanded ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                      onClick={() => setExpandedSummaryItem(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm whitespace-nowrap">
                          {item.count} {lang === 'th' ? 'โครงการ' : 'Projects'}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="p-3 border-t border-slate-200 bg-white">
                        <ul className="space-y-2">
                          {item.projects.map(proj => (
                            <li 
                              key={proj.id}
                              onClick={() => navigate ? navigate(`projects/${proj.id}/info`) : undefined}
                              className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-start gap-2 group"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0 group-hover:bg-blue-600"></span>
                              <span className="line-clamp-2">{proj.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">{lang === 'th' ? 'ไม่พบข้อมูลที่ค้นหา' : 'No matching data found'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
