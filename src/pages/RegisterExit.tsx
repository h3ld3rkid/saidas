import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Search, X, CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ServiceSummaryModal } from '@/components/ServiceSummaryModal';
import { MapLocationPicker } from '@/components/MapLocationPicker';

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

  // Base data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [crewOptions, setCrewOptions] = useState<ProfileLite[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [editDate, setEditDate] = useState(false);
  const [editTime, setEditTime] = useState(false);
  const [exitType, setExitType] = useState('');
  const [coduNumber, setCoduNumber] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({ serviceType: '', serviceNumber: 0, totalServiceNumber: 0 });
  const [inemOption, setInemOption] = useState<'inem' | 'inem_s_iteams' | 'reserva' | ''>('');
  const [showCrewDropdown, setShowCrewDropdown] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [mapLocation, setMapLocation] = useState('');
  type SelectedCrew = { user_id: string; display_name: string };
  const [selectedCrew, setSelectedCrew] = useState<SelectedCrew[]>([]);

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


  // Keep exit_type in sync
  useEffect(() => {
    setForm((f) => ({ ...f, exit_type: exitType }));
  }, [exitType]);

  // Sync address fields with selected values
  useEffect(() => {
    const names = getSelectedNames();
    setForm(f => ({
      ...f,
      patient_district: names.district,
      patient_municipality: names.municipality,
      patient_parish: names.parish
    }));
  }, [selectedDistrict, selectedMunicipality, selectedParish, getSelectedNames]);

  const set = (key: keyof typeof form, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const crewSuggestions = useMemo(
    () => crewOptions.map((c) => `${c.first_name} ${c.last_name}`).filter(Boolean),
    [crewOptions]
  );

  const sendTelegramNotification = async (data: {
    serviceType: string;
    serviceNumber: number;
    departureTime: string;
    contact: string;
    coduNumber?: string;
    address: string;
    observations?: string;
    mapLocation?: string;
    crewUserIds: string;
  }) => {
    try {
      // Parse crew IDs (now UUIDs)
      const crewIds = data.crewUserIds.split(',').map(id => id.trim()).filter(Boolean);
      
      // Add current user ID if not already included
      if (user && !crewIds.includes(user.id)) {
        crewIds.push(user.id);
      }

      // Get crew members' Telegram chat IDs and names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, telegram_chat_id, first_name, last_name')
        .in('user_id', crewIds)
        .not('telegram_chat_id', 'is', null);

      if (!profiles || profiles.length === 0) {
        console.log('No Telegram configurations found for crew');
        return;
      }

      // Extract chat IDs and create crew names string
      const chatIds = profiles.map(p => p.telegram_chat_id!);
      const crewNames = profiles.map(p => `${p.first_name} ${p.last_name}`).join(', ');

      const message = `
🚨 <b>Nova Saída Registrada</b>

📋 <b>Tipo:</b> ${data.serviceType}
🔢 <b>Número:</b> ${data.serviceNumber}
⏰ <b>Hora:</b> ${data.departureTime}
📞 <b>Contacto:</b> ${data.contact}
${data.coduNumber ? `🆘 <b>CODU:</b> ${data.coduNumber}\n` : ''}📍 <b>Morada:</b> ${data.address}
👥 <b>Tripulação:</b> ${crewNames}
${data.observations ? `📝 <b>Observações:</b> ${data.observations}\n` : ''}${data.mapLocation ? `🗺️ <b>Localização:</b> ${data.mapLocation}` : ''}
      `;

      const response = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: chatIds,
          message: message.trim()
        }
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  };

  const checkCoduExists = async () => {
    if (!coduNumber.trim()) return;
    
    try {
      const { data, error } = await supabase.rpc('check_codu_exists', {
        codu_number: coduNumber.trim()
      });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const exit = data[0];
        toast({
          title: 'Número CODU já registado',
          description: `Este número CODU já foi usado em ${exit.departure_date} às ${exit.departure_time}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao verificar CODU:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!exitType) {
      toast({ title: 'Tipo de saída obrigatório', description: 'Selecione o tipo de saída.', variant: 'destructive' });
      return;
    }

    // Map INEM options to flags
    const is_pem = inemOption === 'inem';
    const is_reserve = inemOption === 'reserva';

    // Prepare payload and convert empty strings to null for date/time fields
    const payload = {
      ...form,
      departure_date: editDate ? form.departure_date : nowDate(),
      departure_time: editTime ? form.departure_time : nowTime(),
      // Convert empty strings to null for optional date/time fields
      expected_return_date: form.expected_return_date || null,
      expected_return_time: form.expected_return_time || null,
      // Convert empty patient_age to null
      patient_age: form.patient_age || null,
      is_pem,
      is_reserve,
      user_id: user.id,
      // If CODU selected, prepend to observations for now (no dedicated column yet)
      observations: exitType === 'Emergencia/CODU' && coduNumber
        ? `CODU: ${coduNumber}${form.observations ? `\n${form.observations}` : ''}${mapLocation ? `\nMapa: ${mapLocation}` : ''}`
        : `${form.observations}${mapLocation ? `${form.observations ? '\n' : ''}Mapa: ${mapLocation}` : ''}`,
    };

    setLoading(true);
    
    try {
      // Get service numbers first
      const { data: numberData, error: numberError } = await supabase.rpc('get_next_service_number', {
        p_service_type: exitType
      });
      
      if (numberError) throw numberError;
      
      const serviceNumber = numberData[0]?.service_num || 1;
      const totalServiceNumber = numberData[0]?.total_num || 1;
      
      // Build crew IDs including current user
      const existingCrewIds = (form.crew || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!existingCrewIds.includes(user.id)) existingCrewIds.push(user.id);
      const crewIdsForDb = existingCrewIds.join(', ');
      
      // Insert the exit with the numbers and crew
      const { error } = await supabase.from('vehicle_exits').insert({
        ...payload,
        crew: crewIdsForDb,
        service_number: serviceNumber,
        total_service_number: totalServiceNumber
      } as any);
      
      if (error) throw error;
      
      // Show summary modal
      setSummaryData({ 
        serviceType: exitType, 
        serviceNumber, 
        totalServiceNumber 
      });
      setShowSummary(true);

      // Send Telegram notification (always include current user)
      try {
        await sendTelegramNotification({
          serviceType: exitType,
          serviceNumber,
          departureTime: `${form.departure_date} ${form.departure_time}`,
          contact: form.patient_contact,
          coduNumber: exitType === 'Emergencia/CODU' ? coduNumber : undefined,
          address: `${form.patient_district}, ${form.patient_municipality}, ${form.patient_parish}, ${form.patient_address}`,
          observations: form.observations,
          mapLocation,
          crewUserIds: crewIdsForDb
        });
      } catch (telegramError) {
        console.error('Failed to send Telegram notification:', telegramError);
        // Don't fail the main process for telegram errors
      }
      
    } catch (error: any) {
      toast({ title: 'Erro ao registar saída', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
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
            {/* Linha 1: Data/Hora com calendário intuitivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Saída</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.departure_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.departure_date ? format(new Date(form.departure_date), "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.departure_date ? new Date(form.departure_date) : undefined}
                      onSelect={(date) => set('departure_date', date ? date.toISOString().slice(0, 10) : nowDate())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departure_time">Hora de Saída</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="departure_time" 
                    type="time" 
                    value={form.departure_time} 
                    onChange={(e) => set('departure_time', e.target.value)}
                    className="pl-10"
                  />
                </div>
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
                    <SelectItem value="VSL">VSL</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {exitType === 'Emergencia/CODU' && (
                <div className="space-y-2">
                  <Label>Número CODU</Label>
                  <Input 
                    value={coduNumber} 
                    onChange={(e) => setCoduNumber(e.target.value)} 
                    onBlur={checkCoduExists}
                    placeholder="Ex.: 123456" 
                  />
                </div>
              )}
            </div>

            {/* Linha 3: Motivo */}
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={form.purpose} onChange={(e) => set('purpose', e.target.value)} />
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

            {/* Linha 5: Contacto único */}
            <div className="space-y-2">
              <Label>Contacto</Label>
              <Input 
                inputMode="numeric" 
                maxLength={9} 
                value={form.patient_contact} 
                onChange={(e) => set('patient_contact', e.target.value.replace(/\D/g, '').slice(0, 9))} 
                placeholder="123456789" 
              />
              <p className="text-xs text-muted-foreground">Número de telefone com 9 dígitos.</p>
            </div>

            {/* Linha 6: Morada com dropdowns hierárquicos */}
            <div className="space-y-4">
              <Label>Morada</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Distrito</Label>
                  <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
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
                  <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality} disabled={!selectedDistrict}>
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
                  <Select value={selectedParish} onValueChange={setSelectedParish} disabled={!selectedMunicipality}>
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

              <div className="space-y-2 relative">
                <Label>Rua</Label>
                <div className="relative">
                  <Input
                    value={streetSearch}
                    onChange={(e) => {
                      setStreetSearch(e.target.value);
                      setShowStreetDropdown(true);
                    }}
                    onFocus={() => setShowStreetDropdown(true)}
                    placeholder="Procurar rua..."
                    disabled={!selectedParish}
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                {showStreetDropdown && streets.length > 0 && (
                  <div className="absolute z-10 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {streets.map((street) => (
                      <div
                        key={street.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setStreetSearch(street.nome);
                          set('patient_address', street.nome);
                          setShowStreetDropdown(false);
                        }}
                      >
                        {street.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Morada completa</Label>
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

              {exitType !== 'VSL' && (
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
              )}
              {exitType === 'VSL' && (
                <div className="space-y-2">
                  <Label>Tipo de serviço</Label>
                  <RadioGroup value="vsl" className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="vsl" value="vsl" />
                      <Label htmlFor="vsl">VSL</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>

            {/* Linha 8: Destino */}

            {/* Linha 9: Tripulação com pesquisa ativa */}
            <div className="space-y-2 relative">
              <Label>Tripulação</Label>
              <div className="relative">
                <Input
                  value={crewSearchTerm}
                  onChange={(e) => {
                    setCrewSearchTerm(e.target.value);
                    setShowCrewDropdown(true);
                  }}
                  onFocus={() => setShowCrewDropdown(true)}
                  placeholder="Procurar tripulação..."
                />
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              {showCrewDropdown && crewMembers.length > 0 && (
                <div className="absolute z-10 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                  {crewMembers.map((member) => (
                      <div
                        key={member.user_id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setSelectedCrew((prev) => {
                            if (prev.some(m => m.user_id === member.user_id)) return prev;
                            const updated = [...prev, { user_id: member.user_id, display_name: member.display_name }];
                            set('crew', updated.map(m => m.user_id).join(', '));
                            return updated;
                          });
                          setCrewSearchTerm('');
                          setShowCrewDropdown(false);
                        }}
                      >
                        {member.display_name}
                      </div>
                  ))}
                </div>
              )}
                <div className="space-y-2">
                  <Label>Tripulação selecionada</Label>
                  {selectedCrew.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCrew.map((m) => (
                        <div key={m.user_id} className="flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-2 py-1">
                          <span>{m.display_name}</span>
                          <button
                            type="button"
                            aria-label={`Remover ${m.display_name}`}
                            className="hover:text-destructive"
                            onClick={() => {
                              setSelectedCrew((prev) => {
                                const updated = prev.filter(x => x.user_id !== m.user_id);
                                set('crew', updated.map(x => x.user_id).join(', '));
                                return updated;
                              });
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem membros selecionados ainda.</p>
                  )}
                  <input type="hidden" value={form.crew} readOnly />
                  <p className="text-xs text-muted-foreground">Nota: Quem regista o serviço é incluído automaticamente</p>
                </div>
            </div>

            {/* Mapa para localização */}
            <MapLocationPicker
              value={mapLocation}
              onLocationSelect={setMapLocation}
            />

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={(e) => set('observations', e.target.value)} rows={3} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || !form.vehicle_id || !form.purpose}>
                {loading ? 'A registar...' : 'Registar Saída'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ServiceSummaryModal
        open={showSummary}
        onClose={() => {
          setShowSummary(false);
          navigate('/');
        }}
        serviceType={summaryData.serviceType}
        serviceNumber={summaryData.serviceNumber}
        totalServiceNumber={summaryData.totalServiceNumber}
      />
    </div>
  );
}
