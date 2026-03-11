import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Load logo from storage
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const { data } = supabase.storage
          .from('assets')
          .getPublicUrl('logo.png');

        if (data?.publicUrl) {
          const response = await fetch(data.publicUrl);
          if (response.ok) {
            setLogoUrl(data.publicUrl);
          }
        }
      } catch (error) {
        console.log('No logo found, using default icon');
      }
    };

    loadLogo();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      try {
        const { data } = await supabase.functions.invoke('handle-failed-login', {
          body: { email }
        });
        
        if (data?.locked) {
          toast({
            title: "Conta bloqueada",
            description: "A sua conta foi bloqueada após várias tentativas falhadas. Contacte um administrador.",
            variant: "destructive",
          });
        } else if (data?.remaining !== undefined && data.remaining > 0) {
          toast({
            title: "Erro no login",
            description: `${error.message}. Tentativas restantes: ${data.remaining}`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          });
        }
      } catch (trackError) {
        console.error('Error tracking failed login:', trackError);
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      try {
        await supabase.rpc('reset_failed_login_attempts', { user_email: email });
      } catch (resetError) {
        console.error('Error resetting failed attempts:', resetError);
      }
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });
      navigate('/');
    }

    setLoading(false);
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      toast({ title: "Erro", description: "Introduza o seu email", variant: "destructive" });
      return;
    }
    setRecoverLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('recover-password', {
        body: { email: recoveryEmail }
      });

      if (error) {
        let msg = 'Erro ao recuperar password';
        try {
          const ctx: any = error;
          if (ctx?.context?.response) {
            const body = await ctx.context.response.json();
            msg = body?.error || msg;
          }
        } catch (_) {}
        toast({ title: "Erro", description: msg, variant: "destructive" });
      } else if (data?.success === false) {
        toast({ title: "Erro", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Sucesso", description: data?.message || "Verifique o seu Telegram." });
        setShowRecovery(false);
        setRecoveryEmail('');
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Erro inesperado", variant: "destructive" });
    }

    setRecoverLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {logoUrl ? (
              <div className="w-32 h-32 sm:w-36 sm:h-36">
                <img src={logoUrl} alt="CV Amares Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary rounded-lg flex items-center justify-center">
                <Car className="h-10 w-10 sm:h-12 sm:w-12 text-primary-foreground" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">Sistema de Saídas</CardTitle>
          <CardDescription>
            {showRecovery 
              ? 'Introduza o seu email para receber uma nova password no Telegram'
              : 'Faça login para aceder ao sistema de registo de saídas de viaturas'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showRecovery ? (
            <form onSubmit={handleRecoverPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="O seu email registado"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={recoverLoading}>
                {recoverLoading ? 'A enviar...' : 'Enviar password por Telegram'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => { setShowRecovery(false); setRecoveryEmail(''); }}
              >
                Voltar ao login
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Palavra-passe</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'A entrar...' : 'Entrar'}
                </Button>
              </form>
              <div className="mt-3 text-center">
                <Button 
                  variant="link" 
                  className="text-sm text-muted-foreground"
                  onClick={() => setShowRecovery(true)}
                >
                  Esqueci a minha password
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
