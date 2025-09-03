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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input 
                    value={exit.purpose || ''} 
                    onChange={(e) => setExit({ ...exit, purpose: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  <Input 
                    value={exit.destination || ''} 
                    onChange={(e) => setExit({ ...exit, destination: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tripulação</Label>
                <Input 
                  value={exit.crew || ''} 
                  onChange={(e) => setExit({ ...exit, crew: e.target.value })} 
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={exit.observations || ''} 
                  onChange={(e) => setExit({ ...exit, observations: e.target.value })} 
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'A guardar...' : 'Guardar Alterações'}
                </Button>
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