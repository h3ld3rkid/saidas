import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, MapPin, User, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VehicleExit {
  id: string;
  user_id: string;
  departure_date: string;
  departure_time: string;
  expected_return_date: string;
  expected_return_time: string;
  destination: string;
  purpose: string;
  driver_name: string;
  driver_license: string;
  observations: string;
  status: string;
  created_at: string;
  vehicles: {
    license_plate: string;
    make: string;
    model: string;
  };
}

const Exits = () => {
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const navigate = useNavigate();
  const [exits, setExits] = useState<VehicleExit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExits = async () => {
      if (!user) return;

      let query = supabase
        .from('vehicle_exits')
        .select(`
          *,
          vehicles!inner (license_plate, make, model)
        `)
        .order('created_at', { ascending: false });

      // Se não for mod ou admin, só mostra as próprias saídas
      if (!hasRole('mod')) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Buscar perfis dos utilizadores
        const userIds = data.map(exit => exit.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        // Mapear perfis aos dados
        const exitsWithProfiles = data.map(exit => ({
          ...exit,
          profile: profilesData?.find(p => p.user_id === exit.user_id)
        }));

        setExits(exitsWithProfiles as any);
      }
      setLoading(false);
    };

    fetchExits();
  }, [user, hasRole]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'returned': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'returned': return 'Regressou';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registos de Saídas</h1>
          <p className="text-muted-foreground">
            {hasRole('mod') ? 'Todos os registos de saídas' : 'Os seus registos de saídas'}
          </p>
        </div>
      </div>

      {exits.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhum registo encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exits.map((exit) => (
            <Card key={exit.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {exit.vehicles.license_plate} - {exit.vehicles.make} {exit.vehicles.model}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4" />
                      {(exit as any).profile?.first_name} {(exit as any).profile?.last_name}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(exit.status)}>
                    {getStatusText(exit.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Saída:</span>
                    <span>{new Date(exit.departure_date).toLocaleDateString('pt-PT')}</span>
                    <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                    <span>{exit.departure_time}</span>
                  </div>
                  
                  {exit.expected_return_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Regresso previsto:</span>
                      <span>{new Date(exit.expected_return_date).toLocaleDateString('pt-PT')}</span>
                      {exit.expected_return_time && (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                          <span>{exit.expected_return_time}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Destino:</span>
                  <span>{exit.destination}</span>
                </div>

                <div>
                  <span className="font-medium">Finalidade:</span>
                  <span className="ml-2">{exit.purpose}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Condutor:</span>
                    <span className="ml-2">{exit.driver_name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Carta:</span>
                    <span className="ml-2">{exit.driver_license}</span>
                  </div>
                </div>

                {exit.observations && (
                  <div>
                    <span className="font-medium">Observações:</span>
                    <p className="mt-1 text-sm text-muted-foreground">{exit.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Exits;