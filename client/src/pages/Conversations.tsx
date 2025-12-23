import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageCircle, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <div className="space-y-3">
          {activeConversations.map((conv) => (
            <Link key={conv.id} href={`/chat/${conv.id}`}>
              <Card className="hover-elevate cursor-pointer" data-testid={`conversation-card-${conv.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(conv.personaName || conv.personaId)?.charAt(0)?.toUpperCase() || <User className="w-5 h-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium truncate">
                        {conv.personaName || conv.personaId}
                      </span>
                      {conv.lastMessage?.createdAt && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                            addSuffix: true,
                            locale: ko,
                          })}
                        </span>
                      )}
                    </div>
                    {conv.scenarioRun?.scenarioName && (
                      <Badge variant="outline" className="mb-1 text-xs">
                        {conv.scenarioRun.scenarioName}
                      </Badge>
                    )}
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage?.message
                        ? (conv.lastMessage.sender === "user" ? "나: " : "") + conv.lastMessage.message
                        : "대화를 시작해보세요"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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
