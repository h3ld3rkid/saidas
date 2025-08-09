import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
}

interface ProfileLite {
  user_id: string;
  first_name: string;
  last_name: string;
}

const nowDate = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export default function RegisterExit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasRole } = useUserRole();

  // Base data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [crewOptions, setCrewOptions] = useState<ProfileLite[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [editDate, setEditDate] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const [exitType, setExitType] = useState('');
  const [coduNumber, setCoduNumber] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [inemOption, setInemOption] = useState<'inem' | 'inem_s_iteams' | 'reserva' | ''>('');

  // Form data mapping 1:1 to DB where possible
  const [form, setForm] = useState({
    vehicle_id: '',
    ambulance_number: '',
    departure_date: nowDate(),
    departure_time: nowTime(),
    expected_return_date: '',
    expected_return_time: '',
    exit_type: '',
    purpose: '',
    destination: '',
    driver_name: '',
    driver_license: '',
    observations: '',
    // Patient fields
    patient_name: '',
    patient_age: '' as unknown as number | '' ,
    patient_gender: '',
    patient_contact: '',
    patient_district: '',
    patient_municipality: '',
    patient_parish: '',
    patient_address: '',
    // Flags
    is_pem: false,
    is_reserve: false,
    crew: '',
  });

  useEffect(() => {
    document.title = 'Registar Saída | CV Amares';
  }, []);

  useEffect(() => {
    // Load active vehicles for selection
    supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true)
      .order('license_plate')
      .then(({ data, error }) => {
        if (error) {
          toast({ title: 'Erro ao carregar viaturas', description: error.message, variant: 'destructive' });
        } else {
          setVehicles(data || []);
        }
      });

    // Attempt to load active crew suggestions (only if roles permit reading profiles)
    if (hasRole('admin') || hasRole('mod')) {
      supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('is_active', true)
        .order('first_name')
        .then(({ data }) => setCrewOptions(data || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep patient_contact synced from segmented inputs
  useEffect(() => {
    const joined = `${phone1}${phone2}${phone3}`.replace(/\D/g, '').slice(0, 9);
    setForm((f) => ({ ...f, patient_contact: joined }));
  }, [phone1, phone2, phone3]);

  // Keep exit_type and ambulance selection in sync
  useEffect(() => {
    setForm((f) => ({ ...f, exit_type: exitType }));
  }, [exitType]);

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const crewSuggestions = useMemo(
    () => crewOptions.map((c) => `${c.first_name} ${c.last_name}`).filter(Boolean),
    [crewOptions]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Map INEM options to flags
    const is_pem = inemOption === 'inem';
    const is_reserve = inemOption === 'reserva';

    // Ensure date/time default when not editable
    const payload = {
      ...form,
      departure_date: editDate ? form.departure_date : nowDate(),
      departure_time: editTime ? form.departure_time : nowTime(),
      is_pem,
      is_reserve,
      user_id: user.id,
      // If CODU selected, prepend to observations for now (no dedicated column yet)
      observations: exitType === 'Emergencia/CODU' && coduNumber
        ? `CODU: ${coduNumber}${form.observations ? `\n${form.observations}` : ''}`
        : form.observations,
    } as const;

    setLoading(true);
    const { error } = await supabase.from('vehicle_exits').insert(payload as any);
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao registar saída', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saída registada com sucesso' });
      navigate('/exits');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registar Nova Saída</h1>
          <p className="text-muted-foreground">Preencha os dados de forma intuitiva</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Saída</CardTitle>
          <CardDescription>Campos essenciais do serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Linha 1: Data/Hora com checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="departure_date">Data</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit_date" checked={editDate} onCheckedChange={(v) => setEditDate(Boolean(v))} />
                    <Label htmlFor="edit_date" className="text-sm text-muted-foreground">Editar</Label>
                  </div>
                </div>
                <Input id="departure_date" type="date" value={form.departure_date} disabled={!editDate} onChange={(e) => set('departure_date', e.target.value)} />
                {!editDate && <p className="text-xs text-muted-foreground">Usando a data atual: {nowDate()}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="departure_time">Hora</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox id="edit_time" checked={editTime} onCheckedChange={(v) => setEditTime(Boolean(v))} />
                    <Label htmlFor="edit_time" className="text-sm text-muted-foreground">Editar</Label>
                  </div>
                </div>
                <Input id="departure_time" type="time" value={form.departure_time} disabled={!editTime} onChange={(e) => set('departure_time', e.target.value)} />
                {!editTime && <p className="text-xs text-muted-foreground">Usando a hora atual: {nowTime()}</p>}
              </div>
            </div>

            {/* Linha 2: Tipo de saída e CODU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de saída</Label>
                <Select value={exitType} onValueChange={setExitType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione o tipo de saída" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Emergencia/CODU">Emergência/CODU</SelectItem>
                    <SelectItem value="Emergencia particular">Emergência particular</SelectItem>
                    <SelectItem value="VLS">VLS</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {exitType === 'Emergencia/CODU' && (
                <div className="space-y-2">
                  <Label>Número CODU</Label>
                  <Input value={coduNumber} onChange={(e) => setCoduNumber(e.target.value)} placeholder="Ex.: 123456" />
                </div>
              )}
            </div>

            {/* Linha 3: Motivo e Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input value={form.purpose} onChange={(e) => set('purpose', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Input value={form.destination} onChange={(e) => set('destination', e.target.value)} />
              </div>
            </div>

            {/* Linha 4: Dados do paciente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.patient_name} onChange={(e) => set('patient_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Idade</Label>
                <Input type="number" min={0} max={120} value={form.patient_age as any} onChange={(e) => set('patient_age', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={form.patient_gender} onValueChange={(v) => set('patient_gender', v)}>
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

            {/* Linha 5: Contacto em 3 blocos */}
            <div className="space-y-2">
              <Label>Contacto</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input inputMode="numeric" maxLength={3} value={phone1} onChange={(e) => setPhone1(e.target.value.replace(/\D/g, '').slice(0,3))} placeholder="000" />
                <Input inputMode="numeric" maxLength={3} value={phone2} onChange={(e) => setPhone2(e.target.value.replace(/\D/g, '').slice(0,3))} placeholder="000" />
                <Input inputMode="numeric" maxLength={3} value={phone3} onChange={(e) => setPhone3(e.target.value.replace(/\D/g, '').slice(0,3))} placeholder="000" />
              </div>
              <p className="text-xs text-muted-foreground">Será guardado como um número único.</p>
            </div>

            {/* Linha 6: Morada (texto com possibilidade de filtros futuros) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Input value={form.patient_district} onChange={(e) => set('patient_district', e.target.value)} placeholder="Ex.: Braga" />
              </div>
              <div className="space-y-2">
                <Label>Concelho</Label>
                <Input value={form.patient_municipality} onChange={(e) => set('patient_municipality', e.target.value)} placeholder="Ex.: Amares" />
              </div>
              <div className="space-y-2">
                <Label>Freguesia</Label>
                <Input value={form.patient_parish} onChange={(e) => set('patient_parish', e.target.value)} placeholder="Ex.: Ferreiros" />
              </div>
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input value={form.patient_address} onChange={(e) => set('patient_address', e.target.value)} placeholder="Rua, nº, andar..." />
              </div>
            </div>

            {/* Linha 7: Ambulância e opções INEM/Reserva */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Ambulância (Matrícula)</Label>
                <Select
                  value={form.vehicle_id}
                  onValueChange={(v) => {
                    const veh = vehicles.find((x) => x.id === v);
                    set('vehicle_id', v);
                    set('ambulance_number', veh ? veh.license_plate : '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione a viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} — {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de serviço</Label>
                <RadioGroup value={inemOption} onValueChange={(v: any) => setInemOption(v)} className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="inem" value="inem" />
                    <Label htmlFor="inem">INEM</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="inem_si" value="inem_s_iteams" />
                    <Label htmlFor="inem_si">INEM s/ITeams</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="reserva" value="reserva" />
                    <Label htmlFor="reserva">Reserva</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Linha 8: Tripulação (texto + sugestões quando possível) */}
            <div className="space-y-2">
              <Label>Tripulação</Label>
              <Input list="crew_list" value={form.crew} onChange={(e) => set('crew', e.target.value)} placeholder="Ex.: João, Maria, Pedro" />
              {crewSuggestions.length > 0 && (
                <datalist id="crew_list">
                  {crewSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              )}
              <p className="text-xs text-muted-foreground">Sugestões visíveis apenas se permitido pelas permissões.</p>
            </div>

            {/* Linha 9: Condutor e observações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Condutor</Label>
                <Input value={form.driver_name} onChange={(e) => set('driver_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Carta de Condução</Label>
                <Input value={form.driver_license} onChange={(e) => set('driver_license', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={(e) => set('observations', e.target.value)} rows={3} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading}>
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
}
