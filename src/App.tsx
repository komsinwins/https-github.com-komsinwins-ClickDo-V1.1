/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { MasterData } from './pages/MasterData';
import { ProjectDetails } from './pages/ProjectDetails';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');

  const navigate = (route: string) => {
    setCurrentRoute(route);
  };

  const renderContent = () => {
    if (currentRoute === 'dashboard') return <Dashboard />;
    if (currentRoute === 'projects') return <Projects navigate={navigate} />;
    if (currentRoute === 'master') return <MasterData />;
    
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
      {renderContent()}
    </Layout>
  );
}
