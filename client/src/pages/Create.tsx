import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Users, FileText, Save, Send, Sparkles, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [characterForm, setCharacterForm] = useState({
    name: "",
    tagline: "",
    description: "",
    systemPrompt: "",
    tags: "",
    gender: "" as "" | "male" | "female",
    mbti: "",
    personalityTraits: "",
    imageStyle: "professional",
  });

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageGenerationProgress, setImageGenerationProgress] = useState(0);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null);

  const MBTI_TYPES = [
    "ENFJ", "ENFP", "ENTJ", "ENTP",
    "ESFJ", "ESFP", "ESTJ", "ESTP",
    "INFJ", "INFP", "INTJ", "INTP",
    "ISFJ", "ISFP", "ISTJ", "ISTP"
  ];

  const generateCharacterImagesMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      setIsGeneratingImages(true);
      setImageGenerationProgress(0);

      const res = await fetch("/api/images/generate-character-base", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          characterId,
          gender: characterForm.gender,
          mbti: characterForm.mbti || "ENFP",
          personalityTraits: characterForm.personalityTraits 
            ? characterForm.personalityTraits.split(",").map(t => t.trim()).filter(Boolean) 
            : [],
          imageStyle: characterForm.imageStyle || "professional",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "이미지 생성 실패");
      }

      setImageGenerationProgress(30);
      const baseResult = await res.json();
      setGeneratedImageUrl(baseResult.imageUrl);

      setImageGenerationProgress(50);
      const expressionsRes = await fetch("/api/images/generate-character-expressions", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          characterId,
          gender: characterForm.gender,
          mbti: characterForm.mbti || "ENFP",
          personalityTraits: characterForm.personalityTraits 
            ? characterForm.personalityTraits.split(",").map(t => t.trim()).filter(Boolean) 
            : [],
          imageStyle: characterForm.imageStyle || "professional",
        }),
      });

      let expressionsGenerated = false;
      if (!expressionsRes.ok) {
        console.warn("표정 이미지 생성 실패, 기본 이미지만 사용");
      } else {
        setImageGenerationProgress(100);
        expressionsGenerated = true;
      }

      // 캐릭터의 expressionImagesGenerated 필드 업데이트
      if (expressionsGenerated) {
        const updateRes = await fetch(`/api/ugc/characters/${characterId}`, {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({
            expressionImagesGenerated: true,
            profileImage: baseResult.imageUrl,
          }),
        });
        if (!updateRes.ok) {
          console.error("캐릭터 업데이트 실패");
        }
      }

      return { ...baseResult, expressionsGenerated };
    },
    onSuccess: () => {
      setIsGeneratingImages(false);
      queryClient.invalidateQueries({ queryKey: ["/api/ugc/characters"] });
      toast({
        title: "이미지 생성 완료",
        description: "캐릭터 이미지와 표정 이미지가 생성되었습니다.",
      });
      setLocation("/library");
    },
    onError: (error: Error) => {
      setIsGeneratingImages(false);
      toast({
        title: "이미지 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [scenarioForm, setScenarioForm] = useState({
    name: "",
    tagline: "",
    description: "",
    background: "",
    goal: "",
    constraints: "",
    openerMessage: "",
    difficulty: "2",
    tags: "",
  });

  const createCharacterMutation = useMutation({
    mutationFn: async (data: typeof characterForm & { publish?: boolean; generateImages?: boolean }) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/ugc/characters", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          tagline: data.tagline || null,
          description: data.description || null,
          systemPrompt: data.systemPrompt || null,
          tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          gender: data.gender || null,
          mbti: data.mbti || null,
          personalityTraits: data.personalityTraits 
            ? data.personalityTraits.split(",").map(t => t.trim()).filter(Boolean) 
            : [],
          imageStyle: data.imageStyle || null,
          visibility: data.publish ? "public" : "private",
          status: data.publish ? "published" : "draft",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "캐릭터 생성 실패");
      }
      const result = await res.json();
      return { ...result, generateImages: data.generateImages };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ugc/characters"] });
      
      if (data.generateImages && data.id && characterForm.gender) {
        setCreatedCharacterId(data.id);
        generateCharacterImagesMutation.mutate(data.id);
        toast({
          title: "캐릭터 저장됨",
          description: "이미지 생성을 시작합니다...",
        });
      } else {
        toast({
          title: variables.publish ? "캐릭터 공개됨" : "캐릭터 저장됨",
          description: variables.publish 
            ? "캐릭터가 성공적으로 공개되었습니다!"
            : "캐릭터가 임시저장되었습니다.",
        });
        setLocation("/library");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createScenarioMutation = useMutation({
    mutationFn: async (data: typeof scenarioForm & { publish?: boolean }) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/ugc/scenarios", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          tagline: data.tagline || null,
          description: data.description || null,
          background: data.background || null,
          goal: data.goal || null,
          constraints: data.constraints || null,
          openerMessage: data.openerMessage || null,
          difficulty: parseInt(data.difficulty),
          tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          visibility: data.publish ? "public" : "private",
          status: data.publish ? "published" : "draft",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "시나리오 생성 실패");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ugc/scenarios"] });
      toast({
        title: variables.publish ? "시나리오 공개됨" : "시나리오 저장됨",
        description: variables.publish
          ? "시나리오가 성공적으로 공개되었습니다!"
          : "시나리오가 임시저장되었습니다.",
      });
      setLocation("/library");
    },
    onError: (error: Error) => {
      toast({
        title: "오류",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => setLocation("/explore")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> 탐색으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">만들기</h1>
          <p className="text-slate-600 mt-1">나만의 캐릭터 또는 시나리오를 만들어보세요</p>
        </div>

        <Tabs defaultValue="character" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="character" className="flex-1 gap-2">
              <Users className="h-4 w-4" /> 캐릭터 만들기
            </TabsTrigger>
            <TabsTrigger value="scenario" className="flex-1 gap-2">
              <FileText className="h-4 w-4" /> 시나리오 만들기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="character">
            <Card>
              <CardHeader>
                <CardTitle>새 캐릭터</CardTitle>
                <CardDescription>
                  대화에 사용할 캐릭터의 성격과 특성을 정의하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="char-name">캐릭터 이름 *</Label>
                  <Input
                    id="char-name"
                    placeholder="예: 친절한 상담사 김미나"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="char-tagline">한줄 소개</Label>
                  <Input
                    id="char-tagline"
                    placeholder="캐릭터를 한 문장으로 설명해주세요"
                    value={characterForm.tagline}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="char-desc">설명</Label>
                  <Textarea
                    id="char-desc"
                    placeholder="캐릭터의 배경, 특징, 성격을 자세히 설명해주세요"
                    rows={4}
                    value={characterForm.description}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="char-prompt">시스템 프롬프트</Label>
                  <Textarea
                    id="char-prompt"
                    placeholder="AI가 이 캐릭터로 행동할 때 참고할 지침을 작성하세요. 말투, 성격, 지식 범위, 금지사항 등을 포함할 수 있습니다."
                    rows={6}
                    value={characterForm.systemPrompt}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="char-tags">태그 (쉼표로 구분)</Label>
                  <Input
                    id="char-tags"
                    placeholder="예: HR, 상담, 친절함, 협상"
                    value={characterForm.tags}
                    onChange={(e) => setCharacterForm(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    캐릭터 이미지 설정 (선택)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    성별과 MBTI를 선택하면 AI가 캐릭터의 프로필 이미지와 다양한 표정 이미지를 자동 생성합니다.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="char-gender">성별</Label>
                      <Select
                        value={characterForm.gender}
                        onValueChange={(value: "male" | "female") => 
                          setCharacterForm(prev => ({ ...prev, gender: value }))
                        }
                      >
                        <SelectTrigger id="char-gender" data-testid="select-char-gender">
                          <SelectValue placeholder="성별 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">남성</SelectItem>
                          <SelectItem value="female">여성</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="char-mbti">MBTI (선택)</Label>
                      <Select
                        value={characterForm.mbti}
                        onValueChange={(value) => 
                          setCharacterForm(prev => ({ ...prev, mbti: value }))
                        }
                      >
                        <SelectTrigger id="char-mbti" data-testid="select-char-mbti">
                          <SelectValue placeholder="MBTI 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {MBTI_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="char-traits">성격 특성 (쉼표 구분)</Label>
                      <Input
                        id="char-traits"
                        placeholder="예: 차분함, 분석적"
                        value={characterForm.personalityTraits}
                        onChange={(e) => setCharacterForm(prev => ({ ...prev, personalityTraits: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="char-style">이미지 스타일</Label>
                      <Select
                        value={characterForm.imageStyle}
                        onValueChange={(value) => 
                          setCharacterForm(prev => ({ ...prev, imageStyle: value }))
                        }
                      >
                        <SelectTrigger id="char-style" data-testid="select-char-style">
                          <SelectValue placeholder="스타일 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">프로페셔널</SelectItem>
                          <SelectItem value="casual">캐주얼</SelectItem>
                          <SelectItem value="creative">크리에이티브</SelectItem>
                          <SelectItem value="friendly">친근함</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {generatedImageUrl && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">생성된 프로필 이미지</p>
                      <img 
                        src={generatedImageUrl} 
                        alt="생성된 캐릭터 이미지" 
                        className="w-32 h-32 object-cover rounded-lg mx-auto"
                      />
                    </div>
                  )}

                  {isGeneratingImages && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-muted-foreground">이미지 생성 중...</p>
                      <Progress value={imageGenerationProgress} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      disabled={!characterForm.name || createCharacterMutation.isPending || isGeneratingImages}
                      onClick={() => createCharacterMutation.mutate({ ...characterForm, publish: false })}
                      data-testid="button-char-save"
                    >
                      <Save className="h-4 w-4" />
                      임시저장
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      disabled={!characterForm.name || createCharacterMutation.isPending || isGeneratingImages}
                      onClick={() => createCharacterMutation.mutate({ ...characterForm, publish: true })}
                      data-testid="button-char-publish"
                    >
                      <Send className="h-4 w-4" />
                      공개하기
                    </Button>
                  </div>

                  {characterForm.gender && (
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      disabled={!characterForm.name || createCharacterMutation.isPending || isGeneratingImages}
                      onClick={() => createCharacterMutation.mutate({ ...characterForm, publish: false, generateImages: true })}
                      data-testid="button-char-generate-images"
                    >
                      {isGeneratingImages ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          이미지 생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          저장 + 이미지 자동 생성
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenario">
            <Card>
              <CardHeader>
                <CardTitle>새 시나리오</CardTitle>
                <CardDescription>
                  롤플레이에 사용할 상황과 목표를 정의하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="scen-name">시나리오 제목 *</Label>
                  <Input
                    id="scen-name"
                    placeholder="예: 신입사원 면접 연습"
                    value={scenarioForm.name}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scen-tagline">한줄 소개</Label>
                  <Input
                    id="scen-tagline"
                    placeholder="시나리오를 한 문장으로 설명해주세요"
                    value={scenarioForm.tagline}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scen-desc">설명</Label>
                  <Textarea
                    id="scen-desc"
                    placeholder="시나리오의 전체적인 상황을 설명해주세요"
                    rows={4}
                    value={scenarioForm.description}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scen-bg">배경 설정</Label>
                  <Textarea
                    id="scen-bg"
                    placeholder="대화가 일어나는 상황, 장소, 시간 등을 설명해주세요"
                    rows={3}
                    value={scenarioForm.background}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, background: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scen-goal">목표</Label>
                  <Textarea
                    id="scen-goal"
                    placeholder="사용자가 이 시나리오에서 달성해야 할 목표"
                    rows={2}
                    value={scenarioForm.goal}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, goal: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scen-opener">첫 메시지</Label>
                  <Textarea
                    id="scen-opener"
                    placeholder="대화 시작 시 AI가 먼저 할 말"
                    rows={2}
                    value={scenarioForm.openerMessage}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, openerMessage: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scen-diff">난이도</Label>
                    <Select
                      value={scenarioForm.difficulty}
                      onValueChange={(v) => setScenarioForm(prev => ({ ...prev, difficulty: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">입문</SelectItem>
                        <SelectItem value="2">기본</SelectItem>
                        <SelectItem value="3">도전</SelectItem>
                        <SelectItem value="4">고급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scen-tags">태그 (쉼표로 구분)</Label>
                    <Input
                      id="scen-tags"
                      placeholder="면접, 비즈니스"
                      value={scenarioForm.tags}
                      onChange={(e) => setScenarioForm(prev => ({ ...prev, tags: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={!scenarioForm.name || createScenarioMutation.isPending}
                    onClick={() => createScenarioMutation.mutate({ ...scenarioForm, publish: false })}
                  >
                    <Save className="h-4 w-4" />
                    임시저장
                  </Button>
                  <Button
                    className="flex-1 gap-2"
                    disabled={!scenarioForm.name || createScenarioMutation.isPending}
                    onClick={() => createScenarioMutation.mutate({ ...scenarioForm, publish: true })}
                  >
                    <Send className="h-4 w-4" />
                    공개하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
