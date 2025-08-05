import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface Notice {
  id: string;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

const ManageNotices = () => {
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (hasRole('admin')) {
      fetchNotices();
    }
  }, [hasRole]);

  const fetchNotices = async () => {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar avisos',
        variant: 'destructive',
      });
    } else {
      setNotices(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingNotice) {
      const { error } = await supabase
        .from('notices')
        .update(formData)
        .eq('id', editingNotice.id);

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao atualizar aviso',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: 'Aviso atualizado com sucesso',
        });
        setEditingNotice(null);
      }
    } else {
      const { error } = await supabase
        .from('notices')
        .insert({
          ...formData,
          created_by: user?.id,
        });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao criar aviso',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: 'Aviso criado com sucesso',
        });
      }
    }

    setFormData({
      title: '',
      content: '',
      start_date: '',
      end_date: '',
      is_active: true,
    });
    fetchNotices();
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      start_date: notice.start_date.split('T')[0],
      end_date: notice.end_date.split('T')[0],
      is_active: notice.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja eliminar este aviso?')) {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao eliminar aviso',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sucesso',
          description: 'Aviso eliminado com sucesso',
        });
        fetchNotices();
      }
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Apenas administradores podem gerir avisos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Gerir Avisos</h1>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">
            {editingNotice ? 'Editar Aviso' : 'Criar Aviso'}
          </TabsTrigger>
          <TabsTrigger value="list">Listar Avisos</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingNotice ? 'Editar Aviso' : 'Criar Novo Aviso'}
              </CardTitle>
              <CardDescription>
                {editingNotice ? 'Atualize as informações do aviso' : 'Preencha os dados para criar um novo aviso'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">Data de Fim</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingNotice ? 'Atualizar' : 'Criar'} Aviso
                  </Button>
                  {editingNotice && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingNotice(null);
                        setFormData({
                          title: '',
                          content: '',
                          start_date: '',
                          end_date: '',
                          is_active: true,
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Avisos Existentes</CardTitle>
              <CardDescription>
                Lista de todos os avisos criados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Carregando...</p>
              ) : notices.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Nenhum aviso encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {notices.map((notice) => (
                    <div key={notice.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">{notice.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notice.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Início: {new Date(notice.start_date).toLocaleDateString('pt-PT')}</span>
                            <span>Fim: {new Date(notice.end_date).toLocaleDateString('pt-PT')}</span>
                            <span className={notice.is_active ? 'text-green-600' : 'text-red-600'}>
                              {notice.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(notice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(notice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageNotices;