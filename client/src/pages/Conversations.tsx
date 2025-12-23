import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { MessageCircle, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  } | string; // 새로운 필드는 string 직접 저장
  lastActivityAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export default function Conversations() {
  const { toast } = useToast();
  const { data: activeConversations, isLoading, refetch } = useQuery<ActiveConversation[]>({
    queryKey: ["/api/active-conversations"],
    refetchInterval: 10000, // 10초마다 자동 리페치
  });

  // 대화방 닫기 mutation
  const closeMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return await apiRequest(`/api/conversations/${conversationId}/close`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/active-conversations"] });
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

  // 페르소나 정보 조회 (이미지용)
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

  const getPersonaImage = (persona: any) => {
    if (!persona?.images) return null;
    const gender = persona.gender || 'male';
    const genderImages = persona.images[gender as 'male' | 'female'];
    return genderImages?.expressions?.['중립'] || persona.images.base || null;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">대화 중</h1>
        {activeConversations && activeConversations.length > 0 && (
          <Badge variant="secondary">{activeConversations.length}개</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : activeConversations && activeConversations.length > 0 ? (
        <div className="space-y-1">
          {activeConversations.map((conv) => {
            const personaInfo = personas[conv.personaId];
            const personaImage = getPersonaImage(personaInfo);
            
            // 유효한 날짜 확인 및 포맷팅
            const getValidDate = (dateStr?: string) => {
              if (!dateStr) return new Date();
              const parsed = new Date(dateStr);
              return isNaN(parsed.getTime()) ? new Date() : parsed;
            };
            
            // lastActivityAt 우선 사용 (메신저 스타일)
            const lastMessageTime = conv.lastActivityAt 
              ? format(getValidDate(conv.lastActivityAt), 'MM/dd HH:mm')
              : format(getValidDate(conv.createdAt), 'MM/dd HH:mm');
            
            // lastMessage 파싱 (객체 또는 문자열 형태)
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
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-all cursor-pointer group hover-elevate"
                  data-testid={`conversation-card-${conv.id}`}
                >
                  {/* 페르소나 이미지 + 읽지 않음 배지 */}
                  <div className="relative flex-shrink-0">
                    {personaImage ? (
                      <img 
                        src={personaImage} 
                        alt={conv.personaName || conv.personaId}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-muted to-muted-foreground/50 flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                        {(conv.personaName || conv.personaId).charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* 읽지 않은 메시지 배지 */}
                    {hasUnread && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* 대화 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold truncate text-sm">
                        {conv.personaName || conv.personaId}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {lastMessageTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {conv.scenarioRun?.scenarioName && (
                        <Badge variant="outline" className="text-xs">
                          {conv.scenarioRun.scenarioName}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs truncate ${hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {getLastMessageText()}
                    </p>
                  </div>

                  {/* 액션 버튼 (호버시 표시) */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/chat/${conv.id}`;
                      }}
                      data-testid={`button-view-conversation-${conv.id}`}
                    >
                      보기
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm("대화방을 닫으시겠습니까? 목록에서 제거됩니다.")) {
                          closeMutation.mutate(conv.id);
                        }
                      }}
                      disabled={closeMutation.isPending}
                      data-testid={`button-close-conversation-${conv.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">진행 중인 대화가 없습니다</p>
            <Link href="/">
              <span className="text-primary hover:underline cursor-pointer">
                라이브러리에서 페르소나를 선택하여 대화를 시작해보세요
              </span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
