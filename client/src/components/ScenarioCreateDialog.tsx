import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus } from 'lucide-react';

interface ScenarioFormData {
  title: string;
  description: string;
  difficulty: number;
  estimatedTime: string;
  skills: string[];
  context: {
    situation: string;
    timeline: string;
    stakes: string;
    playerRole: {
      position: string;
      department: string;
      experience: string;
      responsibility: string;
    };
  };
  objectives: string[];
  successCriteria: {
    optimal: string;
    good: string;
    acceptable: string;
    failure: string;
  };
  personas: any[];
  recommendedFlow: string[];
}

const emptyFormData: ScenarioFormData = {
  title: '',
  description: '',
  difficulty: 2,
  estimatedTime: '30-60분',
  skills: [],
  context: {
    situation: '',
    timeline: '',
    stakes: '',
    playerRole: {
      position: '',
      department: '',
      experience: '',
      responsibility: ''
    }
  },
  objectives: [],
  successCriteria: {
    optimal: '',
    good: '',
    acceptable: '',
    failure: ''
  },
  personas: [],
  recommendedFlow: []
};

interface ScenarioCreateDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScenarioCreateDialog({ trigger, open: controlledOpen, onOpenChange, onSuccess }: ScenarioCreateDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState<ScenarioFormData>(emptyFormData);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  const createMutation = useMutation({
    mutationFn: async (scenarioData: ScenarioFormData) => {
      const response = await apiRequest("POST", "/api/admin/scenarios", scenarioData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scenarios'] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "시나리오가 생성되었습니다."
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "시나리오 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "필수 입력 누락",
        description: "시나리오 제목을 입력해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
      }
      setIsOpen(open);
    }}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50">
        <DialogHeader className="bg-teal-600 -m-6 mb-4 p-6 rounded-t-lg">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Plus className="w-5 h-5" />
            시나리오 직접 생성
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              기본 정보
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-semibold text-slate-700 mb-1.5 block">시나리오 제목 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="예: 까다로운 고객 응대하기"
                  required
                  className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="input-scenario-title"
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="text-sm font-semibold text-slate-700 mb-1.5 block">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="시나리오에 대한 간략한 설명을 입력하세요"
                  className="min-h-[80px] border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="textarea-scenario-description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedTime" className="text-sm font-semibold text-slate-700 mb-1.5 block">예상 소요 시간</Label>
                  <Select
                    value={formData.estimatedTime}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, estimatedTime: value }))}
                  >
                    <SelectTrigger className="border-slate-300 bg-white" data-testid="select-estimated-time">
                      <SelectValue placeholder="소요 시간 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15-30분">15-30분</SelectItem>
                      <SelectItem value="30-60분">30-60분</SelectItem>
                      <SelectItem value="60-90분">60-90분</SelectItem>
                      <SelectItem value="90분 이상">90분 이상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="skills" className="text-sm font-semibold text-slate-700 mb-1.5 block">필요 스킬 (쉼표로 구분)</Label>
                  <Input
                    id="skills"
                    value={formData.skills.join(', ')}
                    onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))}
                    placeholder="협상, 설득, 공감"
                    className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                    data-testid="input-skills"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 상황 정보 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              상황 정보
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="situation" className="text-sm font-semibold text-slate-700 mb-1.5 block">상황 설명</Label>
                <Textarea
                  id="situation"
                  value={formData.context.situation}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    context: { ...prev.context, situation: e.target.value } 
                  }))}
                  placeholder="어떤 상황에서 대화가 시작되는지 설명해주세요"
                  className="min-h-[80px] border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="textarea-situation"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeline" className="text-sm font-semibold text-slate-700 mb-1.5 block">시간적 제약</Label>
                  <Input
                    id="timeline"
                    value={formData.context.timeline}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      context: { ...prev.context, timeline: e.target.value } 
                    }))}
                    placeholder="예: 오늘 오후까지 결정 필요"
                    className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                    data-testid="input-timeline"
                  />
                </div>
                <div>
                  <Label htmlFor="stakes" className="text-sm font-semibold text-slate-700 mb-1.5 block">이해관계</Label>
                  <Input
                    id="stakes"
                    value={formData.context.stakes}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      context: { ...prev.context, stakes: e.target.value } 
                    }))}
                    placeholder="예: 대형 계약 성사 여부"
                    className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                    data-testid="input-stakes"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 플레이어 역할 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              플레이어 역할
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="playerPosition" className="text-sm font-semibold text-slate-700 mb-1.5 block">직책</Label>
                <Input
                  id="playerPosition"
                  value={formData.context.playerRole.position}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    context: { 
                      ...prev.context, 
                      playerRole: { ...prev.context.playerRole, position: e.target.value } 
                    } 
                  }))}
                  placeholder="예: 영업 담당자"
                  className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="input-player-position"
                />
              </div>
              <div>
                <Label htmlFor="playerDepartment" className="text-sm font-semibold text-slate-700 mb-1.5 block">소속 부서</Label>
                <Input
                  id="playerDepartment"
                  value={formData.context.playerRole.department}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    context: { 
                      ...prev.context, 
                      playerRole: { ...prev.context.playerRole, department: e.target.value } 
                    } 
                  }))}
                  placeholder="예: 영업팀"
                  className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="input-player-department"
                />
              </div>
              <div>
                <Label htmlFor="playerExperience" className="text-sm font-semibold text-slate-700 mb-1.5 block">경력 수준</Label>
                <Input
                  id="playerExperience"
                  value={formData.context.playerRole.experience}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    context: { 
                      ...prev.context, 
                      playerRole: { ...prev.context.playerRole, experience: e.target.value } 
                    } 
                  }))}
                  placeholder="예: 신입 (6개월차)"
                  className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="input-player-experience"
                />
              </div>
              <div>
                <Label htmlFor="playerResponsibility" className="text-sm font-semibold text-slate-700 mb-1.5 block">핵심 책임</Label>
                <Input
                  id="playerResponsibility"
                  value={formData.context.playerRole.responsibility}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    context: { 
                      ...prev.context, 
                      playerRole: { ...prev.context.playerRole, responsibility: e.target.value } 
                    } 
                  }))}
                  placeholder="예: 고객 문의 처리 및 이슈 해결"
                  className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                  data-testid="input-player-responsibility"
                />
              </div>
            </div>
          </div>

          {/* 목표 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              시나리오 목표
            </h3>
            <div>
              <Label htmlFor="objectives" className="text-sm font-semibold text-slate-700 mb-1.5 block">목표 (줄바꿈으로 구분)</Label>
              <Textarea
                id="objectives"
                value={formData.objectives.join('\n')}
                onChange={(e) => setFormData(prev => ({ ...prev, objectives: e.target.value.split('\n').filter(o => o.trim()) }))}
                placeholder="고객의 불만 원인 파악하기&#10;적절한 해결책 제시하기&#10;고객 만족도 확보하기"
                className="min-h-[100px] border-slate-300 focus:border-teal-500 focus:ring-teal-500 bg-white"
                data-testid="textarea-objectives"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="button-save-scenario"
            >
              {createMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
