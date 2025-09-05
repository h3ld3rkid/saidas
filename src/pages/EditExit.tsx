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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Search } from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
}

export default function EditExit() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();
  
  const [loading, setLoading] = useState(false);
  const [exit, setExit] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
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
    getSelectedNames
  } = useAddressHierarchy();

  // Crew search hook
  const {
    crewMembers,
    searchTerm: crewSearchTerm,
    setSearchTerm: setCrewSearchTerm,
    loading: crewLoading
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
    const { error } = await supabase
      .from('vehicle_exits')
      .update(exit)
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
              >
                Ativo
              </Button>
              <Button 
                variant={exit.status === 'completed' ? 'default' : 'outline'}
                onClick={() => handleStatusChange('completed')}
              >
                Concluído
              </Button>
              <Button 
                variant={exit.status === 'cancelled' ? 'destructive' : 'outline'}
                onClick={() => handleStatusChange('cancelled')}
              >
                Cancelado
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Saída</CardTitle>
            <CardDescription>Editar informações do serviço</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input 
                    value={exit.purpose || ''} 
                    onChange={(e) => setExit({ ...exit, purpose: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input 
                    value={exit.destination || ''} 
                    onChange={(e) => setExit({ ...exit, destination: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Saída</Label>
                  <Input 
                    value={exit.exit_type || ''} 
                    onChange={(e) => setExit({ ...exit, exit_type: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número da Ambulância</Label>
                  <Input 
                    value={exit.ambulance_number || ''} 
                    onChange={(e) => setExit({ ...exit, ambulance_number: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
              </div>

              {/* Vehicle Selection */}
              <div className="space-y-2">
                <Label>Viatura</Label>
                <Select 
                  value={exit.vehicle_id || ''} 
                  onValueChange={(value) => setExit({ ...exit, vehicle_id: value })}
                  disabled={exit.status === 'completed' && !hasRole('admin')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Condutor</Label>
                  <Input 
                    value={exit.driver_name || ''} 
                    onChange={(e) => setExit({ ...exit, driver_name: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carta de Condução</Label>
                  <Input 
                    value={exit.driver_license || ''} 
                    onChange={(e) => setExit({ ...exit, driver_license: e.target.value })}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                  />
                </div>
              </div>

              {/* Crew */}
              <div className="space-y-2">
                <Label>Tripulação</Label>
                <div className="relative">
                  <Input 
                    value={exit.crew || ''} 
                    onChange={(e) => {
                      setExit({ ...exit, crew: e.target.value });
                      setCrewSearchTerm(e.target.value);
                      setShowCrewDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => setShowCrewDropdown(crewSearchTerm.length > 0)}
                    disabled={exit.status === 'completed' && !hasRole('admin')}
                    placeholder="Digite para pesquisar membros..."
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  
                  {showCrewDropdown && crewMembers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {crewMembers.map((member, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            const currentCrew = exit.crew || '';
                            const newCrew = currentCrew ? `${currentCrew}, ${member.display_name}` : member.display_name;
                            setExit({ ...exit, crew: newCrew });
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
              </div>

              {/* Patient Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados do Utente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Utente</Label>
                    <Input 
                      value={exit.patient_name || ''} 
                      onChange={(e) => setExit({ ...exit, patient_name: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Idade</Label>
                    <Input 
                      type="number"
                      value={exit.patient_age || ''} 
                      onChange={(e) => setExit({ ...exit, patient_age: parseInt(e.target.value) || null })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select 
                      value={exit.patient_gender || ''} 
                      onValueChange={(value) => setExit({ ...exit, patient_gender: value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o género" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto</Label>
                    <Input 
                      value={exit.patient_contact || ''} 
                      onChange={(e) => setExit({ ...exit, patient_contact: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                </div>

                {/* Patient Address */}
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
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o distrito" />
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
                      disabled={!selectedDistrict || (exit.status === 'completed' && !hasRole('admin'))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o concelho" />
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
                      disabled={!selectedMunicipality || (exit.status === 'completed' && !hasRole('admin'))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a freguesia" />
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
                  <Label>Rua/Endereço</Label>
                  <div className="relative">
                    <Input 
                      value={exit.patient_address || ''} 
                      onChange={(e) => {
                        setExit({ ...exit, patient_address: e.target.value });
                        setStreetSearch(e.target.value);
                        setShowStreetDropdown(e.target.value.length > 2);
                      }}
                      onFocus={() => setShowStreetDropdown(streetSearch.length > 2)}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                      placeholder="Digite para pesquisar ruas..."
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    
                    {showStreetDropdown && streets.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                        {streets.slice(0, 10).map((street) => (
                          <div
                            key={street.id}
                            className="px-3 py-2 hover:bg-accent cursor-pointer"
                            onClick={() => {
                              setExit({ ...exit, patient_address: street.nome });
                              setShowStreetDropdown(false);
                              setStreetSearch('');
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

              {/* Service Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Detalhes do Serviço</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Partida</Label>
                    <Input 
                      type="date"
                      value={exit.departure_date || ''} 
                      onChange={(e) => setExit({ ...exit, departure_date: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de Partida</Label>
                    <Input 
                      type="time"
                      value={exit.departure_time || ''} 
                      onChange={(e) => setExit({ ...exit, departure_time: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data Prevista de Retorno</Label>
                    <Input 
                      type="date"
                      value={exit.expected_return_date || ''} 
                      onChange={(e) => setExit({ ...exit, expected_return_date: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Prevista de Retorno</Label>
                    <Input 
                      type="time"
                      value={exit.expected_return_time || ''} 
                      onChange={(e) => setExit({ ...exit, expected_return_time: e.target.value })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="is_pem" 
                      checked={exit.is_pem || false}
                      onCheckedChange={(checked) => setExit({ ...exit, is_pem: checked })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                    <Label htmlFor="is_pem">Posto de Emergência Médica</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="is_reserve" 
                      checked={exit.is_reserve || false}
                      onCheckedChange={(checked) => setExit({ ...exit, is_reserve: checked })}
                      disabled={exit.status === 'completed' && !hasRole('admin')}
                    />
                    <Label htmlFor="is_reserve">Serviço de Reserva</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={exit.observations || ''} 
                  onChange={(e) => setExit({ ...exit, observations: e.target.value })} 
                  rows={3}
                  disabled={exit.status === 'completed' && !hasRole('admin')}
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={loading || (exit.status === 'completed' && !hasRole('admin'))}
                >
                  {loading ? 'A guardar...' : 'Guardar Alterações'}
                </Button>
                {exit.status === 'active' && (
                  <Button 
                    type="button" 
                    variant="default"
                    onClick={() => handleStatusChange('completed')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Concluir Serviço
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => navigate('/exits')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}