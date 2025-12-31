import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useCallback } from "react";
import { User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatWindow from "@/components/ChatWindow";
import PersonaLoadingState from "@/components/PersonaLoadingState";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ComplexScenario, ScenarioPersona } from "@/lib/scenario-system";

interface PersonaImages {
  base?: string;
  style?: string;
  male?: {
    expressions?: Record<string, string>;
  };
  female?: {
    expressions?: Record<string, string>;
  };
}

interface PersonaRunData {
  id: string;
  personaId: string;
  personaName?: string;
  personaSnapshot: any;
  scenarioRunId: string;
  status: string;
  mode: string;
  difficulty: number;
  turnCount: number;
}

interface ScenarioRunData {
  id: string;
  scenarioId?: string;
  scenarioName: string;
  conversationType: string;
}

interface ChatMessageData {
  id: string;
  sender: string;
  message: string;
  emotion?: string;
  emotionReason?: string;
  createdAt: string;
}

export default function ConversationView() {
  const [, params] = useRoute("/chat/:conversationId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const personaRunId = params?.conversationId;
  const [showChat, setShowChat] = useState(false);

  const { data: personaRun, isLoading: prLoading } = useQuery<PersonaRunData>({
    queryKey: ["/api/persona-runs", personaRunId],
    enabled: !!personaRunId,
  });

  const { data: scenarioRun, isLoading: srLoading } = useQuery<ScenarioRunData>({
    queryKey: ["/api/scenario-runs", personaRun?.scenarioRunId],
    enabled: !!personaRun?.scenarioRunId,
  });

  const { data: messages = [], isLoading: msgLoading } = useQuery<ChatMessageData[]>({
    queryKey: ["/api/persona-runs", personaRunId, "messages"],
    enabled: !!personaRunId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const isLoading = prLoading || srLoading || msgLoading;

  useEffect(() => {
    if (!isLoading && personaRun && scenarioRun) {
      setTimeout(() => setShowChat(true), 100);
    }
  }, [isLoading, personaRun, scenarioRun]);

  const getProfileImage = useCallback((snapshot: any) => {
    if (!snapshot) return null;
    const gender = snapshot.gender || 'female';
    const genderKey = gender.toLowerCase() === 'male' ? 'male' : 'female';
    
    if (snapshot.images?.[genderKey]?.expressions?.base) {
      return snapshot.images[genderKey].expressions.base;
    }
    if (snapshot.images?.base) {
      return snapshot.images.base;
    }
    if (snapshot.profileImage) {
      return snapshot.profileImage;
    }
    return null;
  }, []);

  const dummyScenario = useMemo((): ComplexScenario | null => {
    if (!personaRun || !scenarioRun) return null;
    const snapshot = personaRun.personaSnapshot || {};
    return {
      id: scenarioRun.scenarioId || '',
      title: scenarioRun.scenarioName || "자유 대화",
      description: `${snapshot.name || personaRun.personaId} 페르소나와의 대화`,
      context: {
        situation: `${snapshot.name || personaRun.personaId}와 대화하는 상황입니다.`,
        timeline: "제한 없음",
        stakes: "자유 대화",
        playerRole: {
          position: "사용자",
          department: "일반",
          experience: "N/A",
          responsibility: "자유 대화"
        }
      },
      objectives: ["자유롭게 대화하기"],
      successCriteria: {
        optimal: "좋은 대화",
        good: "보통 대화",
        acceptable: "대화 진행",
        failure: "N/A"
      },
      personas: [personaRun.personaId],
      recommendedFlow: [personaRun.personaId],
      difficulty: personaRun.difficulty || 2,
      estimatedTime: "무제한",
      skills: ["의사소통"]
    };
  }, [personaRun, scenarioRun]);

  const personaSnapshotForChat = useMemo((): ScenarioPersona | null => {
    if (!personaRun) return null;
    const snapshot = personaRun.personaSnapshot || {};
    return {
      id: snapshot.id || personaRun.personaId,
      name: snapshot.name || personaRun.personaName || personaRun.personaId,
      mbti: snapshot.mbti || "",
      role: snapshot.role || "대화 상대",
      department: snapshot.department || "일반",
      experience: "N/A",
      gender: snapshot.gender === "male" ? "male" : snapshot.gender === "female" ? "female" : undefined,
      personality: {
        traits: snapshot.personality?.traits || ["친절함"],
        communicationStyle: snapshot.personality?.communicationStyle || "친근한 대화 스타일",
        motivation: snapshot.personality?.motivation || "대화 상대와의 소통",
        fears: snapshot.personality?.fears || [],
      },
      background: {
        education: "N/A",
        previousExperience: "N/A",
        majorProjects: [],
        expertise: []
      },
      currentSituation: {
        workload: "보통",
        pressure: "낮음",
        concerns: [],
        position: snapshot.role || "대화 상대"
      },
      communicationPatterns: snapshot.communicationPatterns || {
        openingStyle: "친근하게 인사",
        keyPhrases: [],
        responseToArguments: {},
        winConditions: []
      },
      image: "",
      voice: snapshot.voice || {
        tone: "친근한",
        pace: "보통",
        emotion: "따뜻한"
      }
    };
  }, [personaRun]);

  const initialMessages = useMemo(() => {
    return messages.map((msg) => ({
      sender: msg.sender as 'user' | 'ai',
      message: msg.message,
      timestamp: msg.createdAt || new Date().toISOString(),
      emotion: msg.emotion,
      emotionReason: msg.emotionReason
    }));
  }, [messages]);

  const handleChatComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/active-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/persona-runs", personaRunId] });
    queryClient.invalidateQueries({ queryKey: ["/api/scenario-runs"] });
    toast({
      title: "대화 완료",
      description: "대화가 성공적으로 완료되었습니다.",
    });

    // 시나리오 기반 대화인 경우 피드백 페이지로, 개별 페르소나 대화인 경우 대화 목록으로
    if (scenarioRun?.conversationType === 'persona_direct') {
      // 페르소나 직접 대화는 피드백 없이 대화 목록으로
      setLocation("/conversations");
    } else {
      // 시나리오 대화는 피드백 페이지로
      setLocation(`/feedback/${personaRunId}`);
    }
  };

  const handleExit = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/active-conversations"] });
    setLocation("/conversations");
  };

  const snapshot = personaRun?.personaSnapshot;
  const profileImage = getProfileImage(snapshot);
  const personaName = snapshot?.name || personaRun?.personaName || personaRun?.personaId;
  const mbtiDisplay = snapshot?.mbti || personaRun?.personaId?.toUpperCase();

  if (isLoading) {
    return (
      <PersonaLoadingState
        profileImage={profileImage}
        personaName={personaName}
        mbtiDisplay={mbtiDisplay}
        loadingMessage="대화 불러오는 중..."
      />
    );
  }

  if (!personaRun || !dummyScenario || !personaSnapshotForChat) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6 max-w-md w-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium text-sm sm:text-base">대화를 찾을 수 없습니다</p>
          <Button onClick={() => setLocation("/conversations")} variant="outline" data-testid="button-back-conversations" className="text-sm sm:text-base">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            대화 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 페르소나 직접 대화인지 시나리오 대화인지 구분
  const isPersonaDirectChat = scenarioRun?.conversationType === 'persona_direct';

  return (
    <div className={`h-full w-full relative transition-opacity duration-300 ${showChat ? 'opacity-100' : 'opacity-0'}`}>
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshotForChat}
        conversationId={personaRun.id}
        personaRunId={personaRun.id}
        onChatComplete={handleChatComplete}
        onExit={handleExit}
        initialChatMode="messenger"
        isPersonaChat={isPersonaDirectChat}
        initialMessages={initialMessages}
        personaId={personaRun.personaId}
      />
    </div>
  );
}
