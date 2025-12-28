import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageCircle, X, ChevronRight, Sparkles, CalendarDays, Trash2, Users, BarChart3, TrendingUp, Star, Award, Target, Loader2, CheckCircle, AlertCircle, ArrowRight, Minus, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { type ScenarioRun, type PersonaRun } from "@shared/schema";

interface ActiveConversation {
  id: string;
  personaId: string;
  personaName?: string;
  scenarioRun?: {
    scenarioId?: string;
    scenarioName?: string;
  };
  lastMessage?: {
    message: string;
    sender: string;
    createdAt: string;
  } | string;
  lastActivityAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export default function Conversations() {
  const [activeTab, setActiveTab] = useState<"persona" | "scenario" | "analytics">("persona");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scenarioRunToDelete, setScenarioRunToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: activeConversations, isLoading: personaLoading, refetch } = useQuery<ActiveConversation[]>({
    queryKey: ["/api/active-conversations"],
    refetchInterval: 10000,
  });

  const closeMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest("POST", `/api/conversations/${conversationId}/close`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/active-conversations"] });
      await refetch();
      toast({
        title: "대화방 닫힘",
        description: "대화방이 목록에서 제거되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "대화방을 닫는데 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const { data: personas = {} } = useQuery<Record<string, any>>({
    queryKey: ["/api/personas/public"],
    select: (data) => {
      const map: Record<string, any> = {};
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          map[p.id] = p;
        });
      }
      return map;
    },
  });

  const { data: rawScenarioRuns = [], isLoading: scenarioLoading } = useQuery<(ScenarioRun & { personaRuns: PersonaRun[] })[]>({
    queryKey: ['/api/scenario-runs'],
    enabled: !!user,
  });

  const { data: feedbacks = [] } = useQuery<any[]>({
    queryKey: ['/api/feedbacks'],
    enabled: !!user,
  });

