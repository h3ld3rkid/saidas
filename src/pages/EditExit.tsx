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
import { ArrowLeft, Search } from 'lucide-react';

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedCrew, setSelectedCrew] = useState<{user_id: string, display_name: string}[]>([]);
  const [coduNumber, setCoduNumber] = useState('');
  
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

    // Load exit data
    supabase
      .from('vehicle_exits')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: 'Erro ao carregar saída', variant: 'destructive' });
          navigate('/exits');
        } else {
          setExit(data);
          
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
          
          // Set address selections based on existing data
          if (data.patient_district) {
            const district = districts.find(d => d.nome === data.patient_district);
            if (district) setSelectedDistrict(district.id);
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
  }, [id, navigate, districts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !exit || !id) return;

    setLoading(true);
    
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
      navigate('/');
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

  const canEdit = exit.status !== 'completed' || hasRole('admin');
  
  // Check if service is older than 3 hours
  const isOlderThan3Hours = new Date(exit.created_at).getTime() < Date.now() - 3 * 60 * 60 * 1000;
  const canChangeStatus = !isOlderThan3Hours || hasRole('admin');

  return (
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
          <CardHeader>
            <CardTitle>Status do Serviço</CardTitle>
            <CardDescription>Controle o estado atual do serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                variant={exit.status === 'active' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('active')}
                disabled={!canChangeStatus}
              >
                Ativo
              </Button>
              <Button 
                variant={exit.status === 'completed' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('completed')}
              >
                Concluir Serviço
              </Button>
              <Button 
                variant={exit.status === 'cancelled' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('cancelled')}
                disabled={!canChangeStatus}
              >
                Cancelar
              </Button>
            </div>
            {isOlderThan3Hours && !hasRole('admin') && (
              <p className="text-xs text-muted-foreground mt-2">
                Não é possível alterar o status após 3 horas da criação do serviço.
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
                  <Input 
                    value={exit.exit_type || ''} 
                    onChange={(e) => setExit({ ...exit, exit_type: e.target.value })}
                    disabled={!canEdit}
                  />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input 
                      value={exit.patient_name || ''} 
                      onChange={(e) => setExit({ ...exit, patient_name: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input 
                      type="number"
                      value={exit.patient_age || ''} 
                      onChange={(e) => setExit({ ...exit, patient_age: parseInt(e.target.value) || null })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select 
                      value={exit.patient_gender || ''} 
                      onValueChange={(value) => setExit({ ...exit, patient_gender: value })}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
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
                    placeholder="123456789"
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
                          <SelectValue placeholder="Seleccione o distrito" />
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
                          <SelectValue placeholder="Seleccione o concelho" />
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
                          <SelectValue placeholder="Seleccione a freguesia" />
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
                        placeholder="Rua, nº, andar..."
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}