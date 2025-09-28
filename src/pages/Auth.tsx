import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
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
              <div className="w-24 h-24">
                <img src={logoUrl} alt="CV Amares Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Car className="h-8 w-8 text-primary-foreground" />
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
              <Input
                id="password"
                type="password"
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