  const { data: scenarios = [] } = useQuery<any[]>({
    queryKey: ['/api/scenarios'],
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ['/api/analytics/summary'],
    enabled: !!user,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

  const scenarioRuns = useMemo(() => {
    if (!feedbacks || feedbacks.length === 0) {
      return rawScenarioRuns;
    }
    const feedbackScores: Record<string, number> = {};
    feedbacks.forEach(f => {
      if (f.personaRunId) {
        feedbackScores[f.personaRunId] = f.overallScore || 0;
      }
    });
    return rawScenarioRuns.map(sr => ({
      ...sr,
      personaRuns: (sr.personaRuns || []).map(pr => ({
        ...pr,
        score: pr.score !== null ? pr.score : (feedbackScores[pr.id] || 0)
      }))
    }));
  }, [rawScenarioRuns, feedbacks]);

  const scenariosMap = useMemo(() => {
    const map = new Map<string, any>();
    scenarios.forEach(s => map.set(s.id, s));
    return map;
  }, [scenarios]);

  const getScenarioInfo = (scenarioId: string | null) => {
    if (!scenarioId) return { title: '알 수 없는 시나리오', difficulty: 1, personas: [] };
    return scenariosMap.get(scenarioId) || { title: '알 수 없는 시나리오', difficulty: 1, personas: [] };
  };

  const displayableScenarioRuns = useMemo(() => {
    return scenarioRuns
      .filter(sr => sr.personaRuns && sr.personaRuns.length > 0)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [scenarioRuns]);

  const scenarioAttemptNumbers = useMemo(() => {
    const attemptMap = new Map<string, number>();
    const scenarioCounters: Record<string, number> = {};
    const chronologicalRuns = [...scenarioRuns]
      .filter(sr => sr.personaRuns && sr.personaRuns.length > 0 && sr.scenarioId)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    chronologicalRuns.forEach((run) => {
      const scenarioId = run.scenarioId!;
      if (!scenarioCounters[scenarioId]) {
        scenarioCounters[scenarioId] = 0;
      }
      scenarioCounters[scenarioId]++;
      attemptMap.set(run.id, scenarioCounters[scenarioId]);
    });
    return attemptMap;
  }, [scenarioRuns]);

  const deleteMutation = useMutation({
    mutationFn: async (scenarioRunId: string) => {
      return await apiRequest('DELETE', `/api/scenario-runs/${scenarioRunId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scenario-runs'] });
      toast({
        title: "삭제 완료",
        description: "시나리오 실행 기록이 삭제되었습니다.",
      });
      setScenarioRunToDelete(null);
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "시나리오 실행 기록을 삭제할 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (scenarioRunId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setScenarioRunToDelete(scenarioRunId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scenarioRunToDelete && !deleteMutation.isPending) {
      deleteMutation.mutate(scenarioRunToDelete);
      setDeleteDialogOpen(false);
    }
  };

  const getPersonaImage = (persona: any) => {
    if (!persona?.images) return null;
    const gender = persona.gender || 'male';
    const genderImages = persona.images[gender as 'male' | 'female'];
    return genderImages?.expressions?.['중립'] || persona.images.base || null;
  };

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    
    if (isToday(date)) {
      return format(date, 'a h:mm', { locale: ko });
    } else if (isYesterday(date)) {
      return '어제';
    } else {
      return format(date, 'M월 d일', { locale: ko });
    }
  };

  const personaConversationsCount = activeConversations?.length || 0;
  const scenarioConversationsCount = displayableScenarioRuns.length;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">대화</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "persona" | "scenario" | "analytics")} className="flex-1 flex flex-col">
          <div className="px-2 sm:px-4 pt-3">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="persona" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm" data-testid="tab-persona-chat">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">페르소나</span>
                <span className="xs:hidden">대화</span>
                {personaConversationsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-1.5">
                    {personaConversationsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="scenario" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm" data-testid="tab-scenario-chat">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">시나리오</span>
                <span className="xs:hidden">시나리오 채팅</span>
                {scenarioConversationsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 sm:px-1.5">
                    {scenarioConversationsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs sm:text-sm" data-testid="tab-analytics">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>채팅 분석</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="persona" className="flex-1 overflow-y-auto m-0 mt-2">
            {personaLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : activeConversations && activeConversations.length > 0 ? (
              <div className="divide-y divide-border/50">
                {activeConversations.map((conv) => {
                  const personaInfo = personas[conv.personaId];
                  const personaImage = getPersonaImage(personaInfo);
                  const lastMessageTime = formatMessageTime(conv.lastActivityAt || conv.createdAt);
                  
                  const getLastMessageText = () => {
                    if (!conv.lastMessage) return "대화를 시작해보세요";
                    if (typeof conv.lastMessage === 'string') {
                      return conv.lastMessage;
                    }
                    if (typeof conv.lastMessage === 'object' && conv.lastMessage.message) {
                      return (conv.lastMessage.sender === "user" ? "나: " : "") + conv.lastMessage.message;
                    }
                    return "대화를 시작해보세요";
                  };
                  
                  const hasUnread = (conv.unreadCount ?? 0) > 0;
                  
                  return (
                    <div 
                      key={conv.id}
                      className="relative"
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <Link href={`/chat/${conv.id}`}>
                        <div className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors">
                          <div className="relative flex-shrink-0">
                            {personaImage ? (
                              <img 
                                src={personaImage} 
                                alt={conv.personaName || conv.personaId}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-background shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-lg shadow-sm">
                                {(conv.personaName || conv.personaId).charAt(0).toUpperCase()}
                              </div>
                            )}
                            {hasUnread && (
                              <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-[10px] font-bold px-1 shadow-sm">
                                {conv.unreadCount! > 99 ? '99+' : conv.unreadCount}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className={`font-medium truncate text-sm sm:text-base ${hasUnread ? 'text-foreground' : 'text-foreground/90'}`}>
                                {conv.personaName || conv.personaId}
                              </span>
                              <span className="text-[11px] sm:text-xs text-muted-foreground flex-shrink-0">
                                {lastMessageTime}
                              </span>
                            </div>
                            
                            {conv.scenarioRun?.scenarioName && (
                              <div className="flex items-center gap-1 mb-0.5">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {conv.scenarioRun.scenarioName}
                                </span>
                              </div>
                            )}
                            
                            <p className={`text-xs sm:text-sm truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {getLastMessageText()}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 hidden sm:block" />
                        </div>
                      </Link>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 text-muted-foreground/60 sm:hidden"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm("대화방을 닫으시겠습니까?")) {
                            closeMutation.mutate(conv.id);
                          }
                        }}
                        disabled={closeMutation.isPending}
                        data-testid={`button-close-${conv.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 text-sm">진행 중인 페르소나 대화가 없습니다</p>
                <Link href="/">
                  <Button variant="link" className="text-primary p-0 h-auto text-sm">
                    라이브러리에서 대화 시작하기
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scenario" className="flex-1 overflow-y-auto m-0 mt-2 px-4">
            {scenarioLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : displayableScenarioRuns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 text-sm">완료한 시나리오 대화 기록이 없습니다</p>
                <Link href="/home">
                  <Button variant="link" className="text-primary p-0 h-auto text-sm">
                    시나리오 시작하기
                  </Button>
                </Link>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <Accordion type="multiple" className="w-full">
                    {displayableScenarioRuns.map((scenarioRun) => {
                      const scenarioInfo = getScenarioInfo(scenarioRun.scenarioId);
                      const attemptNumber = scenarioAttemptNumbers.get(scenarioRun.id) || 1;
                      
                      const hasMultiplePersonas = scenarioInfo.personas?.length > 1;
                      const isScenarioCompleted = hasMultiplePersonas 
                        ? (scenarioRun.status === 'completed' && !!scenarioRun.strategyReflection)
                        : scenarioRun.status === 'completed';
                      
                      return (
                        <AccordionItem 
                          key={scenarioRun.id} 
                          value={scenarioRun.id} 
                          data-testid={`scenario-run-${scenarioRun.id}`}
                        >
                          <div className="flex items-center justify-between border-b">
                            <AccordionTrigger className="hover:no-underline flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {scenarioRun.startedAt ? (() => {
                                    const date = new Date(scenarioRun.startedAt);
                                    return !isNaN(date.getTime()) ? format(date, 'yyyy년 MM월 dd일 HH:mm') : '시간 정보 없음';
                                  })() : '시간 정보 없음'}
                                </span>
                                <h3 className="font-semibold text-left">{scenarioInfo.title}</h3>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                                  난이도 {scenarioRun.difficulty || scenarioInfo.difficulty}
                                </Badge>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                  #{attemptNumber}회 시도
                                </Badge>
                                {isScenarioCompleted ? (
                                  <Badge className="bg-green-600">완료</Badge>
                                ) : (
                                  <Badge className="bg-yellow-600">진행 중</Badge>
                                )}
                              </div>
                            </AccordionTrigger>
                            <button
                              onClick={(e) => handleDeleteClick(scenarioRun.id, e)}
                              className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors mr-2"
                              data-testid={`delete-scenario-run-${scenarioRun.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <AccordionContent>
                            <ScenarioRunDetails 
                              scenarioRun={scenarioRun} 
                              scenarioInfo={scenarioInfo}
                              personaRuns={scenarioRun.personaRuns || []}
                              personas={personas}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-y-auto m-0 mt-2 px-2 sm:px-4 pb-4">
            {analyticsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !analyticsData ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2 text-sm">분석할 대화 데이터가 없습니다</p>
                <Link href="/home">
                  <Button variant="link" className="text-primary p-0 h-auto text-sm">
                    첫 대화 시작하기
                  </Button>
                </Link>
              </div>
            ) : (
              <TooltipProvider>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-amber-500" />
                          <span className="text-xs sm:text-sm text-muted-foreground">평균 점수</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">
                          {analyticsData.averageScore?.toFixed(1) || 0}
                          <span className="text-sm font-normal text-muted-foreground">/100</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-xs sm:text-sm text-muted-foreground">총 대화</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">
                          {analyticsData.totalConversations || 0}
                          <span className="text-sm font-normal text-muted-foreground">회</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          {(analyticsData.growthRate || 0) >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs sm:text-sm text-muted-foreground">성장률</span>
                        </div>
                        <div className={`text-xl sm:text-2xl font-bold ${(analyticsData.growthRate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(analyticsData.growthRate || 0) >= 0 ? '+' : ''}{analyticsData.growthRate?.toFixed(1) || 0}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-xs sm:text-sm text-muted-foreground">최고 점수</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">
                          {analyticsData.scoreHistory?.length > 0 
                            ? Math.max(...analyticsData.scoreHistory.map((e: any) => e.score)) 
                            : 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {analyticsData.categoryAverages && (
                    <Card>
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                        <CardTitle className="text-sm sm:text-base">영역별 점수</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
                        {Object.entries(analyticsData.categoryAverages).map(([key, value]) => {
                          const categoryNames: Record<string, string> = {
                            clarity: "명확성",
                            empathy: "공감력",
                            problemSolving: "문제해결",
                            professionalism: "전문성",
                            strategicCommunication: "전략적 소통"
                          };
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs sm:text-sm font-medium">{categoryNames[key] || key}</span>
                                <span className="text-xs sm:text-sm font-semibold">{(value as number).toFixed(1)} / 5.0</span>
                              </div>
                              <Progress value={(value as number) * 20} className="h-2" />
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {analyticsData.scoreHistory && analyticsData.scoreHistory.length > 1 && (
                    <Card>
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                        <CardTitle className="text-sm sm:text-base">점수 추이</CardTitle>
                      </CardHeader>
                      <CardContent className="px-1 sm:px-4 pb-3 sm:pb-4">
                        <div className="w-full h-48 sm:h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={Object.entries(
                                analyticsData.scoreHistory.reduce((acc: Record<string, { scores: number[], date: string }>, entry: any) => {
                                  const dateKey = entry.date;
                                  if (!acc[dateKey]) {
                                    acc[dateKey] = { scores: [], date: dateKey };
                                  }
                                  acc[dateKey].scores.push(entry.score);
                                  return acc;
                                }, {})
                              )
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .map(([_, data]) => {
                                const d = data as { date: string; scores: number[] };
                                const [year, month, day] = d.date.split('-');
                                return {
                                  date: `${month}.${day}`,
                                  score: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
                                };
                              })}
                              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} />
                              <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} style={{ fontSize: '10px' }} />
                              <ChartTooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  fontSize: '12px'
                                }}
                                formatter={(value: any) => [`${value}점`, '평균 점수']}
                              />
                              <Line
                                type="monotone"
                                dataKey="score"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {analyticsData.topStrengths && analyticsData.topStrengths.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                          <CardTitle className="text-sm sm:text-base text-green-600 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            주요 강점
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-2">
                          {analyticsData.topStrengths.slice(0, 3).map((strength: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] sm:text-xs shrink-0">
                                {strength.count}회
                              </Badge>
                              <span className="text-muted-foreground line-clamp-2">{strength.category}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {analyticsData.topImprovements && analyticsData.topImprovements.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
                          <CardTitle className="text-sm sm:text-base text-orange-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            개선 필요
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-2">
                          {analyticsData.topImprovements.slice(0, 3).map((improvement: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-[10px] sm:text-xs shrink-0">
                                {improvement.count}회
                              </Badge>
                              <span className="text-muted-foreground line-clamp-2">{improvement.category}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TooltipProvider>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>시나리오 실행 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 시나리오 실행 기록을 삭제하시겠습니까? 관련된 모든 대화와 피드백이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScenarioRunDetails({ 
  scenarioRun, 
  scenarioInfo,
  personaRuns,
  personas
}: { 
  scenarioRun: ScenarioRun; 
  scenarioInfo: any;
  personaRuns: PersonaRun[];
  personas: Record<string, any>;
}) {
  const completedPersonaRuns = personaRuns.filter(pr => pr.status === 'completed');

  const getPersonaImage = (persona: any) => {
    if (!persona?.images) return null;
    const gender = persona.gender || 'male';
    const genderImages = persona.images[gender as 'male' | 'female'];
    return genderImages?.expressions?.['중립'] || persona.images.base || null;
  };

  return (
    <div className="space-y-4 pt-4">
      {scenarioRun.strategyReflection && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            전략 회고
          </h4>
          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
            {scenarioRun.strategyReflection}
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground">대화 기록</h4>
        {personaRuns.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 대화 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {personaRuns.map((pr) => {
              const personaInfo = personas[pr.personaId];
              const personaImage = getPersonaImage(personaInfo);
              const personaName = personaInfo?.name || pr.personaId;
              
              return (
                <Link key={pr.id} href={`/feedback/${pr.conversationId}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    {personaImage ? (
                      <img 
                        src={personaImage} 
                        alt={personaName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {personaName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{personaName}</span>
                        {pr.status === 'completed' ? (
                          <Badge className="bg-green-600 text-xs">완료</Badge>
                        ) : (
                          <Badge className="bg-yellow-600 text-xs">진행 중</Badge>
                        )}
                      </div>
                      {pr.score !== null && pr.score > 0 && (
                        <div className="text-sm text-muted-foreground">
                          점수: {pr.score}점
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
