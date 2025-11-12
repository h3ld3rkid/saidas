import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Edit2, UserX, Key, Mail, User, Shield, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  function_role: string | null;
  is_active: boolean;
  created_at: string;
  email: string;
  access_role?: 'user' | 'mod' | 'admin';
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'mod' | 'admin';
}

const ManageUsers = () => {
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{ open: boolean; password: string; title: string; description: string }>({
    open: false,
    password: '',
    title: '',
    description: ''
  });
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    employee_number: '',
    function_role: '',
    role: 'user' as 'user' | 'mod' | 'admin',
  });

  useEffect(() => {
    if (hasRole('admin')) {
      fetchUsers();
    }
  }, [hasRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const profilesResult = await supabase.rpc('get_all_users_details');

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      // Mapear os dados para corresponder ao tipo Profile esperado
      const mappedProfiles = (profilesResult.data || []).map((item: any) => ({
        id: item.profile_id,
        user_id: item.user_id,
        email: item.email,
        first_name: item.first_name,
        last_name: item.last_name,
        employee_number: item.employee_number,
        function_role: item.function_role,
        is_active: item.is_active,
        created_at: item.created_at,
        access_role: item.access_role,
      }));
      
      // Ordenar alfabeticamente por nome e apelido
      mappedProfiles.sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setProfiles(mappedProfiles);
      setUserRoles([]);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar utilizadores: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      employee_number: '',
      function_role: '',
      role: 'user',
    });
    setEditingUser(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.employee_number || !formData.function_role) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          userData: formData
        }
      });

      if (error) {
        console.error('Create user error:', error);
        // Try to extract detailed error from edge function response
        let description = 'Erro ao criar utilizador';
        try {
          const ctx: any = error as any;
          if (ctx?.context?.response) {
            const body = await ctx.context.response.json();
            description = body?.error || description;
          } else if (error.message) {
            description = error.message;
          }
        } catch (_) {}
        
        throw new Error(description);
      }

      if (data?.success) {
        if (data.tempPassword) {
          setTempPasswordDialog({
            open: true,
            password: data.tempPassword,
            title: 'Utilizador Criado com Sucesso',
            description: 'Guarde a senha temporária abaixo. O utilizador deve alterá-la no primeiro login.'
          });
        } else {
          toast({
            title: 'Sucesso',
            description: 'Utilizador criado com sucesso',
          });
        }
        resetForm();
        fetchUsers();
        setActiveTab('list');
      } else {
        toast({
          title: 'Erro',
          description: data?.error || 'Erro ao criar utilizador',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Create user catch error:', error);
      toast({
        title: 'Erro',
        description: 'Erro inesperado: ' + (error?.message || 'Desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser || !formData.first_name || !formData.last_name || !formData.employee_number || !formData.function_role || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: 'Email inválido', description: 'Introduza um email válido.', variant: 'destructive' });
      return;
    }

    try {
      // 1) Update email in auth if changed
      if (formData.email !== editingUser.email) {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'update-email',
            userId: editingUser.user_id,
            newEmail: formData.email,
          },
        });
        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || 'Falha ao atualizar email');
        }
      }

      // 2) Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
        last_name: formData.last_name,
        employee_number: formData.employee_number,
        function_role: formData.function_role,
        role: formData.role,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // 3) Update role se mudou - agora está na tabela profiles
      // O role já foi atualizado na operação anterior (update do profile)

      toast({ title: 'Sucesso', description: 'Utilizador atualizado com sucesso' });
      resetForm();
      fetchUsers();
      setActiveTab('list');
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao atualizar utilizador: ' + error.message, variant: 'destructive' });
    }
  };

  const handleEditUser = (profile: Profile) => {
    setEditingUser(profile);
    setFormData({
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      employee_number: profile.employee_number,
      function_role: profile.function_role || '',
      role: getUserRole(profile.user_id),
    });
    setActiveTab('create');
  };

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Utilizador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar estado do utilizador: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (userId: string, employeeNumber: string, email?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset-password',
          userId: userId,
          email,
        }
      });

      if (error) {
        // Try to extract detailed error from edge function response
        let description = 'Erro ao redefinir password';
        try {
          const ctx: any = error as any;
          if (ctx?.context?.response) {
            const body = await ctx.context.response.json();
            description = body?.error || description;
          } else if (error.message) {
            description = error.message;
          }
        } catch (_) {}

        throw new Error(description);
      }

      if (data.success) {
        setTempPasswordDialog({
          open: true,
          password: data.newPassword,
          title: 'Password Reposta com Sucesso',
          description: `Nova senha temporária para o utilizador nº ${employeeNumber}. Deve ser alterada no primeiro login.`
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao redefinir password',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao redefinir password: ' + (error?.message || 'Desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const handleResetToDefaultPassword = async (userId: string, employeeNumber: string, email?: string) => {
    const defaultPassword = 'CVA2025!';
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset-password',
          userId: userId,
          email,
          defaultPassword: defaultPassword,
        }
      });

      if (error) {
        let description = 'Erro ao redefinir password';
        try {
          const ctx: any = error as any;
          if (ctx?.context?.response) {
            const body = await ctx.context.response.json();
            description = body?.error || description;
          } else if (error.message) {
            description = error.message;
          }
        } catch (_) {}

        throw new Error(description);
      }

      if (data.success) {
        setTempPasswordDialog({
          open: true,
          password: defaultPassword,
          title: 'Password Reposta para Padrão',
          description: `Password padrão definida para o utilizador nº ${employeeNumber}. Deve ser alterada no primeiro login.`
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao redefinir password',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao redefinir password: ' + (error?.message || 'Desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem a certeza que pretende eliminar definitivamente o utilizador "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete-user',
          userId: userId
        }
      });

      if (error) {
        let description = 'Erro ao eliminar utilizador';
        try {
          const ctx: any = error as any;
          if (ctx?.context?.response) {
            const body = await ctx.context.response.json();
            description = body?.error || description;
          } else if (error.message) {
            description = error.message;
          }
        } catch (_) {}
        throw new Error(description);
      }

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `Utilizador "${userName}" eliminado com sucesso`,
        });
        fetchUsers();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao eliminar utilizador',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado ao eliminar utilizador: ' + (error?.message || 'Desconhecido'),
        variant: 'destructive',
      });
    }
  };

  const getUserRole = (userId: string) => {
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.access_role || 'user';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'mod': return 'Moderador';
      default: return 'Utilizador';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    // Normalizar o role (remover acentos, converter para minúsculas, remover espaços)
    const normalizedRole = role
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    
    if (normalizedRole === 'admin' || normalizedRole === 'administrador') {
      return 'destructive' as const;
    }
    if (normalizedRole === 'mod' || normalizedRole === 'moderador') {
      return 'success' as const;
    }
    return 'outline' as const;
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(tempPasswordDialog.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast({
        title: 'Copiado',
        description: 'Senha copiada para a área de transferência',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao copiar senha',
        variant: 'destructive',
      });
    }
  };

  if (!hasRole('admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Apenas administradores podem gerir utilizadores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={tempPasswordDialog.open} onOpenChange={(open) => {
        setTempPasswordDialog({ ...tempPasswordDialog, open });
        if (!open) setCopiedPassword(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tempPasswordDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {tempPasswordDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <code className="text-lg font-mono font-semibold flex-1">
                {tempPasswordDialog.password}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCopyPassword}
                className="shrink-0"
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setTempPasswordDialog({ ...tempPasswordDialog, open: false });
              setCopiedPassword(false);
            }}>
              Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 md:h-6 md:w-6" />
          <h1 className="text-2xl md:text-3xl font-bold">Gestão de Utilizadores</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
            className="flex-1 sm:flex-initial"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{editingUser ? 'Editar' : 'Criar'}</span>
          </Button>
          <Button 
            variant={activeTab === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveTab('list')}
            className="flex-1 sm:flex-initial"
          >
            <Users className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Listar</span>
          </Button>
        </div>
      </div>

      {activeTab === 'create' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingUser ? 'Editar Utilizador' : 'Criar Novo Utilizador'}
            </CardTitle>
            <CardDescription>
              {editingUser ? 'Atualize as informações do utilizador' : 'Preencha todos os campos para criar um novo utilizador'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-6">
              <div>
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Nome</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Nome"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Apelido</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Apelido"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employee_number">Número Mecanográfico</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="12345"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="function_role">Função</Label>
                  <Select value={formData.function_role} onValueChange={(value) => setFormData({ ...formData, function_role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Condutor">Condutor</SelectItem>
                      <SelectItem value="Socorrista">Socorrista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Nível de Acesso
                </Label>
                <Select value={formData.role} onValueChange={(value: 'user' | 'mod' | 'admin') => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilizador</SelectItem>
                    <SelectItem value="mod">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingUser ? 'Atualizar Utilizador' : 'Criar Utilizador'}
                </Button>
                {editingUser && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'list' && (
        <Card>
          <CardHeader>
            <CardTitle>Utilizadores Registados ({profiles.length})</CardTitle>
            <CardDescription>
              Lista de todos os utilizadores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Carregando...</span>
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div key={profile.id} className="border rounded-lg p-3 md:p-4">
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-base md:text-lg">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <Badge variant={getRoleBadgeVariant(getUserRole(profile.user_id))} className="text-xs">
                            {getRoleLabel(getUserRole(profile.user_id))}
                          </Badge>
                          <Badge variant={profile.is_active ? 'default' : 'secondary'} className="text-xs">
                            {profile.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="truncate"><strong>Email:</strong> {profile.email}</p>
                          <p><strong>Nº:</strong> {profile.employee_number}</p>
                          {profile.function_role && (
                            <p><strong>Função:</strong> {profile.function_role}</p>
                          )}
                          <p className="hidden md:block"><strong>Criado:</strong> {new Date(profile.created_at).toLocaleDateString('pt-PT')}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditUser(profile)}
                          className="h-8 w-8"
                          title="Editar"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant={profile.is_active ? "destructive" : "default"}
                          onClick={() => handleToggleActive(profile.id, profile.is_active)}
                          className="h-8 w-8"
                          title={profile.is_active ? "Desativar" : "Ativar"}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handleResetToDefaultPassword(profile.user_id, profile.employee_number, profile.email)}
                          className="h-8 w-8"
                          title="Repor Password Padrão (CVA2025!)"
                        >
                          <KeyRound className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => handleResetPassword(profile.user_id, profile.employee_number, profile.email)}
                          className="h-8 w-8"
                          title="Gerar Password Temporária"
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDeleteUser(profile.user_id, `${profile.first_name} ${profile.last_name}`)}
                          className="h-8 w-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
};

export default ManageUsers;