import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { MessageCircle, Users } from 'lucide-react';

export default function TelegramSettings() {
  const { hasRole } = useUserRole();
  const [chatIds, setChatIds] = useState('');
  const [testMessage, setTestMessage] = useState('🧪 Teste de notificação Telegram');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Configurações Telegram';
    // Load existing chat IDs from localStorage for now
    const saved = localStorage.getItem('telegram_chat_ids');
    if (saved) {
      setChatIds(saved);
    }
  }, []);

  const saveChatIds = () => {
    localStorage.setItem('telegram_chat_ids', chatIds);
    toast({
      title: 'Chat IDs guardados',
      description: 'As configurações foram guardadas localmente.'
    });
  };

  const sendTestMessage = async () => {
    if (!chatIds.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, adicione pelo menos um Chat ID.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const chatIdList = chatIds.split('\n').map(id => id.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('telegram-notify', {
        body: {
          chatIds: chatIdList,
          message: testMessage
        }
      });

      if (error) throw error;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      const totalCount = chatIdList.length;

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
            <Users className="h-5 w-5" />
            Chat IDs da Tripulação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chat-ids">
              Chat IDs (um por linha)
            </Label>
            <Textarea
              id="chat-ids"
              placeholder="123456789&#10;987654321&#10;..."
              value={chatIds}
              onChange={(e) => setChatIds(e.target.value)}
              rows={5}
            />
            <p className="text-sm text-muted-foreground">
              Para obter o Chat ID: 
              <br />1. Adicione o bot @userinfobot ao Telegram
              <br />2. Envie /start para o bot
              <br />3. O bot irá responder com o seu Chat ID
              <br />4. Cole os Chat IDs aqui, um por linha
            </p>
          </div>

          <Button onClick={saveChatIds}>
            Guardar Chat IDs
          </Button>
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
            disabled={loading || !chatIds.trim()}
            variant="outline"
          >
            {loading ? 'Enviando...' : 'Enviar Teste'}
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
            <p><strong>2.</strong> Copie o token do bot</p>
            <p><strong>3.</strong> O token já foi configurado nas configurações do sistema</p>
            <p><strong>4.</strong> Adicione o bot aos grupos ou conversas onde quer receber notificações</p>
            <p><strong>5.</strong> Use @userinfobot para obter os Chat IDs necessários</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}