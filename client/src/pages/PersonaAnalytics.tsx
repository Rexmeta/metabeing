import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MessageSquare, Target, TrendingUp, ThumbsUp, ThumbsDown, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PersonaAnalyticsData {
  personaId: string;
  persona: {
    id: string;
    name: string;
    mbti: string;
    description: string;
  };
  creatorId: string | null;
  creatorName: string;
  statistics: {
    uniqueUsersCount: number;
    totalConversations: number;
    completedConversations: number;
    completionRate: string;
    totalTurns: number;
    avgTurnsPerConversation: string;
    avgScore: string | null;
    likesCount: number;
    dislikesCount: number;
  };
  recentActivity: Array<{
    id: string;
    turnCount: number;
    score: number | null;
    status: string;
    startedAt: string;
    lastActivityAt: string | null;
  }>;
}

export default function PersonaAnalytics() {
  const { personaId } = useParams();
  const [, setLocation] = useLocation();

  const { data: analyticsData, isLoading, isError } = useQuery<PersonaAnalyticsData>({
    queryKey: [`/api/personas/${personaId}/analytics`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/personas/${personaId}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!personaId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader title="페르소나 분석" subtitle="페르소나 사용 통계 및 분석" />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !analyticsData) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader title="페르소나 분석" subtitle="페르소나 사용 통계 및 분석" />
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-red-600">페르소나 분석 데이터를 불러오는데 실패했습니다.</p>
            <Button className="mt-4" onClick={() => setLocation("/admin-management?tab=manage-personas")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { persona, creatorName, statistics, recentActivity } = analyticsData;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        title={`${persona.name} 분석`}
        subtitle="페르소나 사용 통계 및 분석"
      />
      <div className="container mx-auto p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin-management?tab=manage-personas")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            페르소나 목록으로
          </Button>
        </div>

        {/* 페르소나 정보 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{persona.name}</CardTitle>
                <p className="text-slate-600 mt-2">{persona.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {persona.mbti && (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {persona.mbti}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-600">
              <p>제작자: {creatorName}</p>
            </div>
          </CardContent>
        </Card>

        {/* 주요 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 고유 사용자 수 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">고유 사용자</p>
                  <p className="text-2xl font-bold">{statistics.uniqueUsersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 총 대화 수 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">총 대화 수</p>
                  <p className="text-2xl font-bold">{statistics.totalConversations}</p>
                  <p className="text-xs text-slate-500">
                    완료: {statistics.completedConversations} ({statistics.completionRate}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 총 대화 턴 수 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">총 대화 턴</p>
                  <p className="text-2xl font-bold">{statistics.totalTurns}</p>
                  <p className="text-xs text-slate-500">
                    평균: {statistics.avgTurnsPerConversation} 턴/대화
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 평균 점수 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">평균 점수</p>
                  <p className="text-2xl font-bold">
                    {statistics.avgScore ? `${statistics.avgScore}점` : "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 좋아요/싫어요 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>사용자 반응</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <ThumbsUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-slate-600">좋아요</p>
                  <p className="text-2xl font-bold">{statistics.likesCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg">
                <ThumbsDown className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-slate-600">싫어요</p>
                  <p className="text-2xl font-bold">{statistics.dislikesCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        {recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={activity.status === "completed" ? "default" : "secondary"}>
                          {activity.status === "completed" ? "완료" : "진행중"}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          {new Date(activity.lastActivityAt || activity.startedAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        대화 턴: {activity.turnCount}
                        {activity.score !== null && ` • 점수: ${activity.score}점`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 특징 분석 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>페르소나 특징</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 참여도 */}
              <div>
                <h4 className="font-semibold mb-2">참여도</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(statistics.uniqueUsersCount * 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">
                    {statistics.uniqueUsersCount}명의 사용자와 대화
                  </span>
                </div>
              </div>

              {/* 완료율 */}
              <div>
                <h4 className="font-semibold mb-2">완료율</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${statistics.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">{statistics.completionRate}%</span>
                </div>
              </div>

              {/* 대화 깊이 */}
              <div>
                <h4 className="font-semibold mb-2">대화 깊이</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${Math.min(parseFloat(statistics.avgTurnsPerConversation) * 5, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600">
                    평균 {statistics.avgTurnsPerConversation}턴
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
