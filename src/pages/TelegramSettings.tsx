import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Users, UserPlus, CheckCircle, Settings, X, Send, Wifi } from 'lucide-react';

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
  const [failedChatIds, setFailedChatIds] = useState<Set<string>>(new Set());
  const [lastCheckDone, setLastCheckDone] = useState(false);

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

  const removeChatId = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: null })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Chat ID removido',
        description: `Telegram desconfigurado para ${userName}`
      });
      
      loadProfiles();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const [checkingUserId, setCheckingUserId] = useState<string | null>(null);

  const checkSingleUser = async (chatId: string, userId: string, userName: string) => {
    setCheckingUserId(userId);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: [chatId],
          message: '🔔 Verificação de conectividade individual - A sua ligação ao bot está ativa!'
        }
      });

      if (error) throw error;

      const success = data?.results?.[0]?.success;
      
      const newFailed = new Set(failedChatIds);
      if (success) {
        newFailed.delete(chatId);
        toast({ title: '✅ OK', description: `${userName} está conectado.` });
      } else {
        newFailed.add(chatId);
        toast({ title: '⚠️ Falha', description: `${userName} precisa enviar /start.`, variant: 'destructive' });
      }
      setFailedChatIds(newFailed);
      setLastCheckDone(true);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setCheckingUserId(null);
    }
  };

  const sendTestToUser = async (chatId: string, userName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: [chatId],
          message: '🧪 Teste individual de notificação Telegram'
        }
      });

      if (error) throw error;

      const success = data?.results?.[0]?.success;
      
      if (success) {
        toast({ title: 'Teste enviado!', description: `Mensagem de teste enviada para ${userName}` });
      } else {
        toast({ title: 'Erro no envio', description: `Falha ao enviar mensagem para ${userName}`, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erro ao enviar teste', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
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

  const pingAllUsers = async () => {
    const configuredProfiles = profiles.filter(p => p.telegram_chat_id);

    if (configuredProfiles.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum utilizador com Telegram configurado.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setFailedChatIds(new Set());
    setLastCheckDone(false);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: configuredProfiles.map(p => p.telegram_chat_id),
          message: '🔔 Verificação de conectividade - A sua ligação ao bot está ativa!\n\nSe recebeu esta mensagem, está tudo OK. Não precisa fazer nada.'
        }
      });

      if (error) throw error;

      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      const failedResults = results.filter((r: any) => !r.success);
      
      const newFailedIds = new Set<string>(
        failedResults.map((r: any) => r.chatId as string)
      );
      setFailedChatIds(newFailedIds);
      setLastCheckDone(true);

      const failedUsers = failedResults.map((r: any) => {
        const profile = configuredProfiles.find(p => p.telegram_chat_id === r.chatId);
        return profile ? `${profile.first_name} ${profile.last_name}` : r.chatId;
      });

      if (failedUsers.length > 0) {
        toast({
          title: 'Verificação concluída com falhas',
          description: `${successCount}/${configuredProfiles.length} OK. Falharam: ${failedUsers.join(', ')}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Todos os utilizadores OK!',
          description: `${successCount}/${configuredProfiles.length} mensagens enviadas com sucesso.`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao verificar',
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
          </div>
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
              profiles.map((profile) => {
                const isFailed = lastCheckDone && profile.telegram_chat_id && failedChatIds.has(profile.telegram_chat_id);
                const isOk = lastCheckDone && profile.telegram_chat_id && !failedChatIds.has(profile.telegram_chat_id);
                return (
                <div
                  key={profile.user_id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${isFailed ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {profile.first_name} {profile.last_name}
                      {isFailed && (
                        <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          ⚠️ Precisa /start
                        </span>
                      )}
                      {isOk && (
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          ✅ OK
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile.telegram_chat_id ? `Telegram: ${profile.telegram_chat_id}` : 'Telegram não configurado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {profile.telegram_chat_id ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => checkSingleUser(profile.telegram_chat_id!, profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                          disabled={checkingUserId === profile.user_id}
                          title="Verificar conectividade"
                        >
                          <Wifi className={`h-4 w-4 ${checkingUserId === profile.user_id ? 'animate-pulse' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendTestToUser(profile.telegram_chat_id!, `${profile.first_name} ${profile.last_name}`)}
                          disabled={loading}
                          title="Enviar teste"
                        >
                          <Send className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeChatId(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                          title="Remover configuração"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação e Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 mb-2">
              <strong>⚠️ Utilizadores não recebem notificações?</strong>
            </p>
            <p className="text-sm text-amber-700 mb-3">
              Se um utilizador bloqueou o bot ou não interage há muito tempo, pode deixar de receber mensagens. 
              Use o botão abaixo para verificar quem está com problemas.
            </p>
            <Button 
              onClick={pingAllUsers} 
              disabled={loading || profiles.filter(p => p.telegram_chat_id).length === 0}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Verificando...' : `🔍 Verificar Conectividade (${profiles.filter(p => p.telegram_chat_id).length} utilizadores)`}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="test-message">Mensagem de teste personalizada</Label>
            <Input
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Mensagem para testar as notificações"
            />
            <Button 
              onClick={sendTestMessage} 
              disabled={loading || profiles.filter(p => p.telegram_chat_id).length === 0}
              variant="outline"
            >
              {loading ? 'Enviando...' : `Enviar Teste (${profiles.filter(p => p.telegram_chat_id).length} destinatários)`}
            </Button>
          </div>
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