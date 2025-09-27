import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Edit, UserX, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('*')
    ]);

    if (profilesResult.error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar utilizadores',
        variant: 'destructive',
      });
    } else {
      setProfiles(profilesResult.data || []);
    }

    if (rolesResult.error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar roles dos utilizadores',
        variant: 'destructive',
      });
    } else {
      setUserRoles(rolesResult.data || []);
    }

    setLoading(false);
  };

const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.function_role) {
    toast({ title: 'Erro', description: 'Selecione a função do utilizador', variant: 'destructive' });
    return;
  }

  try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          userData: {
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            employee_number: formData.employee_number,
            function_role: formData.function_role,
            role: formData.role,
          }
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

        setFormData({
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          employee_number: '',
          function_role: '',
          role: 'user',
        });

        fetchUsers();
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProfile) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          employee_number: formData.employee_number,
          function_role: formData.function_role || null,
        })
        .eq('id', editingProfile.id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = getUserRole(editingProfile.user_id);
      if (formData.role !== currentRole) {
        // Remover papéis anteriores e definir apenas o novo
        const { error: delErr } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', editingProfile.user_id);
        if (delErr) throw delErr;

        const { error: insErr } = await supabase
          .from('user_roles')
          .insert({ user_id: editingProfile.user_id, role: formData.role });
        if (insErr) throw insErr;
      }

      toast({
        title: 'Sucesso',
        description: 'Utilizador atualizado com sucesso',
      });
      setEditingProfile(null);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        employee_number: '',
        function_role: '',
        role: 'user',
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar utilizador: ' + error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', profileId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar estado do utilizador',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `Utilizador ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`,
      });
      fetchUsers();
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
        description: 'Erro inesperado ao redefinir password',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      email: '',
      password: '',
      first_name: profile.first_name,
      last_name: profile.last_name,
      employee_number: profile.employee_number,
      function_role: profile.function_role || '',
      role: getUserRole(profile.user_id),
    });
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(role => role.user_id === userId);
    return userRole?.role || 'user';
  };

  if (!hasRole('admin')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Apenas administradores podem gerir utilizadores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Gerir Utilizadores</h1>
      </div>

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">
            {editingProfile ? 'Editar Utilizador' : 'Criar Utilizador'}
          </TabsTrigger>
          <TabsTrigger value="list">Listar Utilizadores</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingProfile ? 'Editar Utilizador' : 'Criar Novo Utilizador'}
              </CardTitle>
              <CardDescription>
                {editingProfile ? 'Atualize as informações do utilizador' : 'Preencha os dados para criar um novo utilizador'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingProfile ? handleUpdateProfile : handleCreateUser} className="space-y-4">
                {!editingProfile && (
                  <>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    {/* Password removido - será gerada automaticamente */}
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">Nome</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">Apelido</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="employee_number">Número Mecanográfico</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="function_role">Função</Label>
                  <Select value={formData.function_role || ''} onValueChange={(value) => setFormData({ ...formData, function_role: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Condutor">Condutor</SelectItem>
                      <SelectItem value="Socorrista">Socorrista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                 <div>
                   <Label htmlFor="role">Role</Label>
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
                    {editingProfile ? 'Atualizar' : 'Criar'} Utilizador
                  </Button>
                  {editingProfile && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingProfile(null);
                        setFormData({
                          email: '',
                          password: '',
                          first_name: '',
                          last_name: '',
                          employee_number: '',
                          function_role: '',
                          role: 'user',
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
              <CardTitle>Utilizadores Existentes</CardTitle>
              <CardDescription>
                Lista de todos os utilizadores registados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Carregando...</p>
              ) : profiles.length === 0 ? (
                <p className="text-center text-muted-foreground">
                  Nenhum utilizador encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {profile.first_name} {profile.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Nº Mecanográfico: {profile.employee_number}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className={`px-2 py-1 rounded text-xs ${
                              getUserRole(profile.user_id) === 'admin' ? 'bg-red-100 text-red-800' :
                              getUserRole(profile.user_id) === 'mod' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {getUserRole(profile.user_id) === 'admin' ? 'Administrador' :
                               getUserRole(profile.user_id) === 'mod' ? 'Moderador' : 'Utilizador'}
                            </span>
                            <span className={profile.is_active ? 'text-green-600' : 'text-red-600'}>
                              {profile.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(profile)}
                          >
                            <Edit className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageUsers;