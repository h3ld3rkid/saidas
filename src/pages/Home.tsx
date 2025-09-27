import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Car, FilePlus2, Megaphone, Users, UserCircle2, ListChecks, Edit3 } from "lucide-react";
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
  const {
    data,
    error
  } = await supabase.from('vehicle_exits').select('id, user_id, vehicle_id, departure_date, departure_time, destination, purpose, ambulance_number, exit_type, driver_name, crew, status, service_number, total_service_number').eq('status', 'active').order('departure_date', {
    ascending: false
  });
  if (error) throw error;
  return data ?? [];
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
  const { hasRole } = useUserRole();
  const { user } = useAuth();
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
                          <strong>Destino:</strong> {s.destination}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          <strong>Partida:</strong> {s.departure_date} às {s.departure_time}
                        </p>
                        {s.crew && <p className="text-xs text-muted-foreground">
                            <strong>Tripulação:</strong> {s.crew}
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
                              const canConclude = hasRole('mod') || hasRole('admin') || s.user_id === user?.id;
                              if (!canConclude) {
                                toast({ title: 'Sem permissão', description: 'Apenas o autor, moderadores ou administradores podem concluir.', variant: 'destructive' });
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