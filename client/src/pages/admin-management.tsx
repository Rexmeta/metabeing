import { useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScenarioManager } from "@/components/admin/ScenarioManager";
import { PersonaManager } from "@/components/admin/PersonaManager";
import { DifficultySettingsTab } from "@/components/admin/DifficultySettingsTab";
import { AppHeader } from "@/components/AppHeader";
import { UserPlus, Brain } from "lucide-react";

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState("manage-scenarios");
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader 
        title="콘텐츠 관리"
        subtitle="시나리오와 페르소나 생성 및 관리"
        showBackButton
      />
      <div className="container mx-auto p-6 space-y-6" data-testid="admin-management">
        {/* Quick Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button 
            onClick={() => setLocation("/create")}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="button-create-character"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            캐릭터 만들기
          </Button>
          <Button 
            onClick={() => setActiveTab("manage-personas")}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            data-testid="button-create-persona"
          >
            <Brain className="h-4 w-4 mr-2" />
            페르소나 생성
          </Button>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manage-scenarios" data-testid="tab-manage-scenarios">시나리오 관리</TabsTrigger>
            <TabsTrigger value="difficulty-settings" data-testid="tab-difficulty-settings">난이도 설정</TabsTrigger>
            <TabsTrigger value="manage-personas" data-testid="tab-manage-personas">페르소나 관리</TabsTrigger>
          </TabsList>

          <TabsContent value="manage-scenarios" className="space-y-6">
            <ScenarioManager />
          </TabsContent>

          <TabsContent value="difficulty-settings" className="space-y-6">
            <DifficultySettingsTab />
          </TabsContent>

          <TabsContent value="manage-personas" className="space-y-6">
            <PersonaManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}