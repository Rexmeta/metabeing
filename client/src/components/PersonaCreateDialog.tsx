import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Pencil } from 'lucide-react';

interface MBTIPersonaFormData {
  id: string;
  mbti: string;
  gender: 'male' | 'female';
  name: string;
  department: string;
  position: string;
  experience: string;
  stance: string;
  goal: string;
  tradeoff: string;
  personality_traits: string[];
  communication_style: string;
  motivation: string;
  fears: string[];
  background: {
    personal_values: string[];
    hobbies: string[];
    social: {
      preference: string;
      behavior: string;
    };
  };
  communication_patterns: {
    opening_style: string;
    key_phrases: string[];
    response_to_arguments: Record<string, string>;
    win_conditions: string[];
  };
  voice: {
    tone: string;
    pace: string;
    emotion: string;
  };
  images: {
    base: string;
    style: string;
    male?: {
      expressions: Record<string, string>;
    };
    female?: {
      expressions: Record<string, string>;
    };
    expressions?: Record<string, string>;
  };
}

const emptyFormData: MBTIPersonaFormData = {
  id: '',
  mbti: '',
  gender: 'male',
  name: '',
  department: '',
  position: '',
  experience: '',
  stance: '',
  goal: '',
  tradeoff: '',
  personality_traits: [],
  communication_style: '',
  motivation: '',
  fears: [],
  background: {
    personal_values: [],
    hobbies: [],
    social: {
      preference: '',
      behavior: ''
    }
  },
  communication_patterns: {
    opening_style: '',
    key_phrases: [],
    response_to_arguments: {},
    win_conditions: []
  },
  voice: {
    tone: '',
    pace: '',
    emotion: ''
  },
  images: {
    base: '',
    style: '',
    expressions: {
      중립: '',
      기쁨: '',
      슬픔: '',
      분노: '',
      놀람: '',
      호기심: '',
      불안: '',
      단호: '',
      실망: '',
      당혹: ''
    }
  }
};

interface PersonaCreateDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

