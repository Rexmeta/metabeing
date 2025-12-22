import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Plus, FileText, Bookmark, Trash2, Eye, EyeOff, MoreVertical, Users, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

interface Persona {
  id: string;
  name: string;
  displayName?: string;
  mbpiType?: string;
  mbtiType?: string;
  gender?: string;
  description?: string;
  visibility?: "public" | "private";
  images?: {
    male?: { expressions?: Record<string, string>; base?: string };
    female?: { expressions?: Record<string, string>; base?: string };
  };
}

export default function Library() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ type: "scenario" | "persona"; id: string; name?: string } | null>(null);
  
  const searchParams = new URLSearchParams(searchString);
  const tabFromUrl = searchParams.get("tab") || "personas";
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tab = params.get("tab");
    if (tab && ["personas", "scenarios", "bookmarks"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchString]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const { data: myScenarios = [], isLoading: loadingScens } = useQuery<Scenario[]>({
    queryKey: ["/api/ugc/scenarios", "mine"],
    queryFn: async () => {
      const res = await fetch("/api/ugc/scenarios?visibility=mine", { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: myBookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ["/api/ugc/bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/ugc/bookmarks", { 
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery<Persona[]>({
    queryKey: ["/api/admin/personas"],
    queryFn: async () => {
      const res = await fetch("/api/admin/personas");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "scenario"; id: string }) => {
      const res = await fetch(`/api/ugc/scenarios/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("삭제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ugc/scenarios"] });
      toast({ title: "삭제됨", description: "시나리오가 삭제되었습니다." });
      setDeleteDialog(null);
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "scenario"; id: string }) => {
      const res = await fetch(`/api/ugc/scenarios/${id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("공개 실패");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ugc/scenarios"] });
      toast({ title: "공개됨", description: "시나리오가 공개되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "공개에 실패했습니다.", variant: "destructive" });
    },
  });

  const deletePersonaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/personas/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("삭제 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      toast({ title: "삭제됨", description: "페르소나가 삭제되었습니다." });
      setDeleteDialog(null);
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const updatePersonaVisibilityMutation = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: "public" | "private" }) => {
      const res = await fetch(`/api/admin/personas/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) throw new Error("변경 실패");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      toast({ 
        title: variables.visibility === "public" ? "공개됨" : "비공개됨", 
        description: `페르소나가 ${variables.visibility === "public" ? "공개" : "비공개"}로 변경되었습니다.` 
      });
    },
    onError: () => {
      toast({ title: "오류", description: "변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteDialog) return;
    if (deleteDialog.type === "persona") {
      deletePersonaMutation.mutate(deleteDialog.id);
    } else {
      deleteMutation.mutate({ type: "scenario", id: deleteDialog.id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">내 라이브러리</h1>
            <p className="text-slate-600 mt-1">페르소나, 시나리오, 북마크를 관리하세요</p>
          </div>
          <Button onClick={() => setLocation("/content-management?tab=manage-personas")} className="gap-2">
            <Plus className="h-4 w-4" />
            페르소나 만들기
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="personas" className="gap-2">
              <Users className="h-4 w-4" /> 내 페르소나 ({personas.length})
            </TabsTrigger>
            <TabsTrigger value="scenarios" className="gap-2">
              <FileText className="h-4 w-4" /> 내 시나리오 ({myScenarios.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2">
              <Bookmark className="h-4 w-4" /> 북마크 ({myBookmarks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personas">
            {loadingPersonas ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : personas.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 페르소나가 없습니다</h3>
                <Button className="mt-4" onClick={() => setLocation("/content-management?tab=manage-personas")}>
                  페르소나 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {personas.map((persona) => {
                  const mbti = persona.mbtiType || persona.mbpiType || "";
                  const gender = persona.gender || "female";
                  const genderImages = gender === "male" ? persona.images?.male : persona.images?.female;
                  const imageUrl = genderImages?.expressions?.["중립"] || genderImages?.base || null;
                  const isPublic = persona.visibility === "public";
                  
                  return (
                    <Card
                      key={persona.id}
                      className="overflow-hidden cursor-pointer hover-elevate group"
                      onClick={() => setLocation(`/persona-chat/${persona.id}`)}
                      data-testid={`card-persona-${persona.id}`}
                    >
                      <div className="aspect-[3/4] relative bg-gradient-to-br from-blue-500 to-purple-600">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={persona.displayName || persona.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <User className="w-16 h-16 text-white/40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        
                        {/* 상단 뱃지 및 메뉴 */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {mbti && (
                              <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm border-white/30 text-white">
                                {mbti}
                              </Badge>
                            )}
                            <Badge 
                              variant="secondary" 
                              className={`backdrop-blur-sm border-white/30 text-white ${isPublic ? "bg-green-500/50" : "bg-gray-500/50"}`}
                            >
                              {isPublic ? "공개" : "비공개"}
                            </Badge>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 bg-white/20 backdrop-blur-sm border border-white/30 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-persona-menu-${persona.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocation(`/content-management?tab=manage-personas&edit=${persona.id}`);
                                }}
                                data-testid={`button-edit-persona-${persona.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-2" /> 수정
                              </DropdownMenuItem>
                              {isPublic ? (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePersonaVisibilityMutation.mutate({ id: persona.id, visibility: "private" });
                                  }}
                                  data-testid={`button-private-persona-${persona.id}`}
                                >
                                  <EyeOff className="h-4 w-4 mr-2" /> 비공개로 전환
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updatePersonaVisibilityMutation.mutate({ id: persona.id, visibility: "public" });
                                  }}
                                  data-testid={`button-public-persona-${persona.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" /> 공개로 전환
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({ type: "persona", id: persona.id, name: persona.displayName || persona.name });
                                }}
                                className="text-red-600"
                                data-testid={`button-delete-persona-${persona.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> 삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-white font-bold text-lg drop-shadow-lg">
                            {persona.displayName || persona.name}
                          </h3>
                          {persona.description && (
                            <p className="text-white/80 text-sm line-clamp-2 mt-1">
                              {persona.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
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
                <p className="text-slate-500 mt-1">마음에 드는 페르소나나 시나리오를 북마크해보세요</p>
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
              이 작업은 되돌릴 수 없습니다. 
              {deleteDialog?.type === "persona" 
                ? `"${deleteDialog.name}" 페르소나가 영구적으로 삭제됩니다.`
                : "시나리오가 영구적으로 삭제됩니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
