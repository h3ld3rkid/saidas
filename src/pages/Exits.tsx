import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

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
  exit_type: string;
  service_number: number;
  total_service_number: number;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  patient_contact: string;
  crew: string;
  vehicles: {
    license_plate: string;
    make: string;
    model: string;
  };
  profile?: {
    first_name: string;
    last_name: string;
  };
}

const Exits = () => {
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const navigate = useNavigate();
  const [exits, setExits] = useState<VehicleExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDeleteExit = async (exitId: string) => {
    setDeleting(exitId);
    try {
      const { error } = await supabase
        .from('vehicle_exits')
        .delete()
        .eq('id', exitId);
        
      if (error) throw error;
      
      // Refresh the list
      setExits(exits.filter(exit => exit.id !== exitId));
      
      toast({
        title: 'Serviço eliminado',
        description: 'O serviço foi eliminado e os números foram atualizados.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar serviço',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const ExitDetailsModal = ({ exit }: { exit: VehicleExit }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          Detalhes do Serviço #{exit.service_number} (Ficha #{exit.total_service_number})
        </DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Informações Gerais</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Tipo:</strong> {exit.exit_type}</p>
              <p><strong>Motivo:</strong> {exit.purpose}</p>
              <p><strong>Viatura:</strong> {exit.vehicles.license_plate} - {exit.vehicles.make} {exit.vehicles.model}</p>
              <p><strong>Condutor:</strong> {exit.driver_name}</p>
              <p><strong>Carta:</strong> {exit.driver_license}</p>
              <p><strong>Tripulação:</strong> {exit.crew}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Datas e Horas</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Data de Saída:</strong> {new Date(exit.departure_date).toLocaleDateString('pt-PT')}</p>
              <p><strong>Hora de Saída:</strong> {exit.departure_time}</p>
              {exit.expected_return_date && (
                <>
                  <p><strong>Regresso Previsto:</strong> {new Date(exit.expected_return_date).toLocaleDateString('pt-PT')}</p>
                  {exit.expected_return_time && <p><strong>Hora Prevista:</strong> {exit.expected_return_time}</p>}
                </>
              )}
            </div>
          </div>
        </div>
        
        {exit.patient_name && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Dados do Paciente</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>Nome:</strong> {exit.patient_name}</p>
                  {exit.patient_age && <p><strong>Idade:</strong> {exit.patient_age} anos</p>}
                  {exit.patient_gender && <p><strong>Sexo:</strong> {exit.patient_gender}</p>}
                </div>
                <div className="space-y-2">
                  {exit.patient_contact && <p><strong>Contacto:</strong> {exit.patient_contact}</p>}
                </div>
              </div>
            </div>
          </>
        )}
        
        {exit.observations && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Observações</h4>
              <p className="text-sm text-muted-foreground">{exit.observations}</p>
            </div>
          </>
        )}
        
        <Separator />
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Registado por: {exit.profile?.first_name} {exit.profile?.last_name}
          </p>
          <Badge className={getStatusColor(exit.status)}>
            {getStatusText(exit.status)}
          </Badge>
        </div>
      </div>
    </DialogContent>
  );

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
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
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
        <Card>
          <CardHeader>
            <CardTitle>Lista de Saídas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Hora</th>
                    <th className="p-4 font-medium">Tipo de Saída</th>
                    <th className="p-4 font-medium">Nº Saída</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exits.map((exit) => (
                    <tr key={exit.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {new Date(exit.departure_date).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="p-4">{exit.departure_time}</td>
                      <td className="p-4">{exit.exit_type}</td>
                      <td className="p-4">
                        <div className="font-medium">#{exit.service_number}</div>
                        <div className="text-xs text-muted-foreground">
                          Ficha #{exit.total_service_number}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(exit.status)}>
                          {getStatusText(exit.status)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <ExitDetailsModal exit={exit} />
                          </Dialog>
                          
                          {(exit.user_id === user?.id || hasRole('mod')) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/exits/${exit.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {hasRole('admin') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" disabled={deleting === exit.id}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Eliminar Serviço</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem a certeza que pretende eliminar este serviço? Esta ação não pode ser desfeita. 
                                    Todos os números de serviços posteriores serão atualizados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteExit(exit.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Exits;