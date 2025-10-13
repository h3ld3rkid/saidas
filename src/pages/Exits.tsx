import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserNames } from '@/hooks/useUserNames';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
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
  const { hasRole, role } = useUserRole();
  const navigate = useNavigate();
  const [exits, setExits] = useState<VehicleExit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Component to display crew names
  const CrewDisplay = ({ crewString }: { crewString: string }) => {
    const crewIds = crewString.split(',').map(id => id.trim()).filter(Boolean);
    const { formatCrewNames, loading } = useUserNames(crewIds);
    
    if (loading) return <span>Carregando...</span>;
    if (!crewString) return <span>N/A</span>;
    
    return <span>{formatCrewNames(crewString)}</span>;
  };

  useEffect(() => {
    const fetchExits = async () => {
      if (!user) return;

      // Use RPC function to get exits with sensitive data privacy after 24h
      const { data: exitsData, error } = await supabase
        .rpc('get_vehicle_exits_with_privacy');

      if (error) {
        console.error('Error fetching exits:', error);
        setLoading(false);
        return;
      }

      if (!exitsData || exitsData.length === 0) {
        setExits([]);
        setLoading(false);
        return;
      }

      // Fetch vehicle data for the exits
      const vehicleIds = exitsData.map((exit: any) => exit.vehicle_id);
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model')
        .in('id', vehicleIds);

      const data = exitsData.map((exit: any) => ({
        ...exit,
        vehicles: vehiclesData?.find((v: any) => v.id === exit.vehicle_id)
      }));

      // Fetch user profiles
      const userIds = data.map((exit: any) => exit.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Mapear perfis aos dados
      const exitsWithProfiles = data.map((exit: any) => ({
        ...exit,
        profile: profilesData?.find(p => p.user_id === exit.user_id)
      }));

      // Ordenar do mais recente para o mais antigo
      const sortedExits = exitsWithProfiles.sort((a: any, b: any) => {
        const dateA = new Date(`${a.departure_date} ${a.departure_time}`).getTime();
        const dateB = new Date(`${b.departure_date} ${b.departure_time}`).getTime();
        return dateB - dateA;
      });

      setExits(sortedExits as any);
      setLoading(false);
    };

    fetchExits();
  }, [user, role]);

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

  const getExitTypeColor = (exitType: string) => {
    switch (exitType) {
      case 'Emergencia/CODU': return 'bg-red-500 hover:bg-red-600';
      case 'Emergencia particular': return 'bg-green-500 hover:bg-green-600';
      case 'VSL': return 'bg-orange-500 hover:bg-orange-600';
      case 'Outro': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const ExitDetailsModal = ({ exit }: { exit: VehicleExit }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        Detalhes do Serviço #{exit?.service_number || 'N/A'} (Ficha #{exit?.total_service_number || 'N/A'})
      </DialogTitle>
      <DialogDescription>Informações detalhadas do serviço</DialogDescription>
    </DialogHeader>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Informações Gerais</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <strong>Tipo:</strong>
                <Badge className={getExitTypeColor(exit?.exit_type || '')}>
                  {exit?.exit_type || 'N/A'}
                </Badge>
              </div>
              <p><strong>Motivo:</strong> {exit?.purpose || 'N/A'}</p>
              <p><strong>Viatura:</strong> {exit?.vehicles ? `${exit.vehicles.license_plate} - ${exit.vehicles.make} ${exit.vehicles.model}` : 'N/A'}</p>
              <p><strong>Tripulação:</strong> <CrewDisplay crewString={exit?.crew || ''} /></p>
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
        
        {exit.patient_name ? (
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
        ) : (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Dados do Paciente</h4>
              <p className="text-sm text-muted-foreground italic">
                Os dados sensíveis do paciente foram ocultados (saída com mais de 24h)
              </p>
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

  // Paginação
  const totalPages = Math.ceil(exits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExits = exits.slice(startIndex, startIndex + itemsPerPage);

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
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Saídas</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Mostrar:</Label>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                  setItemsPerPage(Number(v));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                  {paginatedExits.map((exit) => (
                    <tr key={exit.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        {new Date(exit.departure_date).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="p-4">{exit.departure_time}</td>
                      <td className="p-4">
                        <Badge className={getExitTypeColor(exit.exit_type)}>
                          {exit.exit_type}
                        </Badge>
                      </td>
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
                          
{(exit.user_id === user?.id || hasRole('mod') || (user && exit.crew?.includes(user.id))) && (
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
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                A mostrar {startIndex + 1}-{Math.min(startIndex + itemsPerPage, exits.length)} de {exits.length} serviços
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === 1 || 
                      page === totalPages || 
                      Math.abs(page - currentPage) <= 1
                    )
                    .map((page, idx, arr) => (
                      <>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span key={`ellipsis-${page}`} className="px-2">...</span>
                        )}
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </>
                    ))
                  }
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Exits;