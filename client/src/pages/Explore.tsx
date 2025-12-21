import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, TrendingUp, Clock, Star, FileText, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SortType = "trending" | "new" | "top";

interface Scenario {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  difficulty: number | null;
  tags: string[];
  viewCount: number;
  usageCount: number;
  createdAt: string;
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
}

function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [, setLocation] = useLocation();

  const difficultyLabels = ["", "입문", "기본", "도전", "고급"];
  const difficultyColors = ["", "bg-green-100 text-green-800", "bg-blue-100 text-blue-800", "bg-orange-100 text-orange-800", "bg-red-100 text-red-800"];

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => setLocation(`/scenario/${scenario.id}`)}
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
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {(scenario.tags || []).slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> {scenario.usageCount}회 사용
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonaCard({ persona }: { persona: Persona }) {
  const [, setLocation] = useLocation();
  const mbtiDisplay = persona.mbtiType || persona.mbti || "";
  const displayName = persona.name || mbtiDisplay || "Unknown";
  const displayGender = persona.gender === "male" ? "남성" : persona.gender === "female" ? "여성" : "미지정";
  
  const handleClick = () => {
    setLocation(`/persona/${persona.id}/chat`);
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={handleClick}
      data-testid={`card-persona-${persona.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={persona.profileImage} />
            <AvatarFallback>{displayName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{displayName}</CardTitle>
            <CardDescription className="line-clamp-2">
              {persona.description || "AI 페르소나"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {mbtiDisplay && <Badge variant="secondary" className="text-xs">{mbtiDisplay}</Badge>}
          <Badge variant="outline" className="text-xs">{displayGender}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("trending");
  const [, setLocation] = useLocation();

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/ugc/scenarios", searchQuery, sortType],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort: sortType,
        visibility: "public",
        ...(searchQuery && { query: searchQuery }),
      });
      const res = await fetch(`/api/ugc/scenarios?${params}`);
      if (!res.ok) throw new Error("Failed to fetch scenarios");
      return res.json();
    },
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery<Persona[]>({
    queryKey: ["/api/admin/personas"],
    queryFn: async () => {
      const res = await fetch("/api/admin/personas");
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="flex gap-3">
                        <div className="h-12 w-12 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-200 rounded w-full" />
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : personas.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 생성된 페르소나가 없습니다</h3>
                <p className="text-slate-500 mt-1">첫 번째 페르소나를 만들어보세요!</p>
                <Button className="mt-4" onClick={() => setLocation("/admin-management?tab=manage-personas")}>
                  페르소나 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
