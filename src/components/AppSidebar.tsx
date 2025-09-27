import { useNavigate, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { role, hasRole } = useUserRole();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const sendEmergencyAlert = async (alertType: 'condutores' | 'socorristas') => {
    try {
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
      title: 'Home',
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
      title: 'Telegram',
      icon: MessageCircle,
      path: '/telegram',
      roles: ['admin'],
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Sidebar className={!open ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          {open && <span className="font-semibold">Sistema Saídas</span>}
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
                    {open && <span>{item.title}</span>}
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
                  className="hover:bg-orange-500/10 text-orange-600 hover:text-orange-700"
                >
                  <UserCheck className="h-4 w-4" />
                  {open && <span>Condutores</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => sendEmergencyAlert('socorristas')}
                  className="hover:bg-red-500/10 text-red-600 hover:text-red-700"
                >
                  <Zap className="h-4 w-4" />
                  {open && <span>Socorristas</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
                      {open && <span>{item.title}</span>}
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
          {open && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs capitalize">Nível: {role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>

      
    </Sidebar>
  );
}