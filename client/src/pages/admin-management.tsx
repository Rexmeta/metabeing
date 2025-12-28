import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScenarioManager } from "@/components/admin/ScenarioManager";
import { PersonaManager } from "@/components/admin/PersonaManager";
import { DifficultySettingsTab } from "@/components/admin/DifficultySettingsTab";
import { AppHeader } from "@/components/AppHeader";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Users, User, MoreVertical, Pencil, Eye, EyeOff, Trash2 } from "lucide-react";

export default function AdminManagement() {
  const [location, setLocation] = useLocation();
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "manage-scenarios");
  const { toast } = useToast();

  const [editingPersona, setEditingPersona] = useState<any | null>(null);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const { data: personasData, isLoading: loadingPersonas, isError: personasError } = useQuery({
    queryKey: ["/api/admin/personas"],
    queryFn: async () => {
      const res = await fetch("/api/admin/personas", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch personas");
      return res.json();
    },
  });
  
  // 안전한 배열 보장
  const personas = Array.isArray(personasData) ? personasData : [];

  const updatePersonaVisibilityMutation = useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: string }) => {
      const res = await apiRequest("PATCH", `/api/personas/${id}/visibility`, { visibility });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/personas/mine"] });
      toast({
        title: variables.visibility === "public" ? "공개됨" : "비공개됨",
        description: `페르소나가 ${variables.visibility === "public" ? "공개" : "비공개"}로 변경되었습니다.`,
      });
    },
    onError: () => {
      toast({ title: "오류", description: "변경에 실패했습니다.", variant: "destructive" });
    },
  });

  const deletePersonaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/personas/${id}`);
      if (!res.ok) throw new Error("Failed to delete persona");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
      queryClient.invalidateQueries({ queryKey: ["/api/personas/mine"] });
      toast({ title: "삭제됨", description: "페르소나가 삭제되었습니다." });
      setDeleteDialog(null);
    },
    onError: () => {
      toast({ title: "오류", description: "삭제에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleDeleteConfirm = () => {
    if (!deleteDialog) return;
    deletePersonaMutation.mutate(deleteDialog.id);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader 
        title="콘텐츠 관리"
        subtitle="시나리오와 페르소나 생성 및 관리"
      />
      <div className="container mx-auto p-6 space-y-6" data-testid="admin-management">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage-personas" data-testid="tab-manage-personas">페르소나</TabsTrigger>
            <TabsTrigger value="manage-scenarios" data-testid="tab-manage-scenarios">시나리오</TabsTrigger>
            <TabsTrigger value="difficulty-settings" data-testid="tab-difficulty-settings">대화 난이도</TabsTrigger>
          </TabsList>

          <TabsContent value="manage-scenarios" className="space-y-6">
            <ScenarioManager />
          </TabsContent>

          <TabsContent value="difficulty-settings" className="space-y-6">
            <DifficultySettingsTab />
          </TabsContent>

          <TabsContent value="manage-personas" className="space-y-6">
            <div className="flex justify-end mb-4">
              <Button 
                className="gap-2" 
                data-testid="button-create-persona"
                onClick={() => {
                  setEditingPersona(null);
                  setPersonaDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                페르소나 만들기
              </Button>
            </div>

            {loadingPersonas ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : personas.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">아직 페르소나가 없습니다</h3>
                <Button 
                  className="mt-4" 
                  data-testid="button-create-persona-empty"
                  onClick={() => {
                    setEditingPersona(null);
                    setPersonaDialogOpen(true);
                  }}
                >
                  페르소나 만들기
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {personas.map((persona: any) => {
                  const mbti = persona.mbtiType || persona.mbti || "";
                  const gender = persona.gender || "female";
                  const genderImages = gender === "male" ? persona.images?.male : persona.images?.female;
                  const imageUrl = genderImages?.expressions?.["중립"] || genderImages?.base || persona.images?.base || null;
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
                                  setEditingPersona(persona);
                                  setPersonaDialogOpen(true);
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
        </Tabs>
      </div>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteDialog?.name}"을(를) 삭제하면 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PersonaManager
        dialogOnly={true}
        externalOpen={personaDialogOpen}
        externalPersona={editingPersona}
        onExternalClose={() => {
          setPersonaDialogOpen(false);
          setEditingPersona(null);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/personas"] });
          queryClient.invalidateQueries({ queryKey: ["/api/personas/mine"] });
        }}
      />
    </div>
  );
}
