/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useAppStore } from './store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { MasterData } from './pages/MasterData';
import { ProjectDetails } from './pages/ProjectDetails';
import { ProjectSummary } from './pages/ProjectSummary';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const { syncError } = useAppStore();

  const navigate = (route: string) => {
    setCurrentRoute(route);
  };

  const renderContent = () => {
    if (currentRoute === 'dashboard') return <Dashboard navigate={navigate} />;
    if (currentRoute === 'projects') return <Projects navigate={navigate} />;
    if (currentRoute === 'master') return <MasterData />;
    if (currentRoute === 'project-summary') return <ProjectSummary navigate={navigate} />;
    
    if (currentRoute.startsWith('projects/')) {
      const parts = currentRoute.split('/');
      const projectId = parts[1];
      const tab = parts[2] || 'info';
      return <ProjectDetails projectId={projectId} tab={tab} navigate={navigate} />;
    }

    return <div>Page Not Found</div>;
  };

  return (
    <Layout currentRoute={currentRoute} navigate={navigate}>
      {syncError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">ไม่สามารถซิงค์ข้อมูลกับฐานข้อมูลได้ (Firebase Error)</h3>
            <p className="text-sm text-red-700 mt-1">{syncError}</p>
            <div className="text-sm text-red-700 mt-2">
              <strong>วิธีแก้ไข (สำหรับกรณีที่ 1):</strong>
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li>ไปที่ <b>Firebase Console</b> {'>'} โปรเจกต์ <b>clickdo11</b></li>
                <li>เลือกเมนู <b>Firestore Database</b> จากแถบด้านซ้าย</li>
                <li>คลิกที่แท็บ <b>Rules</b></li>
                <li>เปลี่ยนโค้ดด้านในให้เป็น:<br />
                  <code className="block bg-red-100 p-2 mt-1 rounded text-xs">
                    rules_version = '2';<br/>
                    service cloud.firestore {'{'}<br/>
                    &nbsp;&nbsp;match /databases/{"{database}"}/documents {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;match /{"{document=**}"} {'{'}<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if true;<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                    &nbsp;&nbsp;{'}'}<br/>
                    {'}'}
                  </code>
                </li>
                <li>คลิกปุ่ม <b>Publish</b></li>
                <li>รีเฟรชหน้านี้ใหม่</li>
              </ol>
            </div>
          </div>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}
