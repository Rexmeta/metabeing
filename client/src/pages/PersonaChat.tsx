import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import PersonaLoadingState from "@/components/PersonaLoadingState";
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

interface Persona {
  id: string;
  name?: string;
  personaKey?: string;
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
  images?: PersonaImages;
}

interface PersonaChatSession {
  id: string;
  personaRunId: string;
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
  const [showChat, setShowChat] = useState(false);

  const { data: persona, isLoading: loadingPersona, error: personaError } = useQuery<Persona>({
    queryKey: ["/api/admin/personas", params.personaId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/personas/${params.personaId}`);
      if (!res.ok) throw new Error("Failed to fetch persona");
      return res.json();
    },
    enabled: !!params.personaId,
    staleTime: 60000,
  });

  const getProfileImage = useCallback((p: Persona | undefined) => {
    if (!p) return null;
    const gender = p.gender || 'female';
    const genderKey = gender.toLowerCase() === 'male' ? 'male' : 'female';
    
    if (p.images?.[genderKey]?.expressions?.base) {
      return p.images[genderKey].expressions.base;
    }
    if (p.images?.base) {
      return p.images.base;
    }
    if (p.profileImage) {
      return p.profileImage;
    }
    return null;
  }, []);

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
    personaKey: session.personaSnapshot.personaKey || session.personaSnapshot.mbti || "",
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
        console.log(`🎭 페르소나 채팅 시작: personaId=${params.personaId}`);
        const response = await apiRequest("POST", "/api/persona-chat", {
          personaId: params.personaId,
          mode: "text",
          difficulty: 2
        });

        const session = await response.json();
        console.log(`📦 세션 응답 받음:`, {
          id: session.id,
          isResumed: session.isResumed,
          messagesCount: session.messages?.length || 0,
          messages: session.messages
        });
        setChatSession(session);

        setTimeout(() => setShowChat(true), 100);
      } catch (error) {
        console.error("페르소나 대화 생성 실패:", error);
        toast({
          title: "오류",
          description: "대화를 시작할 수 없습니다.",
          variant: "destructive",
        });
        setLocation("/explore");
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
    setLocation("/conversations");
  };

  const handleExit = () => {
    setLocation("/explore");
  };

  const profileImage = getProfileImage(persona);
  const personaKeyDisplay = persona?.personaKey || persona?.mbtiType || persona?.mbti || params.personaId?.toUpperCase();

  if (loadingPersona || isCreating || !chatSession) {
    return (
      <PersonaLoadingState
        profileImage={profileImage}
        personaName={persona?.name}
        mbtiDisplay={personaKeyDisplay}
        loadingMessage={loadingPersona ? "정보 불러오는 중..." : "대화 준비 중..."}
      />
    );
  }

  if (personaError || !persona) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="text-center space-y-4 p-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <User className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium">페르소나를 찾을 수 없습니다</p>
          <Button onClick={() => setLocation("/explore")} variant="outline" data-testid="button-back-explore">
            <ArrowLeft className="h-4 w-4 mr-2" />
            탐색으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const dummyScenario = createDummyScenario(chatSession);
  const personaSnapshot = createPersonaSnapshotForChat(chatSession);

  const initialMessages = (chatSession.messages || []).map((msg: any) => ({
    sender: msg.sender as 'user' | 'ai',
    message: msg.message,
    timestamp: msg.timestamp || new Date().toISOString(),
    emotion: msg.emotion,
    emotionReason: msg.emotionReason
  }));

  console.log(`📨 initialMessages 생성:`, {
    sessionMessagesCount: chatSession.messages?.length || 0,
    initialMessagesCount: initialMessages.length,
    firstMessage: initialMessages[0],
    isResumed: chatSession.isResumed
  });

  return (
    <div className={`h-full w-full relative transition-opacity duration-300 ${showChat ? 'opacity-100' : 'opacity-0'}`}>
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshot}
        conversationId={chatSession.id}
        personaRunId={chatSession.personaRunId}
        onChatComplete={handleChatComplete}
        onExit={handleExit}
        initialChatMode="messenger"
        isPersonaChat={true}
        initialMessages={initialMessages}
      />
    </div>
  );
}
