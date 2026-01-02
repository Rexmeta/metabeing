import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // 로그인 성공 시 리다이렉트
  useEffect(() => {
    if (isAuthenticated) {
      // 저장된 이전 경로가 있으면 그곳으로, 없으면 홈으로
      const redirectTo = sessionStorage.getItem("redirectAfterAuth") || "/home";
      sessionStorage.removeItem("redirectAfterAuth");
      setLocation(redirectTo);
    }
  }, [isAuthenticated, setLocation]);

  const handleGuestTrial = () => {
    setLocation("/explore");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="text-app-title">
            AI 역할극 훈련 시스템
          </h1>
          <p className="text-gray-600 dark:text-gray-300" data-testid="text-app-description">
            커뮤니케이션 스킬 향상을 위한 전문적인 AI 대화 훈련
          </p>
        </div>

        {isLoginMode ? (
          <LoginForm onSwitchToRegister={() => setIsLoginMode(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLoginMode(true)} />
        )}
        
        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-2 text-gray-500 dark:text-gray-400">
                또는
              </span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="mt-4 w-full gap-2"
            onClick={handleGuestTrial}
            data-testid="button-guest-trial"
          >
            <MessageCircle className="w-4 h-4" />
            먼저 둘러보기
          </Button>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            페르소나와 시나리오를 미리 확인해보세요
          </p>
        </div>
      </div>
    </div>
  );
}