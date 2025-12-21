import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-gray-600">로그인이 필요합니다.</p>
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
      <Route path="/chat/:conversationId">
        {() => <ProtectedRoute component={ConversationView} />}
      </Route>
      <Route path="/feedback/:conversationId">
        {() => <ProtectedRoute component={FeedbackView} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin-dashboard">
        {() => <ProtectedRoute component={AdminDashboard} />}
      </Route>
      <Route path="/admin-management">
        {() => <ProtectedRoute component={AdminManagement} />}
      </Route>
      <Route path="/ai-generator">
        {() => <ProtectedRoute component={AIGeneratorPage} />}
      </Route>
      <Route path="/system-admin">
        {() => <ProtectedRoute component={SystemAdminPage} />}
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <MainRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
