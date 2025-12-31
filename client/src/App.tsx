import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Intro from "@/pages/intro";
import Home from "@/pages/home";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminManagement from "@/pages/admin-management";
import SystemAdminPage from "@/pages/system-admin";
import ConversationView from "@/pages/ConversationView";
import FeedbackView from "@/pages/FeedbackView";
import HelpPage from "@/pages/HelpPage";
import NotFound from "@/pages/not-found";
import Explore from "@/pages/Explore";
import ProfileSettings from "@/pages/ProfileSettings";
import PersonaChat from "@/pages/PersonaChat";
import Conversations from "@/pages/Conversations";
import CreatePersona from "@/pages/CreatePersona";
import { AuthPage } from "@/pages/AuthPage";

function ContentManagementRedirect() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    let adminTab = "manage-scenarios";
    if (tab === "manage-personas" || tab === "personas") adminTab = "manage-personas";
    else if (tab === "manage-scenarios" || tab === "scenarios") adminTab = "manage-scenarios";
    else if (tab === "difficulty" || tab === "difficulty-settings") adminTab = "difficulty-settings";
    setLocation(`/admin-management?tab=${adminTab}`, { replace: true });
  }, [setLocation]);
  
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem("redirectAfterAuth", location);
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem("redirectAfterAuth", location);
      setLocation("/auth");
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== "admin" && user?.role !== "operator") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">접근 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return <Component />;
}

function MainRouter() {
  return (
    <Switch>
      <Route path="/" component={Explore} />
      <Route path="/explore" component={Explore} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/persona/:personaId/chat">
        {() => <ProtectedRoute component={PersonaChat} />}
      </Route>
      <Route path="/intro" component={Intro} />
      <Route path="/home">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/profile-settings">
        {() => <ProtectedRoute component={ProfileSettings} />}
      </Route>
      <Route path="/settings/profile">
        {() => <ProtectedRoute component={ProfileSettings} />}
      </Route>
      <Route path="/chat/:conversationId">
        {() => <ProtectedRoute component={ConversationView} />}
      </Route>
      <Route path="/feedback/:conversationId">
        {() => <ProtectedRoute component={FeedbackView} />}
      </Route>
      <Route path="/admin">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin-dashboard">
        {() => <AdminRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin-management">
        {() => <ProtectedRoute component={AdminManagement} />}
      </Route>
      {/* content-management redirects to library */}
      <Route path="/content-management" component={ContentManagementRedirect} />
      <Route path="/system-admin">
        {() => <AdminRoute component={SystemAdminPage} />}
      </Route>
      <Route path="/help" component={HelpPage} />
      {/* library redirects to admin-management */}
      <Route path="/library" component={ContentManagementRedirect} />
      <Route path="/conversations">
        {() => <ProtectedRoute component={Conversations} />}
      </Route>
      <Route path="/create-persona">
        {() => <ProtectedRoute component={CreatePersona} />}
      </Route>
      <Route path="/create-persona/:personaId">
        {() => <ProtectedRoute component={CreatePersona} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
          <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4 h-12 sm:h-14">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <div className="flex-1 overflow-auto w-full">
            <MainRouter />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppLayout />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
