import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Car, FilePlus2, Megaphone, Users, UserCircle2, ListChecks, Edit3, CheckCircle, XCircle, Trash2 } from "lucide-react";
const fetchNotices = async () => {
  const {
    data,
    error
  } = await supabase.from('notices').select('id, title, content, start_date, end_date').order('start_date', {
    ascending: false
  });
  if (error) throw error;
  return data ?? [];
};
  const fetchActiveServices = async () => {
    const { data, error } = await supabase
      .from('vehicle_exits')
      .select('id, user_id, vehicle_id, departure_date, departure_time, purpose, ambulance_number, exit_type, driver_name, crew, status, service_number, total_service_number')
      .eq('status', 'active')
      .order('departure_date', { ascending: false });
  
  if (error) throw error;
  
  // Para cada serviço, buscar os nomes da tripulação
  const servicesWithCrewNames = await Promise.all((data || []).map(async (service) => {
    if (service.crew) {
      const crewIds = service.crew.split(',').map((id: string) => id.trim());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', crewIds);
      
      const crewNames = profiles?.map(p => `${p.first_name} ${p.last_name}`).join(', ') || service.crew;
      return { ...service, crewNames };
    }
    return { ...service, crewNames: '' };
  }));
  
  return servicesWithCrewNames;
};

const fetchReadinessResponses = async () => {
  // Buscar apenas o alerta mais recente dos últimos 30 minutos
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: alerts, error: alertsError } = await supabase
    .from('readiness_alerts')
    .select('alert_id, alert_type, requester_name, created_at')
    .gte('created_at', thirtyMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1); // Apenas o mais recente

  if (alertsError) throw alertsError;
  
  if (!alerts || alerts.length === 0) return [];

  // Para o alerta mais recente, buscar as respostas
  const alert = alerts[0];
  const { data: responses, error: responsesError } = await supabase
    .from('readiness_responses')
    .select('user_id, response, responded_at')
    .eq('alert_id', alert.alert_id);

  if (responsesError) throw responsesError;

  if (!responses || responses.length === 0) {
    return [{
      ...alert,
      yesResponses: [],
      noResponses: [],
      totalResponses: 0
    }];
  }

  // Buscar nomes dos utilizadores via RPC (bypassa RLS de profiles de forma segura)
  const userIds = responses.map(r => r.user_id);
  const { data: namesData, error: namesError } = await supabase
    .rpc('get_user_names_by_ids', { _user_ids: userIds });

  if (namesError) {
    console.error('Erro ao obter nomes via RPC:', namesError);
  }

  // Indexar nomes por user_id
  const nameMap = new Map<string, { first_name: string; last_name: string }>();
  (namesData || []).forEach((u: any) => {
    nameMap.set(u.user_id, { first_name: u.first_name, last_name: u.last_name });
  });

  // Combinar respostas com nomes (sem expor profiles diretamente)
  const responsesWithProfiles = responses.map(response => {
    const n = nameMap.get(response.user_id);
    return {
      ...response,
      profiles: n || { first_name: 'Desconhecido', last_name: '' }
    };
  });

  const yesResponses = responsesWithProfiles.filter(r => r.response === true);
  const noResponses = responsesWithProfiles.filter(r => r.response === false);

  return [{
    ...alert,
    yesResponses,
    noResponses,
    totalResponses: responses.length
  }];
};
export default function Home() {
  useEffect(() => {
    document.title = 'Home | CV Amares';
  }, []);
  const {
    data: notices
  } = useQuery({
    queryKey: ['notices-active'],
    queryFn: fetchNotices
  });
  const {
    data: services
  } = useQuery({
    queryKey: ['services-active'],
    queryFn: fetchActiveServices
  });

  const { data: readinessData, refetch: refetchReadiness } = useQuery({
    queryKey: ['readiness-responses'],
    queryFn: fetchReadinessResponses,
    refetchInterval: 5000 // Atualizar a cada 5 segundos para respostas mais rápidas
  });

  const { hasRole } = useUserRole();
  const { user } = useAuth();

  const handleClearReadiness = async (alertId: string, alertType: string) => {
    try {
      // Não vamos buscar perfis para evitar problemas de RLS para utilizadores
      const respondersToNotify: Array<{ chatId: string; name: string }> = [];

      // Chamar edge function (faz cleanup e pode notificar caso venham responders)
      const { data, error } = await supabase.functions.invoke('clear-readiness-alert', {
        body: { alertId, alertType, responders: respondersToNotify }
      });

      if (error) throw error;

      toast({
        title: 'Prontidão desativada',
        description: `Alerta de ${alertType} removido. (${data?.deletedResponses || 0} respostas apagadas)`,
      });

      // Forçar atualização imediata dos dados
      refetchReadiness();

    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="relative px-6 py-12 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-float">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">Cruz Vermelha Amares</h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">Sistema de gestão de emergências e serviços</p>
            </div>
            
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Avisos Card - Now on Top */}
          <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/10 p-2 rounded-lg">
                  <Megaphone className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Avisos Ativos</CardTitle>
                  <CardDescription>Informações importantes em vigor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notices && notices.length > 0 ? notices.map((n: any) => <div key={n.id} className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{n.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{n.content}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">Ativo</Badge>
                    </div>
                  </div>) : <div className="text-center py-12">
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Megaphone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Sem avisos ativos no momento</p>
                </div>}
            </CardContent>
          </Card>

          {/* Prontidão Card - Só aparece se houver dados */}
          {readinessData && readinessData.length > 0 && (
            <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/10 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Respostas de Prontidão</CardTitle>
                    <CardDescription>Quem respondeu aos alertas recentes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {readinessData.map((alert: any) => (
                  <div key={alert.alert_id} className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">
                          Alerta de {alert.alert_type} - {alert.requester_name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString('pt-PT')}
                        </p>
                        {alert.totalResponses === 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Aguardando respostas...
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClearReadiness(alert.alert_id, alert.alert_type)}
                        className="text-xs"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Desativar
                      </Button>
                    </div>
                    
                    {alert.totalResponses > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Disponíveis */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              Disponíveis ({alert.yesResponses.length})
                            </span>
                          </div>
                          {alert.yesResponses.length > 0 ? (
                            <div className="space-y-1">
                              {alert.yesResponses.map((response: any, idx: number) => (
                                <div key={idx} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded">
                                  {response.profiles.first_name} {response.profiles.last_name}
                                  <span className="text-green-600 ml-2">
                                    {new Date(response.responded_at).toLocaleTimeString('pt-PT', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhuma resposta positiva</p>
                          )}
                        </div>

                        {/* Não Disponíveis */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-700">
                              Não Disponíveis ({alert.noResponses.length})
                            </span>
                          </div>
                          {alert.noResponses.length > 0 ? (
                            <div className="space-y-1">
                              {alert.noResponses.map((response: any, idx: number) => (
                                <div key={idx} className="text-xs bg-red-50 text-red-800 px-2 py-1 rounded">
                                  {response.profiles.first_name} {response.profiles.last_name}
                                  <span className="text-red-600 ml-2">
                                    {new Date(response.responded_at).toLocaleTimeString('pt-PT', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Nenhuma resposta negativa</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Serviços Card - Now Below Notices */}
          <Card className="bg-gradient-card backdrop-blur-sm border-0 shadow-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Saídas Não Terminadas</CardTitle>
                  <CardDescription>Serviços ativos no terreno</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {services && services.length > 0 ? services.map((s: any) => <div key={s.id} className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            {s.ambulance_number ?? 'Viatura'}
                          </h4>
                          {s.service_number && <Badge variant="outline" className="text-xs">Nº {s.service_number}</Badge>}
                          {s.total_service_number && <Badge variant="secondary" className="text-xs">#{s.total_service_number}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          <strong>Motivo:</strong> {s.purpose}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>Partida:</strong> {s.departure_date} às {s.departure_time}
                        </p>
                        {s.crewNames && <p className="text-xs text-muted-foreground">
                            <strong>Tripulação:</strong> {s.crewNames}
                          </p>}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className="shrink-0">{s.exit_type ?? 'Serviço'}</Badge>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            className="text-xs"
                            onClick={async () => {
                              // Check if user is creator, crew member, mod, or admin
                              const isCreator = s.user_id === user?.id;
                              const isCrewMember = s.crew && s.crew.split(',').map((id: string) => id.trim()).includes(user?.id);
                              const canConclude = hasRole('mod') || hasRole('admin') || isCreator || isCrewMember;
                              
                              if (!canConclude) {
                                toast({ title: 'Sem permissão', description: 'Apenas quem registou, tripulação, moderadores ou administradores podem concluir.', variant: 'destructive' });
                                return;
                              }
                              try {
                                const { error } = await supabase
                                  .from('vehicle_exits')
                                  .update({ status: 'completed' })
                                  .eq('id', s.id);
                                
                                if (error) {
                                  toast({ title: 'Erro', description: error.message, variant: 'destructive' });
                                } else {
                                  toast({ title: 'Concluído', description: 'Serviço marcado como concluído.' });
                                  window.location.reload();
                                }
                              } catch (e: any) {
                                toast({ title: 'Erro inesperado', description: e.message, variant: 'destructive' });
                              }
                            }}
                          >
                            Concluir
                          </Button>
                          <Link to={`/exits/${s.id}/edit`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              <Edit3 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>) : <div className="text-center py-12">
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Sem serviços ativos no momento</p>
                </div>}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>;
}