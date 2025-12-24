import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp, Star, FileText, Sparkles, User, ThumbsUp, ThumbsDown, MessageCircle, ChevronRight, Flame, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const difficultyColors = ["", "bg-green-500/90 text-white", "bg-blue-500/90 text-white", "bg-orange-500/90 text-white", "bg-red-500/90 text-white"];

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
    <div 
      className="cursor-pointer flex-shrink-0 w-[200px] sm:w-[240px] group"
      onClick={() => setLocation(`/home?scenarioId=${scenario.id}`)}
      data-testid={`card-scenario-${scenario.id}`}
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2">
        {scenario.image ? (
          <img 
            src={scenario.image} 
            alt={scenario.title || scenario.name || '시나리오'}
            className="w-full h-full object-cover transition-transform duration-300 group-active:scale-95"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/30">
            <FileText className="w-10 h-10 text-primary/50" />
          </div>
        )}
        {scenario.difficulty && (
          <Badge className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 ${difficultyColors[scenario.difficulty]}`}>
            {difficultyLabels[scenario.difficulty]}
          </Badge>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <h3 className="text-white font-semibold text-sm line-clamp-2 drop-shadow-md">
            {scenario.title || scenario.name}
          </h3>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> {formatSNSNumber(scenario.usageCount || 0)}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => handleReaction(e, 'like')}
            disabled={reactMutation.isPending}
            className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
              myReaction?.reaction === 'like'
                ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                : 'text-muted-foreground'
            }`}
            data-testid={`button-scenario-like-${scenario.id}`}
          >
            <ThumbsUp className="w-2.5 h-2.5" />
            <span>{formatSNSNumber(stats?.likesCount || 0)}</span>
          </button>
          <button
            onClick={(e) => handleReaction(e, 'dislike')}
            disabled={reactMutation.isPending}
            className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full transition-all ${
              myReaction?.reaction === 'dislike'
                ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                : 'text-muted-foreground'
            }`}
            data-testid={`button-scenario-dislike-${scenario.id}`}
          >
            <ThumbsDown className="w-2.5 h-2.5" />
            <span>{formatSNSNumber(stats?.dislikesCount || 0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonaCard({ persona, size = "default" }: { persona: Persona; size?: "default" | "small" }) {
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

  const cardSize = size === "small" ? "w-[140px] sm:w-[160px]" : "w-[160px] sm:w-[180px]";

  return (
    <div 
      className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group flex-shrink-0 ${cardSize}`}
      onClick={() => setLocation(`/persona/${persona.id}`)}
      data-testid={`card-persona-${persona.id}`}
    >
      {profileImage ? (
        <img 
          src={profileImage} 
          alt={persona.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-active:scale-95"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
          <User className="w-12 h-12 text-primary/50" />
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        <div className="flex items-center gap-1.5 mb-1">
          <h3 className="font-bold text-sm sm:text-base line-clamp-1">{persona.name}</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
            {mbti}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/70">
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-2.5 h-2.5" />
            {formatSNSNumber(stats?.totalTurns || 0)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => handleReaction(e, 'like')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-all ${
                myReaction?.reaction === 'like'
                  ? 'bg-green-500/30 text-green-300'
                  : 'bg-white/10'
              }`}
              data-testid={`button-persona-like-${persona.id}`}
            >
              <ThumbsUp className="w-2.5 h-2.5" />
              <span>{formatSNSNumber(stats?.likesCount || 0)}</span>
            </button>
            <button
              onClick={(e) => handleReaction(e, 'dislike')}
              disabled={reactMutation.isPending}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-all ${
                myReaction?.reaction === 'dislike'
                  ? 'bg-red-500/30 text-red-300'
                  : 'bg-white/10'
              }`}
              data-testid={`button-persona-dislike-${persona.id}`}
            >
              <ThumbsDown className="w-2.5 h-2.5" />
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
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        {title}
      </h2>
      {onViewAll && (
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-0.5 text-xs h-8 px-2">
          더보기 <ChevronRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

function LoadingCards({ count = 4, type = "persona" }: { count?: number; type?: "persona" | "scenario" }) {
  if (type === "scenario") {
    return (
      <div className="flex gap-3 overflow-hidden px-1">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="w-[200px] sm:w-[240px] flex-shrink-0">
            <div className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
            <div className="h-3 bg-muted rounded mt-2 w-2/3 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-3 overflow-hidden px-1">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="aspect-[3/4] w-[160px] sm:w-[180px] flex-shrink-0 rounded-2xl bg-muted animate-pulse" />
      ))}
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
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h1 className="text-lg sm:text-xl font-bold">탐색</h1>
            <Button 
              size="sm" 
              onClick={() => setLocation("/create")} 
              className="gap-1 h-8 text-xs sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">만들기</span>
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="py-4 space-y-6">
          <section>
            <SectionHeader icon={Star} title="추천" />
            {loadingPersonas ? (
              <LoadingCards count={5} type="persona" />
            ) : recommendedPersonas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">추천 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2 px-4">
                  {recommendedPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            )}
          </section>

          <section>
            <SectionHeader icon={FileText} title="시나리오" />
            {loadingScenarios ? (
              <LoadingCards count={4} type="scenario" />
            ) : scenarios.length === 0 ? (
              <div className="text-center py-6 px-4">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">공개된 시나리오가 없습니다</p>
                <Button size="sm" onClick={() => setLocation("/create")}>
                  시나리오 만들기
                </Button>
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2 px-4">
                  {scenarios.map((scenario) => (
                    <ScenarioCard key={scenario.id} scenario={scenario} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            )}
          </section>

          <section>
            <SectionHeader icon={Heart} title="맞춤 추천" />
            {loadingPersonas ? (
              <LoadingCards count={5} type="persona" />
            ) : personas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">맞춤 추천이 없습니다</div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2 px-4">
                  {personas.slice(0, 10).map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} size="small" />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            )}
          </section>

          <section>
            <SectionHeader icon={TrendingUp} title="인기" />
            {loadingPersonas ? (
              <LoadingCards count={5} type="persona" />
            ) : popularPersonas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">인기 페르소나가 없습니다</div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2 px-4">
                  {popularPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            )}
          </section>

          <section className="pb-4">
            <SectionHeader icon={Flame} title="트렌드" />
            {loadingPersonas ? (
              <LoadingCards count={5} type="persona" />
            ) : trendingPersonas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">트렌드가 없습니다</div>
            ) : (
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2 px-4">
                  {trendingPersonas.map((persona) => (
                    <PersonaCard key={persona.id} persona={persona} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
