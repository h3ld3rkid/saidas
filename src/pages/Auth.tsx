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
          // Check if file actually exists by trying to fetch it
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
      // Track failed login attempt
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
      // Reset failed attempts on successful login
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
            Faça login para aceder ao sistema de registo de saídas de viaturas
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;