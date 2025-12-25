import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, Lock, Save, Shield, Crown, Settings, VolumeX, Plus, X, Check, Sparkles, Zap, Star } from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(3, "사용자명은 3자 이상이어야 합니다").max(20, "사용자명은 20자 이하여야 합니다").regex(/^[a-z0-9_]+$/, "영문 소문자, 숫자, 밑줄만 허용됩니다").optional().or(z.literal("")),
  displayName: z.string().max(50, "표시 이름은 50자 이하여야 합니다").optional(),
  bio: z.string().max(200, "소개는 200자 이하여야 합니다").optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요"),
  newPassword: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Z]/, "대문자를 포함해야 합니다")
    .regex(/[a-z]/, "소문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .regex(/[!@#$%^&*]/, "특수문자(!@#$%^&*)를 포함해야 합니다"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserPreferences {
  language: string;
  theme: string;
  chatStyle: string;
  previewReleases: boolean;
  soundEffects: boolean;
  notifications: boolean;
}

const defaultPreferences: UserPreferences = {
  language: "ko",
  theme: "system",
  chatStyle: "balanced",
  previewReleases: false,
  soundEffects: true,
  notifications: true,
};

const subscriptionPlans = [
  {
    id: "free",
    name: "무료",
    price: 0,
    yearlyPrice: 0,
    features: [
      "기본 채팅 기능",
      "제한된 일일 대화 수",
      "광고 포함",
    ],
    limitations: [
      "채팅 전후 광고 표시",
      "일일 50회 대화 제한",
      "기본 응답 속도",
    ],
  },
  {
    id: "plus",
    name: "플러스",
    price: 9.99,
    yearlyPrice: 95.90,
    features: [
      "광고 없음",
      "더 높은 대화 한도 (일일 200회)",
      "커스텀 채팅 스타일",
      "향상된 메모리 기능",
      "채팅 우선 서비스",
    ],
    limitations: [],
  },
  {
    id: "pro",
    name: "프로",
    price: 19.99,
    yearlyPrice: 191.90,
    features: [
      "광고 없음",
      "무제한 대화",
      "실시간 음성 대화",
      "최우선 응답 속도",
      "모든 채팅 스타일",
      "고급 메모리 & 맥락 유지",
      "독점 기능 조기 접근",
      "VIP 지원",
    ],
    limitations: [],
  },
];

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [newMutedWord, setNewMutedWord] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      displayName: "",
      bio: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        username: (user as any).username || "",
        displayName: (user as any).displayName || "",
        bio: (user as any).bio || "",
      });
      setPreferences((user as any).preferences || defaultPreferences);
      setMutedWords((user as any).mutedWords || []);
    }
  }, [user]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsUpdatingProfile(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        username: data.username || null,
        displayName: data.displayName || null,
        bio: data.bio || null,
      });
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "프로필 업데이트 완료",
        description: "공개 프로필 정보가 성공적으로 업데이트되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "업데이트 실패",
        description: error.message || "프로필 업데이트 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsUpdatingPassword(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      toast({
        title: "비밀번호 변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "변경 실패",
        description: error.message || "비밀번호 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    setIsUpdatingPreferences(true);
    const updatedPrefs = { ...preferences, ...newPreferences };
    setPreferences(updatedPrefs);
    try {
      await apiRequest("PATCH", "/api/user/profile", { preferences: updatedPrefs });
      await refreshUser();
      toast({
        title: "설정 저장됨",
        description: "설정이 성공적으로 업데이트되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "저장 실패",
        description: error.message || "설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const addMutedWord = async () => {
    if (!newMutedWord.trim()) return;
    const word = newMutedWord.trim().toLowerCase();
    if (mutedWords.includes(word)) {
      toast({ title: "이미 추가된 단어입니다", variant: "destructive" });
      return;
    }
    const newList = [...mutedWords, word];
    setMutedWords(newList);
    setNewMutedWord("");
    try {
      await apiRequest("PATCH", "/api/user/profile", { mutedWords: newList });
      await refreshUser();
      toast({ title: "단어가 추가되었습니다" });
    } catch (error: any) {
      setMutedWords(mutedWords);
      toast({ title: "추가 실패", variant: "destructive" });
    }
  };

  const removeMutedWord = async (word: string) => {
    const newList = mutedWords.filter(w => w !== word);
    setMutedWords(newList);
    try {
      await apiRequest("PATCH", "/api/user/profile", { mutedWords: newList });
      await refreshUser();
      toast({ title: "단어가 제거되었습니다" });
    } catch (error: any) {
      setMutedWords(mutedWords);
      toast({ title: "제거 실패", variant: "destructive" });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">사용자 정보를 불러오는 중...</p>
      </div>
    );
  }

  const currentPlan = (user as any).subscriptionPlan || "free";

  return (
    <div className="container max-w-4xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">프로필 설정</h1>
        <p className="text-muted-foreground">계정 정보, 구독, 설정을 관리하세요</p>
      </div>

      <div className="space-y-6">
        {/* 공개 프로필 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              공개 프로필
            </CardTitle>
            <CardDescription>
              다른 사용자에게 표시되는 프로필 정보입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user.profileImage || undefined} />
                <AvatarFallback className="text-2xl">{user.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{(user as any).displayName || user.name}</p>
                <p className="text-sm text-muted-foreground">@{(user as any).username || "username"}</p>
                <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
              </div>
            </div>

            <Separator className="my-6" />

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>사용자명</FormLabel>
                      <FormControl>
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-1">@</span>
                          <Input {...field} placeholder="username" data-testid="input-username" />
                        </div>
                      </FormControl>
                      <FormDescription>고유한 사용자명 (영문 소문자, 숫자, 밑줄)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>표시 이름</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="표시될 이름" data-testid="input-display-name" />
                      </FormControl>
                      <FormDescription>프로필에 표시될 이름</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>소개</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="자기소개를 작성하세요" 
                          className="resize-none"
                          rows={3}
                          data-testid="input-bio" 
                        />
                      </FormControl>
                      <FormDescription>최대 200자</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isUpdatingProfile} data-testid="button-save-profile">
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdatingProfile ? "저장 중..." : "프로필 저장"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 구독 플랜 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              구독 플랜
            </CardTitle>
            <CardDescription>
              현재 플랜: <Badge variant={currentPlan === "pro" ? "default" : currentPlan === "plus" ? "secondary" : "outline"}>
                {currentPlan === "pro" ? "프로" : currentPlan === "plus" ? "플러스" : "무료"}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-end mb-4 gap-2">
              <span className={billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}>월간</span>
              <Switch 
                checked={billingCycle === "yearly"} 
                onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
              />
              <span className={billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}>
                연간 <Badge variant="secondary" className="ml-1">20% 할인</Badge>
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {subscriptionPlans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative rounded-lg border p-4 ${
                    currentPlan === plan.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  {plan.id === "pro" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                        <Sparkles className="w-3 h-3 mr-1" /> 인기
                      </Badge>
                    </div>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg flex items-center justify-center gap-1">
                      {plan.id === "pro" && <Star className="w-4 h-4 text-yellow-500" />}
                      {plan.id === "plus" && <Zap className="w-4 h-4 text-blue-500" />}
                      {plan.name}
                    </h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">
                        ${billingCycle === "yearly" ? (plan.yearlyPrice / 12).toFixed(2) : plan.price.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/월</span>
                    </div>
                    {billingCycle === "yearly" && plan.price > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        연 ${plan.yearlyPrice.toFixed(2)} 청구
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 text-sm mb-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={currentPlan === plan.id ? "outline" : "default"}
                    className="w-full"
                    disabled={currentPlan === plan.id}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {currentPlan === plan.id ? "현재 플랜" : plan.price === 0 ? "다운그레이드" : "업그레이드"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 기본 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              기본 설정
            </CardTitle>
            <CardDescription>
              앱 동작 및 표시 설정을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>언어</Label>
                  <p className="text-sm text-muted-foreground">앱 표시 언어</p>
                </div>
                <Select 
                  value={preferences.language} 
                  onValueChange={(value) => updatePreferences({ language: value })}
                >
                  <SelectTrigger className="w-32" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>테마</Label>
                  <p className="text-sm text-muted-foreground">앱 색상 테마</p>
                </div>
                <Select 
                  value={preferences.theme} 
                  onValueChange={(value) => updatePreferences({ theme: value })}
                >
                  <SelectTrigger className="w-32" data-testid="select-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">라이트</SelectItem>
                    <SelectItem value="dark">다크</SelectItem>
                    <SelectItem value="system">시스템</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>채팅 스타일</Label>
                  <p className="text-sm text-muted-foreground">AI 응답 스타일</p>
                </div>
                <Select 
                  value={preferences.chatStyle} 
                  onValueChange={(value) => updatePreferences({ chatStyle: value })}
                >
                  <SelectTrigger className="w-32" data-testid="select-chat-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">캐주얼</SelectItem>
                    <SelectItem value="balanced">균형</SelectItem>
                    <SelectItem value="formal">격식체</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>미리보기 릴리스</Label>
                  <p className="text-sm text-muted-foreground">새 기능을 미리 체험</p>
                </div>
                <Switch 
                  checked={preferences.previewReleases}
                  onCheckedChange={(checked) => updatePreferences({ previewReleases: checked })}
                  data-testid="switch-preview-releases"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>사운드 효과</Label>
                  <p className="text-sm text-muted-foreground">알림 및 효과음</p>
                </div>
                <Switch 
                  checked={preferences.soundEffects}
                  onCheckedChange={(checked) => updatePreferences({ soundEffects: checked })}
                  data-testid="switch-sound-effects"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 음소거 단어 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VolumeX className="w-5 h-5" />
              음소거 단어
            </CardTitle>
            <CardDescription>
              대화 중 마주치고 싶지 않은 단어를 추가하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input 
                value={newMutedWord}
                onChange={(e) => setNewMutedWord(e.target.value)}
                placeholder="단어 입력"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMutedWord())}
                data-testid="input-muted-word"
              />
              <Button onClick={addMutedWord} size="icon" data-testid="button-add-muted-word">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mutedWords.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 음소거 단어가 없습니다</p>
              ) : (
                mutedWords.map((word) => (
                  <Badge key={word} variant="secondary" className="gap-1">
                    {word}
                    <button 
                      onClick={() => removeMutedWord(word)}
                      className="ml-1 hover:text-destructive"
                      data-testid={`button-remove-word-${word}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              비밀번호 변경
            </CardTitle>
            <CardDescription>
              계정 보안을 위해 비밀번호를 정기적으로 변경하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현재 비밀번호</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-current-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>새 비밀번호</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-new-password" />
                      </FormControl>
                      <FormDescription>
                        8자 이상, 대/소문자, 숫자, 특수문자 포함
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호 확인</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" data-testid="input-confirm-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isUpdatingPassword} data-testid="button-change-password">
                  <Lock className="w-4 h-4 mr-2" />
                  {isUpdatingPassword ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* 계정 관리 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              계정 관리
            </CardTitle>
            <CardDescription>
              계정 삭제 등 중요한 계정 관련 작업을 수행합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
            </p>
            <Button variant="destructive" disabled data-testid="button-delete-account">
              계정 삭제 (준비 중)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
