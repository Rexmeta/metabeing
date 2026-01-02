import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";

interface GuestSession {
  conversationCount: number;
  turnCount: number;
  maxConversations: number;
  maxTurnsPerConversation: number;
  remainingConversations: number;
  allowedPersonas: string[];
}

const GUEST_ALLOWED_PERSONAS = ["ISTJ", "ENFP", "ENTJ"];

export function useGuestSession() {
  const { isAuthenticated } = useAuth();
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGuestSession = useCallback(async () => {
    if (isAuthenticated) {
      setGuestSession(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/guest/session", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("게스트 세션 초기화 실패");
      }

      const data = await res.json();
      setGuestSession({
        conversationCount: data.session?.conversationCount || 0,
        turnCount: data.session?.turnCount || 0,
        maxConversations: data.limits?.maxConversations || 3,
        maxTurnsPerConversation: data.limits?.maxTurnsPerConversation || 5,
        remainingConversations: data.limits?.maxConversations - (data.session?.conversationCount || 0),
        allowedPersonas: GUEST_ALLOWED_PERSONAS,
      });
      setError(null);
    } catch (err) {
      console.error("Guest session error:", err);
      setError("게스트 세션을 불러올 수 없습니다");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchGuestSession();
  }, [fetchGuestSession]);

  const refreshSession = useCallback(async () => {
    await fetchGuestSession();
  }, [fetchGuestSession]);

  const isPersonaAvailable = useCallback((personaId: string): boolean => {
    if (isAuthenticated) return true;
    if (!guestSession) return false;
    
    const mbtiType = personaId.toUpperCase();
    return guestSession.allowedPersonas.includes(mbtiType);
  }, [isAuthenticated, guestSession]);

  const canStartConversation = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (!guestSession) return false;
    return guestSession.remainingConversations > 0;
  }, [isAuthenticated, guestSession]);

  const getRemainingTurns = useCallback((currentConversationTurns: number): number => {
    if (isAuthenticated) return Infinity;
    if (!guestSession) return 0;
    return Math.max(0, guestSession.maxTurnsPerConversation - currentConversationTurns);
  }, [isAuthenticated, guestSession]);

  return {
    isGuest: !isAuthenticated,
    guestSession,
    isLoading,
    error,
    refreshSession,
    isPersonaAvailable,
    canStartConversation,
    getRemainingTurns,
    allowedPersonas: GUEST_ALLOWED_PERSONAS,
  };
}
