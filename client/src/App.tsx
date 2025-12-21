import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
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
import MyPage from "@/pages/MyPage";
import Analytics from "@/pages/Analytics";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminManagement from "@/pages/admin-management";
import AIGeneratorPage from "@/pages/ai-generator";
import SystemAdminPage from "@/pages/system-admin";
import ConversationView from "@/pages/ConversationView";
import FeedbackView from "@/pages/FeedbackView";
import HelpPage from "@/pages/HelpPage";
import NotFound from "@/pages/not-found";
import Explore from "@/pages/Explore";
import Create from "@/pages/Create";
import Library from "@/pages/Library";
import ProfileSettings from "@/pages/ProfileSettings";
import CharacterDetail from "@/pages/CharacterDetail";
import CharacterChat from "@/pages/CharacterChat";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, setShowAuthModal } = useAuth();
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasShownModal) {
      setShowAuthModal(true);
      setHasShownModal(true);
    }
  }, [isLoading, isAuthenticated, hasShownModal, setShowAuthModal]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isAuthenticated, isLoading, setShowAuthModal } = useAuth();
  const [hasShownModal, setHasShownModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasShownModal) {
      setShowAuthModal(true);
      setHasShownModal(true);
    }
  }, [isLoading, isAuthenticated, hasShownModal, setShowAuthModal]);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </div>
    );
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
      <Route path="/character/:id" component={CharacterDetail} />
      <Route path="/character/:id/chat">
        {() => <ProtectedRoute component={CharacterChat} />}
      </Route>
      <Route path="/intro" component={Intro} />
      <Route path="/home">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/mypage">
        {() => <ProtectedRoute component={MyPage} />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={Analytics} />}
      </Route>
      <Route path="/profile-settings">
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
        {() => <AdminRoute component={AdminManagement} />}
      </Route>
      <Route path="/ai-generator">
        {() => <AdminRoute component={AIGeneratorPage} />}
      </Route>
      <Route path="/system-admin">
        {() => <AdminRoute component={SystemAdminPage} />}
      </Route>
      <Route path="/help" component={HelpPage} />
      <Route path="/create">
        {() => <ProtectedRoute component={Create} />}
      </Route>
      <Route path="/library">
        {() => <ProtectedRoute component={Library} />}
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
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-14">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <div className="flex-1 overflow-auto">
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
