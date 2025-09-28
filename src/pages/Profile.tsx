import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const PasswordChangeForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Erro",
        description: "As novas palavras-passe não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova palavra-passe deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: passwords.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Erro",
          description: "Palavra-passe atual incorreta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Palavra-passe alterada com sucesso!",
        });
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar palavra-passe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Palavra-passe Atual</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          value={passwords.currentPassword}
          onChange={handlePasswordChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova Palavra-passe</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          value={passwords.newPassword}
          onChange={handlePasswordChange}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Nova Palavra-passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={passwords.confirmPassword}
          onChange={handlePasswordChange}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'A alterar...' : 'Alterar Palavra-passe'}
      </Button>
    </form>
  );
};
interface ProfileRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  telegram_chat_id: string | null;
}
const Profile = () => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    employee_number: '',
    email: '',
    telegram_chat_id: ''
  });
  useEffect(() => {
    // SEO basics
    document.title = 'Editar Perfil - CV Amares';
    const desc = 'Editar perfil do utilizador - CV Amares';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', desc);
  }, []);
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, user_id, first_name, last_name, employee_number, telegram_chat_id').eq('user_id', user.id).maybeSingle();
      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o perfil.',
          variant: 'destructive'
        });
      } else if (data) {
        setProfileId(data.id);
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          employee_number: data.employee_number ?? '',
          email: user?.email ?? '',
          telegram_chat_id: data.telegram_chat_id ?? ''
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, [user, toast]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      name,
      value
    } = e.target;
    setForm(f => ({
      ...f,
      [name]: value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // Atualizar perfil
    const profileUpdate = await supabase.from('profiles').update({
      telegram_chat_id: form.telegram_chat_id || null
    }).eq('user_id', user.id);

    // Atualizar email no auth
    const emailUpdate = await supabase.auth.updateUser({
      email: form.email
    });
    const error = profileUpdate.error || emailUpdate.error;
    setSaving(false);
    if (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar o perfil.',
        variant: 'destructive'
      });
      return;
    }
    toast({
      title: 'Sucesso',
      description: 'Perfil atualizado com sucesso.'
    });
  };
  return <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <header>
          <h1 className="text-2xl font-semibold">Editar Perfil</h1>
        </header>
      </div>
      <main>
        <section aria-labelledby="profile-section">
          <Card>
            <CardHeader>
              <CardTitle>Os seus dados</CardTitle>
              <CardDescription>Atualize o seu nome e número de colaborador.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <p>A carregar…</p> : <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                     <div className="space-y-2">
                       <Label htmlFor="first_name">Primeiro Nome</Label>
                       <Input id="first_name" name="first_name" value={form.first_name} disabled className="bg-muted" />
                       <p className="text-xs text-muted-foreground">Apenas editável por administradores</p>
                     </div>
                     <div className="space-y-2">
                       <Label htmlFor="last_name">Último Nome</Label>
                       <Input id="last_name" name="last_name" value={form.last_name} disabled className="bg-muted" />
                       <p className="text-xs text-muted-foreground">Apenas editável por administradores</p>
                     </div>
                   </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_number">Número de Colaborador</Label>
                    <Input id="employee_number" name="employee_number" value={form.employee_number} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground">Apenas editável por administradores</p>
                  </div>
                   <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
                   </div>
                   
                   <div className="border-t pt-4 space-y-4">
                     <h3 className="text-lg font-medium">Alterar Palavra-passe</h3>
                     <PasswordChangeForm />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
                     <Input id="telegram_chat_id" name="telegram_chat_id" value={form.telegram_chat_id} onChange={handleChange} placeholder="Digite o seu Chat ID do Telegram" />
                     <p className="text-xs text-muted-foreground">Para obter o Chat ID, enviar /start para @saidascva_bot no Telegram e cola aqui</p>
                   </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>{saving ? 'A guardar…' : 'Guardar Alterações'}</Button>
                  </div>
                </form>}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>;
};
export default Profile;