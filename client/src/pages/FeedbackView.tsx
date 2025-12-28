import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import PersonalDevelopmentReport from "@/components/PersonalDevelopmentReport";
import { Button } from "@/components/ui/button";

interface ConversationWithScenarioRun {
  id: string;
  scenarioId: string;
  personaId: string;
  scenarioRunId?: string;
  [key: string]: any;
}

export default function FeedbackView() {
  const [, params] = useRoute("/feedback/:conversationId");
  const conversationId = params?.conversationId;
  const [, setLocation] = useLocation();

  const { data: conversation, isLoading: conversationLoading } = useQuery<ConversationWithScenarioRun>({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery<any[]>({
    queryKey: ["/api/scenarios"],
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  // 시나리오 기반 대화인 경우 scenarioRun 정보 가져오기
  const { data: scenarioRuns = [] } = useQuery<any[]>({
    queryKey: ["/api/scenario-runs"],
    enabled: !!conversation?.scenarioRunId,
    staleTime: 1000 * 60 * 5,
  });

  const scenariosMap = useMemo(() => 
    new Map(scenarios.map(s => [s.id, s])),
    [scenarios]
  );

  // 현재 scenarioRun 찾기
  const scenarioRun = useMemo(() => {
    if (!conversation?.scenarioRunId) return null;
    return scenarioRuns.find((sr: any) => sr.id === conversation.scenarioRunId);
  }, [scenarioRuns, conversation?.scenarioRunId]);

  // 시나리오 진행 상태 계산
  const { hasMorePersonas, allPersonasCompleted, completedPersonaIds } = useMemo(() => {
    if (!scenarioRun || !conversation) {
      return { hasMorePersonas: false, allPersonasCompleted: false, completedPersonaIds: [] };
    }
    
    const scenario = scenariosMap.get(conversation.scenarioId);
    const totalPersonas = scenario?.personas?.length || 0;
    
    const completedIds = (scenarioRun.personaRuns || [])
      .filter((pr: any) => pr.status === 'completed')
      .map((pr: any) => pr.personaId);
    
    // 현재 대화 완료 포함
    if (!completedIds.includes(conversation.personaId)) {
      completedIds.push(conversation.personaId);
    }
    
    const completedCount = completedIds.length;
    
    return {
      hasMorePersonas: completedCount < totalPersonas,
      allPersonasCompleted: completedCount >= totalPersonas,
      completedPersonaIds: completedIds
    };
  }, [scenarioRun, conversation, scenariosMap]);

  const isLoading = conversationLoading || scenariosLoading;

  if (isLoading || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">피드백을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const scenario = scenariosMap.get(conversation.scenarioId);
  const persona = scenario?.personas?.find((p: any) => p.id === conversation.personaId);

  if (!scenario || !persona) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-red-600">시나리오 또는 페르소나를 찾을 수 없습니다.</p>
          <p className="text-sm text-gray-500 mt-2">
            Scenario ID: {conversation.scenarioId}, Persona ID: {conversation.personaId}
          </p>
          <Button 
            onClick={() => window.location.href = '/conversations'}
            className="mt-4"
          >
            대화 목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 다음 페르소나와 대화 또는 전략 회고로 이동
  const handleNextPersona = () => {
    if (!conversation.scenarioRunId) {
      setLocation('/home');
      return;
    }
    
    if (allPersonasCompleted) {
      // 전략 회고 페이지로 이동 (Home에서 처리)
      setLocation(`/home?scenarioId=${conversation.scenarioId}&scenarioRunId=${conversation.scenarioRunId}&showStrategyReflection=true`);
    } else {
      // 다음 페르소나 선택 화면으로 이동
      setLocation(`/home?scenarioId=${conversation.scenarioId}&scenarioRunId=${conversation.scenarioRunId}`);
    }
  };

  // 시나리오 기반 대화인 경우 추가 props 전달
  const isScenarioBasedConversation = !!conversation.scenarioRunId;

  return (
    <PersonalDevelopmentReport
      scenario={scenario}
      persona={persona}
      conversationId={conversationId || ""}
      onRetry={() => window.location.reload()}
      onSelectNewScenario={() => setLocation('/home')}
      hasMorePersonas={isScenarioBasedConversation ? hasMorePersonas : undefined}
      allPersonasCompleted={isScenarioBasedConversation ? allPersonasCompleted : undefined}
      onNextPersona={isScenarioBasedConversation ? handleNextPersona : undefined}
    />
  );
}
