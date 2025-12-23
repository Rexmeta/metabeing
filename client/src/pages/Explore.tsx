import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp, Clock, Star, FileText, Sparkles, User, ThumbsUp, ThumbsDown, MessageCircle, ChevronRight, Flame, Heart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
  image?: string | null;
  introVideoUrl?: string | null;
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
  viewCount?: number;
  usageCount?: number;
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const difficultyLabels = ["", "입문", "기본", "도전", "고급"];
  const difficultyColors = ["", "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"];

  const { data: stats } = useQuery<ScenarioStats>({
    queryKey: ['/api/scenarios', scenario.id, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios/${scenario.id}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 30000,
  });

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
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden flex-shrink-0 w-[280px]"
      onClick={() => setLocation(`/scenario/${scenario.id}`)}
      data-testid={`card-scenario-${scenario.id}`}
    >
      <div className="relative aspect-video bg-muted">
        {scenario.image ? (
          <img 
            src={scenario.image} 
            alt={scenario.title || scenario.name || '시나리오'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
            <FileText className="w-12 h-12 text-primary/50" />
          </div>
        )}
        {scenario.difficulty && (
          <Badge className={`absolute top-2 right-2 ${difficultyColors[scenario.difficulty]}`}>
            {difficultyLabels[scenario.difficulty]}
          </Badge>
        )}
      </div>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base line-clamp-1">{scenario.title || scenario.name}</CardTitle>
        {stats?.creatorName && stats.creatorName !== "Unknown" && (
          <p className="text-xs text-muted-foreground" data-testid={`text-scenario-creator-${scenario.id}`}>
            by @{stats.creatorName}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Sparkles className="h-3 w-3" /> {formatSNSNumber(scenario.usageCount || 0)}
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
  
  const getProfileImage = () => {
    const gender = persona.gender || 'female';
    const genderKey = gender.toLowerCase() === 'male' ? 'male' : 'female';
    
    if (persona.images?.[genderKey]?.expressions?.base) {
      return persona.images[genderKey].expressions.base;
    }
    if (persona.images?.base) {
      return persona.images.base;
    }
    if (persona.profileImage) {
      return persona.profileImage;
    }
    return null;
  };
  
  const profileImage = getProfileImage();
  const mbti = persona.mbtiType || persona.mbti || persona.id?.toUpperCase();

  const { data: stats } = useQuery<PersonaStats>({
    queryKey: ['/api/personas', persona.id, 'stats'],
    queryFn: async () => {
      const res = await fetch(`/api/personas/${persona.id}/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 30000,
  });

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
  
  const reactMutation = useMutation({
    mutationFn: async (type: 'like' | 'dislike') => {
      return apiRequest('POST', `/api/personas/${persona.id}/react`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personas', persona.id, 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personas', persona.id, 'my-reaction'] });
    },
  });
  
  const handleReaction = (e: React.MouseEvent, type: 'like' | 'dislike') => {
    e.stopPropagation();
    reactMutation.mutate(type);
  };

  return (
    <div 
      className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group flex-shrink-0 w-[180px]"
      onClick={() => setLocation(`/persona/${persona.id}`)}
      data-testid={`card-persona-${persona.id}`}
    >
      {profileImage ? (
        <img 
          src={profileImage} 
          alt={persona.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <User className="w-16 h-16 text-primary/50" />
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-lg line-clamp-1">{persona.name}</h3>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
            {mbti}
          </Badge>
        </div>
        
        {persona.description && (
          <p className="text-sm text-white/80 line-clamp-2 mb-2">{persona.description}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {formatSNSNumber(stats?.totalTurns || 0)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleReaction(e, 'like')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                myReaction?.reaction === 'like'
                  ? 'bg-green-500/30 text-green-300'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              data-testid={`button-persona-like-${persona.id}`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.likesCount || 0)}</span>
            </button>
            <button
              onClick={(e) => handleReaction(e, 'dislike')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                myReaction?.reaction === 'dislike'
                  ? 'bg-red-500/30 text-red-300'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              data-testid={`button-persona-dislike-${persona.id}`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>{formatSNSNumber(stats?.dislikesCount || 0)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, onViewAll }: { icon: any; title: string; onViewAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      {onViewAll && (
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1">
          전체 보기 <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default function Explore() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/scenarios/public"],
    queryFn: async () => {
      const res = await fetch("/api/scenarios/public");
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      return res.json();
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

  const recommendedPersonas = personas.slice(0, 10);
  const popularPersonas = [...personas].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 10);
  const trendingPersonas = [...personas].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 10);

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

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="페르소나 또는 시나리오 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        <div className="space-y-10">
          {/* 1. 추천 섹션 */}
          <section>
            <SectionHeader icon={Star} title="추천" />
            {loadingPersonas ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] w-[180px] flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : recommendedPersonas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">추천 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {recommendedPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </section>

          {/* 2. 시나리오 섹션 */}
          <section>
            <SectionHeader icon={FileText} title="시나리오" />
            {loadingScenarios ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-[280px] flex-shrink-0">
                    <Card className="animate-pulse">
                      <div className="aspect-video bg-slate-200" />
                      <CardHeader>
                        <div className="h-5 bg-slate-200 rounded w-3/4" />
                      </CardHeader>
                    </Card>
                  </div>
                ))}
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 공개된 시나리오가 없습니다</h3>
                <Button className="mt-4" onClick={() => setLocation("/create")}>
                  시나리오 만들기
                </Button>
              </div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {scenarios.map((scenario) => (
                    <ScenarioCard key={scenario.id} scenario={scenario} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </section>

          {/* 3. 맞춤 추천 섹션 */}
          <section>
            <SectionHeader icon={Heart} title="맞춤 추천" />
            {loadingPersonas ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] w-[180px] flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : personas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">맞춤 추천 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {personas.slice(0, 10).map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </section>

          {/* 4. 인기 섹션 */}
          <section>
            <SectionHeader icon={TrendingUp} title="인기" />
            {loadingPersonas ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] w-[180px] flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : popularPersonas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">인기 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {popularPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </section>

          {/* 5. 인기 트렌드 섹션 */}
          <section>
            <SectionHeader icon={Flame} title="인기 트렌드" />
            {loadingPersonas ? (
              <div className="flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] w-[180px] flex-shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            ) : trendingPersonas.length === 0 ? (
              <div className="text-center py-8 text-slate-500">트렌드 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {trendingPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
