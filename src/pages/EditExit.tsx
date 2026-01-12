import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useAddressHierarchy } from '@/hooks/useAddressHierarchy';
import { useCrewSearch } from '@/hooks/useCrewSearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Search, Play, CheckCircle, XCircle, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ServiceSummaryModal } from '@/components/ServiceSummaryModal';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  ambulance_number: string | null;
}

export default function EditExit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();
  
  const [loading, setLoading] = useState(false);
  const [exit, setExit] = useState<any>(null);
  const [originalExitType, setOriginalExitType] = useState<string>('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<{user_id: string, display_name: string}[]>([]);
  const [coduNumber, setCoduNumber] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [exitLogs, setExitLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Address hooks
  const {
    districts,
    municipalities,
    parishes,
    streets,
    selectedDistrict,
    selectedMunicipality,
    selectedParish,
    streetSearch,
    setSelectedDistrict,
    setSelectedMunicipality,
    setSelectedParish,
    setStreetSearch,
  } = useAddressHierarchy();

  // Crew search hook
  const {
    crewMembers,
    searchTerm: crewSearchTerm,
    setSearchTerm: setCrewSearchTerm,
  } = useCrewSearch();

  const [showCrewDropdown, setShowCrewDropdown] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);

  useEffect(() => {
    document.title = 'Editar Saída | CV Amares';
    
    if (!id) {
      navigate('/exits');
      return;
    }

    // Load exit data with privacy protection
    supabase
      .rpc('get_vehicle_exits_with_privacy')
      .then(({ data: exitsData, error }) => {
        const data = exitsData?.find((exit: any) => exit.id === id);
        if (error || !data) {
          toast({ title: 'Erro ao carregar saída', variant: 'destructive' });
          navigate('/exits');
        } else {
          setExit(data);
          setOriginalExitType(data.exit_type);
          
          // Extrair número CODU das observações se existir
          if (data.observations && data.observations.includes('CODU:')) {
            const coduMatch = data.observations.match(/CODU:\s*(\S+)/);
            if (coduMatch) {
              setCoduNumber(coduMatch[1]);
            }
          }
          
          // Carregar nomes da tripulação
          if (data.crew) {
            const crewIds = data.crew.split(',').map((id: string) => id.trim()).filter(Boolean);
            supabase
              .from('profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', crewIds)
              .then(({ data: profiles }) => {
                if (profiles) {
                  const crewWithNames = profiles.map(p => ({
                    user_id: p.user_id,
                    display_name: `${p.first_name} ${p.last_name}`.trim()
                  }));
                  setSelectedCrew(crewWithNames);
                }
              });
          }
        }
      });

    // Load vehicles
    supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order('license_plate')
      .then(({ data }) => setVehicles(data || []));
  }, [id, navigate]);

  // Separate effect to set address selections after data is loaded
  useEffect(() => {
    if (!exit || districts.length === 0) return;
    
    // Set district
    if (exit.patient_district && !selectedDistrict) {
      const district = districts.find(d => d.nome === exit.patient_district);
      if (district) setSelectedDistrict(district.id);
    }
  }, [exit, districts, selectedDistrict, setSelectedDistrict]);

  // Set municipality after district is loaded
  useEffect(() => {
    if (!exit || !selectedDistrict || municipalities.length === 0) return;
    
    if (exit.patient_municipality && !selectedMunicipality) {
      const municipality = municipalities.find(m => m.nome === exit.patient_municipality);
      if (municipality) setSelectedMunicipality(municipality.id);
    }
  }, [exit, selectedDistrict, municipalities, selectedMunicipality, setSelectedMunicipality]);

  // Set parish after municipality is loaded
  useEffect(() => {
    if (!exit || !selectedMunicipality || parishes.length === 0) return;
    
    if (exit.patient_parish && !selectedParish) {
      const parish = parishes.find(p => p.nome === exit.patient_parish);
      if (parish) setSelectedParish(parish.id);
    }
  }, [exit, selectedMunicipality, parishes, selectedParish, setSelectedParish]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !exit || !id) return;

    setLoading(true);
    
    const exitTypeChanged = originalExitType !== exit.exit_type;
    
    // Preparar dados para atualização
    const updateData = { 
      ...exit,
      crew: selectedCrew.map(c => c.user_id).join(', ')
    };
    
    // Se for Emergencia/CODU, atualizar observações com o número CODU
    if (exit.exit_type === 'Emergencia/CODU' && coduNumber) {
      const existingObs = exit.observations || '';
      const coduObs = `CODU: ${coduNumber}`;
      updateData.observations = existingObs.includes('CODU:') 
        ? existingObs.replace(/CODU:\s*\S+/, coduObs)
        : existingObs ? `${coduObs}\n${existingObs}` : coduObs;
    }
    
    const { error } = await supabase
      .from('vehicle_exits')
      .update(updateData)
      .eq('id', id);
    
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao atualizar saída', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saída atualizada com sucesso' });
      
      // Se o tipo de saída mudou, mostrar modal com números atualizados
      if (exitTypeChanged) {
        const { data: updatedExit } = await supabase
          .from('vehicle_exits')
          .select('service_number, total_service_number, exit_type, ambulance_number')
          .eq('id', id)
          .single();
        
        if (updatedExit) {
          setSummaryData({
            serviceType: updatedExit.exit_type,
            serviceNumber: updatedExit.service_number,
            totalServiceNumber: updatedExit.total_service_number,
            ambulanceNumber: updatedExit.ambulance_number
          });
          setShowSummaryModal(true);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!exit || !id) return;
    
    const { error } = await supabase
      .from('vehicle_exits')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      setExit({ ...exit, status: newStatus });
      toast({ title: 'Status atualizado com sucesso' });
    }
  };

  if (!exit) {
    return <div className="p-6">A carregar...</div>;
  }

  // Check if service is older than 3 hours
  const isOlderThan3Hours = new Date(exit.created_at).getTime() < Date.now() - 3 * 60 * 60 * 1000;
  
  // Normal users can only edit active services OR completed/cancelled services within 3h of creation
  // Admins can always edit
  const canEdit = hasRole('admin') || exit.status === 'active' || !isOlderThan3Hours;
  const canChangeStatus = !isOlderThan3Hours || hasRole('admin');

  return (
    <>
      <ServiceSummaryModal
        open={showSummaryModal}
        onClose={() => {
          setShowSummaryModal(false);
          navigate('/');
        }}
        serviceType={summaryData?.serviceType || ''}
        serviceNumber={summaryData?.serviceNumber || 0}
        totalServiceNumber={summaryData?.totalServiceNumber || 0}
        ambulanceNumber={summaryData?.ambulanceNumber}
      />
      
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/exits')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Saída</h1>
          <p className="text-muted-foreground">
            Serviço #{exit.service_number} | Ficha #{exit.total_service_number}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-base">Status do Serviço</CardTitle>
            <CardDescription className="text-xs">Controle o estado atual do serviço</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="flex justify-center gap-4 md:gap-6">
              <button 
                type="button"
                onClick={() => handleStatusChange('active')}
                disabled={!canChangeStatus}
                className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg transition-all ${
                  exit.status === 'active' 
                    ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500' 
                    : 'hover:bg-muted'
                } ${!canChangeStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Play className={`h-6 w-6 ${exit.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${exit.status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`}>Ativo</span>
              </button>
              <button 
                type="button"
                onClick={() => handleStatusChange('completed')}
                className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg transition-all cursor-pointer ${
                  exit.status === 'completed' 
                    ? 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-500' 
                    : 'hover:bg-muted'
                }`}
              >
                <CheckCircle className={`h-6 w-6 ${exit.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${exit.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>Concluído</span>
              </button>
              <button 
                type="button"
                onClick={() => handleStatusChange('cancelled')}
                disabled={!canChangeStatus}
                className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg transition-all ${
                  exit.status === 'cancelled' 
                    ? 'bg-red-100 dark:bg-red-900/40 ring-2 ring-red-500' 
                    : 'hover:bg-muted'
                } ${!canChangeStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <XCircle className={`h-6 w-6 ${exit.status === 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-medium ${exit.status === 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>Cancelado</span>
              </button>
            </div>
            {isOlderThan3Hours && !hasRole('admin') && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Não é possível alterar o status ou editar dados após 3 horas da criação do serviço.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Saída</CardTitle>
            <CardDescription>Editar informações do serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Data e Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Saída</Label>
                  <Input 
                    type="date"
                    value={exit.departure_date || ''} 
                    onChange={(e) => setExit({ ...exit, departure_date: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Saída</Label>
                  <Input 
                    type="time"
                    value={exit.departure_time || ''} 
                    onChange={(e) => setExit({ ...exit, departure_time: e.target.value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Tipo de Saída e CODU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Saída</Label>
                  <Select 
                    value={exit.exit_type || ''} 
                    onValueChange={(value) => setExit({ ...exit, exit_type: value })}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione o tipo de saída" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Emergencia/CODU">Emergência/CODU</SelectItem>
                      <SelectItem value="Emergencia particular">Emergência particular</SelectItem>
                      <SelectItem value="VSL">VSL</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exit.exit_type === 'Emergencia/CODU' && (
                  <div className="space-y-2">
                    <Label>Número CODU</Label>
                    <Input 
                      value={coduNumber} 
                      onChange={(e) => setCoduNumber(e.target.value)}
                      disabled={!canEdit}
                      placeholder="Ex.: 123456" 
                    />
                  </div>
                )}
              </div>

              {/* Motivo */}
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input 
                  value={exit.purpose || ''} 
                  onChange={(e) => setExit({ ...exit, purpose: e.target.value })}
                  disabled={!canEdit}
                />
              </div>

              {/* Dados do Utente */}
              <div className="space-y-4">
                {!exit.patient_name && !exit.patient_age && !exit.patient_gender && !exit.patient_contact && (
                  <div className="p-4 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground italic">
                      Os dados sensíveis do paciente foram ocultados (saída com mais de 24h)
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2 md:col-span-3">
                    <Label>Nome</Label>
                    <Input 
                      value={exit.patient_name || ''} 
                      onChange={(e) => setExit({ ...exit, patient_name: e.target.value })}
                      disabled={!canEdit}
                      placeholder={!exit.patient_name && !canEdit ? "Oculto" : ""}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Idade</Label>
                    <Input 
                      type="number"
                      value={exit.patient_age || ''} 
                      onChange={(e) => setExit({ ...exit, patient_age: parseInt(e.target.value) || null })}
                      disabled={!canEdit}
                      placeholder={!exit.patient_age && !canEdit ? "Oculto" : ""}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1 flex items-end pb-0.5">
                    <Label className="flex items-center gap-2 cursor-pointer h-10">
                      <Checkbox 
                        checked={exit.patient_age_unit === 'meses'} 
                        onCheckedChange={(checked) => setExit({ ...exit, patient_age_unit: checked ? 'meses' : 'anos' })}
                        disabled={!canEdit}
                      />
                      <span>Meses</span>
                    </Label>
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>Sexo</Label>
                    <Select 
                      value={exit.patient_gender || ''} 
                      onValueChange={(value) => setExit({ ...exit, patient_gender: value })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!exit.patient_gender && !canEdit ? "Oculto" : "Seleccione"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-2">
                  <Label>Contacto</Label>
                  <Input 
                    value={exit.patient_contact || ''} 
                    onChange={(e) => setExit({ ...exit, patient_contact: e.target.value })}
                    disabled={!canEdit}
                    placeholder={!exit.patient_contact && !canEdit ? "Oculto" : "123456789"}
                  />
                </div>

                {/* Morada */}
                <div className="space-y-4">
                  <Label>Morada</Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Distrito</Label>
                      <Select 
                        value={selectedDistrict || ''} 
                        onValueChange={(value) => {
                          setSelectedDistrict(value);
                          const district = districts.find(d => d.id === value);
                          setExit({ ...exit, patient_district: district?.nome || '' });
                        }}
                        disabled={!canEdit}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder={!exit.patient_district && !canEdit ? "Oculto" : "Seleccione o distrito"} />
                      </SelectTrigger>
                        <SelectContent>
                          {districts.map((district) => (
                            <SelectItem key={district.id} value={district.id}>
                              {district.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Concelho</Label>
                      <Select 
                        value={selectedMunicipality || ''} 
                        onValueChange={(value) => {
                          setSelectedMunicipality(value);
                          const municipality = municipalities.find(m => m.id === value);
                          setExit({ ...exit, patient_municipality: municipality?.nome || '' });
                        }}
                        disabled={!selectedDistrict || !canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!exit.patient_municipality && !canEdit ? "Oculto" : "Seleccione o concelho"} />
                        </SelectTrigger>
                        <SelectContent>
                          {municipalities.map((municipality) => (
                            <SelectItem key={municipality.id} value={municipality.id}>
                              {municipality.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Freguesia</Label>
                      <Select 
                        value={selectedParish || ''} 
                        onValueChange={(value) => {
                          setSelectedParish(value);
                          const parish = parishes.find(p => p.id === value);
                          setExit({ ...exit, patient_parish: parish?.nome || '' });
                        }}
                        disabled={!selectedMunicipality || !canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!exit.patient_parish && !canEdit ? "Oculto" : "Seleccione a freguesia"} />
                        </SelectTrigger>
                        <SelectContent>
                          {parishes.map((parish) => (
                            <SelectItem key={parish.id} value={parish.id}>
                              {parish.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Morada completa</Label>
                    <div className="relative">
                      <Input 
                        value={exit.patient_address || ''} 
                        onChange={(e) => {
                          setExit({ ...exit, patient_address: e.target.value });
                          setStreetSearch(e.target.value);
                          setShowStreetDropdown(e.target.value.length > 2);
                        }}
                        onFocus={() => setShowStreetDropdown((exit.patient_address || '').length > 2)}
                        disabled={!canEdit}
                        placeholder={!exit.patient_address && !canEdit ? "Oculto" : "Rua, nº, andar..."}
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      
                      {showStreetDropdown && streets.length > 0 && canEdit && (
                        <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                          {streets.map((street) => (
                            <div
                              key={street.id}
                              className="px-3 py-2 hover:bg-accent cursor-pointer"
                              onClick={() => {
                                setExit({ ...exit, patient_address: street.nome });
                                setStreetSearch(street.nome);
                                setShowStreetDropdown(false);
                              }}
                            >
                              {street.nome}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Viatura e Ambulância */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº Ambulância (Matrícula)</Label>
                  <Select 
                    value={exit.vehicle_id || ''} 
                    onValueChange={(value) => {
                      const veh = vehicles.find(x => x.id === value);
                      setExit({ 
                        ...exit, 
                        vehicle_id: value,
                        ambulance_number: veh ? veh.license_plate : exit.ambulance_number
                      });
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione uma viatura" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.ambulance_number 
                            ? `Ambulância ${vehicle.ambulance_number}` 
                            : `${vehicle.license_plate} — ${vehicle.make} ${vehicle.model}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opções INEM/Reserva</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_pem" 
                        checked={exit.is_pem || false} 
                        onCheckedChange={(v) => setExit({ ...exit, is_pem: Boolean(v) })}
                        disabled={!canEdit}
                      />
                      <Label htmlFor="is_pem">INEM</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="inem_si" 
                        checked={exit.inem_si || false} 
                        onCheckedChange={(v) => setExit({ ...exit, inem_si: Boolean(v) })}
                        disabled={!canEdit}
                      />
                      <Label htmlFor="inem_si">INEM s/ITeams</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="is_reserve" 
                        checked={exit.is_reserve || false} 
                        onCheckedChange={(v) => setExit({ ...exit, is_reserve: Boolean(v) })}
                        disabled={!canEdit}
                      />
                      <Label htmlFor="is_reserve">Reserva</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campo Destino removido conforme solicitado */}

              {/* Tripulação */}
              <div className="space-y-2">
                <Label>Tripulação</Label>
                <div className="relative">
                  <Input 
                    value={crewSearchTerm} 
                    onChange={(e) => {
                      setCrewSearchTerm(e.target.value);
                      setShowCrewDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowCrewDropdown(crewSearchTerm.length > 0)}
                    disabled={!canEdit}
                    placeholder="Digite para pesquisar membros..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  
                  {showCrewDropdown && crewMembers.length > 0 && canEdit && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {crewMembers.map((member) => (
                        <div
                          key={member.user_id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            if (!selectedCrew.find(c => c.user_id === member.user_id)) {
                              setSelectedCrew([...selectedCrew, member]);
                            }
                            setShowCrewDropdown(false);
                            setCrewSearchTerm('');
                          }}
                        >
                          {member.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Tripulação selecionada */}
                <div className="space-y-2">
                  {selectedCrew.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCrew.map((member) => (
                        <div key={member.user_id} className="flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-2 py-1">
                          <span>{member.display_name}</span>
                          {canEdit && (
                            <button
                              type="button"
                              className="hover:text-destructive"
                              onClick={() => setSelectedCrew(selectedCrew.filter(c => c.user_id !== member.user_id))}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem membros selecionados.</p>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={exit.observations || ''} 
                  onChange={(e) => setExit({ ...exit, observations: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={loading || !canEdit}>
                {loading ? 'A guardar...' : 'Guardar Alterações'}
              </Button>

              {/* Logs Button - Admin Only */}
              {hasRole('admin') && (
                <Dialog onOpenChange={(open) => {
                  if (open && exitLogs.length === 0) {
                    setLogsLoading(true);
                    supabase
                      .from('vehicle_exit_logs')
                      .select('*')
                      .eq('exit_id', id)
                      .order('created_at', { ascending: true })
                      .then(({ data, error }) => {
                        if (!error && data) {
                          setExitLogs(data);
                        }
                        setLogsLoading(false);
                      });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full">
                      <History className="h-4 w-4 mr-2" />
                      Logs do Serviço
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Histórico do Serviço
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {logsLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">A carregar logs...</p>
                      ) : exitLogs.length === 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Sem logs registados (serviço criado antes da implementação do sistema de auditoria)
                          </p>
                          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">Criação</p>
                              <p className="text-xs text-muted-foreground">
                                {exit.created_at ? format(new Date(exit.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: pt }) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        exitLogs.map((log, index) => {
                          const getActionColor = (action: string) => {
                            switch (action) {
                              case 'created': return 'bg-blue-500';
                              case 'updated': return 'bg-amber-500';
                              case 'completed': return 'bg-green-500';
                              case 'cancelled': return 'bg-red-500';
                              case 'reactivated': return 'bg-purple-500';
                              default: return 'bg-gray-500';
                            }
                          };
                          const getActionLabel = (action: string) => {
                            switch (action) {
                              case 'created': return 'Criação';
                              case 'updated': return 'Modificação';
                              case 'completed': return 'Conclusão';
                              case 'cancelled': return 'Cancelamento';
                              case 'reactivated': return 'Reativação';
                              default: return action;
                            }
                          };
                          return (
                            <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className={`w-3 h-3 rounded-full ${getActionColor(log.action)} mt-1.5 shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">{getActionLabel(log.action)}</p>
                                  <span className="text-xs text-muted-foreground shrink-0">#{index + 1}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: pt })}
                                </p>
                                {log.user_name && (
                                  <p className="text-xs text-primary mt-1">
                                    Por: {log.user_name}
                                  </p>
                                )}
                                {log.details && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">
                                    {log.details}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}