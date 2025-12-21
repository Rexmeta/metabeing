import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Users, FileText, Bookmark, Edit, Trash2, Eye, EyeOff, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Character {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  profileImage: string | null;
  tags: string[];
  visibility: string;
  status: string;
  viewCount: number;
  usageCount: number;
  createdAt: string;
}

interface Scenario {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  difficulty: number | null;
  tags: string[];
  visibility: string;
  status: string;
  viewCount: number;
  usageCount: number;
  createdAt: string;
}

interface Bookmark {
  id: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export default function Library() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ type: "character" | "scenario"; id: string } | null>(null);

  const { data: myCharacters = [], isLoading: loadingChars } = useQuery<Character[]>({
    queryKey: ["/api/ugc/characters", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/ugc/characters?visibility=mine", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: myScenarios = [], isLoading: loadingScens } = useQuery<Scenario[]>({
    queryKey: ["/api/ugc/scenarios", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/ugc/scenarios?visibility=mine", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: myBookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["/api/ugc/bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/ugc/bookmarks", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "character" | "scenario"; id: string }) => {
      const endpoint = type === "character" ? "characters" : "scenarios";
      const res = await fetch(`/api/ugc/${endpoint}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("삭제 실패");
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/ugc/${type === "character" ? "characters" : "scenarios"}`] });
      toast({ title: "삭제됨", description: `${type === "character" ? "캐릭터" : "시나리오"}가 삭제되었습니다.` });
      setDeleteDialog(null);
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "character" | "scenario"; id: string }) => {
      const endpoint = type === "character" ? "characters" : "scenarios";
      const res = await fetch(`/api/ugc/${endpoint}/${id}/publish`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("공개 실패");
      return res.json();
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/ugc/${type === "character" ? "characters" : "scenarios"}`] });
      toast({ title: "공개됨", description: `${type === "character" ? "캐릭터" : "시나리오"}가 공개되었습니다.` });
    },
    onError: () => {
      toast({ title: "오류", description: "공개에 실패했습니다.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">내 라이브러리</h1>
            <p className="text-slate-600 mt-1">내가 만든 캐릭터와 시나리오, 북마크를 관리하세요</p>
          </div>
          <Button onClick={() => setLocation("/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            새로 만들기
          </Button>
        </div>

        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="characters" className="gap-2">
              <Users className="h-4 w-4" /> 내 캐릭터 ({myCharacters.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <FileText className="h-4 w-4" /> 내 시나리오 ({myScenarios.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2">
              <Bookmark className="h-4 w-4" /> 북마크 ({myBookmarks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters">
            {loadingChars ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : myCharacters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 만든 캐릭터가 없습니다</h3>
                <Button className="mt-4" onClick={() => setLocation("/create")}>
                  첫 캐릭터 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCharacters.map((char) => (
                  <Card key={char.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={char.profileImage || undefined} />
                            <AvatarFallback>{char.name.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{char.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={char.status === "published" ? "default" : "secondary"}>
                                {char.status === "published" ? "공개" : "비공개"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {char.status !== "published" && (
                              <DropdownMenuItem onClick={() => publishMutation.mutate({ type: "character", id: char.id })}>
                                <Eye className="h-4 w-4 mr-2" /> 공개하기
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteDialog({ type: "character", id: char.id })} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {char.tagline || char.description || "설명 없음"}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>조회 {char.viewCount}</span>
                        <span>사용 {char.usageCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scenarios">
            {loadingScens ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : myScenarios.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 만든 시나리오가 없습니다</h3>
                <Button className="mt-4" onClick={() => setLocation("/create")}>
                  첫 시나리오 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myScenarios.map((scen) => (
                  <Card key={scen.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base line-clamp-1">{scen.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={scen.status === "published" ? "default" : "secondary"}>
                              {scen.status === "published" ? "공개" : "비공개"}
                            </Badge>
                            {scen.difficulty && (
                              <Badge variant="outline">Lv.{scen.difficulty}</Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {scen.status !== "published" && (
                              <DropdownMenuItem onClick={() => publishMutation.mutate({ type: "scenario", id: scen.id })}>
                                <Eye className="h-4 w-4 mr-2" /> 공개하기
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteDialog({ type: "scenario", id: scen.id })} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {scen.tagline || scen.description || "설명 없음"}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>조회 {scen.viewCount}</span>
                        <span>사용 {scen.usageCount}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            {myBookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 북마크가 없습니다</h3>
                <p className="text-slate-500 mt-1">마음에 드는 캐릭터나 시나리오를 북마크해보세요</p>
                <Button className="mt-4" onClick={() => setLocation("/explore")}>
                  탐색하기
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                북마크 {myBookmarks.length}개
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. {deleteDialog?.type === "character" ? "캐릭터" : "시나리오"}가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog)}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
