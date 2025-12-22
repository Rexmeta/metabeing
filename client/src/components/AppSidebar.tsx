import { useLocation, Link } from "wouter";
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
} from "lucide-react";

const mainMenuItems = [
  {
    title: "탐색",
    url: "/explore",
    icon: Compass,
  },
  {
    title: "캐릭터 만들기",
    url: "/create",
    icon: Sparkles,
    requiresAuth: true,
  },
  {
    title: "페르소나 만들기",
    url: "/content-management?tab=manage-personas",
    icon: Users,
    requiresAuth: true,
  },
];

const myContentItems = [
  {
    title: "마이 페이지",
    url: "/mypage",
    icon: User,
    requiresAuth: true,
  },
  {
    title: "내 페르소나",
    url: "/library?tab=personas",
    icon: Users,
    requiresAuth: true,
  },
  {
    title: "내 시나리오",
    url: "/library?tab=scenarios",
    icon: FileText,
    requiresAuth: true,
  },
  {
    title: "분석 리포트",
    url: "/analytics",
    icon: ChartBar,
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
  {
    title: "AI 생성기",
    url: "/ai-generator",
    icon: Sparkles,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

  const isAdmin = user?.role === "admin";
  const isOperator = user?.role === "operator";
  const showAdminMenu = isAdmin || isOperator;

  const handleLogout = async () => {
    await logout();
  };

  const handleLogin = () => {
    setShowAuthModal(true);
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
          <SidebarGroupLabel>메인</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user.profileImage || undefined} />
              <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-username">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.role === "admin" ? "관리자" : user.role === "operator" ? "운영자" : "사용자"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
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
