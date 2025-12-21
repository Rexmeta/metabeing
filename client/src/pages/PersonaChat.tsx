import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import ChatWindow from "@/components/ChatWindow";
import type { ComplexScenario, ScenarioPersona } from "@/lib/scenario-system";

interface Persona {
  id: string;
  name: string;
  mbtiType: string;
  gender: string;
  profileImage?: string;
  description?: string;
  personaData?: any;
}

export default function PersonaChat() {
  const params = useParams<{ personaId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
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

  const createDummyScenario = (persona: Persona): ComplexScenario => ({
    id: `persona-chat-${persona.id}`,
    title: `${persona.name}와의 대화`,
    description: persona.description || `${persona.name} 페르소나와의 자유 대화`,
    context: {
      situation: `${persona.name}와 자유롭게 대화하는 상황입니다.`,
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
    personas: [persona.id],
    recommendedFlow: [persona.id],
    difficulty: 2,
    estimatedTime: "무제한",
    skills: ["의사소통"]
  });

  const createPersonaSnapshot = (persona: Persona): ScenarioPersona => ({
    id: persona.id,
    name: persona.name,
    mbti: persona.mbtiType,
    role: persona.personaData?.role || "AI 대화 상대",
    department: persona.personaData?.department || "일반",
    experience: persona.personaData?.experience || "N/A",
    gender: persona.gender === "male" ? "male" : persona.gender === "female" ? "female" : undefined,
    personality: {
      traits: persona.personaData?.traits || ["친절함", "대화를 즐김"],
      communicationStyle: persona.personaData?.communicationStyle || "친근하고 열린 대화 스타일",
      motivation: persona.personaData?.motivation || "대화 상대와의 소통",
      fears: persona.personaData?.fears || [],
    },
    background: {
      education: persona.personaData?.education || "N/A",
      previousExperience: persona.personaData?.previousExperience || "N/A",
      majorProjects: persona.personaData?.majorProjects || [],
      expertise: persona.personaData?.expertise || []
    },
    currentSituation: {
      workload: persona.personaData?.workload || "보통",
      pressure: persona.personaData?.pressure || "낮음",
      concerns: persona.personaData?.concerns || [],
      position: persona.personaData?.position || "대화 상대"
    },
    communicationPatterns: {
      openingStyle: persona.personaData?.openingStyle || "친근하게 인사",
      keyPhrases: persona.personaData?.keyPhrases || [],
      responseToArguments: persona.personaData?.responseToArguments || {},
      winConditions: persona.personaData?.winConditions || []
    },
    image: persona.profileImage || "",
    voice: {
      tone: persona.personaData?.voiceTone || "친근한",
      pace: persona.personaData?.voicePace || "보통",
      emotion: persona.personaData?.voiceEmotion || "따뜻한"
    },
    stance: persona.personaData?.stance,
    goal: persona.personaData?.goal,
    tradeoff: persona.personaData?.tradeoff,
  });

  useEffect(() => {
    const startConversation = async () => {
      if (!persona || conversationId || isCreating) return;

      setIsCreating(true);
      try {
        const personaSnapshot = createPersonaSnapshot(persona);
        const dummyScenario = createDummyScenario(persona);

        const conversationData = {
          scenarioId: dummyScenario.id,
          personaId: persona.id,
          personaSnapshot: personaSnapshot,
          scenarioName: dummyScenario.title,
          messages: [],
          turnCount: 0,
          status: "active" as const,
          mode: "realtime_voice" as const,
          difficulty: 2,
          forceNewRun: true,
          isPersonaChat: true,
        };

        const response = await apiRequest("POST", "/api/conversations", conversationData);
        const conversation = await response.json();
        setConversationId(conversation.id);
      } catch (error) {
        console.error("대화 생성 실패:", error);
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

    startConversation();
  }, [persona, conversationId, isCreating]);

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

  if (loadingPersona || isCreating || !conversationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
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

  const dummyScenario = createDummyScenario(persona);
  const personaSnapshot = createPersonaSnapshot(persona);

  return (
    <div className="h-screen w-full">
      <ChatWindow
        scenario={dummyScenario}
        persona={personaSnapshot}
        conversationId={conversationId}
        onChatComplete={handleChatComplete}
        onExit={handleExit}
      />
    </div>
  );
}
