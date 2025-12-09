import { Route, Switch, useLocation } from 'wouter';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PrivateRoute } from '@/components/PrivateRoute';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import DocumentManagement from '@/pages/DocumentManagement';
import ClinicManagement from '@/pages/ClinicManagement';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import UserPortalLogin from '@/pages/UserPortalLogin';
import UserPortalDashboard from '@/pages/UserPortalDashboard';
import NotFound from '@/pages/NotFound';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const isAuthPage = location === '/login' || location === '/signup' || location === '/user-portal-login';
  const isUserPortalDashboard = location === '/user-portal-dashboard';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User Portal Dashboard - separate from admin authentication
  if (isUserPortalDashboard) {
    return (
      <div className="h-full">
        <Switch>
          <Route path="/user-portal-dashboard" component={UserPortalDashboard} />
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  if (isAuthPage || !user) {
    return (
      <div className="h-full">
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/user-portal-login" component={UserPortalLogin} />
          <Route path="/">
            <Login />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
    );
  }

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-full w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-0">
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <Switch>
              <Route path="/">
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              </Route>
              <Route path="/user-management">
                <PrivateRoute>
                  <UserManagement />
                </PrivateRoute>
              </Route>
              <Route path="/document-management">
                <PrivateRoute>
                  <DocumentManagement />
                </PrivateRoute>
              </Route>
              <Route path="/clinic-management">
                <PrivateRoute>
                  <ClinicManagement />
                </PrivateRoute>
              </Route>
              <Route path="/login" component={Login} />
              <Route path="/signup" component={Signup} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="h-full flex flex-col">
          <Toaster />
          <AppContent />
        </div>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App
