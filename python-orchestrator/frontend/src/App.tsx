import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Machines } from './pages/Machines';
import { MachineDetails } from './pages/MachineDetails';
import { Repositories } from './pages/Repositories';
import { Jobs } from './pages/Jobs';
import { JobDetails } from './pages/JobDetails';
import { Schedules } from './pages/Schedules';
import { Credentials } from './pages/Credentials';
import { AuditLogs } from './pages/AuditLogs';
import { Login } from './pages/Login';
import { authService } from './services/auth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = authService.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected App Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="machines" element={<Machines />} />
          <Route path="machines/:machineId" element={<MachineDetails />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobId" element={<JobDetails />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="credentials" element={<Credentials />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
