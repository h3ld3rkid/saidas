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
import { Users, Plus, Edit2, UserX, Key, Mail, User, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

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
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.rpc('get_users_with_email'),
        supabase.from('user_roles').select('*')
      ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }
      
      if (rolesResult.error) {
        throw rolesResult.error;
      }

      setProfiles(profilesResult.data || []);
      setUserRoles(rolesResult.data || []);
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

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: data.tempPassword 
            ? `Utilizador criado! Senha temporária: ${data.tempPassword}` 
            : 'Utilizador criado com sucesso',
        });
        resetForm();
        fetchUsers();
        setActiveTab('list');
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao criar utilizador',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro inesperado: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser || !formData.first_name || !formData.last_name || !formData.employee_number || !formData.function_role) {
      toast({
        title: 'Erro',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          employee_number: formData.employee_number,
          function_role: formData.function_role,
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = getUserRole(editingUser.user_id);
      if (formData.role !== currentRole) {
        // Remove old role and add new one
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingUser.user_id);

        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: editingUser.user_id, role: formData.role });

        if (roleError) throw roleError;
      }

      toast({
        title: 'Sucesso',
        description: 'Utilizador atualizado com sucesso',
      });
      
      resetForm();
      fetchUsers();
      setActiveTab('list');
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar utilizador: ' + error.message,
        variant: 'destructive',
      });
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

  const handleResetPassword = async (userId: string, employeeNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset-password',
          userId: userId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `Password do utilizador nº ${employeeNumber} redefinida para: ${data.newPassword}`,
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
        description: 'Erro inesperado ao redefinir password: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(role => role.user_id === userId);
    return userRole?.role || 'user';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'mod': return 'Moderador';
      default: return 'Utilizador';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'mod': return 'secondary' as const;
      default: return 'outline' as const;
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Gestão de Utilizadores</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
          >
            <Plus className="h-4 w-4 mr-2" />
            {editingUser ? 'Editar' : 'Criar'}
          </Button>
          <Button 
            variant={activeTab === 'list' ? 'default' : 'outline'}
            onClick={() => setActiveTab('list')}
          >
            <Users className="h-4 w-4 mr-2" />
            Listar
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
              {!editingUser && (
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
              )}

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
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div key={profile.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <Badge variant={getRoleBadgeVariant(getUserRole(profile.user_id))}>
                            {getRoleLabel(getUserRole(profile.user_id))}
                          </Badge>
                          <Badge variant={profile.is_active ? 'default' : 'secondary'}>
                            {profile.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p><strong>Email:</strong> {profile.email}</p>
                          <p><strong>Nº Mecanográfico:</strong> {profile.employee_number}</p>
                          {profile.function_role && (
                            <p><strong>Função:</strong> {profile.function_role}</p>
                          )}
                          <p><strong>Criado em:</strong> {new Date(profile.created_at).toLocaleDateString('pt-PT')}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditUser(profile)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={profile.is_active ? "destructive" : "default"}
                          onClick={() => handleToggleActive(profile.id, profile.is_active)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleResetPassword(profile.user_id, profile.employee_number)}
                        >
                          <Key className="h-4 w-4" />
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
  );
};

export default ManageUsers;