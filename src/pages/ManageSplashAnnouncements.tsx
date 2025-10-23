import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SplashAnnouncement {
  id: string;
  title: string;
  message: string;
  target_roles: string[];
  is_active: boolean;
  created_at: string;
}

const ManageSplashAnnouncements = () => {
  const { user } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<SplashAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_roles: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (roleLoading) return;
    
    if (!hasRole('admin')) {
      navigate('/home');
      return;
    }
    fetchAnnouncements();
  }, [hasRole, navigate, roleLoading]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('splash_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar avisos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (formData.target_roles.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um grupo de destinatários',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('splash_announcements')
          .update({
            title: formData.title,
            message: formData.message,
            target_roles: formData.target_roles,
            is_active: formData.is_active,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({
          title: 'Aviso atualizado',
          description: 'O aviso foi atualizado com sucesso',
        });
      } else {
        const { error } = await supabase
          .from('splash_announcements')
          .insert({
            title: formData.title,
            message: formData.message,
            target_roles: formData.target_roles,
            is_active: formData.is_active,
            created_by: user?.id,
          });

        if (error) throw error;
        toast({
          title: 'Aviso criado',
          description: 'O aviso foi criado com sucesso',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (announcement: SplashAnnouncement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      target_roles: announcement.target_roles,
      is_active: announcement.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('splash_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Aviso eliminado',
        description: 'O aviso foi eliminado com sucesso',
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Erro ao eliminar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('splash_announcements')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: 'Estado atualizado',
        description: `Aviso ${!currentState ? 'ativado' : 'desativado'}`,
      });
      fetchAnnouncements();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      target_roles: [],
      is_active: true,
    });
    setEditingId(null);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administradores';
      case 'mod': return 'Moderadores';
      case 'user': return 'Utilizadores';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Avisos de Entrada (Splashscreen)</h1>
          <p className="text-sm text-muted-foreground">
            Gerir avisos importantes que aparecem no login
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Aviso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Aviso' : 'Novo Aviso'}
              </DialogTitle>
              <DialogDescription>
                Crie um aviso importante que será exibido no login
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do aviso"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Mensagem do aviso"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Destinatários *</Label>
                <div className="space-y-2">
                  {['admin', 'mod', 'user'].map(role => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={formData.target_roles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label htmlFor={role} className="cursor-pointer">
                        {getRoleLabel(role)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum aviso criado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map(announcement => (
            <Card key={announcement.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {announcement.message}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {announcement.target_roles.map(role => (
                        <span
                          key={role}
                          className="text-xs px-2 py-1 rounded-full bg-muted"
                        >
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(announcement.id, announcement.is_active)}
                      title={announcement.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {announcement.is_active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Aviso</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem a certeza que pretende eliminar este aviso? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageSplashAnnouncements;
