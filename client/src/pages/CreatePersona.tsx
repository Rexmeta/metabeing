import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PersonaManager } from "@/components/admin/PersonaManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function CreatePersona() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/create-persona/:personaId");
  
  const personaId = match ? params?.personaId : null;
  const isEditMode = !!personaId;
  
  const { data: personaData, isLoading } = useQuery({
    queryKey: ['/api/admin/personas', personaId],
    queryFn: async () => {
      if (!personaId) return null;
      const response = await fetch(`/api/admin/personas/${personaId}`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isEditMode
  });

  const handleClose = () => {
    setLocation("/admin-management?tab=manage-personas");
  };

  const handleSaveSuccess = () => {
    setLocation("/admin-management?tab=manage-personas");
  };

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto py-6 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin-management?tab=manage-personas")}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Button>
        </div>
        
        <PersonaManager
          pageMode
          externalPersona={personaData}
          onExternalClose={handleClose}
          onSaveSuccess={handleSaveSuccess}
        />
      </div>
    </div>
  );
}
