import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Image, Download, Calendar, Link, Hash, FileSpreadsheet } from 'lucide-react';
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
  const [ruasCsvUrl, setRuasCsvUrl] = useState<string>('');
  const [ruasCsvLoading, setRuasCsvLoading] = useState(false);
  const [distritosCsvUrl, setDistritosCsvUrl] = useState<string>('');
  const [distritosCsvLoading, setDistritosCsvLoading] = useState(false);
  const [concelhosCsvUrl, setConcelhosCsvUrl] = useState<string>('');
  const [concelhosCsvLoading, setConcelhosCsvLoading] = useState(false);
  const [freguesiasCsvUrl, setFreguesiasCsvUrl] = useState<string>('');
  const [freguesiasCsvLoading, setFreguesiasCsvLoading] = useState(false);
  
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
    loadRuasCsvUrl();
    loadAddressCsvUrls();
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

  const loadRuasCsvUrl = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'ruas_csv_url')
        .single();
      
      if (data?.value) {
        setRuasCsvUrl(data.value);
      }
    } catch (error) {
      console.log('No ruas CSV URL found yet');
    }
  };

  const loadAddressCsvUrls = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['distritos_csv_url', 'concelhos_csv_url', 'freguesias_csv_url']);
      
      data?.forEach(setting => {
        if (setting.key === 'distritos_csv_url') setDistritosCsvUrl(setting.value || '');
        if (setting.key === 'concelhos_csv_url') setConcelhosCsvUrl(setting.value || '');
        if (setting.key === 'freguesias_csv_url') setFreguesiasCsvUrl(setting.value || '');
      });
    } catch (error) {
      console.log('No address CSV URLs found yet');
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

  const handleSaveRuasCsvUrl = async () => {
    setRuasCsvLoading(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'ruas_csv_url')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: ruasCsvUrl })
          .eq('key', 'ruas_csv_url');

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'ruas_csv_url', value: ruasCsvUrl });

        if (error) throw error;
      }

      toast({
        title: 'URL guardado',
        description: 'O link do CSV das ruas foi atualizado com sucesso.'
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setRuasCsvLoading(false);
    }
  };

  const handleSaveAddressCsvUrl = async (key: string, value: string, setLoading: (v: boolean) => void, label: string) => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('key', key);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key, value });

        if (error) throw error;
      }

      toast({
        title: 'URL guardado',
        description: `O link do CSV de ${label} foi atualizado com sucesso.`
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportDistritosConcelhos = async () => {
    try {
      const { data: distritos } = await supabase.from('distritos').select('id, nome').order('nome');
      const { data: concelhos } = await supabase.from('concelhos').select('id, nome, distrito_id').order('nome');
      const { data: freguesias } = await supabase.from('freguesias').select('id, nome, concelho_id').order('nome');

      // Export distritos
      let distritosCsv = 'id,nome\n';
      distritos?.forEach(d => {
        distritosCsv += `${d.id},"${d.nome}"\n`;
      });

      // Export concelhos
      let concelhosCsv = 'id,nome,distrito_id\n';
      concelhos?.forEach(c => {
        concelhosCsv += `${c.id},"${c.nome}",${c.distrito_id}\n`;
      });

      // Export freguesias
      let freguesiasCsv = 'id,nome,concelho_id\n';
      freguesias?.forEach(f => {
        freguesiasCsv += `${f.id},"${f.nome}",${f.concelho_id}\n`;
      });

      // Download all three files
      const downloadCsv = (content: string, filename: string) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      downloadCsv(distritosCsv, 'distritos.csv');
      setTimeout(() => downloadCsv(concelhosCsv, 'concelhos.csv'), 300);
      setTimeout(() => downloadCsv(freguesiasCsv, 'freguesias.csv'), 600);

      toast({
        title: 'Ficheiros exportados',
        description: '3 ficheiros CSV foram descarregados (distritos, concelhos, freguesias).'
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleExportFreguesias = async () => {
    try {
      // Fetch all freguesias with their concelho and distrito names
      const { data: freguesias, error } = await supabase
        .from('freguesias')
        .select(`
          id,
          nome,
          concelhos:concelho_id (
            nome,
            distritos:distrito_id (
              nome
            )
          )
        `)
        .order('nome');

      if (error) throw error;

      // Create CSV content
      let csv = 'freguesia_id,freguesia_nome,concelho_nome,distrito_nome\n';
      
      freguesias?.forEach((f: any) => {
        const freguesiaNome = f.nome || '';
        const concelhoNome = f.concelhos?.nome || '';
        const distritoNome = f.concelhos?.distritos?.nome || '';
        csv += `${f.id},"${freguesiaNome}","${concelhoNome}","${distritoNome}"\n`;
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'freguesias_ids.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Ficheiro exportado',
        description: 'O ficheiro com os IDs das freguesias foi descarregado.'
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleExportRuas = async () => {
    try {
      // Fetch all streets with their freguesia info
      const { data: ruas, error } = await supabase
        .from('ruas')
        .select(`
          id,
          nome,
          freguesia_id,
          freguesias:freguesia_id (
            nome,
            concelhos:concelho_id (
              nome,
              distritos:distrito_id (
                nome
              )
            )
          )
        `)
        .order('nome');

      if (error) throw error;

      // Create CSV content in the format needed
      let csv = 'freguesia_id,nome\n';
      
      ruas?.forEach((r: any) => {
        csv += `${r.freguesia_id},"${r.nome || ''}"\n`;
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'ruas_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Template exportado',
        description: 'O template das ruas com IDs foi descarregado.'
      });

    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message,
        variant: 'destructive'
      });
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
              <Link className="h-5 w-5" />
              CSV das Ruas (Google Drive)
            </CardTitle>
            <CardDescription>
              Configure o link do Google Drive para o ficheiro CSV das ruas. O CSV será usado no registo de saídas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <Label className="text-sm font-semibold">Ferramentas de Exportação</Label>
                <p className="text-sm text-muted-foreground">
                  Exporte os IDs das freguesias ou o template das ruas para criar o seu CSV personalizado.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportFreguesias}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar IDs Freguesias
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportRuas}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Template Ruas
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruas-csv-url">URL do CSV no Google Drive</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ruas-csv-url"
                      type="url"
                      placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                      value={ruasCsvUrl}
                      onChange={(e) => setRuasCsvUrl(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveRuasCsvUrl}
                    disabled={ruasCsvLoading}
                  >
                    {ruasCsvLoading ? 'A guardar...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  O CSV deve ter as colunas: freguesia_id, nome (nome da rua). Use os botões acima para obter os IDs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Distritos, Concelhos e Freguesias (GitHub CSV)
            </CardTitle>
            <CardDescription>
              Configure os links dos CSVs para gerir distritos, concelhos e freguesias. Edite diretamente no GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <Label className="text-sm font-semibold">Exportar Dados Actuais</Label>
              <p className="text-sm text-muted-foreground">
                Exporte os dados actuais para criar os seus CSVs no GitHub.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDistritosConcelhos}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Distritos, Concelhos e Freguesias
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="distritos-csv-url">URL do CSV de Distritos</Label>
                <div className="flex gap-2">
                  <Input
                    id="distritos-csv-url"
                    type="url"
                    placeholder="https://raw.githubusercontent.com/.../distritos.csv"
                    value={distritosCsvUrl}
                    onChange={(e) => setDistritosCsvUrl(e.target.value)}
                  />
                  <Button 
                    onClick={() => handleSaveAddressCsvUrl('distritos_csv_url', distritosCsvUrl, setDistritosCsvLoading, 'distritos')}
                    disabled={distritosCsvLoading}
                  >
                    {distritosCsvLoading ? '...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Colunas: id, nome</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="concelhos-csv-url">URL do CSV de Concelhos</Label>
                <div className="flex gap-2">
                  <Input
                    id="concelhos-csv-url"
                    type="url"
                    placeholder="https://raw.githubusercontent.com/.../concelhos.csv"
                    value={concelhosCsvUrl}
                    onChange={(e) => setConcelhosCsvUrl(e.target.value)}
                  />
                  <Button 
                    onClick={() => handleSaveAddressCsvUrl('concelhos_csv_url', concelhosCsvUrl, setConcelhosCsvLoading, 'concelhos')}
                    disabled={concelhosCsvLoading}
                  >
                    {concelhosCsvLoading ? '...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Colunas: id, nome, distrito_id</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="freguesias-csv-url">URL do CSV de Freguesias</Label>
                <div className="flex gap-2">
                  <Input
                    id="freguesias-csv-url"
                    type="url"
                    placeholder="https://raw.githubusercontent.com/.../freguesias.csv"
                    value={freguesiasCsvUrl}
                    onChange={(e) => setFreguesiasCsvUrl(e.target.value)}
                  />
                  <Button 
                    onClick={() => handleSaveAddressCsvUrl('freguesias_csv_url', freguesiasCsvUrl, setFreguesiasCsvLoading, 'freguesias')}
                    disabled={freguesiasCsvLoading}
                  >
                    {freguesiasCsvLoading ? '...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Colunas: id, nome, concelho_id</p>
              </div>
            </div>
          </CardContent>
        </Card>

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