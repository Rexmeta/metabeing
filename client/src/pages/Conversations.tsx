import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageCircle, X, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  } | string;
  lastActivityAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export default function Conversations() {
  const { toast } = useToast();
  const { data: activeConversations, isLoading, refetch } = useQuery<ActiveConversation[]>({
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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">대화</h1>
          </div>
          {activeConversations && activeConversations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeConversations.length}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
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
            <p className="text-muted-foreground mb-2 text-sm">진행 중인 대화가 없습니다</p>
            <Link href="/">
              <Button variant="link" className="text-primary p-0 h-auto text-sm">
                라이브러리에서 대화 시작하기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
