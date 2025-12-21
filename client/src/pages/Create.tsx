import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export default function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const createScenarioMutation = useMutation({
    mutationFn: async (data: typeof scenarioForm & { publish?: boolean }) => {
      const res = await fetch("/api/ugc/scenarios", {
        method: "POST",
        headers: getAuthHeaders(),
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
          data-testid="button-back-explore"
        >
          <ArrowLeft className="h-4 w-4" /> 탐색으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">시나리오 만들기</h1>
          <p className="text-slate-600 mt-1">나만의 시나리오를 만들어보세요</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              새 시나리오
            </CardTitle>
            <CardDescription>
              대화 훈련에 사용할 시나리오의 상황과 목표를 정의하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scen-name">시나리오 이름 *</Label>
              <Input
                id="scen-name"
                placeholder="예: 까다로운 고객 응대"
                value={scenarioForm.name}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-scen-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-tagline">한 줄 소개</Label>
              <Input
                id="scen-tagline"
                placeholder="시나리오를 한 줄로 설명해주세요"
                value={scenarioForm.tagline}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, tagline: e.target.value }))}
                data-testid="input-scen-tagline"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-description">상세 설명</Label>
              <Textarea
                id="scen-description"
                placeholder="시나리오의 배경과 상황을 자세히 설명해주세요"
                value={scenarioForm.description}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
                data-testid="input-scen-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-background">상황 배경</Label>
              <Textarea
                id="scen-background"
                placeholder="대화가 시작되는 상황을 설명해주세요"
                value={scenarioForm.background}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, background: e.target.value }))}
                className="min-h-[80px]"
                data-testid="input-scen-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-goal">목표</Label>
              <Textarea
                id="scen-goal"
                placeholder="이 시나리오에서 달성해야 할 목표는 무엇인가요?"
                value={scenarioForm.goal}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, goal: e.target.value }))}
                className="min-h-[80px]"
                data-testid="input-scen-goal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-constraints">제약 조건</Label>
              <Textarea
                id="scen-constraints"
                placeholder="피해야 할 행동이나 지켜야 할 규칙이 있나요?"
                value={scenarioForm.constraints}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, constraints: e.target.value }))}
                className="min-h-[80px]"
                data-testid="input-scen-constraints"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scen-opener">시작 메시지</Label>
              <Textarea
                id="scen-opener"
                placeholder="AI가 먼저 건넬 시작 메시지를 입력하세요"
                value={scenarioForm.openerMessage}
                onChange={(e) => setScenarioForm(prev => ({ ...prev, openerMessage: e.target.value }))}
                className="min-h-[80px]"
                data-testid="input-scen-opener"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scen-difficulty">난이도</Label>
                <Select
                  value={scenarioForm.difficulty}
                  onValueChange={(value) => setScenarioForm(prev => ({ ...prev, difficulty: value }))}
                >
                  <SelectTrigger data-testid="select-scen-difficulty">
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
                <Label htmlFor="scen-tags">태그</Label>
                <Input
                  id="scen-tags"
                  placeholder="고객응대, 협상 (쉼표 구분)"
                  value={scenarioForm.tags}
                  onChange={(e) => setScenarioForm(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-scen-tags"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => createScenarioMutation.mutate({ ...scenarioForm, publish: false })}
                disabled={!scenarioForm.name || createScenarioMutation.isPending}
                data-testid="button-save-draft-scenario"
              >
                <Save className="h-4 w-4" />
                임시저장
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => createScenarioMutation.mutate({ ...scenarioForm, publish: true })}
                disabled={!scenarioForm.name || createScenarioMutation.isPending}
                data-testid="button-publish-scenario"
              >
                <Send className="h-4 w-4" />
                공개하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
