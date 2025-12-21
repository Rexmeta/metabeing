import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle, Heart, Bookmark, Share2, User, Eye, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Character } from "@shared/schema";

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, setShowAuthModal } = useAuth();

  const { data: character, isLoading, error } = useQuery<Character>({
    queryKey: ["/api/ugc/characters", id],
    enabled: !!id,
  });

  const handleStartChat = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // TODO: Start chat with character
    console.log("Start chat with character:", id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !character) {
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
    <div className="p-6 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => setLocation("/explore")} className="mb-6" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        돌아가기
      </Button>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={character.profileImage || undefined} alt={character.name} />
                  <AvatarFallback className="text-3xl">
                    {character.name?.charAt(0) || <User className="w-12 h-12" />}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-2" data-testid="text-character-name">{character.name}</h1>
                {character.tagline && (
                  <p className="text-muted-foreground mb-4">{character.tagline}</p>
                )}
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  {character.tags?.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{character.viewCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{character.usageCount || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleStartChat} data-testid="button-start-chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              대화 시작
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" data-testid="button-like">
              <Heart className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-bookmark">
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" data-testid="button-share">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>소개</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap" data-testid="text-character-description">
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
        </div>
      </div>
    </div>
  );
}
