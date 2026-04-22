import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import Reports from './pages/Reports';
import ReportDetails from './pages/ReportDetails';
import ReportForm from './components/ReportForm';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import CitizenDashboard from './pages/CitizenDashboard';
import ChatPage from './pages/ChatPage';
import GISMapPage from './pages/GISMapPage';
import ContactPage from './pages/ContactPage';        
import OverviewPage from './pages/OverviewPage';       
import ResourcesPage from './pages/ResourcesPage'; 
import VolunteerPage from './pages/VolunteerPage';
import VolunteersAdminPage from './pages/VolunteersAdminPage';
import PartnersAdminPage from './pages/PartnersAdminPage';
import PartnershipPage from './pages/PartnershipPage';
import { ThemeProvider } from './context/ThemeContext';
import NotificationsPage from './pages/NotificationsPage';


function PrivateRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role > 2) return <Navigate to="/dashboard" />;
  return children;
}

export default function App(){
  return (
    <ThemeProvider> 
    <AuthProvider>
      <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm/>} />
          <Route path="/signup" element={<SignupForm/>} />
          <Route path="/reports" element={<PrivateRoute><Reports/></PrivateRoute>} />
          <Route path="/reports/new" element={<PrivateRoute><ReportForm/></PrivateRoute>} />
          <Route path="/reports/:id" element={<PrivateRoute><ReportDetails/></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard/></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><AdminDashboard/></PrivateRoute>} />
          <Route path="/coordinator" element={<PrivateRoute><CoordinatorDashboard/></PrivateRoute>} />
          <Route path="/volunteer" element={<PrivateRoute><VolunteerDashboard/></PrivateRoute>} />
          <Route path="/citizen" element={<PrivateRoute><CitizenDashboard/></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage/></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/reports" />} />
          <Route path="*" element={<Navigate to="/reports" />} />
          <Route path="/map" element={<GISMapPage />} />
          <Route path="/overview" element={<OverviewPage />} />      
          <Route path="/contact" element={<ContactPage />} />        
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/volunteer-apply" element={<VolunteerPage />} />
          <Route path="/partner" element={<PartnershipPage />} />
          <Route path="/admin/volunteers" element={<AdminRoute><VolunteersAdminPage /></AdminRoute>} />
          <Route path="/admin/partners"   element={<AdminRoute><PartnersAdminPage /></AdminRoute>} />
          <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider> 
    
  );
}
