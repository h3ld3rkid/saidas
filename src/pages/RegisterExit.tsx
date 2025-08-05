import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
}

const RegisterExit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    departure_date: '',
    departure_time: '',
    expected_return_date: '',
    expected_return_time: '',
    destination: '',
    purpose: '',
    driver_name: '',
    driver_license: '',
    observations: '',
  });

  useEffect(() => {
    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('is_active', true)
        .order('license_plate');

      if (!error && data) {
        setVehicles(data);
      }
    };

    fetchVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('vehicle_exits')
      .insert({
        ...formData,
        user_id: user.id,
      });

    if (error) {
      toast({
        title: "Erro ao registar saída",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saída registada com sucesso",
        description: "O registo foi guardado no sistema.",
      });
      navigate('/exits');
    }

    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registar Saída de Viatura</h1>
          <p className="text-muted-foreground">Preencha os dados da saída</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da Saída</CardTitle>
          <CardDescription>
            Todos os campos marcados com * são obrigatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Viatura *</Label>
                <Select value={formData.vehicle_id} onValueChange={(value) => handleInputChange('vehicle_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione uma viatura" />
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

              <div className="space-y-2">
                <Label htmlFor="departure_date">Data de Saída *</Label>
                <Input
                  id="departure_date"
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => handleInputChange('departure_date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departure_time">Hora de Saída *</Label>
                <Input
                  id="departure_time"
                  type="time"
                  value={formData.departure_time}
                  onChange={(e) => handleInputChange('departure_time', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_return_date">Data Prevista de Regresso</Label>
                <Input
                  id="expected_return_date"
                  type="date"
                  value={formData.expected_return_date}
                  onChange={(e) => handleInputChange('expected_return_date', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_return_time">Hora Prevista de Regresso</Label>
                <Input
                  id="expected_return_time"
                  type="time"
                  value={formData.expected_return_time}
                  onChange={(e) => handleInputChange('expected_return_time', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_name">Nome do Condutor *</Label>
                <Input
                  id="driver_name"
                  value={formData.driver_name}
                  onChange={(e) => handleInputChange('driver_name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_license">Carta de Condução *</Label>
                <Input
                  id="driver_license"
                  value={formData.driver_license}
                  onChange={(e) => handleInputChange('driver_license', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destino *</Label>
              <Input
                id="destination"
                value={formData.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Finalidade *</Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'A registar...' : 'Registar Saída'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterExit;