import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Compass,
  User,
  Users,
  FileText,
  Settings,
  LayoutDashboard,
  Shield,
  Sparkles,
  LogOut,
  LogIn,
  Cog,
  HelpCircle,
  ChartBar,
  History,
  ShieldCheck,
  BarChart3,
  ChevronUp,
  MessageCircle,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  admin: { label: "시스템관리자", color: "text-red-700", bgColor: "bg-red-100" },
  operator: { label: "운영자", color: "text-blue-700", bgColor: "bg-blue-100" },
  user: { label: "일반유저", color: "text-slate-600", bgColor: "bg-slate-100" },
};

const mainMenuItems = [
  {
    title: "탐색",
    url: "/explore",
    icon: Compass,
  },
];

const myContentItems = [
  {
    title: "콘텐츠 관리",
    url: "/admin-management",
    icon: Cog,
    requiresAuth: true,
  },
];

const settingsItems = [
  {
    title: "프로필 설정",
    url: "/profile-settings",
    icon: Settings,
    requiresAuth: true,
  },
  {
    title: "도움말",
    url: "/help",
    icon: HelpCircle,
  },
];

const adminItems = [
  {
    title: "대시보드",
    url: "/admin-dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "운영 관리",
    url: "/admin-management",
    icon: Cog,
  },
  {
    title: "시스템 설정",
    url: "/system-admin",
    icon: Shield,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const { data: categories } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/categories'],
    enabled: !!user?.assignedCategoryId,
  });

  // 진행 중인 대화 목록 조회
  const { data: activeConversations, isLoading: conversationsLoading } = useQuery<{
    id: string;
    personaId: string;
    personaName: string | null;
    conversationId: string | null;
    status: string;
    actualStartedAt: string;
    lastMessage?: {
      message: string;
      sender: string;
      createdAt: string;
    };
    scenarioRun?: {
      scenarioId: string;
      scenarioName: string;
    };
  }[]>({
    queryKey: ['/api/active-conversations'],
    enabled: isAuthenticated,
    refetchInterval: 30000, // 30초마다 갱신
  });

  const isAdmin = user?.role === "admin";
  const isOperator = user?.role === "operator";
  const showAdminMenu = isAdmin || isOperator;

  const role = user?.role || "user";
  const roleInfo = roleConfig[role] || roleConfig.user;
  const assignedCategory = Array.isArray(categories) ? categories.find(c => String(c.id) === String(user?.assignedCategoryId)) : undefined;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const handleLogin = () => {
    window.location.href = "/auth";
  };

  const isActive = (url: string) => {
    if (url.includes("?")) {
      return location.startsWith(url.split("?")[0]);
    }
    return location === url;
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/explore">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Metabeings</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 만들기 드롭다운 버튼 */}
              {isAuthenticated && (
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton data-testid="menu-create">
                        <Plus className="w-4 h-4" />
                        <span>만들기</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem
                        onClick={() => window.location.href = '/create-persona'}
                        data-testid="menu-create-persona"
                      >
                        <User className="w-4 h-4 mr-2" />
                        페르소나
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => window.location.href = '/create-scenario'}
                        data-testid="menu-create-scenario"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        시나리오
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              )}
              
              {/* 탐색 메뉴 */}
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    data-testid={`menu-${item.url.replace("/", "")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAuthenticated && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/conversations")}
                      data-testid="menu-conversations"
                    >
                      <Link href="/conversations">
                        <MessageCircle className="w-4 h-4" />
                        <span>채팅</span>
                        {activeConversations && activeConversations.length > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {activeConversations.length}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isAuthenticated && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>내 콘텐츠</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {myContentItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        data-testid={`menu-${item.url.replace("/", "").replace("?", "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>설정</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                if (item.requiresAuth && !isAuthenticated) return null;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      data-testid={`menu-${item.url.replace("/", "")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAdminMenu && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>
                {isAdmin ? "시스템 관리" : "운영자 메뉴"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => {
                    if (!isAdmin && item.url === "/system-admin") return null;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          data-testid={`menu-admin-${item.url.replace("/", "")}`}
                        >
                          <Link href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {isAuthenticated && user ? (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-3 w-full p-2 rounded-md hover-elevate cursor-pointer text-left"
                  data-testid="button-profile-menu"
                >
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={user.profileImage || undefined} />
                    <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid="text-username">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {roleInfo.label}
                    </p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "사용자"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {assignedCategory && (
                        <Badge className="bg-green-100 text-green-700 text-xs w-fit" data-testid="menu-category-badge">
                          {assignedCategory.name}
                        </Badge>
                      )}
                      <Badge className={`${roleInfo.bgColor} ${roleInfo.color} text-xs w-fit`} data-testid="menu-role-badge">
                        {roleInfo.label}
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.location.href = '/conversations'}
                  data-testid="menu-conversations"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  대화
                </DropdownMenuItem>
                
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => window.location.href = '/system-admin'}
                      data-testid="menu-system-admin"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      시스템 관리자
                    </DropdownMenuItem>
                  </>
                )}
                
                {(user?.role === 'admin' || user?.role === 'operator') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => window.location.href = '/admin'}
                      data-testid="menu-admin-dashboard"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      운영자 대시보드
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.location.href = '/admin-management'}
                      data-testid="menu-content-management"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      콘텐츠 관리
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </>
        ) : (
          <Button
            className="w-full"
            onClick={handleLogin}
            data-testid="button-login"
          >
            <LogIn className="w-4 h-4 mr-2" />
            로그인
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