export function PersonaCreateDialog({ trigger, open: controlledOpen, onOpenChange, onSuccess, initialData, mode = 'create' }: PersonaCreateDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [formData, setFormData] = useState<MBTIPersonaFormData>(emptyFormData);
  
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;
  const isEditMode = mode === 'edit' && initialData;

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  useEffect(() => {
    if (isEditMode && isOpen && initialData) {
      const mappedData: MBTIPersonaFormData = {
        id: initialData.id || '',
        mbti: initialData.mbti || initialData.mbtiType || initialData.mbpiType || '',
        gender: initialData.gender || 'female',
        name: initialData.name || initialData.displayName || '',
        department: initialData.department || '',
        position: initialData.position || initialData.role || '',
        experience: initialData.experience || '',
        stance: initialData.stance || '',
        goal: initialData.goal || '',
        tradeoff: initialData.tradeoff || '',
        personality_traits: initialData.personality_traits || [],
        communication_style: initialData.communication_style || initialData.communicationStyle || '',
        motivation: initialData.motivation || '',
        fears: initialData.fears || [],
        background: {
          personal_values: initialData.background?.personal_values || [],
          hobbies: initialData.background?.hobbies || [],
          social: {
            preference: initialData.background?.social?.preference || '',
            behavior: initialData.background?.social?.behavior || ''
          }
        },
        communication_patterns: {
          opening_style: initialData.communication_patterns?.opening_style || '',
          key_phrases: initialData.communication_patterns?.key_phrases || [],
          response_to_arguments: initialData.communication_patterns?.response_to_arguments || {},
          win_conditions: initialData.communication_patterns?.win_conditions || []
        },
        voice: {
          tone: initialData.voice?.tone || '',
          pace: initialData.voice?.pace || '',
          emotion: initialData.voice?.emotion || ''
        },
        images: {
          base: initialData.images?.male?.base || initialData.images?.female?.base || '',
          style: '',
          expressions: {
            중립: initialData.images?.male?.expressions?.neutral || initialData.images?.female?.expressions?.neutral || '',
            기쁨: initialData.images?.male?.expressions?.joy || initialData.images?.female?.expressions?.joy || '',
            슬픔: initialData.images?.male?.expressions?.sad || initialData.images?.female?.expressions?.sad || '',
            분노: initialData.images?.male?.expressions?.angry || initialData.images?.female?.expressions?.angry || '',
            놀람: initialData.images?.male?.expressions?.surprise || initialData.images?.female?.expressions?.surprise || '',
            호기심: initialData.images?.male?.expressions?.curious || initialData.images?.female?.expressions?.curious || '',
            불안: '',
            단호: '',
            실망: '',
            당혹: ''
          }
        }
      };
      setFormData(mappedData);
    }
  }, [isEditMode, isOpen, initialData]);

  const createMutation = useMutation({
    mutationFn: async (personaData: MBTIPersonaFormData) => {
      const response = await apiRequest("POST", "/api/admin/personas", personaData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/personas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personas/mine'] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "페르소나가 생성되었습니다."
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "페르소나 생성에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (personaData: MBTIPersonaFormData) => {
      const response = await apiRequest("PUT", `/api/admin/personas/${initialData.id}`, personaData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/personas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personas/mine'] });
      queryClient.invalidateQueries({ queryKey: ['/api/personas/public'] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "페르소나가 수정되었습니다."
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "오류",
        description: "페르소나 수정에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
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
        <DialogHeader className="bg-indigo-600 -m-6 mb-4 p-6 rounded-t-lg">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            {isEditMode ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {isEditMode ? '페르소나 수정' : '페르소나 생성'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              기본 정보
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id" className="text-sm font-semibold text-slate-700 mb-1.5 block">MBTI ID (소문자)</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value.toLowerCase() }))}
                  placeholder="istj, enfp, intp 등"
                  required
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-persona-id"
                />
              </div>
              <div>
                <Label htmlFor="mbti" className="text-sm font-semibold text-slate-700 mb-1.5 block">MBTI 유형 (대문자)</Label>
                <Input
                  id="mbti"
                  value={formData.mbti}
                  onChange={(e) => setFormData(prev => ({ ...prev, mbti: e.target.value.toUpperCase() }))}
                  placeholder="ISTJ, ENFP, INTP 등"
                  required
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-mbti"
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-sm font-semibold text-slate-700 mb-1.5 block">성별</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value: 'male' | 'female') => setFormData(prev => ({ ...prev, gender: value }))}
                >
                  <SelectTrigger className="border-slate-300 bg-white" data-testid="select-gender">
                    <SelectValue placeholder="성별 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남성</SelectItem>
                    <SelectItem value="female">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 시나리오 페르소나 정의 섹션 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              시나리오 페르소나 정의
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="persona_name" className="text-sm font-semibold text-slate-700 mb-1.5 block">이름</Label>
                  <Input
                    id="persona_name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="김철수"
                    className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    data-testid="input-persona-name"
                  />
                </div>
                <div>
                  <Label htmlFor="persona_department" className="text-sm font-semibold text-slate-700 mb-1.5 block">부서</Label>
                  <Input
                    id="persona_department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="영업팀"
                    className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    data-testid="input-persona-department"
                  />
                </div>
                <div>
                  <Label htmlFor="persona_position" className="text-sm font-semibold text-slate-700 mb-1.5 block">직책</Label>
                  <Input
                    id="persona_position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="팀장"
                    className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    data-testid="input-persona-position"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="persona_experience" className="text-sm font-semibold text-slate-700 mb-1.5 block">경력/경험</Label>
                <Textarea
                  id="persona_experience"
                  value={formData.experience}
                  onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="10년 경력의 영업 전문가, 다양한 고객 대응 경험 보유"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-persona-experience"
                />
              </div>

              <div>
                <Label htmlFor="persona_stance" className="text-sm font-semibold text-slate-700 mb-1.5 block">입장/태도</Label>
                <Textarea
                  id="persona_stance"
                  value={formData.stance}
                  onChange={(e) => setFormData(prev => ({ ...prev, stance: e.target.value }))}
                  placeholder="고객 중심적 사고, 문제 해결에 적극적"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-persona-stance"
                />
              </div>

              <div>
                <Label htmlFor="persona_goal" className="text-sm font-semibold text-slate-700 mb-1.5 block">목표</Label>
                <Textarea
                  id="persona_goal"
                  value={formData.goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                  placeholder="팀 매출 목표 달성, 신규 고객 확보"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-persona-goal"
                />
              </div>

              <div>
                <Label htmlFor="persona_tradeoff" className="text-sm font-semibold text-slate-700 mb-1.5 block">딜레마/트레이드오프</Label>
                <Textarea
                  id="persona_tradeoff"
                  value={formData.tradeoff}
                  onChange={(e) => setFormData(prev => ({ ...prev, tradeoff: e.target.value }))}
                  placeholder="품질과 비용 사이의 균형"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-persona-tradeoff"
                />
              </div>
            </div>
          </div>

          {/* 성격 특성 섹션 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              성격 특성
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="personality_traits" className="text-sm font-semibold text-slate-700 mb-1.5 block">성격 특성 (쉼표로 구분)</Label>
                <Input
                  id="personality_traits"
                  value={formData.personality_traits.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, personality_traits: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                  placeholder="분석적, 신중함, 책임감 있는"
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-personality-traits"
                />
              </div>

              <div>
                <Label htmlFor="communication_style" className="text-sm font-semibold text-slate-700 mb-1.5 block">의사소통 스타일</Label>
                <Textarea
                  id="communication_style"
                  value={formData.communication_style}
                  onChange={(e) => setFormData(prev => ({ ...prev, communication_style: e.target.value }))}
                  placeholder="직접적이고 명확한 표현, 사실과 데이터 중심"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-communication-style"
                />
              </div>

              <div>
                <Label htmlFor="motivation" className="text-sm font-semibold text-slate-700 mb-1.5 block">동기/동인</Label>
                <Textarea
                  id="motivation"
                  value={formData.motivation}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                  placeholder="안정성과 질서, 명확한 규칙과 절차"
                  className="min-h-[60px] border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="textarea-motivation"
                />
              </div>

              <div>
                <Label htmlFor="fears" className="text-sm font-semibold text-slate-700 mb-1.5 block">두려움/걱정 (쉼표로 구분)</Label>
                <Input
                  id="fears"
                  value={formData.fears.join(', ')}
                  onChange={(e) => setFormData(prev => ({ ...prev, fears: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                  placeholder="불확실성, 급격한 변화, 무질서"
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-fears"
                />
              </div>
            </div>
          </div>

          {/* 음성 설정 섹션 */}
          <div className="bg-white rounded-lg p-5 shadow-sm border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-200">
              음성 설정
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="voice_tone" className="text-sm font-semibold text-slate-700 mb-1.5 block">톤</Label>
                <Input
                  id="voice_tone"
                  value={formData.voice.tone}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice: { ...prev.voice, tone: e.target.value } }))}
                  placeholder="차분하고 신뢰감 있는"
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-voice-tone"
                />
              </div>
              <div>
                <Label htmlFor="voice_pace" className="text-sm font-semibold text-slate-700 mb-1.5 block">속도</Label>
                <Input
                  id="voice_pace"
                  value={formData.voice.pace}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice: { ...prev.voice, pace: e.target.value } }))}
                  placeholder="보통, 일정한 리듬"
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-voice-pace"
                />
              </div>
              <div>
                <Label htmlFor="voice_emotion" className="text-sm font-semibold text-slate-700 mb-1.5 block">감정</Label>
                <Input
                  id="voice_emotion"
                  value={formData.voice.emotion}
                  onChange={(e) => setFormData(prev => ({ ...prev, voice: { ...prev.voice, emotion: e.target.value } }))}
                  placeholder="차분함, 안정적"
                  className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                  data-testid="input-voice-emotion"
                />
              </div>
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
              className="bg-corporate-600 hover:bg-corporate-700"
              data-testid="button-save-persona"
            >
              {createMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
