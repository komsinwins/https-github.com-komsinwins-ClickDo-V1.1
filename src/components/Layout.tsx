import { useState, ReactNode, useRef } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  Bell,
  Menu,
  Globe,
  Download,
  Upload
} from 'lucide-react';
import { useAppStore } from '../store';
import { differenceInDays, parseISO } from 'date-fns';

interface SidebarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export function Sidebar({ currentRoute, navigate }: SidebarProps) {
  const { data } = useAppStore();
  const lang = data.language || 'th';

  const menuItems = [
    { id: 'dashboard', label: lang === 'th' ? 'แผงควบคุม' : 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: lang === 'th' ? 'โครงการ' : 'Projects', icon: FolderKanban },
    { id: 'master', label: lang === 'th' ? 'ข้อมูลหลัก' : 'Master Data', icon: Users },
  ];

  return (
    <div className="w-[220px] bg-slate-800 text-white h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="text-2xl font-extrabold tracking-tighter text-white flex items-baseline">
          ClickDo<span className="text-xs opacity-60 ml-1">V1.1</span>
        </div>
        <p className="text-[10px] italic text-[#FF5E00] mt-1">"Click to Plan, Do to Win"</p>
      </div>
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id || currentRoute.startsWith(item.id + '/');
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-[13px] transition-all ${
                isActive
                  ? 'bg-white/10 border-l-4 border-[#FF5E00] opacity-100'
                  : 'opacity-70 hover:opacity-100 hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-6 border-t border-white/10">
        <div className="text-[13px] font-bold text-center">WIN SECURITY SERVICE COMPANY LIMITED</div>
      </div>
    </div>
  );
}

export function Header() {
  const { data, updateData } = useAppStore();
  const today = new Date();
  const lang = data.language || 'th';
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const endingSoon = data.projects.filter(p => {
    if (!p.endDate || p.actualCompletionDate) return false;
    const daysLeft = differenceInDays(parseISO(p.endDate), today);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `clickdo_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (window.confirm(lang === 'th' ? "ยืนยันการคืนค่าข้อมูล? ข้อมูลปัจจุบันจะถูกเขียนทับ" : "Confirm restore? Current data will be replaced.")) {
          updateData(parsed);
          alert(lang === 'th' ? "สำรองข้อมูลสำเร็จ" : "Restore successful");
        }
      } catch(err) {
        alert(lang === 'th' ? "ไฟล์สำรองข้อมูลไม่ถูกต้อง" : "Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <h2 className="text-lg font-semibold text-slate-800">
        {lang === 'th' ? 'การจัดการโครงการ' : 'Project Management'}
      </h2>
      <div className="flex items-center gap-4">
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={importData}
        />
        <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 p-1.5 px-3 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors text-sm font-medium border border-slate-200"
            title={lang === 'th' ? 'นำเข้าข้อมูล' : 'Import Backup'}
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={exportData}
            className="flex items-center gap-1.5 p-1.5 px-3 bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition-colors text-sm font-medium border border-slate-200"
            title={lang === 'th' ? 'สำรองข้อมูล' : 'Export Backup'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => updateData({ language: lang === 'th' ? 'en' : 'th' })}
          className="flex items-center gap-2 p-1.5 px-3 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
        >
          <Globe className="w-4 h-4" />
          {lang === 'th' ? 'EN' : 'TH'}
        </button>

        <div className="relative group cursor-pointer flex items-center">
          {endingSoon.length > 0 && (
            <div className="mr-5 text-xs text-red-500 flex items-center">
              ⚠️ {lang === 'th' ? 'ใกล้ครบกำหนดใน 7 วัน' : 'Ending within 7 days'} 
              <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-2 font-bold">{endingSoon.length}</span>
            </div>
          )}
          <div className="p-1.5 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">
            <Bell className="w-4 h-4 text-slate-600" />
          </div>
          
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 p-3 hidden group-hover:block z-50">
            <h3 className="font-semibold text-slate-800 mb-2 text-xs uppercase">{lang === 'th' ? 'การแจ้งเตือน' : 'Notifications'}</h3>
            {endingSoon.length === 0 ? (
              <p className="text-xs text-slate-500">{lang === 'th' ? 'ไม่มีโครงการที่ใกล้ครบกำหนด' : 'No projects ending soon.'}</p>
            ) : (
              <div className="space-y-2">
                {endingSoon.map(p => (
                  <div key={p.id} className="text-xs p-2 bg-red-50 text-red-800 rounded border border-red-100">
                    <span className="font-bold">{p.name}</span> {lang === 'th' ? `จะสิ้นสุดใน ${differenceInDays(parseISO(p.endDate), today)} วัน!` : `ends in ${differenceInDays(parseISO(p.endDate), today)} days!`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Layout({ children, currentRoute, navigate }: { children: ReactNode; currentRoute: string; navigate: (r: string) => void }) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar currentRoute={currentRoute} navigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
