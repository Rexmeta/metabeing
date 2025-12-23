import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ComplexScenario, ScenarioPersona } from "@/lib/scenario-system";

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

  // personaRun 조회
  const { data: personaRun, isLoading: prLoading } = useQuery<PersonaRunData>({
    queryKey: ["/api/persona-runs", personaRunId],
    enabled: !!personaRunId,
  });

  // scenarioRun 조회
  const { data: scenarioRun, isLoading: srLoading } = useQuery<ScenarioRunData>({
    queryKey: ["/api/scenario-runs", personaRun?.scenarioRunId],
    enabled: !!personaRun?.scenarioRunId,
  });

  // 채팅 메시지 조회
  const { data: messages = [], isLoading: msgLoading } = useQuery<ChatMessageData[]>({
    queryKey: ["/api/persona-runs", personaRunId, "messages"],
    enabled: !!personaRunId,
  });

  const isLoading = prLoading || srLoading || msgLoading;

  // ChatWindow용 더미 시나리오 생성
  const dummyScenario = useMemo((): ComplexScenario | null => {
    if (!personaRun || !scenarioRun) return null;
    const personaSnapshot = personaRun.personaSnapshot || {};
    return {
      id: scenarioRun.scenarioId || '',
      title: scenarioRun.scenarioName || "자유 대화",
      description: `${personaSnapshot.name || personaRun.personaId} 페르소나와의 대화`,
      context: {
        situation: `${personaSnapshot.name || personaRun.personaId}와 대화하는 상황입니다.`,
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

  // ChatWindow용 페르소나 스냅샷 생성
  const personaSnapshot = useMemo((): ScenarioPersona | null => {
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

  // 초기 메시지 변환
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
    toast({
      title: "대화 완료",
      description: "대화가 성공적으로 완료되었습니다.",
    });
    setLocation("/conversations");
  };

  const handleExit = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/active-conversations"] });
    setLocation("/conversations");
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">대화 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!personaRun || !dummyScenario || !personaSnapshot) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">대화를 찾을 수 없습니다.</p>
          <Button onClick={() => setLocation("/conversations")} data-testid="button-back-conversations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            대화 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 완료된 대화는 읽기 전용으로 표시
  const isCompleted = personaRun.status === 'completed';

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full relative">
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshot}
        conversationId={personaRun.id}
        onChatComplete={handleChatComplete}
        onExit={handleExit}
        isPersonaChat={true}
        initialMessages={initialMessages}
      />
    </div>
  );
}
