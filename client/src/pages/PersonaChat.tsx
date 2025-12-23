import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import type { ComplexScenario, ScenarioPersona } from "@/lib/scenario-system";

interface Persona {
  id: string;
  name?: string;
  mbtiType?: string;
  mbti?: string;
  gender: string;
  profileImage?: string;
  description?: string;
  position?: string;
  department?: string;
  personality_traits?: string[];
  communication_style?: string;
  motivation?: string;
  fears?: string[];
  background?: any;
  communication_patterns?: any;
  voice?: any;
}

interface PersonaChatSession {
  id: string;
  personaRunId: string; // 실제 DB의 persona_runs.id - chatMessages 저장용
  scenarioId: string;
  scenarioName: string;
  personaId: string;
  personaSnapshot: any;
  messages: any[];
  turnCount: number;
  status: string;
  mode: string;
  difficulty: number;
  isPersonaChat: boolean;
}

export default function PersonaChat() {
  const params = useParams<{ personaId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [chatSession, setChatSession] = useState<PersonaChatSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: persona, isLoading: loadingPersona, error: personaError } = useQuery<Persona>({
    queryKey: ["/api/admin/personas", params.personaId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/personas/${params.personaId}`);
      if (!res.ok) throw new Error("Failed to fetch persona");
      return res.json();
    },
    enabled: !!params.personaId,
  });

  const createDummyScenario = (session: PersonaChatSession): ComplexScenario => ({
    id: session.scenarioId,
    title: session.scenarioName,
    description: `${session.personaSnapshot.name} 페르소나와의 자유 대화`,
    context: {
      situation: `${session.personaSnapshot.name}와 자유롭게 대화하는 상황입니다.`,
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
    personas: [session.personaId],
    recommendedFlow: [session.personaId],
    difficulty: session.difficulty,
    estimatedTime: "무제한",
    skills: ["의사소통"]
  });

  const createPersonaSnapshotForChat = (session: PersonaChatSession): ScenarioPersona => ({
    id: session.personaSnapshot.id,
    name: session.personaSnapshot.name,
    mbti: session.personaSnapshot.mbti || "",
    role: session.personaSnapshot.role || "AI 대화 상대",
    department: session.personaSnapshot.department || "일반",
    experience: "N/A",
    gender: session.personaSnapshot.gender === "male" ? "male" : session.personaSnapshot.gender === "female" ? "female" : undefined,
    personality: {
      traits: session.personaSnapshot.personality?.traits || ["친절함", "대화를 즐김"],
      communicationStyle: session.personaSnapshot.personality?.communicationStyle || "친근하고 열린 대화 스타일",
      motivation: session.personaSnapshot.personality?.motivation || "대화 상대와의 소통",
      fears: session.personaSnapshot.personality?.fears || [],
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
      position: session.personaSnapshot.role || "대화 상대"
    },
    communicationPatterns: session.personaSnapshot.communicationPatterns || {
      openingStyle: "친근하게 인사",
      keyPhrases: [],
      responseToArguments: {},
      winConditions: []
    },
    image: "",
    voice: session.personaSnapshot.voice || {
      tone: "친근한",
      pace: "보통",
      emotion: "따뜻한"
    }
  });

  useEffect(() => {
    const startPersonaChat = async () => {
      if (!persona || chatSession || isCreating) return;

      setIsCreating(true);
      try {
        const response = await apiRequest("POST", "/api/persona-chat", {
          personaId: params.personaId,
          mode: "text",
          difficulty: 2
        });
        
        const session = await response.json();
        setChatSession(session);
      } catch (error) {
        console.error("페르소나 대화 생성 실패:", error);
        toast({
          title: "오류",
          description: "대화를 시작할 수 없습니다.",
          variant: "destructive",
        });
        setLocation("/");
      } finally {
        setIsCreating(false);
      }
    };

    startPersonaChat();
  }, [persona, chatSession, isCreating, params.personaId]);

  const handleChatComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    toast({
      title: "대화 완료",
      description: "대화가 성공적으로 완료되었습니다.",
    });
    setLocation("/");
  };

  const handleExit = () => {
    setLocation("/");
  };

  if (loadingPersona || isCreating || !chatSession) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {loadingPersona ? "페르소나 정보 로딩 중..." : "대화 준비 중..."}
          </p>
        </div>
      </div>
    );
  }

  if (personaError || !persona) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">페르소나를 찾을 수 없습니다.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const dummyScenario = createDummyScenario(chatSession);
  const personaSnapshot = createPersonaSnapshotForChat(chatSession);

  // 초기 메시지 변환
  const initialMessages = (chatSession.messages || []).map((msg: any) => ({
    sender: msg.sender as 'user' | 'ai',
    message: msg.message,
    timestamp: msg.timestamp || new Date().toISOString(),
    emotion: msg.emotion,
    emotionReason: msg.emotionReason
  }));

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full relative">
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshot}
        conversationId={chatSession.id}
        personaRunId={chatSession.personaRunId} // 실제 DB의 persona_runs.id - chatMessages 저장용
        onChatComplete={handleChatComplete}
        onExit={handleExit}
        initialChatMode="character"
        isPersonaChat={true}
        initialMessages={initialMessages}
      />
    </div>
  );
}
