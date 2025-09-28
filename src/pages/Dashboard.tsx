import { NoticeMarquee } from '@/components/NoticeMarquee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Car, PlusCircle, List, Users, AlertTriangle, Siren } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { role, hasRole } = useUserRole();
  const { user } = useAuth();

  const handleReadinessAlert = async (alertType: 'condutores' | 'socorristas') => {
    if (!user) return;

    try {
      // Get user name
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const requesterName = profile ? `${profile.first_name} ${profile.last_name}` : 'Utilizador Desconhecido';

      // Call the emergency alert function
      const { error } = await supabase.functions.invoke('emergency-alert', {
        body: {
          alertType,
          requesterName
        }
      });

      if (error) throw error;

      toast({
        title: "Alerta de prontidão enviado",
        description: `Alerta para ${alertType} foi enviado via Telegram.`,
      });

    } catch (error: any) {
      toast({
        title: "Erro ao enviar alerta",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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
      title: 'Alerta de Prontidão',
      description: 'Enviar alerta de prontidão',
      icon: Siren,
      action: 'readiness',
      color: 'bg-red-500/10 hover:bg-red-500/20',
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
            key={action.path || action.action} 
            className={`cursor-pointer transition-colors ${action.color}`}
            onClick={() => {
              if (action.path) {
                navigate(action.path);
              } else if (action.action === 'readiness') {
                // Show readiness alert options
                const alertType = window.confirm('Seleccionar tipo de alerta:\nOK = Condutores\nCancelar = Socorristas');
                handleReadinessAlert(alertType ? 'condutores' : 'socorristas');
              }
            }}
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
        <CardContent className="flex gap-4 flex-wrap">
          <Button onClick={() => navigate('/register-exit')} className="flex-1 min-w-[150px]">
            <PlusCircle className="h-4 w-4 mr-2" />
            Registar Saída
          </Button>
          <Button variant="outline" onClick={() => navigate('/exits')} className="flex-1 min-w-[150px]">
            <List className="h-4 w-4 mr-2" />
            Ver Saídas
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              const alertType = window.confirm('Seleccionar tipo de alerta:\nOK = Condutores\nCancelar = Socorristas');
              handleReadinessAlert(alertType ? 'condutores' : 'socorristas');
            }}
            className="flex-1 min-w-[150px]"
          >
            <Siren className="h-4 w-4 mr-2" />
            Alerta de Prontidão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;