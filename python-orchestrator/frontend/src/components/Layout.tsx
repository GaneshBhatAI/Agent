import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { RunJobModal } from './RunJobModal';
import { AddMachineModal } from './AddMachineModal';

export const Layout: React.FC = () => {
  const [isRunJobOpen, setIsRunJobOpen] = useState<boolean>(false);
  const [isAddMachineOpen, setIsAddMachineOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onOpenRunJob={() => setIsRunJobOpen(true)}
          onOpenAddMachine={() => setIsAddMachineOpen(true)}
        />

        {/* Page View Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet context={{ openRunJob: () => setIsRunJobOpen(true), openAddMachine: () => setIsAddMachineOpen(true) }} />
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <RunJobModal isOpen={isRunJobOpen} onClose={() => setIsRunJobOpen(false)} />
      <AddMachineModal isOpen={isAddMachineOpen} onClose={() => setIsAddMachineOpen(false)} />
    </div>
  );
};
