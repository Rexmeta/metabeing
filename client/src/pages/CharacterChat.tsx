import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, User, MessageCircle, Info, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import type { Character } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  emotion?: string;
}

export default function CharacterChat() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, setShowAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "profile">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [currentEmotion, setCurrentEmotion] = useState<string>("중립");
  const [characterImageUrl, setCharacterImageUrl] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 감정을 이미지 파일명으로 변환 (한국어/영어 모두 지원)
  const getEmotionImagePath = (emotion: string, characterId: string, gender: string = "male") => {
    const emotionMap: Record<string, string> = {
      // 한국어
      "중립": "neutral",
      "기쁨": "joy",
      "슬픔": "sad",
      "분노": "angry",
      "놀람": "surprise",
      "호기심": "curious",
      "불안": "anxious",
      "단호": "determined",
      "실망": "disappointed",
      "당혹": "confused",
      // 영어 (AI 모델이 영어로 응답할 경우)
      "neutral": "neutral",
      "joy": "joy",
      "happy": "joy",
      "sad": "sad",
      "angry": "angry",
      "surprise": "surprise",
      "surprised": "surprise",
      "curious": "curious",
      "anxious": "anxious",
      "determined": "determined",
      "disappointed": "disappointed",
      "confused": "confused"
    };
    const emotionEn = emotionMap[emotion.toLowerCase()] || emotionMap[emotion] || "neutral";
    return `/characters/${characterId}/${gender}/${emotionEn}.webp`;
  };

  const { data: character, isLoading } = useQuery<Character>({
    queryKey: [`/api/ugc/characters/${id}`],
    enabled: !!id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const token = localStorage.getItem("authToken");
      const res = await fetch("/api/ugc/characters/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          characterId: id,
          message,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "메시지 전송 실패");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          emotion: data.emotion,
        },
      ]);
      // 감정 업데이트 및 표정 이미지 변경
      if (data.emotion) {
        setCurrentEmotion(data.emotion);
        if (character?.gender && character?.expressionImagesGenerated) {
          const imagePath = getEmotionImagePath(data.emotion, character.id, character.gender);
          setCharacterImageUrl(imagePath);
        }
      }
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (character && messages.length === 0) {
      const greeting = character.tagline || `안녕하세요, ${character.name}입니다.`;
      setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [character]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    sendMessageMutation.mutate(userMessage.content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/explore")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">캐릭터를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center gap-3 p-4 border-b bg-background">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/explore")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={character.profileImage || undefined} alt={character.name} />
          <AvatarFallback>
            {character.name?.charAt(0) || <User className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate" data-testid="text-character-name">{character.name}</h1>
          {character.tagline && (
            <p className="text-sm text-muted-foreground truncate">{character.tagline}</p>
          )}
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "profile")}>
          <TabsList>
            <TabsTrigger value="chat" data-testid="tab-chat">
              <MessageCircle className="w-4 h-4 mr-1" />
              대화
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <Info className="w-4 h-4 mr-1" />
              프로필
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "chat" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.role}-${index}`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage 
                        src={
                          msg.emotion && character.gender && character.expressionImagesGenerated
                            ? getEmotionImagePath(msg.emotion, character.id, character.gender)
                            : (characterImageUrl || character.profileImage || undefined)
                        } 
                      />
                      <AvatarFallback>{character.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={character.profileImage || undefined} />
                    <AvatarFallback>{character.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
            <div className="flex gap-2 max-w-3xl mx-auto">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="min-h-[44px] max-h-32 resize-none"
                disabled={sendMessageMutation.isPending}
                data-testid="input-message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessageMutation.isPending}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={character.profileImage || undefined} alt={character.name} />
                <AvatarFallback className="text-2xl">
                  {character.name?.charAt(0) || <User className="w-10 h-10" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{character.name}</h2>
              {character.tagline && (
                <p className="text-muted-foreground mt-1">{character.tagline}</p>
              )}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {character.tags?.map((tag, i) => (
                  <Badge key={i} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>소개</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">
                  {character.description || "설명이 없습니다."}
                </p>
              </CardContent>
            </Card>

            {character.systemPrompt && (
              <Card>
                <CardHeader>
                  <CardTitle>성격 및 특성</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {character.systemPrompt}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button 
              className="w-full" 
              onClick={() => setActiveTab("chat")}
              data-testid="button-start-chat"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              대화 시작하기
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
