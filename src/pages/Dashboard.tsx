import { NoticeMarquee } from '@/components/NoticeMarquee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Car, PlusCircle, List, Users, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { role, hasRole } = useUserRole();

  const quickActions = [
    {
      title: 'Registar Nova Saída',
      description: 'Registar saída de viatura',
      icon: PlusCircle,
      path: '/register-exit',
      color: 'bg-primary/10 hover:bg-primary/20',
      roles: ['user', 'mod', 'admin'],
    },
    {
      title: 'Ver Saídas',
      description: 'Consultar registos de saídas',
      icon: List,
      path: '/exits',
      color: 'bg-blue-500/10 hover:bg-blue-500/20',
      roles: ['user', 'mod', 'admin'],
    },
    {
      title: 'Gerir Viaturas',
      description: 'Adicionar e gerir viaturas',
      icon: Car,
      path: '/vehicles',
      color: 'bg-green-500/10 hover:bg-green-500/20',
      roles: ['admin'],
    },
    {
      title: 'Gerir Utilizadores',
      description: 'Adicionar e gerir utilizadores',
      icon: Users,
      path: '/users',
      color: 'bg-purple-500/10 hover:bg-purple-500/20',
      roles: ['admin'],
    },
    {
      title: 'Gerir Avisos',
      description: 'Criar e gerir avisos',
      icon: AlertTriangle,
      path: '/notices',
      color: 'bg-orange-500/10 hover:bg-orange-500/20',
      roles: ['admin'],
    },
  ];

  const availableActions = quickActions.filter(action => 
    action.roles.includes(role)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao Sistema de Registo de Saídas de Viaturas
        </p>
      </div>

      <NoticeMarquee />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableActions.map((action) => (
          <Card 
            key={action.path} 
            className={`cursor-pointer transition-colors ${action.color}`}
            onClick={() => navigate(action.path)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <action.icon className="h-6 w-6" />
                <CardTitle className="text-lg">{action.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {action.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
          <CardDescription>
            Acções mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => navigate('/register-exit')} className="flex-1">
            <PlusCircle className="h-4 w-4 mr-2" />
            Registar Saída
          </Button>
          <Button variant="outline" onClick={() => navigate('/exits')} className="flex-1">
            <List className="h-4 w-4 mr-2" />
            Ver Saídas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;