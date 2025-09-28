import { useState } from 'react';
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
  const { signIn } = useAuth();
  const navigate = useNavigate();

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
            <Car className="h-12 w-12 text-primary" />
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

          <div className="mt-4 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={async () => {
                try {
                  setLoading(true);
                  const { data, error } = await supabase.functions.invoke('manage-users', {
                    body: { action: 'reset-password', email: 'admin@cvamares.pt' }
                  });
                  if (error || !data?.success) {
                    throw new Error(data?.error || error?.message || 'Falha ao repor password');
                  }
                  toast({ title: 'Password reposta', description: 'Use a password: Admin123!' });
                  setEmail('admin@cvamares.pt');
                  setPassword('Admin123!');
                } catch (e: any) {
                  toast({ title: 'Erro', description: e.message, variant: 'destructive' });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Repor password admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;