import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Image, Download, Calendar, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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