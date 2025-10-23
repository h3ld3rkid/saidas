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
import { Car, Megaphone, Users, Edit3, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { getExitTypeBadgeStyle, displayExitType } from "@/lib/exitType";
import { SplashAnnouncementModal } from "@/components/SplashAnnouncementModal";

const fetchNotices = async () => {
  const { data, error } = await supabase
    .from('notices')
    .select('id, title, content, start_date, end_date')
    .order('start_date', { ascending: false });
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

  // Para cada serviço, buscar o nome do OPCOM e da tripulação
  const servicesWithNames = await Promise.all((data || []).map(async (service) => {
    let opcomName = '';
    let crewNames = '';
    
    // Buscar nome do OPCOM (quem registou)
    if (service.user_id) {
      const { data: opcomProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', service.user_id)
        .single();
      
      if (opcomProfile) {
        opcomName = `${opcomProfile.first_name} ${opcomProfile.last_name}`;
      }
    }
    
    // Buscar nomes da tripulação
    if (service.crew) {
      const crewIds = service.crew.split(',').map((id: string) => id.trim());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', crewIds);
      
      crewNames = profiles?.map(p => `${p.first_name} ${p.last_name}`).join(', ') || service.crew;
    }
    
    return { ...service, opcomName, crewNames };
  }));
  
  return servicesWithNames;
};

const fetchReadinessResponses = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: alerts, error: alertsError } = await supabase
    .from('readiness_alerts')
    .select('alert_id, alert_type, requester_name, created_at')
    .gte('created_at', thirtyMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (alertsError) throw alertsError;
  if (!alerts || alerts.length === 0) return [];

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

  const userIds = responses.map(r => r.user_id);
  const { data: namesData, error: namesError } = await supabase
    .rpc('get_user_names_by_ids', { _user_ids: userIds });

  if (namesError) {
    console.error('Erro ao obter nomes via RPC:', namesError);
  }

  const nameMap = new Map<string, { first_name: string; last_name: string }>();
  (namesData || []).forEach((u: any) => {
    nameMap.set(u.user_id, { first_name: u.first_name, last_name: u.last_name });
  });

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
  
  const { data: notices } = useQuery({
    queryKey: ['notices-active'],
    queryFn: fetchNotices
  });
  
  const { data: services } = useQuery({
    queryKey: ['services-active'],
    queryFn: fetchActiveServices,
    refetchInterval: 3000
  });

  const { data: readinessData, refetch: refetchReadiness } = useQuery({
    queryKey: ['readiness-responses'],
    queryFn: fetchReadinessResponses,
    refetchInterval: 3000
  });

  const { hasRole } = useUserRole();
  const { user } = useAuth();

  const handleClearReadiness = async (alertId: string, alertType: string) => {
    try {
      // Obter nome de quem está a terminar o alerta
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();

      const closedByName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Utilizador'
        : 'Utilizador';

      const { data, error } = await supabase.functions.invoke('clear-readiness-alert', {
        body: { alertId, alertType, closedByName }
      });

      if (error) throw error;

      toast({
        title: 'Prontidão desativada',
        description: `Alerta de ${alertType} removido. (${data?.deletedResponses || 0} respostas apagadas)`,
      });

      refetchReadiness();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <SplashAnnouncementModal />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="relative px-6 py-6 md:py-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-float">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Cruz Vermelha Amares
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Sistema de gestão de emergências e serviços
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
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
              {notices && notices.length > 0 ? (
                notices.map((n: any) => (
                  <div key={n.id} className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground mb-1">{n.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{n.content}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">Ativo</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Megaphone className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Sem avisos ativos no momento</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Link to="/register-exit" className="block">
            <Card className="bg-gradient-to-br from-destructive to-destructive/90 border-0 shadow-lg hover:shadow-destructive/50 transition-all duration-300 hover:scale-[1.01] cursor-pointer">
              <CardContent className="p-5 text-center">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse" />
                    <div className="relative p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                      <Car className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Registar Saída</h3>
                    <p className="text-white/70 text-xs">Registar novo serviço</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

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
              {services && services.length > 0 ? (
                services.map((s: any) => (
                  <div key={s.id} className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border transition-all hover:shadow-md">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-base mb-1">
                            Ambulância {s.ambulance_number ?? 'N/A'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {s.service_number && <span className="font-medium">Nº{s.service_number}</span>}
                            {s.total_service_number && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">Nº Ficha {s.total_service_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const style = getExitTypeBadgeStyle(s.exit_type);
                            return (
                              <Badge variant={style.variant} className={`shrink-0 ${style.className || ''}`}>
                                {displayExitType(s.exit_type)}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground break-words">
                          <strong className="text-foreground">Motivo:</strong> {s.purpose}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Partida:</strong> {s.departure_date} às {s.departure_time}
                        </p>
                      </div>

                      <div className="space-y-1 text-xs">
                        {s.opcomName && (
                          <p className="text-muted-foreground break-words">
                            <strong className="text-foreground">OPCOM:</strong> {s.opcomName}
                          </p>
                        )}
                        {s.crewNames && (
                          <p className="text-muted-foreground break-words">
                            <strong className="text-foreground">Tripulação:</strong> {s.crewNames}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="icon"
                          variant="default"
                          className="h-9 w-9 bg-green-600 hover:bg-green-700"
                          title="Concluir"
                          onClick={async () => {
                            const isCreator = s.user_id === user?.id;
                            const isCrewMember = s.crew && s.crew.split(',').map((id: string) => id.trim()).includes(user?.id);
                            const canConclude = hasRole('mod') || hasRole('admin') || isCreator || isCrewMember;
                            
                            if (!canConclude) {
                              toast({ 
                                title: 'Sem permissão', 
                                description: 'Apenas quem registou, tripulação, moderadores ou administradores podem concluir.', 
                                variant: 'destructive' 
                              });
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
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Link to={`/exits/${s.id}/edit`}>
                          <Button size="icon" variant="outline" className="h-9 w-9" title="Editar">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Car className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Sem serviços ativos no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}