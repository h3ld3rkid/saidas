import { NoticeMarquee } from '@/components/NoticeMarquee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Car, PlusCircle, List, Users, AlertTriangle, Siren, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { role, hasRole } = useUserRole();
  const { user } = useAuth();
  const [readinessAlerts, setReadinessAlerts] = useState<any[]>([]);
  const [readinessResponses, setReadinessResponses] = useState<any[]>([]);

  useEffect(() => {
    const fetchReadinessData = async () => {
      try {
        // Fetch readiness alerts
        const { data: alertsData } = await supabase
          .from('readiness_alerts')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch readiness responses (only fields needed; avoid profile join that requires FK/RLS)
        const { data: responsesData } = await supabase
          .from('readiness_responses')
          .select('alert_id, response')
          .eq('response', true);

        setReadinessAlerts(alertsData || []);
        setReadinessResponses(responsesData || []);
      } catch (error) {
        console.error('Error fetching readiness data:', error);
      }
    };

    fetchReadinessData();

    // Set up real-time subscriptions
    const alertsChannel = supabase
      .channel('readiness_alerts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'readiness_alerts' },
        () => fetchReadinessData()
      )
      .subscribe();

    const responsesChannel = supabase
      .channel('readiness_responses_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'readiness_responses' },
        () => fetchReadinessData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, []);

  const handleClearReadiness = async (alertId: string, alertType: string) => {
    try {
      // Now the edge function will compute responders and notify them server-side
      const { error } = await supabase.functions.invoke('clear-readiness-alert', {
        body: {
          alertId,
          alertType,
        }
      });

      if (error) throw error;

      toast({
        title: "Alerta desativado com sucesso",
        description: `Alerta de ${alertType} foi desativado e notificações enviadas.`,
      });

    } catch (error: any) {
      console.error('Error clearing readiness alert:', error);
      toast({
        title: "Erro ao desativar alerta",
        description: error.message,
        variant: "destructive"
      });
    }
  };

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

      {readinessAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <Siren className="h-5 w-5" />
              Alertas de Prontidão Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {readinessAlerts.map((alert) => {
                const alertResponses = readinessResponses.filter(r => r.alert_id === alert.alert_id);
                const positiveResponses = alertResponses.filter(r => r.response === true);
                
                return (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Tipo:</span>
                        <span className="capitalize">{alert.alert_type}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Enviado por: {alert.requester_name} • {new Date(alert.created_at).toLocaleString('pt-PT')}
                      </div>
                      {positiveResponses.length > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          ✅ {positiveResponses.length} pessoa(s) disponível(eis)
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleClearReadiness(alert.alert_id, alert.alert_type)}
                      className="ml-4"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Desativar
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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