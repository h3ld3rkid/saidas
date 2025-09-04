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
} from 'lucide-react';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { role, hasRole } = useUserRole();
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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

      <SidebarTrigger className="absolute -right-4 top-4 z-10" />
    </Sidebar>
  );
}