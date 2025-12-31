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
  const [showChat, setShowChat] = useState(false);

  const { data: persona, isLoading: loadingPersona, error: personaError } = useQuery<Persona>({
    queryKey: ["/api/personas", params.personaId],
    queryFn: async () => {
      const res = await fetch(`/api/personas/${params.personaId}`);
      if (!res.ok) throw new Error("Failed to fetch persona");
      return res.json();
    },
    enabled: !!params.personaId,
    staleTime: 60000,
  });

  // 페르소나 대화 세션 시작/재개
  const { data: chatSession, isLoading: loadingSession, error: sessionError } = useQuery<PersonaChatSession>({
    queryKey: ["/api/persona-chat", params.personaId],
    queryFn: async () => {
      const res = await apiRequest('/api/persona-chat', {
        method: 'POST',
        body: JSON.stringify({
          personaId: params.personaId,
          mode: 'realtime_voice'
        }),
      });
      return res;
    },
    enabled: !!params.personaId,
    staleTime: 0, // 항상 최신 데이터 로드
    refetchOnMount: true,
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

  const createDummyScenario = (p: Persona): ComplexScenario => ({
    id: `persona-chat-${p.id}`,
    title: `${p.name}와의 대화`,
    description: `${p.name} 페르소나와의 자유 대화`,
    context: {
      situation: `${p.name}와 자유롭게 대화하는 상황입니다.`,
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
    personas: [p.id],
    recommendedFlow: [p.id],
    difficulty: 2,
    estimatedTime: "무제한",
    skills: ["의사소통"]
  });

  const createPersonaSnapshotForChat = (p: Persona): ScenarioPersona => ({
    id: p.id,
    name: p.name,
    personaKey: p.personaKey || p.mbtiType || p.mbti || "",
    role: p.position || "AI 대화 상대",
    department: p.department || "일반",
    experience: "N/A",
    gender: p.gender === "male" ? "male" : p.gender === "female" ? "female" : undefined,
    personality: {
      traits: p.personality_traits || ["친절함", "대화를 즐김"],
      communicationStyle: p.communication_style || "친근하고 열린 대화 스타일",
      motivation: p.motivation || "대화 상대와의 소통",
      fears: p.fears || [],
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
      position: p.position || "대화 상대"
    },
    communicationPatterns: p.communication_patterns || {
      openingStyle: "친근하게 인사",
      keyPhrases: [],
      responseToArguments: {},
      winConditions: []
    },
    image: "",
    voice: p.voice || {
      tone: "친근한",
      pace: "보통",
      emotion: "따뜻한"
    }
  });

  useEffect(() => {
    if (persona && chatSession) {
      setTimeout(() => setShowChat(true), 100);
    }
  }, [persona, chatSession]);

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

  if (loadingPersona || loadingSession) {
    return (
      <PersonaLoadingState
        profileImage={profileImage}
        personaName={persona?.name}
        mbtiDisplay={personaKeyDisplay}
        loadingMessage="정보 불러오는 중..."
      />
    );
  }

  if (personaError || !persona || sessionError || !chatSession) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="text-center space-y-3 sm:space-y-4 p-4 sm:p-6 max-w-md w-full">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <User className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
          </div>
          <p className="text-destructive font-medium text-sm sm:text-base">
            {personaError ? "페르소나를 찾을 수 없습니다" : "대화 세션을 시작할 수 없습니다"}
          </p>
          <Button onClick={() => setLocation("/explore")} variant="outline" data-testid="button-back-explore" className="text-sm sm:text-base">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            탐색으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  const dummyScenario = createDummyScenario(persona);
  const personaSnapshot = createPersonaSnapshotForChat(persona);

  return (
    <div className={`h-full w-full relative transition-opacity duration-300 ${showChat ? 'opacity-100' : 'opacity-0'}`}>
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshot}
        conversationId={chatSession.personaRunId}
        personaRunId={chatSession.personaRunId}
        onChatComplete={handleChatComplete}
        onExit={handleExit}
        initialChatMode="messenger"
        isPersonaChat={true}
        initialMessages={chatSession.messages || []}
        personaId={params.personaId}
      />
    </div>
  );
}
