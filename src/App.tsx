import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ForcePasswordChange from "@/components/ForcePasswordChange";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import RegisterExit from "./pages/RegisterExit";
import Exits from "./pages/Exits";
import EditExit from "./pages/EditExit";
import ManageNotices from "./pages/ManageNotices";
import ManageUsers from "./pages/ManageUsers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import ManageVehicles from "./pages/ManageVehicles";
import TelegramSettings from "./pages/TelegramSettings";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="ml-2" />
          </header>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

const AuthRedirect = () => {
  const { user, loading, requiresPasswordChange, setRequiresPasswordChange } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !requiresPasswordChange) {
      navigate('/home');
    }
  }, [user, loading, requiresPasswordChange, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requiresPasswordChange) {
    return (
      <ForcePasswordChange
        onPasswordChanged={() => setRequiresPasswordChange(false)}
      />
    );
  }

  if (user) {
    return null;
  }

  return <Auth />;
};

const AppContent = () => {
  const { requiresPasswordChange, setRequiresPasswordChange } = useAuth();

  if (requiresPasswordChange) {
    return (
      <ForcePasswordChange
        onPasswordChanged={() => setRequiresPasswordChange(false)}
      />
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthRedirect />} />
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/home" element={
        <ProtectedRoute>
          <AppLayout>
            <Home />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/register-exit" element={
        <ProtectedRoute>
          <AppLayout>
            <RegisterExit />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/exits" element={
        <ProtectedRoute>
          <AppLayout>
            <Exits />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/exits/:id/edit" element={
        <ProtectedRoute>
          <AppLayout>
            <EditExit />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/vehicles" element={
        <ProtectedRoute>
          <AppLayout>
            <ManageVehicles />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/notices" element={
        <ProtectedRoute>
          <AppLayout>
            <ManageNotices />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <AppLayout>
            <ManageUsers />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/telegram" element={
        <ProtectedRoute>
          <AppLayout>
            <TelegramSettings />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <AppLayout>
            <Profile />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <AppLayout>
            <Settings />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
