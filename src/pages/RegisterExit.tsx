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
import { TimePicker } from '@/components/ui/time-picker';
interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  ambulance_number: string | null;
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
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    hasRole
  } = useUserRole();

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
    districtSearch,
    municipalitySearch,
    parishSearch,
    setSelectedDistrict,
    setSelectedMunicipality,
    setSelectedParish,
    setStreetSearch,
    setDistrictSearch,
    setMunicipalitySearch,
    setParishSearch,
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
  const [summaryData, setSummaryData] = useState({
    serviceType: '',
    serviceNumber: 0,
    totalServiceNumber: 0,
    ambulanceNumber: ''
  });
  const [inemOption, setInemOption] = useState<'inem' | 'inem_s_iteams' | 'reserva' | ''>('');
  const [showCrewDropdown, setShowCrewDropdown] = useState(false);
  const [showStreetDropdown, setShowStreetDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showMunicipalityDropdown, setShowMunicipalityDropdown] = useState(false);
  const [showParishDropdown, setShowParishDropdown] = useState(false);
  const [mapLocation, setMapLocation] = useState('');
  const [errors, setErrors] = useState<{
    [key: string]: boolean;
  }>({});
  type SelectedCrew = {
    user_id: string;
    display_name: string;
  };
  const [selectedCrew, setSelectedCrew] = useState<SelectedCrew[]>([]);
  const [vslActivated, setVslActivated] = useState(false);
  const [selectedVslCrew, setSelectedVslCrew] = useState<SelectedCrew[]>([]);
  const [showVslCrewDropdown, setShowVslCrewDropdown] = useState(false);
  const [vslCrewSearchTerm, setVslCrewSearchTerm] = useState('');

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
    driver_name: '',
    driver_license: '',
    observations: '',
    // Patient fields
    patient_name: '',
    patient_age: '' as unknown as number | '',
    patient_age_unit: 'anos' as 'anos' | 'meses',
    patient_gender: '',
    patient_contact: '',
    patient_district: '',
    patient_municipality: '',
    patient_parish: '',
    patient_address: '',
    // Flags
    is_pem: false,
    is_reserve: false,
    crew: ''
  });
  useEffect(() => {
    document.title = 'Registar Saída | CV Amares';
  }, []);
  useEffect(() => {
    // Load active vehicles for selection ordered by display_order
    supabase.from('vehicles').select('*').eq('is_active', true).order('display_order', {
      ascending: true,
      nullsFirst: false
    }).order('ambulance_number', {
      ascending: true
    }).then(({
      data,
      error
    }) => {
      if (error) {
        toast({
          title: 'Erro ao carregar viaturas',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        setVehicles(data || []);
      }
    });

    // Attempt to load active crew suggestions (only if roles permit reading profiles)
    if (hasRole('admin') || hasRole('mod')) {
      supabase.from('profiles').select('user_id, first_name, last_name').eq('is_active', true).order('first_name').then(({
        data
      }) => setCrewOptions(data || []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep exit_type in sync
  useEffect(() => {
    setForm(f => ({
      ...f,
      exit_type: exitType
    }));
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
  const set = (key: keyof typeof form, value: any) => setForm(f => ({
    ...f,
    [key]: value
  }));

  // Format Portuguese phone number to 123-123-123
  const formatPortuguesePhone = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // If it's a Portuguese mobile (9 digits starting with 9)
    if (digits.length === 9 && digits[0] === '9') {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
    }
    return value;
  };

  // Validate contact field
  const isValidContact = (value: string): boolean => {
    if (!value) return false;

    // Accept "codu" (case insensitive)
    if (value.toLowerCase() === 'codu') return true;

    // Accept Portuguese format 123-123-123
    if (/^\d{3}-\d{3}-\d{3}$/.test(value)) return true;

    // Accept international numbers (starting with 00 followed by country code and digits)
    if (/^00\d{10,15}$/.test(value.replace(/[\s-]/g, ''))) return true;

    // Accept plain 9-digit Portuguese numbers
    if (/^9\d{8}$/.test(value)) return true;
    return false;
  };
  const crewSuggestions = useMemo(() => crewOptions.map(c => `${c.first_name} ${c.last_name}`).filter(Boolean), [crewOptions]);
  const sendTelegramNotification = async (data: {
    serviceType: string;
    serviceNumber: number;
    departureTime: string;
    contact: string;
    coduNumber?: string;
    district?: string;
    municipality?: string;
    parish?: string;
    address: string;
    observations?: string;
    mapLocation?: string;
    crewUserIds: string;
  }) => {
    try {
      // Parse crew IDs (original crew selection without auto-adding registrar)
      const crewIds = data.crewUserIds.split(',').map(id => id.trim()).filter(Boolean);

      // Delegate notification to edge function (bypasses RLS safely)
      const {
        data: notifyData,
        error: notifyError
      } = await supabase.functions.invoke('service-crew-notify', {
        body: {
          crewUserIds: crewIds,
          serviceType: data.serviceType,
          serviceNumber: data.serviceNumber,
          departureTime: data.departureTime,
          contact: data.contact,
          coduNumber: data.coduNumber,
          district: data.district,
          municipality: data.municipality,
          parish: data.parish,
          address: data.address,
          observations: data.observations,
          mapLocation: data.mapLocation,
          registrarUserId: user?.id
        }
      });
      if (notifyError) {
        throw notifyError;
      }
      console.log('Telegram notify result:', notifyData);
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  };
  const checkCoduExists = async () => {
    if (!coduNumber.trim()) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('check_codu_exists', {
        codu_number: coduNumber.trim()
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const exit = data[0];
        toast({
          title: 'Número CODU já registado',
          description: `Este número CODU já foi usado em ${exit.departure_date} às ${exit.departure_time}`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao verificar CODU:', error);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validar campos obrigatórios
    const newErrors: {
      [key: string]: boolean;
    } = {};
    if (!exitType) newErrors.exitType = true;
    if (!form.vehicle_id) newErrors.vehicle_id = true;
    if (!form.purpose) newErrors.purpose = true;

    // CODU obrigatório se emergencia/codu selecionado
    if (exitType === 'Emergencia/CODU') {
      if (!coduNumber) {
        newErrors.coduNumber = true;
      } else {
        const coduNum = parseInt(coduNumber);
        if (isNaN(coduNum) || coduNum < 1 || coduNum > 10000000) {
          newErrors.coduNumber = true;
          toast({
            title: 'Número CODU inválido',
            description: 'O número CODU deve estar entre 1 e 10000000.',
            variant: 'destructive'
          });
        }
      }
    }

    // Validação do contacto
    if (!isValidContact(form.patient_contact)) {
      newErrors.patient_contact = true;
    }

    // Validação da tripulação: mínimo 2, máximo 4 elementos
    if (selectedCrew.length < 2) {
      newErrors.crew = true;
      toast({
        title: 'Tripulação insuficiente',
        description: 'É necessário selecionar pelo menos 2 membros na tripulação.',
        variant: 'destructive'
      });
    }
    if (selectedCrew.length > 4) {
      newErrors.crew = true;
      toast({
        title: 'Tripulação excedida',
        description: 'É permitido no máximo 4 membros na tripulação.',
        variant: 'destructive'
      });
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: 'Campos obrigatórios em falta',
        description: 'Por favor preencha todos os campos assinalados a vermelho.',
        variant: 'destructive'
      });
      return;
    }
    if (!exitType) {
      toast({
        title: 'Tipo de saída obrigatório',
        description: 'Selecione o tipo de saída.',
        variant: 'destructive'
      });
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
      observations: exitType === 'Emergencia/CODU' && coduNumber ? `CODU: ${coduNumber}${form.observations ? `\n${form.observations}` : ''}${mapLocation ? `\nMapa: ${mapLocation}` : ''}` : `${form.observations}${mapLocation ? `${form.observations ? '\n' : ''}Mapa: ${mapLocation}` : ''}`
    };
    setLoading(true);
    try {
      // Get service numbers first
      const {
        data: numberData,
        error: numberError
      } = await supabase.rpc('get_next_service_number', {
        p_service_type: exitType
      });
      if (numberError) throw numberError;
      const serviceNumber = numberData[0]?.service_num || 1;
      const totalServiceNumber = numberData[0]?.total_num || 1;

      // Get crew IDs from form (these are the selected crew members only)
      const selectedCrewIds = (form.crew || '').split(',').map(s => s.trim()).filter(Boolean);

      // Crew for DB and notifications is the same - only selected members
      const crewIdsString = selectedCrewIds.join(', ');

      // If VSL is activated, we need to handle both CODU and VSL entries
      if (vslActivated && exitType === 'Emergencia/CODU') {
        // Get VSL service number without incrementing total counter
        const {
          data: vslNumberData,
          error: vslNumberError
        } = await supabase.rpc('get_next_service_number_no_total', {
          p_service_type: 'VSL'
        });
        if (vslNumberError) throw vslNumberError;
        const vslServiceNumber = vslNumberData[0]?.service_num || 1;

        // Insert CODU record
        const {
          error: coduError
        } = await supabase.from('vehicle_exits').insert({
          ...payload,
          crew: crewIdsString,
          service_number: serviceNumber,
          total_service_number: totalServiceNumber,
          exit_type: 'Emergencia/CODU'
        } as any);
        if (coduError) throw coduError;

        // Insert VSL record with VSL crew (only selected members)
        const vslSelectedCrewIds = selectedVslCrew.map(c => c.user_id);
        const vslCrewString = vslSelectedCrewIds.join(', ');
        const {
          error: vslError
        } = await supabase.from('vehicle_exits').insert({
          ...payload,
          crew: vslCrewString,
          service_number: vslServiceNumber,
          total_service_number: totalServiceNumber,
          // Same total number
          exit_type: 'VSL',
          observations: `VSL para CODU: ${coduNumber}${form.observations ? `\n${form.observations}` : ''}${mapLocation ? `\nMapa: ${mapLocation}` : ''}`
        } as any);
        if (vslError) throw vslError;

        // Show summary for CODU (primary service)
        setSummaryData({
          serviceType: `${exitType} + VSL`,
          serviceNumber,
          totalServiceNumber,
          ambulanceNumber: form.ambulance_number
        });

        // Send notifications to both crews
        try {
          // CODU crew notification
          await sendTelegramNotification({
            serviceType: 'Emergencia/CODU',
            serviceNumber,
            departureTime: `${form.departure_date} ${form.departure_time}`,
            contact: form.patient_contact,
            coduNumber,
            district: form.patient_district,
            municipality: form.patient_municipality,
            parish: form.patient_parish,
            address: form.patient_address,
            observations: form.observations,
            mapLocation,
            crewUserIds: crewIdsString
          });

          // VSL crew notification
          await sendTelegramNotification({
            serviceType: 'VSL (Apoio)',
            serviceNumber: vslServiceNumber,
            departureTime: `${form.departure_date} ${form.departure_time}`,
            contact: form.patient_contact,
            coduNumber,
            district: form.patient_district,
            municipality: form.patient_municipality,
            parish: form.patient_parish,
            address: form.patient_address,
            observations: `VSL para CODU: ${coduNumber}`,
            mapLocation,
            crewUserIds: vslCrewString
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
        }
      } else {
        // Regular single service entry
        const {
          error
        } = await supabase.from('vehicle_exits').insert({
          ...payload,
          crew: crewIdsString,
          service_number: serviceNumber,
          total_service_number: totalServiceNumber
        } as any);
        if (error) throw error;

        // Show summary modal
        setSummaryData({
          serviceType: exitType,
          serviceNumber,
          totalServiceNumber,
          ambulanceNumber: form.ambulance_number
        });

        // Send Telegram notification with selected crew
        try {
          await sendTelegramNotification({
            serviceType: exitType,
            serviceNumber,
            departureTime: `${form.departure_date} ${form.departure_time}`,
            contact: form.patient_contact,
            coduNumber: exitType === 'Emergencia/CODU' ? coduNumber : undefined,
            district: form.patient_district,
            municipality: form.patient_municipality,
            parish: form.patient_parish,
            address: form.patient_address,
            observations: form.observations,
            mapLocation,
            crewUserIds: crewIdsString
          });
        } catch (telegramError) {
          console.error('Failed to send Telegram notification:', telegramError);
        }
      }
      setShowSummary(true);
    } catch (error: any) {
      toast({
        title: 'Erro ao registar saída',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="p-6">
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
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.departure_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.departure_date ? format(new Date(form.departure_date), "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.departure_date ? new Date(form.departure_date) : undefined} onSelect={date => set('departure_date', date ? date.toISOString().slice(0, 10) : nowDate())} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departure_time">Hora de Saída</Label>
                <TimePicker value={form.departure_time} onChange={time => {
                set('departure_time', time);
                setEditTime(true);
              }} />
              </div>
            </div>

            {/* Linha 2: Tipo de saída e CODU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de saída <span className="text-red-500">*</span></Label>
                <Select value={exitType} onValueChange={value => {
                setExitType(value);
                if (value && errors.exitType) {
                  setErrors(prev => {
                    const newErrors = {
                      ...prev
                    };
                    delete newErrors.exitType;
                    return newErrors;
                  });
                }
              }}>
                  <SelectTrigger className={errors.exitType ? 'border-red-500' : ''}>
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
              {exitType === 'Emergencia/CODU' && <div className="space-y-2">
                  <Label>Número CODU <span className="text-red-500">*</span></Label>
                  <Input type="number" min={1} max={10000000} value={coduNumber} onChange={e => {
                const value = e.target.value;
                // Only allow numbers between 1 and 10000000
                if (value === '' || parseInt(value) >= 1 && parseInt(value) <= 10000000) {
                  setCoduNumber(value);
                  if (value && errors.coduNumber) {
                    setErrors(prev => {
                      const newErrors = {
                        ...prev
                      };
                      delete newErrors.coduNumber;
                      return newErrors;
                    });
                  }
                }
              }} onBlur={checkCoduExists} className={errors.coduNumber ? 'border-red-500' : ''} placeholder="Ex.: 123456 (1-10000000)" />
                </div>}
            </div>

            {/* Botão VSL - só aparece quando Emergencia/CODU selecionado */}
            {exitType === 'Emergencia/CODU' && <div className="flex justify-center">
                <Button type="button" variant={vslActivated ? "default" : "outline"} className={cn("bg-blue-600 hover:bg-blue-700 text-white border-blue-600", !vslActivated && "bg-transparent text-blue-600 hover:bg-blue-50")} onClick={() => setVslActivated(!vslActivated)}>
                  {vslActivated ? '✓ VSL Ativado' : 'Ativação VSL'}
                </Button>
              </div>}

            {/* Linha 3: Motivo */}
            <div className="space-y-2">
              <Label>Motivo <span className="text-red-500">*</span></Label>
              <Input value={form.purpose} onChange={e => {
              set('purpose', e.target.value);
              if (e.target.value && errors.purpose) {
                setErrors(prev => {
                  const newErrors = {
                    ...prev
                  };
                  delete newErrors.purpose;
                  return newErrors;
                });
              }
            }} className={errors.purpose ? 'border-red-500' : ''} placeholder="Ex.: Transporte inter-hospitalar" />
            </div>

            {/* Linha 4: Dados do paciente */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label>Nome</Label>
                <Input value={form.patient_name} onChange={e => set('patient_name', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Idade</Label>
                <Input type="number" min={0} max={form.patient_age_unit === 'meses' ? 24 : 120} value={form.patient_age as any} onChange={e => set('patient_age', e.target.value ? Number(e.target.value) : '')} />
              </div>
              <div className="space-y-2 md:col-span-1 flex items-end pb-0.5">
                <Label className="flex items-center gap-2 cursor-pointer h-10">
                  <Checkbox checked={form.patient_age_unit === 'meses'} onCheckedChange={checked => set('patient_age_unit', checked ? 'meses' : 'anos')} />
                  <span>Meses</span>
                </Label>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label>Sexo</Label>
                <Select value={form.patient_gender} onValueChange={v => set('patient_gender', v)}>
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
              <Label>Contato <span className="text-red-500">*</span></Label>
              <Input inputMode="text" value={form.patient_contact} onChange={e => {
              let value = e.target.value;

              // Auto-format Portuguese numbers as user types
              if (/^9\d{0,8}$/.test(value.replace(/\D/g, ''))) {
                const digits = value.replace(/\D/g, '');
                if (digits.length === 9) {
                  value = formatPortuguesePhone(digits);
                }
              }
              set('patient_contact', value);
              if (value && errors.patient_contact) {
                setErrors(prev => {
                  const newErrors = {
                    ...prev
                  };
                  delete newErrors.patient_contact;
                  return newErrors;
                });
              }
            }} onBlur={e => {
              // Format on blur if it's a 9-digit Portuguese number
              const value = e.target.value;
              const digits = value.replace(/\D/g, '');
              if (digits.length === 9 && digits[0] === '9') {
                set('patient_contact', formatPortuguesePhone(digits));
              }
            }} className={errors.patient_contact ? 'border-red-500' : ''} placeholder="912-345-678, CODU ou 0033123456789" />
              <p className="text-xs text-muted-foreground">
                Formato PT: 999-999-999 | Internacional: 0033123456789 | Ou escreve "CODU"
              </p>
            </div>

            {/* Linha 6: Morada com pesquisa ativa */}
            <div className="space-y-4">
              <Label>Morada</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 relative">
                  <Label>Distrito</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input value={districtSearch} onChange={e => {
                    setDistrictSearch(e.target.value);
                    setShowDistrictDropdown(true);
                  }} onFocus={() => setShowDistrictDropdown(true)} onBlur={() => setTimeout(() => setShowDistrictDropdown(false), 200)} placeholder="Procurar e selecionar distrito..." className="pl-10" />
                  </div>
                  {showDistrictDropdown && districts.length > 0 && <div className="absolute z-20 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {districts.map(district => <div key={district.id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                    setSelectedDistrict(district.id);
                    setDistrictSearch(district.nome);
                    setShowDistrictDropdown(false);
                  }}>
                          {district.nome}
                        </div>)}
                    </div>}
                  {selectedDistrict && <div className="text-sm text-muted-foreground">
                      Selecionado: {districts.find(d => d.id === selectedDistrict)?.nome}
                    </div>}
                </div>

                <div className="space-y-2 relative">
                  <Label>Concelho</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input value={municipalitySearch} onChange={e => {
                    setMunicipalitySearch(e.target.value);
                    setShowMunicipalityDropdown(true);
                  }} onFocus={() => selectedDistrict && setShowMunicipalityDropdown(true)} onBlur={() => setTimeout(() => setShowMunicipalityDropdown(false), 200)} placeholder="Procurar e selecionar concelho..." className="pl-10" disabled={!selectedDistrict} />
                  </div>
                  {showMunicipalityDropdown && municipalities.length > 0 && selectedDistrict && <div className="absolute z-20 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {municipalities.map(municipality => <div key={municipality.id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                    setSelectedMunicipality(municipality.id);
                    setMunicipalitySearch(municipality.nome);
                    setShowMunicipalityDropdown(false);
                  }}>
                          {municipality.nome}
                        </div>)}
                    </div>}
                  {selectedMunicipality && <div className="text-sm text-muted-foreground">
                      Selecionado: {municipalities.find(m => m.id === selectedMunicipality)?.nome}
                    </div>}
                </div>

                <div className="space-y-2 relative">
                  <Label>Freguesia</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Input value={parishSearch} onChange={e => {
                    setParishSearch(e.target.value);
                    setShowParishDropdown(true);
                  }} onFocus={() => selectedMunicipality && setShowParishDropdown(true)} onBlur={() => setTimeout(() => setShowParishDropdown(false), 200)} placeholder="Procurar e selecionar freguesia..." className="pl-10" disabled={!selectedMunicipality} />
                  </div>
                  {showParishDropdown && parishes.length > 0 && selectedMunicipality && <div className="absolute z-20 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {parishes.map(parish => <div key={parish.id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                    setSelectedParish(parish.id);
                    setParishSearch(parish.nome);
                    setShowParishDropdown(false);
                  }}>
                          {parish.nome}
                        </div>)}
                    </div>}
                  {selectedParish && <div className="text-sm text-muted-foreground">
                      Selecionado: {parishes.find(p => p.id === selectedParish)?.nome}
                    </div>}
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label>Rua</Label>
                <div className="relative">
                  <Input value={streetSearch} onChange={e => {
                  setStreetSearch(e.target.value);
                  setShowStreetDropdown(true);
                }} onFocus={() => setShowStreetDropdown(true)} onBlur={() => setTimeout(() => setShowStreetDropdown(false), 200)} placeholder="Procurar rua..." disabled={!selectedParish} />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                {showStreetDropdown && streets.length > 0 && <div className="absolute z-10 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {streets.map(street => <div key={street.id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                  setStreetSearch(street.nome);
                  set('patient_address', street.nome);
                  setShowStreetDropdown(false);
                }}>
                        {street.nome}
                      </div>)}
                  </div>}
              </div>

              <div className="space-y-2">
                <Label>Morada completa</Label>
                <Input value={form.patient_address} onChange={e => set('patient_address', e.target.value)} placeholder="Rua, nº, andar..." />
              </div>
            </div>

            {/* Linha 7: Ambulância e opções INEM/Reserva */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ambulância <span className="text-red-500">*</span></Label>
                <Select value={form.vehicle_id} onValueChange={v => {
                const veh = vehicles.find(x => x.id === v);
                set('vehicle_id', v);
                set('ambulance_number', veh ? veh.ambulance_number || veh.license_plate : '');
                if (v && errors.vehicle_id) {
                  setErrors(prev => {
                    const newErrors = {
                      ...prev
                    };
                    delete newErrors.vehicle_id;
                    return newErrors;
                  });
                }
              }}>
                  <SelectTrigger className={errors.vehicle_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccione a ambulância" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map(vehicle => <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.ambulance_number ? `Ambulância ${vehicle.ambulance_number}` : `${vehicle.license_plate} — ${vehicle.make} ${vehicle.model}`}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {exitType !== 'VSL' && <div className="space-y-2">
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
                </div>}
              {exitType === 'VSL' && <div className="space-y-2">
                  <Label>Tipo de serviço</Label>
                  <RadioGroup value="vsl" className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="vsl" value="vsl" />
                      <Label htmlFor="vsl">VSL</Label>
                    </div>
                  </RadioGroup>
                </div>}
            </div>

            {/* Linha 8: Destino */}

            {/* Linha 9: Tripulação com pesquisa ativa */}
            <div className="space-y-2 relative">
              <Label>Tripulação <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input value={crewSearchTerm} onChange={e => {
                setCrewSearchTerm(e.target.value);
                setShowCrewDropdown(true);
              }} onFocus={() => setShowCrewDropdown(true)} placeholder="Procurar tripulação..." className={errors.crew ? 'border-red-500' : ''} />
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              {showCrewDropdown && crewMembers.length > 0 && <div className="absolute z-10 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                  {crewMembers.map(member => <div key={member.user_id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                setSelectedCrew(prev => {
                  if (prev.some(m => m.user_id === member.user_id)) return prev;
                  if (prev.length >= 4) {
                    toast({
                      title: 'Limite atingido',
                      description: 'Máximo de 4 membros na tripulação.',
                      variant: 'destructive'
                    });
                    return prev;
                  }
                  const updated = [...prev, {
                    user_id: member.user_id,
                    display_name: member.display_name
                  }];
                  set('crew', updated.map(m => m.user_id).join(', '));
                  if (errors.crew && updated.length >= 2 && updated.length <= 4) {
                    setErrors(prev => {
                      const newErrors = {
                        ...prev
                      };
                      delete newErrors.crew;
                      return newErrors;
                    });
                  }
                  return updated;
                });
                setCrewSearchTerm('');
                setShowCrewDropdown(false);
              }}>
                        {member.display_name}
                      </div>)}
                </div>}
                <div className="space-y-2">
                  <Label>Tripulação selecionada ({selectedCrew.length}/4)</Label>
                  {selectedCrew.length > 0 ? <div className="flex flex-wrap gap-2">
                      {selectedCrew.map(m => <div key={m.user_id} className="flex items-center gap-1 rounded-full bg-muted text-foreground text-xs px-2 py-1">
                          <span>{m.display_name}</span>
                          <button type="button" aria-label={`Remover ${m.display_name}`} className="hover:text-destructive" onClick={() => {
                    setSelectedCrew(prev => {
                      const updated = prev.filter(x => x.user_id !== m.user_id);
                      set('crew', updated.map(x => x.user_id).join(', '));
                      return updated;
                    });
                  }}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>)}
                    </div> : <p className="text-xs text-muted-foreground">Sem membros selecionados ainda.</p>}
                  <input type="hidden" value={form.crew} readOnly />
                  <p className="text-xs text-muted-foreground">Mínimo 2, máximo 4 elementos  </p>
                </div>
            </div>

            {/* Mapa para localização */}
            <MapLocationPicker value={mapLocation} onLocationSelect={setMapLocation} address={form.patient_address} parish={form.patient_parish} municipality={form.patient_municipality} />

            {/* Seção VSL - só aparece quando VSL está ativado */}
            {vslActivated && exitType === 'Emergencia/CODU' && <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-orange-800 text-lg">🚑 Tripulação VSL</CardTitle>
                  <CardDescription className="text-orange-700">Selecione a tripulação para a Viatura de Socorro e Limpeza</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <div className="space-y-2">
                      <Label className="text-orange-800">Pesquisar tripulação VSL</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Digite para pesquisar membros..." value={vslCrewSearchTerm} onChange={e => {
                      setVslCrewSearchTerm(e.target.value);
                      setShowVslCrewDropdown(e.target.value.length > 0);
                    }} onFocus={() => setShowVslCrewDropdown(vslCrewSearchTerm.length > 0)} onBlur={() => setTimeout(() => setShowVslCrewDropdown(false), 200)} className="pl-10" />
                      </div>
                    </div>

                    {showVslCrewDropdown && crewMembers.filter(member => member.display_name.toLowerCase().includes(vslCrewSearchTerm.toLowerCase())).length > 0 && <div className="absolute z-10 w-full bg-background border rounded-md shadow-md max-h-40 overflow-y-auto">
                        {crewMembers.filter(member => member.display_name.toLowerCase().includes(vslCrewSearchTerm.toLowerCase())).map(member => <div key={member.user_id} className="px-3 py-2 hover:bg-accent cursor-pointer" onClick={() => {
                    setSelectedVslCrew(prev => {
                      if (prev.some(m => m.user_id === member.user_id)) return prev;
                      return [...prev, {
                        user_id: member.user_id,
                        display_name: member.display_name
                      }];
                    });
                    setVslCrewSearchTerm('');
                    setShowVslCrewDropdown(false);
                  }}>
                            {member.display_name}
                          </div>)}
                      </div>}

                    <div className="space-y-2">
                      <Label className="text-orange-800">Tripulação VSL selecionada</Label>
                      {selectedVslCrew.length > 0 ? <div className="flex flex-wrap gap-2">
                          {selectedVslCrew.map(m => <div key={m.user_id} className="flex items-center gap-1 rounded-full bg-orange-200 text-orange-800 text-xs px-2 py-1">
                              <span>{m.display_name}</span>
                              <button type="button" aria-label={`Remover ${m.display_name}`} className="hover:text-red-600" onClick={() => {
                        setSelectedVslCrew(prev => prev.filter(x => x.user_id !== m.user_id));
                      }}>
                                <X className="h-3 w-3" />
                              </button>
                            </div>)}
                        </div> : <p className="text-xs text-orange-600">Nenhum membro VSL selecionado ainda.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={e => set('observations', e.target.value)} rows={3} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading || Object.keys(errors).length > 0}>
                {loading ? 'A registar...' : 'Registar Saída'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ServiceSummaryModal open={showSummary} onClose={() => {
      setShowSummary(false);
      navigate('/');
    }} serviceType={summaryData.serviceType} serviceNumber={summaryData.serviceNumber} totalServiceNumber={summaryData.totalServiceNumber} ambulanceNumber={summaryData.ambulanceNumber} />
    </div>;
}