import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp, Clock, Star, FileText, Sparkles, User, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";

type SortType = "trending" | "new" | "top";

// SNS 스타일 숫자 포맷팅 (1K, 1.2M 등)
function formatSNSNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

interface PersonaStats {
  personaId: string;
  creatorId: string | null;
  creatorName: string;
  totalTurns: number;
  likesCount: number;
  dislikesCount: number;
}

interface ScenarioStats {
  scenarioId: string;
  creatorId: string | null;
  creatorName: string;
  likesCount: number;
  dislikesCount: number;
}

interface Scenario {
  id: string;
  name?: string;
  title?: string;
  tagline?: string | null;
  description?: string | null;
  difficulty?: number | null;
  tags?: string[];
  viewCount?: number;
  usageCount?: number;
  createdAt?: string;
  visibility?: "public" | "private";
}

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
  name: string;
  mbtiType?: string;
  mbti?: string;
  gender: string;
  profileImage?: string;
  description?: string;
  createdAt?: string;
  images?: PersonaImages;
  visibility?: "public" | "private";
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const difficultyLabels = ["", "입문", "기본", "도전", "고급"];
  const difficultyColors = ["", "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"];

  // 시나리오 통계 조회
  const { data: stats } = useQuery<ScenarioStats>({
    queryKey: ['/api/scenarios', scenario.id, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenario.id}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 30000,
  });
  
  // 사용자 반응 조회
  const { data: myReaction } = useQuery<{ reaction: 'like' | 'dislike' | null }>({
    queryKey: ['/api/scenarios', scenario.id, 'my-reaction'],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenario.id}/my-reaction`);
      if (!res.ok) {
        if (res.status === 401) return { reaction: null };
        throw new Error("Failed to fetch reaction");
      }
      return res.json();
    },
    staleTime: 30000,
  });
  
  // 반응 토글 mutation
  const reactMutation = useMutation({
    mutationFn: async (type: 'like' | 'dislike') => {
      return apiRequest('POST', `/api/scenarios/${scenario.id}/react`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scenarios', scenario.id, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scenarios', scenario.id, 'my-reaction'] });
    },
  });
  
  const handleReaction = (e: React.MouseEvent, type: 'like' | 'dislike') => {
    e.stopPropagation();
    reactMutation.mutate(type);
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => setLocation(`/scenario/${scenario.id}`)}
      data-testid={`card-scenario-${scenario.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{scenario.name}</CardTitle>
          {scenario.difficulty && (
            <Badge className={difficultyColors[scenario.difficulty]}>
              {difficultyLabels[scenario.difficulty]}
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {scenario.tagline || scenario.description || "설명 없음"}
        </CardDescription>
        {stats?.creatorName && stats.creatorName !== "Unknown" && (
          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-scenario-creator-${scenario.id}`}>
            by @{stats.creatorName}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {(scenario.tags || []).slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {formatSNSNumber(scenario.usageCount)}회 사용
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleReaction(e, 'like')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                myReaction?.reaction === 'like'
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300 border border-green-400/50'
                  : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
              }`}
              data-testid={`button-scenario-like-${scenario.id}`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.likesCount || 0)}</span>
            </button>
            <button
              onClick={(e) => handleReaction(e, 'dislike')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                myReaction?.reaction === 'dislike'
                  ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-400/50'
                  : 'bg-muted text-muted-foreground border border-transparent hover:bg-muted/80'
              }`}
              data-testid={`button-scenario-dislike-${scenario.id}`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.dislikesCount || 0)}</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonaCard({ persona }: { persona: Persona }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const mbtiDisplay = persona.mbtiType || persona.mbti || "";
  const displayName = persona.name || mbtiDisplay || "Unknown";
  
  // 페르소나 통계 조회
  const { data: stats } = useQuery<PersonaStats>({
    queryKey: ['/api/personas', persona.id, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/personas/${persona.id}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 30000,
  });
  
  // 사용자 반응 조회
  const { data: myReaction } = useQuery<{ reaction: 'like' | 'dislike' | null }>({
    queryKey: ['/api/personas', persona.id, 'my-reaction'],
    queryFn: async () => {
      const res = await fetch(`/api/personas/${persona.id}/my-reaction`);
      if (!res.ok) {
        if (res.status === 401) return { reaction: null };
        throw new Error("Failed to fetch reaction");
      }
      return res.json();
    },
    staleTime: 30000,
  });
  
  // 반응 토글 mutation
  const reactMutation = useMutation({
    mutationFn: async (type: 'like' | 'dislike') => {
      return apiRequest('POST', `/api/personas/${persona.id}/react`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personas', persona.id, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personas', persona.id, 'my-reaction'] });
    },
  });
  
  // 페르소나 기본 표정 이미지 가져오기
  const getPersonaImage = () => {
    if (!persona.images) return null;
    
    const gender = persona.gender || 'male';
    const genderImages = persona.images[gender as 'male' | 'female'];
    
    if (genderImages?.expressions?.['중립']) {
      return genderImages.expressions['중립'];
    }
    
    if (persona.images.base) {
      return persona.images.base;
    }
    
    return null;
  };
  
  const personaImage = getPersonaImage();
  
  const handleClick = () => {
    setLocation(`/persona/${persona.id}/chat`);
  };
  
  const handleReaction = (e: React.MouseEvent, type: 'like' | 'dislike') => {
    e.stopPropagation();
    reactMutation.mutate(type);
  };

  // MBTI 타입별 그라데이션 색상
  const getMbtiGradient = (mbti: string) => {
    const mbtiLower = mbti.toLowerCase();
    const gradients: Record<string, string> = {
      'intj': 'from-indigo-600 via-purple-600 to-violet-700',
      'intp': 'from-cyan-500 via-blue-500 to-indigo-600',
      'entj': 'from-amber-500 via-orange-500 to-red-600',
      'entp': 'from-yellow-400 via-orange-400 to-pink-500',
      'infj': 'from-purple-500 via-pink-500 to-rose-500',
      'infp': 'from-pink-400 via-purple-400 to-indigo-500',
      'enfj': 'from-emerald-400 via-teal-500 to-cyan-600',
      'enfp': 'from-orange-400 via-pink-500 to-purple-600',
      'istj': 'from-slate-500 via-gray-600 to-zinc-700',
      'isfj': 'from-rose-400 via-pink-400 to-fuchsia-500',
      'estj': 'from-blue-600 via-indigo-600 to-violet-700',
      'esfj': 'from-pink-500 via-rose-500 to-red-500',
      'istp': 'from-gray-500 via-slate-600 to-zinc-700',
      'isfp': 'from-green-400 via-emerald-500 to-teal-600',
      'estp': 'from-red-500 via-orange-500 to-yellow-500',
      'esfp': 'from-fuchsia-500 via-pink-500 to-rose-500',
    };
    return gradients[mbtiLower] || 'from-slate-600 via-gray-700 to-zinc-800';
  };
  
  return (
    <div 
      className="group relative cursor-pointer"
      onClick={handleClick}
      data-testid={`card-persona-${persona.id}`}
    >
      {/* 카드 컨테이너 - 인스타그램 스타일 */}
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg transition-all duration-500 group-hover:shadow-2xl group-hover:scale-[1.02]">
        
        {/* 배경 이미지 또는 그라데이션 */}
        {personaImage ? (
          <>
            <img 
              src={personaImage} 
              alt={displayName}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* 다크 오버레이 그라데이션 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </>
        ) : (
          /* 이미지 없을 때 MBTI 기반 그라데이션 */
          <div className={`absolute inset-0 bg-gradient-to-br ${getMbtiGradient(mbtiDisplay)}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="w-24 h-24 text-white/30" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          </div>
        )}

        {/* 상단 MBTI 뱃지 */}
        {mbtiDisplay && (
          <div className="absolute top-3 left-3 z-10">
            <div className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
              <span className="text-white font-bold text-sm tracking-wider">{mbtiDisplay}</span>
            </div>
          </div>
        )}

        {/* 상단 우측: 대화 턴 수 */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
            <MessageCircle className="w-3 h-3 text-white" />
            <span className="text-white text-xs font-medium">{formatSNSNumber(stats?.totalTurns || 0)}</span>
          </div>
        </div>

        {/* 하단 정보 영역 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {/* 이름 */}
          <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
            {displayName}
          </h3>
          
          {/* 제작자 ID */}
          {stats?.creatorName && stats.creatorName !== "Unknown" && (
            <p className="text-white/70 text-xs mb-2 drop-shadow-md" data-testid={`text-creator-${persona.id}`}>
              by @{stats.creatorName}
            </p>
          )}
          
          {/* 좋아요/싫어요 버튼 */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleReaction(e, 'like')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                myReaction?.reaction === 'like'
                  ? 'bg-green-500/40 text-green-100 border border-green-400/50'
                  : 'bg-white/20 text-white/90 border border-white/30 hover:bg-white/30'
              }`}
              data-testid={`button-like-${persona.id}`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.likesCount || 0)}</span>
            </button>
            <button
              onClick={(e) => handleReaction(e, 'dislike')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                myReaction?.reaction === 'dislike'
                  ? 'bg-red-500/40 text-red-100 border border-red-400/50'
                  : 'bg-white/20 text-white/90 border border-white/30 hover:bg-white/30'
              }`}
              data-testid={`button-dislike-${persona.id}`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.dislikesCount || 0)}</span>
            </button>
          </div>
        </div>

        {/* 호버 시 반짝이는 효과 */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  );
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("trending");
  const [, setLocation] = useLocation();

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios/public", searchQuery, sortType],
    queryFn: async () => {
      const res = await fetch("/api/scenarios/public");
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      let data = await res.json();
      
      // 클라이언트 측 검색 필터링
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        data = data.filter((s: Scenario) => 
          s.title?.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower)
        );
      }
      
      // 클라이언트 측 정렬
      if (sortType === "trending" || sortType === "new") {
        data = data.slice().reverse();
      }
      
      return data;
    },
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery<Persona[]>({
    queryKey: ["/api/personas/public"],
    queryFn: async () => {
      const res = await fetch("/api/personas/public");
      if (!res.ok) throw new Error("Failed to fetch personas");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">탐색</h1>
            <p className="text-slate-600 mt-1">다양한 페르소나와 시나리오를 찾아보세요</p>
          </div>
          <Button onClick={() => setLocation("/create")} className="gap-2">
            <Sparkles className="h-4 w-4" />
            직접 만들기
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="페르소나 또는 시나리오 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortType === "trending" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortType("trending")}
              className="gap-1"
            >
              <TrendingUp className="h-4 w-4" /> 인기
            </Button>
            <Button
              variant={sortType === "new" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortType("new")}
              className="gap-1"
            >
              <Clock className="h-4 w-4" /> 최신
            </Button>
            <Button
              variant={sortType === "top" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortType("top")}
              className="gap-1"
            >
              <Star className="h-4 w-4" /> 조회순
            </Button>
          </div>
        </div>

        <Tabs defaultValue="personas" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="personas" className="gap-2">
              <User className="h-4 w-4" /> 페르소나
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <FileText className="h-4 w-4" /> 시나리오
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios">
            {loadingScenarios ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 rounded w-full" />
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 공개된 시나리오가 없습니다</h3>
                <p className="text-slate-500 mt-1">첫 번째 시나리오를 만들어보세요!</p>
                <Button className="mt-4" onClick={() => setLocation("/create")}>
                  시나리오 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="personas">
            {loadingPersonas ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse overflow-hidden">
                    <div className="h-full flex flex-col justify-end p-4">
                      <div className="h-5 bg-slate-400/30 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-slate-400/30 rounded w-full mb-1" />
                      <div className="h-3 bg-slate-400/30 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : personas.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 공개된 페르소나가 없습니다</h3>
                <p className="text-slate-500 mt-1">첫 번째 페르소나를 만들어보세요!</p>
                <Button className="mt-4" onClick={() => setLocation("/content-management?tab=manage-personas")}>
                  페르소나 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {personas.map((persona) => (
                  <PersonaCard key={persona.id} persona={persona} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
