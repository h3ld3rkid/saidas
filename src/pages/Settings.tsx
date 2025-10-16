import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Image, Download, Calendar, Link, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeExitType, displayExitType, DEFAULT_EXIT_TYPE_KEYS } from '@/lib/exitType';

export default function Settings() {
  const navigate = useNavigate();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [currentLogo, setCurrentLogo] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [escalasUrl, setEscalasUrl] = useState<string>('');
  const [escalasLoading, setEscalasLoading] = useState(false);
  
  // Service counters state
  const [serviceCounters, setServiceCounters] = useState<{[key: string]: number}>({});
  const [serviceTypeOriginalNames, setServiceTypeOriginalNames] = useState<{[key: string]: string}>({});
  const [totalCounter, setTotalCounter] = useState<number>(0);
  const [countersLoading, setCountersLoading] = useState(false);

  useEffect(() => {
    document.title = 'Configurações | CV Amares';
    
    if (roleLoading) return;
    if (!hasRole('admin')) {
      navigate('/home');
      return;
    }

    // Load current logo if exists
    loadCurrentLogo();
    loadEscalasUrl();
    loadServiceCounters();
  }, [navigate, hasRole, roleLoading]);

  const loadEscalasUrl = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'escalas_url')
        .single();
      
      if (data?.value) {
        setEscalasUrl(data.value);
      }
    } catch (error) {
      console.log('No escalas URL found yet');
    }
  };

  const loadCurrentLogo = async () => {
    try {
      const { data } = supabase.storage
        .from('assets')
        .getPublicUrl('logo.png');

      if (data?.publicUrl) {
        // Check if file actually exists by trying to fetch it
        const response = await fetch(data.publicUrl);
        if (response.ok) {
          setCurrentLogo(data.publicUrl);
        }
      }
    } catch (error) {
      console.log('No logo found yet');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('png')) {
      toast({
        title: 'Formato inválido',
        description: 'Apenas ficheiros PNG são aceites.',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Ficheiro muito grande',
        description: 'O ficheiro deve ter menos de 2MB.',
        variant: 'destructive'
      });
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    setLoading(true);
    try {
      // Upload the logo (overwrites if exists)
      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload('logo.png', logoFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      toast({
        title: 'Logotipo actualizado',
        description: 'O logotipo foi actualizado com sucesso.'
      });

      // Refresh current logo
      await loadCurrentLogo();
      setLogoFile(null);
      setLogoPreview('');

    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione as datas de início e fim.',
        variant: 'destructive'
      });
      return;
    }

    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-data', {
        body: {
          startDate,
          endDate
        }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_servicos_${startDate}_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Dados exportados',
        description: 'O relatório foi descarregado com sucesso.'
      });

    } catch (error: any) {
      toast({
        title: 'Erro na exportação',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSaveEscalasUrl = async () => {
    setEscalasLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ value: escalasUrl })
        .eq('key', 'escalas_url');

      if (error) throw error;

      toast({
        title: 'URL guardado',
        description: 'O link das escalas foi atualizado com sucesso.'
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setEscalasLoading(false);
    }
  };

  const loadServiceCounters = async () => {
    try {
      // Carregar contadores de serviço
      const { data: counters } = await supabase
        .from('service_counters')
        .select('service_type, current_number');
      
      if (counters) {
        const countersMap: {[key: string]: number} = {};
        const originalNamesMap: {[key: string]: string} = {};
        
        counters.forEach((c: any) => {
          const normalizedKey = normalizeExitType(c.service_type);
          countersMap[normalizedKey] = c.current_number;
          originalNamesMap[normalizedKey] = c.service_type;
        });
        
        setServiceCounters(countersMap);
        setServiceTypeOriginalNames(originalNamesMap);
      }

      // Carregar contador total
      const { data: totalData } = await supabase
        .from('total_service_counter')
        .select('current_number')
        .maybeSingle();
      
      if (totalData) {
        setTotalCounter(totalData.current_number);
      }
    } catch (error) {
      console.log('Error loading counters:', error);
    }
  };

  const handleUpdateCounter = async (normalizedKey: string, newValue: number) => {
    setCountersLoading(true);
    try {
      // Use original name if exists, otherwise use normalized key
      const dbServiceType = serviceTypeOriginalNames[normalizedKey] || normalizedKey;
      
      // Check if counter exists
      const { data: existing } = await supabase
        .from('service_counters')
        .select('id')
        .eq('service_type', dbServiceType)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('service_counters')
          .update({ current_number: newValue, updated_at: new Date().toISOString() })
          .eq('service_type', dbServiceType);

        if (error) throw error;
      } else {
        // Create new counter with normalized key
        const { error } = await supabase
          .from('service_counters')
          .insert({ service_type: normalizedKey, current_number: newValue });

        if (error) throw error;
      }

      setServiceCounters(prev => ({ ...prev, [normalizedKey]: newValue }));

      toast({
        title: 'Contador atualizado',
        description: `Contador de "${displayExitType(normalizedKey)}" atualizado para ${newValue}.`
      });

      await loadServiceCounters();

    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCountersLoading(false);
    }
  };

  const handleUpdateTotalCounter = async (newValue: number) => {
    setCountersLoading(true);
    try {
      const { data: existing } = await supabase
        .from('total_service_counter')
        .select('id')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('total_service_counter')
          .update({ current_number: newValue, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('total_service_counter')
          .insert({ current_number: newValue });

        if (error) throw error;
      }

      setTotalCounter(newValue);

      toast({
        title: 'Contador total atualizado',
        description: `Contador total de fichas atualizado para ${newValue}.`
      });

      await loadServiceCounters();

    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setCountersLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!hasRole('admin')) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerir configurações do sistema</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Link das Escalas
            </CardTitle>
            <CardDescription>
              Configure o link que será aberto quando os utilizadores clicarem no botão "Escalas" na barra lateral
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="escalas-url">URL das Escalas</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="escalas-url"
                    type="url"
                    placeholder="https://exemplo.com/escalas"
                    value={escalasUrl}
                    onChange={(e) => setEscalasUrl(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button 
                  onClick={handleSaveEscalasUrl}
                  disabled={escalasLoading}
                >
                  {escalasLoading ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                O botão "Escalas" só aparecerá na barra lateral quando um URL válido for configurado
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Logotipo do Sistema
            </CardTitle>
            <CardDescription>
              Faça upload do logotipo que aparecerá na página de login (apenas PNG)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentLogo && (
              <div className="space-y-2">
                <Label>Logotipo Actual</Label>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img 
                    src={currentLogo} 
                    alt="Logotipo actual" 
                    className="h-16 w-auto max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="logo-upload">Novo Logotipo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept=".png"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Formatos aceites: PNG (máx. 2MB)
              </p>
            </div>

            {logoPreview && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img 
                    src={logoPreview} 
                    alt="Pré-visualização" 
                    className="h-16 w-auto max-w-full object-contain"
                  />
                </div>
                <Button 
                  onClick={handleUploadLogo}
                  disabled={loading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? 'A fazer upload...' : 'Actualizar Logotipo'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Números de Saídas
            </CardTitle>
            <CardDescription>
              Defina manualmente os números atuais dos contadores de saídas. Estes são os últimos números usados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Contador Total */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label htmlFor="total-counter" className="text-base font-semibold mb-3 block">
                Contador Total de Fichas
              </Label>
              <div className="flex gap-3">
                <Input
                  id="total-counter"
                  type="number"
                  min="0"
                  value={totalCounter}
                  onChange={(e) => setTotalCounter(parseInt(e.target.value) || 0)}
                  className="text-lg font-mono"
                />
                <Button 
                  onClick={() => handleUpdateTotalCounter(totalCounter)}
                  disabled={countersLoading}
                  size="lg"
                >
                  Atualizar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Próxima ficha será: <span className="font-semibold">Nº{totalCounter + 1}</span>
              </p>
            </div>

            {/* Contadores por Tipo */}
            <div className="space-y-4">
              <h4 className="font-semibold text-base">Contadores por Tipo de Serviço</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEFAULT_EXIT_TYPE_KEYS.map(({ key, label }) => (
                  <div key={key} className="p-4 border rounded-lg bg-card">
                    <Label htmlFor={`counter-${key}`} className="font-medium mb-2 block">
                      {label}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`counter-${key}`}
                        type="number"
                        min="0"
                        value={serviceCounters[key] || 0}
                        onChange={(e) => setServiceCounters(prev => ({
                          ...prev,
                          [key]: parseInt(e.target.value) || 0
                        }))}
                        className="font-mono"
                      />
                      <Button 
                        onClick={() => handleUpdateCounter(key, serviceCounters[key] || 0)}
                        disabled={countersLoading}
                      >
                        Atualizar
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Próximo: <span className="font-semibold">Nº{(serviceCounters[key] || 0) + 1}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportação de Dados
            </CardTitle>
            <CardDescription>
              Exporte os serviços realizados num período específico para análise estatística
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data de Início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button 
              onClick={handleExportData}
              disabled={exportLoading || !startDate || !endDate}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? 'A exportar...' : 'Exportar Dados (CSV)'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}