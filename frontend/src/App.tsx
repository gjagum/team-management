import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import Login from './pages/Login.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import Layout from './components/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Leaves from './pages/Leaves.tsx';
import Overtime from './pages/Overtime.tsx';
import Users from './pages/Users.tsx';
import Employees from './pages/Employees.tsx';
import EmployeeDetail from './pages/EmployeeDetail.tsx';
import Schedules from './pages/Schedules.tsx';
import Settings from './pages/Settings.tsx';
import RBACManagement from './pages/RBACManagement.tsx';
import Teams from './pages/Teams.tsx';
import Timesheets from './pages/Timesheets.tsx';
import { NotificationProvider } from './contexts/NotificationContext.tsx';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
}


function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <SettingsProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="leaves" element={<Leaves />} />
              <Route path="overtime" element={<Overtime />} />
              <Route path="users" element={<Users />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="settings" element={<Settings />} />
              <Route path="rbac" element={<RBACManagement />} />
              <Route path="timesheets" element={<Timesheets />} />
              <Route path="teams" element={<Teams />} />
            </Route>
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
