import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Car, FilePlus2, Megaphone, Users, UserCircle2, ListChecks, Edit3 } from "lucide-react";
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
    .select('id, vehicle_id, departure_date, departure_time, destination, purpose, ambulance_number, exit_type, driver_name, crew, status, service_number, total_service_number')
    .eq('status', 'active')
    .order('departure_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

export default function Home() {
  useEffect(() => {
    document.title = 'Home | Avisos e Serviços Ativos';
  }, []);

  const { data: notices } = useQuery({ queryKey: ['notices-active'], queryFn: fetchNotices });
  const { data: services } = useQuery({ queryKey: ['services-active'], queryFn: fetchActiveServices });
  const { hasRole } = useUserRole();
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Home</h1>
        <p className="text-muted-foreground">Avisos e serviços que ainda não terminaram</p>
      </header>

      <section aria-label="Ações rápidas" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link to="/register-exit">
          <Button className="w-full justify-center" variant="default">
            <FilePlus2 className="h-4 w-4 mr-2" /> Registar Saída
          </Button>
        </Link>
        <Link to="/exits">
          <Button className="w-full justify-center" variant="secondary">
            <ListChecks className="h-4 w-4 mr-2" /> Saídas
          </Button>
        </Link>
        <Link to="/profile">
          <Button className="w-full justify-center" variant="outline">
            <UserCircle2 className="h-4 w-4 mr-2" /> Perfil
          </Button>
        </Link>
        {hasRole('admin') && (
          <>
            <Link to="/vehicles">
              <Button className="w-full justify-center" variant="outline">
                <Car className="h-4 w-4 mr-2" /> Viaturas
              </Button>
            </Link>
            <Link to="/notices">
              <Button className="w-full justify-center" variant="outline">
                <Megaphone className="h-4 w-4 mr-2" /> Avisos
              </Button>
            </Link>
            <Link to="/users">
              <Button className="w-full justify-center" variant="outline">
                <Users className="h-4 w-4 mr-2" /> Utilizadores
              </Button>
            </Link>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Avisos</CardTitle>
            <CardDescription>Informações importantes ativas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notices && notices.length > 0 ? (
              notices.map((n: any) => (
                <div key={n.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{n.title}</h3>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem avisos ativos.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Serviços em Curso</CardTitle>
            <CardDescription>Saídas ainda ativas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {services && services.length > 0 ? (
              services.map((s: any) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Ambulância: {s.ambulance_number ?? '—'}</p>
                        {s.service_number && (
                          <Badge variant="outline">Nº {s.service_number}</Badge>
                        )}
                        {s.total_service_number && (
                          <Badge variant="secondary">#{s.total_service_number}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Destino: {s.destination}</p>
                      <p className="text-xs text-muted-foreground mt-1">Partida: {s.departure_date} {s.departure_time}</p>
                      {s.crew && (
                        <p className="text-xs text-muted-foreground">Tripulação: {s.crew}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge>{s.exit_type ?? 'Serviço'}</Badge>
                      <Link to={`/exits/${s.id}/edit`}>
                        <Button size="sm" variant="outline">
                          <Edit3 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Sem serviços ativos.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
