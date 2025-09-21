import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Users, UserPlus, CheckCircle, Settings } from 'lucide-react';

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  telegram_chat_id: string | null;
}

export default function TelegramSettings() {
  const { hasRole } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [setupFirstName, setSetupFirstName] = useState('');
  const [setupLastName, setSetupLastName] = useState('');
  const [manualChatId, setManualChatId] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [testMessage, setTestMessage] = useState('🧪 Teste de notificação Telegram');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    document.title = 'Configurações Telegram';
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, telegram_chat_id')
      .eq('is_active', true)
      .order('first_name');

    if (error) {
      toast({
        title: 'Erro ao carregar perfis',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      setProfiles(data || []);
    }
  };

  const setupTelegramForUser = async () => {
    if (!setupFirstName.trim() || !setupLastName.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha o primeiro e último nome.',
        variant: 'destructive'
      });
      return;
    }

    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-setup', {
        body: {
          firstName: setupFirstName.trim(),
          lastName: setupLastName.trim()
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Configuração concluída!',
          description: `Telegram configurado para ${setupFirstName} ${setupLastName}`
        });
        setSetupFirstName('');
        setSetupLastName('');
        loadProfiles(); // Reload to show updated data
      } else {
        toast({
          title: 'Usuário não encontrado',
          description: data.instructions || 'Certifique-se de que o usuário enviou uma mensagem para o bot primeiro.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro na configuração',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const setupManualChatId = async () => {
    if (!selectedProfileId || !manualChatId.trim()) {
      toast({
        title: 'Erro',
        description: 'Selecione um utilizador e insira o Chat ID.',
        variant: 'destructive'
      });
      return;
    }

    setManualLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: manualChatId.trim() })
        .eq('user_id', selectedProfileId);

      if (error) throw error;

      toast({
        title: 'Configuração manual concluída!',
        description: 'Chat ID configurado com sucesso.'
      });
      
      setManualChatId('');
      setSelectedProfileId('');
      loadProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro na configuração',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setManualLoading(false);
    }
  };

  const sendTestMessage = async () => {
    const activeChatIds = profiles
      .filter(p => p.telegram_chat_id)
      .map(p => p.telegram_chat_id!);

    if (activeChatIds.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum usuário com Telegram configurado.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: activeChatIds,
          message: testMessage
        }
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      const totalCount = activeChatIds.length;

      toast({
        title: 'Mensagem de teste enviada',
        description: `${successCount}/${totalCount} mensagens enviadas com sucesso.`
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar teste',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupWebhook = async () => {
    setWebhookLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-webhook-setup');

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Webhook configurado!',
          description: 'O webhook do Telegram foi configurado com sucesso.'
        });
      } else {
        toast({
          title: 'Erro na configuração',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao configurar webhook',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setWebhookLoading(false);
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">Apenas administradores podem configurar o Telegram.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageCircle className="h-8 w-8" />
          Configurações Telegram
        </h1>
        <p className="text-muted-foreground">Configure as notificações automáticas para a tripulação</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Configurar Telegram para Utilizador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              <strong>📋 Instruções para obter o Chat ID:</strong>
            </p>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Envie /start para o bot do Telegram</li>
              <li>2. O bot enviará automaticamente o seu Chat ID</li>
              <li>3. Copie o número do Chat ID e cole abaixo</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-select">Selecionar Utilizador</Label>
              <select
                id="profile-select"
                className="w-full p-2 border rounded-md"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                <option value="">Selecione um utilizador...</option>
                {profiles.filter(p => !p.telegram_chat_id).map((profile) => (
                  <option key={profile.user_id} value={profile.user_id}>
                    {profile.first_name} {profile.last_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="manual-chat-id">Chat ID do Telegram</Label>
              <Input
                id="manual-chat-id"
                placeholder="Ex: 123456789"
                value={manualChatId}
                onChange={(e) => setManualChatId(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={setupManualChatId} 
            disabled={manualLoading || !selectedProfileId || !manualChatId.trim()}
            variant="default"
          >
            {manualLoading ? 'Configurando...' : 'Configurar Chat ID Manualmente'}
          </Button>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Configuração automática (Recomendado):</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Os utilizadores podem também ser automaticamente configurados enviando /start para o bot do Telegram.
            </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">Primeiro Nome (configuração manual)</Label>
              <Input
                id="first-name"
                placeholder="João"
                value={setupFirstName}
                onChange={(e) => setSetupFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Último Nome (configuração manual)</Label>
              <Input
                id="last-name"
                placeholder="Silva"
                value={setupLastName}
                onChange={(e) => setSetupLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Instruções para configuração manual:</strong>
            </p>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. O utilizador deve enviar uma mensagem para o bot Telegram primeiro</li>
              <li>2. Digite o nome completo do utilizador aqui</li>
              <li>3. Clique em "Configurar" para associar manualmente (apenas se a configuração automática falhar)</li>
            </ol>
          </div>

          <Button 
            onClick={setupTelegramForUser} 
            disabled={setupLoading || !setupFirstName.trim() || !setupLastName.trim()}
            variant="secondary"
          >
            {setupLoading ? 'Configurando...' : 'Configuração Manual (apenas se necessário)'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utilizadores Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>
            ) : (
              profiles.map((profile) => (
                <div
                  key={profile.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.telegram_chat_id ? 'Telegram configurado' : 'Telegram não configurado'}
                    </p>
                  </div>
                  {profile.telegram_chat_id && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-message">Mensagem de teste</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Mensagem para testar as notificações"
            />
          </div>

          <Button 
            onClick={sendTestMessage} 
            disabled={loading || profiles.filter(p => p.telegram_chat_id).length === 0}
            variant="outline"
          >
            {loading ? 'Enviando...' : `Enviar Teste (${profiles.filter(p => p.telegram_chat_id).length} destinatários)`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração do Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Configuração Automática do Webhook:</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Configure automaticamente o webhook do Telegram para receber mensagens dos utilizadores. 
              Isto permite que o bot detecte automaticamente quando novos utilizadores enviam mensagens.
            </p>
          </div>

          <Button 
            onClick={setupWebhook} 
            disabled={webhookLoading}
            variant="secondary"
          >
            {webhookLoading ? 'Configurando webhook...' : 'Configurar Webhook Telegram'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como configurar o Bot Telegram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>1.</strong> Crie um bot no Telegram usando @BotFather</p>
            <p><strong>2.</strong> Copie o token do bot e configure nas secrets do sistema</p>
            <p><strong>3.</strong> Configure o webhook clicando no botão "Configurar Webhook Telegram"</p>
            <p><strong>4.</strong> Os utilizadores enviam /start para o bot e são automaticamente configurados</p>
            <p><strong>5.</strong> As notificações são enviadas automaticamente para toda a tripulação configurada</p>
            <p className="text-green-600"><strong>✅ Configuração automática ativa!</strong> Os utilizadores só precisam de enviar /start.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}