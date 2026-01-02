import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, UserPlus, Lock, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GuestSession {
  id: string;
  conversationCount: number;
  turnCount: number;
  lastPersonaId: string | null;
  expiresAt: string;
}

interface GuestLimits {
  maxConversations: number;
  maxTurnsPerConversation: number;
  remainingConversations: number;
  allowedPersonas: string[];
}

interface Persona {
  mbtiType: string;
  name: string;
  description: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  message: string;
  timestamp: string;
  emotion?: string;
}

export default function GuestChat() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [limits, setLimits] = useState<GuestLimits | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeGuestSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeGuestSession = async () => {
    try {
      const sessionRes = await apiRequest("POST", "/api/guest/session");
      const sessionData = await sessionRes.json();
      setSession(sessionData.session);
      setLimits(sessionData.limits);

      const personasRes = await apiRequest("GET", "/api/guest/personas");
      const personasData = await personasRes.json();
      setPersonas(personasData.personas);
    } catch (error) {
      console.error("Failed to initialize guest session:", error);
      toast({
        title: "오류",
        description: "게스트 세션을 시작할 수 없습니다.",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setMessages([]);
    setLimitReached(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPersona || isLoading) return;

    const userMessage: ChatMessage = {
      sender: "user",
      message: inputMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/guest/chat", {
        personaId: selectedPersona.mbtiType,
        message: userMessage.message,
        conversationHistory: messages.map((m) => ({
          sender: m.sender,
          message: m.message,
          timestamp: m.timestamp,
        })),
      });

      const response = await res.json();
      
      const aiMessage: ChatMessage = {
        sender: "ai",
        message: response.response,
        timestamp: new Date().toISOString(),
        emotion: response.emotion,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      const errorMsg = error?.message || "";
      if (errorMsg.includes("403")) {
        setLimitReached(true);
        toast({
          title: "체험 한도 도달",
          description: "무료 체험 한도에 도달했습니다. 회원가입 후 계속 이용해주세요!",
        });
      } else {
        toast({
          title: "오류",
          description: "메시지 전송에 실패했습니다.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">게스트 세션 준비 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back-to-auth"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인 페이지
          </Button>
          
          <div className="flex items-center gap-2 flex-wrap">
            {limits && (
              <Badge variant="secondary" className="gap-1" data-testid="badge-remaining-conversations">
                <Sparkles className="w-3 h-3" />
                남은 대화: {limits.remainingConversations}/{limits.maxConversations}
              </Badge>
            )}
            <Button
              variant="default"
              onClick={() => setLocation("/")}
              className="gap-2"
              data-testid="button-signup"
            >
              <UserPlus className="w-4 h-4" />
              회원가입
            </Button>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              체험 가능한 페르소나
              <Badge variant="outline" className="text-xs">
                {personas.length}개 / 16개
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {personas.map((persona) => (
                <Button
                  key={persona.mbtiType}
                  variant={selectedPersona?.mbtiType === persona.mbtiType ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => handleSelectPersona(persona)}
                  data-testid={`button-persona-${persona.mbtiType}`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {persona.mbtiType.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {persona.mbtiType}
                </Button>
              ))}
              
              {["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"]
                .filter((m) => !limits?.allowedPersonas.includes(m))
                .slice(0, 3)
                .map((mbti) => (
                  <Button
                    key={mbti}
                    variant="outline"
                    disabled
                    className="gap-2 opacity-50"
                    data-testid={`button-persona-locked-${mbti}`}
                  >
                    <Lock className="w-4 h-4" />
                    {mbti}
                  </Button>
                ))}
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
                +10개 더...
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="h-[500px] flex flex-col">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-lg">
              {selectedPersona ? (
                <span className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{selectedPersona.mbtiType.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  {selectedPersona.name} ({selectedPersona.mbtiType})
                </span>
              ) : (
                "페르소나를 선택해주세요"
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              {!selectedPersona ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  위에서 페르소나를 선택하면 대화를 시작할 수 있습니다
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  {selectedPersona.name}와 대화를 시작해보세요
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                        data-testid={`message-${msg.sender}-${idx}`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            
            {limitReached ? (
              <div className="p-4 border-t bg-amber-50 dark:bg-amber-900/20">
                <div className="text-center">
                  <p className="text-amber-700 dark:text-amber-300 mb-2">
                    무료 체험 한도에 도달했습니다
                  </p>
                  <Button onClick={() => setLocation("/")} className="gap-2" data-testid="button-signup-limit">
                    <UserPlus className="w-4 h-4" />
                    회원가입하고 계속 대화하기
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={selectedPersona ? "메시지를 입력하세요..." : "먼저 페르소나를 선택하세요"}
                  disabled={!selectedPersona || isLoading}
                  data-testid="input-guest-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!selectedPersona || !inputMessage.trim() || isLoading}
                  size="icon"
                  data-testid="button-send-guest-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          회원가입 시 16가지 모든 페르소나와 무제한 대화가 가능합니다
        </p>
      </div>
    </div>
  );
}
