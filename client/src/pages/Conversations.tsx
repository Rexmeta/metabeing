import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { MessageCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  };
  createdAt: string;
}

export default function Conversations() {
  const { data: activeConversations, isLoading } = useQuery<ActiveConversation[]>({
    queryKey: ["/api/active-conversations"],
    refetchInterval: 30000,
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
            const lastMessageTime = conv.lastMessage?.createdAt 
              ? format(new Date(conv.lastMessage.createdAt), 'MM/dd HH:mm')
              : format(new Date(conv.createdAt), 'MM/dd HH:mm');
            
            return (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200 transition-all cursor-pointer group hover:bg-blue-50 hover:border-blue-200"
                  data-testid={`conversation-card-${conv.id}`}
                >
                  {/* 페르소나 이미지 */}
                  <div className="relative flex-shrink-0">
                    {personaImage ? (
                      <img 
                        src={personaImage} 
                        alt={conv.personaName || conv.personaId}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold shadow-sm">
                        {(conv.personaName || conv.personaId).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* 대화 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-900 truncate text-sm">
                        {conv.personaName || conv.personaId}
                      </span>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {lastMessageTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {conv.scenarioRun?.scenarioName && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {conv.scenarioRun.scenarioName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {conv.lastMessage?.message
                        ? (conv.lastMessage.sender === "user" ? "나: " : "") + conv.lastMessage.message
                        : "대화를 시작해보세요"}
                    </p>
                  </div>

                  {/* 액션 버튼 (호버시 표시) */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/chat/${conv.id}`;
                      }}
                    >
                      보기
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
