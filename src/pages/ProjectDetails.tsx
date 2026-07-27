import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store';
import { ProjectInfo } from './ProjectDetails/ProjectInfo';
import { ScopeOfWork } from './ProjectDetails/ScopeOfWork';
import { Timeline } from './ProjectDetails/Timeline';
import { SchedulePlan } from './ProjectDetails/SchedulePlan';
import { Contractors } from './ProjectDetails/Contractors';
import { WorkersVehicles } from './ProjectDetails/WorkersVehicles';
import { Contacts } from './ProjectDetails/Contacts';
import { Reports } from './ProjectDetails/Reports';
import { Closeout } from './ProjectDetails/Closeout';
import { Files } from './ProjectDetails/Files';

interface Props {
  projectId: string;
  tab: string;
  navigate: (route: string) => void;
}

export function ProjectDetails({ projectId, tab, navigate }: Props) {
  const { data } = useAppStore();
  const lang = data.language || 'th';
  const project = data.projects.find(p => p.id === projectId);

  if (!project) {
    return <div>Project not found</div>;
  }

  const tabs = [
    { id: 'info', label: lang === 'th' ? 'ข้อมูลโครงการ' : 'Info' },
    { id: 'scope', label: lang === 'th' ? 'ขอบเขตงาน' : 'Scope of Work' },
    { id: 'timeline', label: lang === 'th' ? 'ตารางเวลา (Gantt)' : 'Timeline (Gantt)' },
    { id: 'schedule', label: lang === 'th' ? 'แผนงาน' : 'Schedule Plan' },
    { id: 'contractors', label: lang === 'th' ? 'ผู้รับเหมา' : 'Contractors' },
    { id: 'workers', label: lang === 'th' ? 'คนงาน & ยานพาหนะ' : 'Workers & Vehicles' },
    { id: 'contacts', label: lang === 'th' ? 'รายชื่อติดต่อ' : 'Contacts' },
    { id: 'reports', label: lang === 'th' ? 'รายงาน' : 'Reports' },
    { id: 'closeout', label: lang === 'th' ? 'รายงานสรุปโครงการ' : 'Project Summary Report' },
    { id: 'files', label: lang === 'th' ? 'ไฟล์' : 'Files' },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3 mb-4 shrink-0">
        <button 
          onClick={() => navigate('projects')}
          className="p-1 hover:bg-slate-200 rounded transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">{project.name || 'Untitled Project'}</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 flex flex-col flex-1 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50 shrink-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`projects/${projectId}/${t.id}`)}
              className={`whitespace-nowrap py-2.5 px-4 text-xs font-semibold text-center transition-colors focus:outline-none border-b-2 ${
                tab === t.id
                  ? 'bg-white text-[#0061FF] border-[#0061FF]'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          {tab === 'info' && <ProjectInfo projectId={projectId} />}
          {tab === 'scope' && <ScopeOfWork projectId={projectId} />}
          {tab === 'timeline' && <Timeline projectId={projectId} />}
          {tab === 'schedule' && <SchedulePlan projectId={projectId} />}
          {tab === 'contractors' && <Contractors projectId={projectId} />}
          {tab === 'workers' && <WorkersVehicles projectId={projectId} />}
          {tab === 'contacts' && <Contacts projectId={projectId} />}
          {tab === 'reports' && <Reports projectId={projectId} />}
          {tab === 'closeout' && <Closeout projectId={projectId} />}
          {tab === 'files' && <Files projectId={projectId} />}
        </div>
      </div>
    </div>
  );
}

