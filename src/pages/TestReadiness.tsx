import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { FlaskConical, Send } from 'lucide-react';

interface UserRow {
  user_id: string;
  first_name: string;
  last_name: string;
  function_role: string | null;
  telegram_chat_id: string | null;
}

const TestReadiness = () => {
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [alertType, setAlertType] = useState<'condutores' | 'socorristas'>('condutores');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !hasRole('admin')) {
      navigate('/home');
    }
  }, [roleLoading, hasRole, navigate]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, function_role, telegram_chat_id')
        .eq('is_active', true)
        .order('first_name');
      if (!error && data) setUsers(data as UserRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const selectAllVisible = () => {
    setSelectedIds(new Set(filtered.map(u => u.user_id)));
  };
  const clearAll = () => setSelectedIds(new Set());

  const send = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Nenhum utilizador selecionado', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();
      const requesterName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin'
        : 'Admin';

      const { error } = await supabase.functions.invoke('emergency-alert', {
        body: {
          alertType,
          requesterName,
          requesterUserId: user?.id,
          isTest: true,
          testUserIds: Array.from(selectedIds),
        },
      });
      if (error) throw error;
      toast({
        title: 'Teste enviado',
        description: `Notificação de teste enviada a ${selectedIds.size} utilizador(es).`,
      });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6">A carregar...</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Teste de Prontidão</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração do teste</CardTitle>
          <CardDescription>
            Envia um alerta de <strong>teste</strong> (marcado como 🧪 TESTE) apenas
            aos utilizadores selecionados. Não aparece como alerta ativo nos painéis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Tipo de alerta</Label>
            <RadioGroup
              value={alertType}
              onValueChange={(v) => setAlertType(v as 'condutores' | 'socorristas')}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="condutores" id="rt-cond" />
                <Label htmlFor="rt-cond">Condutores</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="socorristas" id="rt-soc" />
                <Label htmlFor="rt-soc">Socorristas</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm">Pesquisar utilizador</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome..."
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
              Selecionar visíveis
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearAll}>
              Limpar seleção
            </Button>
            <span className="text-sm text-muted-foreground self-center ml-auto">
              {selectedIds.size} selecionado(s)
            </span>
          </div>

          <div className="border rounded-md max-h-80 overflow-y-auto divide-y">
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Sem resultados.</div>
            )}
            {filtered.map(u => {
              const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilizador';
              const hasTelegram = !!u.telegram_chat_id;
              return (
                <label
                  key={u.user_id}
                  className="flex items-center gap-3 p-2 hover:bg-accent/40 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.has(u.user_id)}
                    onCheckedChange={() => toggle(u.user_id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.function_role || 'Sem função'} ·{' '}
                      {hasTelegram ? (
                        <span className="text-green-600">Telegram OK</span>
                      ) : (
                        <span className="text-red-600">Sem Telegram</span>
                      )}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          <Button
            onClick={send}
            disabled={sending || selectedIds.size === 0}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'A enviar...' : `Enviar teste a ${selectedIds.size} utilizador(es)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestReadiness;
