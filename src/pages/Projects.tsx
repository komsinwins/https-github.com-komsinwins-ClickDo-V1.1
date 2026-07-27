import { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Search, Calendar, MapPin, ChevronRight, FolderKanban, LayoutGrid, List, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays, parseISO, format } from 'date-fns';

interface ProjectsProps {
  navigate: (route: string) => void;
}

export function Projects({ navigate }: ProjectsProps) {
  const { data, updateData } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const lang = data.language || 'th';

  const createNewProject = () => {
    const newProject = {
      id: uuidv4(),
      name: lang === 'th' ? 'โครงการใหม่' : 'New Project',
      location: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      actualCompletionDate: '',
      customerId: '',
      ownerId: '',
      salespersonId: '',
      managerId: '',
    };
    updateData({ projects: [...data.projects, newProject] });
    navigate(`projects/${newProject.id}/info`);
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(lang === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบโครงการนี้?' : 'Are you sure you want to delete this project?')) {
      updateData({ projects: data.projects.filter(p => p.id !== id) });
    }
  };

  const filteredProjects = data.projects.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const customer = data.customers.find(c => c.id === p.customerId)?.name.toLowerCase() || '';
    const owner = data.owners.find(o => o.id === p.ownerId)?.name.toLowerCase() || '';
    const salesperson = data.salespersons.find(s => s.id === p.salespersonId)?.name.toLowerCase() || '';
    const manager = data.projectManagers.find(m => m.id === p.managerId)?.name.toLowerCase() || '';
    
    return p.name.toLowerCase().includes(searchLower) ||
           customer.includes(searchLower) ||
           owner.includes(searchLower) ||
           salesperson.includes(searchLower) ||
           manager.includes(searchLower);
  });

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{lang === 'th' ? 'โครงการ' : 'Projects'}</h2>
          <p className="text-xs text-slate-500 mt-1">{lang === 'th' ? 'จัดการโครงการติดตั้งทั้งหมด' : 'Manage all your installation projects.'}</p>
        </div>
        <button
          onClick={createNewProject}
          className="px-4 py-2 bg-[#0061FF] text-white rounded text-xs font-semibold hover:bg-blue-700 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          {lang === 'th' ? 'โครงการใหม่' : 'New Project'}
        </button>
      </div>

      <div className="bg-white p-3 rounded-lg border border-slate-200 flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'th' ? 'ค้นหาชื่อโครงการ, ลูกค้า, เจ้าของ, ฝ่ายขาย, ผจก.โครงการ...' : 'Search projects, customers, owners, sales, managers...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0061FF] focus:bg-white transition-all"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-500 hover:text-slate-800'}`}
            title={lang === 'th' ? 'มุมมองแบบรายการ' : 'List View'}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-[#0061FF]' : 'text-slate-500 hover:text-slate-800'}`}
            title={lang === 'th' ? 'มุมมองแบบกริด' : 'Grid View'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => {
            const duration = project.startDate && project.endDate 
              ? differenceInDays(parseISO(project.endDate), parseISO(project.startDate)) 
              : 0;

            const projectScopes = data.scopes.filter(s => s.projectId === project.id);
            const progress = projectScopes.length > 0 
              ? Math.round(projectScopes.reduce((sum, s) => sum + s.progress, 0) / projectScopes.length)
              : 0;

            return (
              <div 
                key={project.id}
                onClick={() => navigate(`projects/${project.id}/info`)}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:border-[#0061FF] cursor-pointer transition-all group flex flex-col relative"
              >
                <button
                  onClick={(e) => deleteProject(project.id, e)}
                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all z-10"
                  title={lang === 'th' ? 'ลบโครงการ' : 'Delete Project'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex-1 pr-6">
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-[#0061FF] transition-colors line-clamp-1">{project.name}</h3>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-[#FF5E00]" />
                      <span className="text-xs line-clamp-2 leading-tight">{project.location || (lang === 'th' ? 'ไม่มีการตั้งค่าสถานที่' : 'No location set')}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-3.5 h-3.5 text-[#0061FF]" />
                      <span className="text-xs">
                        {project.startDate ? format(parseISO(project.startDate), 'dd/MM/yy') : 'TBD'} 
                        {' - '} 
                        {project.endDate ? format(parseISO(project.endDate), 'dd/MM/yy') : 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#22C55E] h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">
                        <span className="text-slate-700">{duration} {lang === 'th' ? 'วัน' : 'days'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#0061FF] font-medium text-xs group-hover:translate-x-1 transition-transform">
                        {lang === 'th' ? 'จัดการ' : 'Manage'} <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[800px]">
            <thead className="bg-[#F1F5F9] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold">{lang === 'th' ? 'ชื่อโครงการ' : 'Project Name'}</th>
                <th className="p-3 font-semibold">{lang === 'th' ? 'สถานที่' : 'Location'}</th>
                <th className="p-3 font-semibold">{lang === 'th' ? 'ความคืบหน้า' : 'Progress'}</th>
                <th className="p-3 font-semibold">{lang === 'th' ? 'ระยะเวลา' : 'Duration'}</th>
                <th className="p-3 font-semibold">{lang === 'th' ? 'จำนวนวัน' : 'Days'}</th>
                <th className="p-3 font-semibold text-right">{lang === 'th' ? 'จัดการ' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map((project) => {
                const duration = project.startDate && project.endDate 
                  ? differenceInDays(parseISO(project.endDate), parseISO(project.startDate)) 
                  : 0;
                
                const projectScopes = data.scopes.filter(s => s.projectId === project.id);
                const progress = projectScopes.length > 0 
                  ? Math.round(projectScopes.reduce((sum, s) => sum + s.progress, 0) / projectScopes.length)
                  : 0;

                return (
                  <tr 
                    key={project.id}
                    onClick={() => navigate(`projects/${project.id}/info`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 font-medium text-slate-800">{project.name}</td>
                    <td className="p-3 text-slate-600 text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5E00]" />
                        <span className="line-clamp-1">{project.location || (lang === 'th' ? 'ไม่มีการตั้งค่าสถานที่' : 'No location set')}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#22C55E] h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="font-semibold text-slate-500 w-7">{progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#0061FF]" />
                        <span>
                          {project.startDate ? format(parseISO(project.startDate), 'dd/MM/yy') : 'TBD'} 
                          {' - '} 
                          {project.endDate ? format(parseISO(project.endDate), 'dd/MM/yy') : 'TBD'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">{duration} {lang === 'th' ? 'วัน' : 'days'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`projects/${project.id}/info`);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title={lang === 'th' ? 'จัดการ' : 'Manage'}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => deleteProject(project.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title={lang === 'th' ? 'ลบโครงการ' : 'Delete Project'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">{lang === 'th' ? 'ไม่พบโครงการ' : 'No projects found'}</h3>
          <p className="text-slate-500 mt-1">{lang === 'th' ? 'ลองค้นหาด้วยคำอื่นหรือสร้างโครงการใหม่' : 'Try a different search term or create a new project.'}</p>
        </div>
      )}
    </div>
  );
}
