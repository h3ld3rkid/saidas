import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import {
  Car,
  PlusCircle,
  List,
  User,
  Users,
  AlertTriangle,
  LogOut,
  Settings,
  Home,
  MessageCircle,
  Shield,
  UserCheck,
  Zap,
  Calendar,
  Moon,
  Sun,
} from 'lucide-react';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { role, hasRole } = useUserRole();
  const { open, setOpen, openMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isExpanded = isMobile ? openMobile : open;
  const showLabels = isMobile ? true : open;
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null);
  const [hasActiveCondutoresAlert, setHasActiveCondutoresAlert] = useState(false);
  const [hasActiveSocorristasAlert, setHasActiveSocorristasAlert] = useState(false);
  const [escalasUrl, setEscalasUrl] = useState<string>('');

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  // Load escalas URL from settings
  useEffect(() => {
    const loadEscalasUrl = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'escalas_url')
        .single();
      
      if (data?.value) {
        setEscalasUrl(data.value);
      }
    };

    loadEscalasUrl();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('settings-escalas')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'settings',
          filter: 'key=eq.escalas_url'
        },
        (payload: any) => {
          if (payload.new?.value) {
            setEscalasUrl(payload.new.value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check for active readiness alerts
  useEffect(() => {
    const checkActiveAlerts = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: condutoresData } = await supabase
        .from('readiness_alerts')
        .select('alert_id')
        .eq('alert_type', 'condutores')
        .gte('created_at', thirtyMinutesAgo)
        .limit(1);
      
      const { data: socorristasData } = await supabase
        .from('readiness_alerts')
        .select('alert_id')
        .eq('alert_type', 'socorristas')
        .gte('created_at', thirtyMinutesAgo)
        .limit(1);
      
      setHasActiveCondutoresAlert(condutoresData && condutoresData.length > 0);
      setHasActiveSocorristasAlert(socorristasData && socorristasData.length > 0);
    };

    checkActiveAlerts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('readiness-alerts-sidebar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'readiness_alerts'
        },
        () => checkActiveAlerts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-red-600';
      case 'mod':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const sendEmergencyAlert = async (alertType: 'condutores' | 'socorristas') => {
    try {
      // Verificar se já existem 2 alertas ativos
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: activeAlerts } = await supabase
        .from('readiness_alerts')
        .select('alert_id')
        .gte('created_at', thirtyMinutesAgo);

      if (activeAlerts && activeAlerts.length >= 2) {
        toast({
          title: 'Limite atingido',
          description: 'Já existem 2 alertas de prontidão ativos. Aguarde antes de enviar outro.',
          variant: 'destructive',
        });
        return;
      }

      // Buscar o nome do utilizador
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const requesterName = profile 
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : user?.email || 'Utilizador';

      const { data, error } = await supabase.functions.invoke('emergency-alert', {
        body: {
          alertType,
          requesterName
        }
      });

      if (error) throw error;

      toast({
        title: 'Alerta enviado',
        description: `Notificação de prontidão enviada para ${alertType}`,
      });

      // Navegar para a página home
      navigate('/home');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar alerta: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const menuItems = [
    {
      title: 'Início',
      icon: Home,
      path: '/home',
      roles: ['user', 'mod', 'admin'],
    },
    {
      title: 'Registar Saída',
      icon: PlusCircle,
      path: '/register-exit',
      roles: ['user', 'mod', 'admin'],
    },
    {
      title: 'Ver Saídas',
      icon: List,
      path: '/exits',
      roles: ['user', 'mod', 'admin'],
    },
    {
      title: 'Editar Perfil',
      icon: User,
      path: '/profile',
      roles: ['user', 'mod', 'admin'],
    },
  ];

  const adminItems = [
    {
      title: 'Gerir Viaturas',
      icon: Car,
      path: '/vehicles',
      roles: ['admin'],
    },
    {
      title: 'Gerir Utilizadores',
      icon: Users,
      path: '/users',
      roles: ['admin'],
    },
    {
      title: 'Gerir Avisos',
      icon: AlertTriangle,
      path: '/notices',
      roles: ['admin'],
    },
    {
      title: 'Avisos de Entrada',
      icon: Shield,
      path: '/splash-announcements',
      roles: ['admin'],
    },
    {
      title: 'Telegram',
      icon: MessageCircle,
      path: '/telegram',
      roles: ['admin'],
    },
    {
      title: 'Configurações',
      icon: Settings,
      path: '/settings',
      roles: ['admin'],
    },
  ];

  const handleNavigation = (path: string, external?: boolean) => {
    if (external && path) {
      window.open(path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(path);
      // Comportamento após navegação: fecha em mobile, mantém aberto em desktop
      if (isMobile) {
        setOpenMobile(false);
      } else {
        setOpen(true);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar className={isMobile ? 'w-60' : (!open ? 'w-14' : 'w-60')} collapsible={isMobile ? 'offcanvas' : 'icon'}>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          {showLabels && <span className="font-semibold">Sistema Saídas</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.path)}
                    className={
                      isActive(item.path)
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {showLabels && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Prontidão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => sendEmergencyAlert('condutores')}
                  className={
                    hasActiveCondutoresAlert 
                      ? 'animate-[pulse-alert_2s_ease-in-out_infinite] !bg-red-600 !text-white hover:!bg-red-700 hover:!text-white' 
                      : '!bg-red-600 !text-white hover:!bg-red-700'
                  }
                >
                  <UserCheck className="h-4 w-4" />
                  {showLabels && <span>Condutores</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => sendEmergencyAlert('socorristas')}
                  className={
                    hasActiveSocorristasAlert 
                      ? 'animate-[pulse-alert_2s_ease-in-out_infinite] !bg-orange-500 !text-white hover:!bg-orange-600 hover:!text-white' 
                      : '!bg-orange-500 !text-white hover:!bg-orange-600'
                  }
                >
                  <Zap className="h-4 w-4" />
                  {showLabels && <span>Socorristas</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {escalasUrl && (
          <SidebarGroup>
            <SidebarGroupLabel>Escalas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(escalasUrl, true)}
                    className="hover:bg-accent/50"
                  >
                    <Calendar className="h-4 w-4" />
                    {showLabels && <span>Inserir</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole('admin') && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      className={
                        isActive(item.path)
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {showLabels && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="space-y-2">
          {isExpanded && (
            <div className="text-sm">
              <p className="font-bold text-foreground">
                {userProfile ? `${userProfile.first_name} ${userProfile.last_name}`.trim() : user?.email}
              </p>
              <p className={`text-xs capitalize font-medium ${getRoleColor(role || '')}`}>
                Nível: {role}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full justify-start"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isExpanded && <span className="ml-2">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            {isExpanded && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>

      
    </Sidebar>
  );
}