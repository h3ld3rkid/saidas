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

    // Criar utilizador no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
    });

    if (authError) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar utilizador: ' + authError.message,
        variant: 'destructive',
      });
      return;
    }

    if (!authData.user) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar utilizador',
        variant: 'destructive',
      });
      return;
    }

    // Criar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        employee_number: formData.employee_number,
      });

    if (profileError) {
      toast({
        title: 'Erro',
        description: 'Erro ao criar perfil: ' + profileError.message,
        variant: 'destructive',
      });
      return;
    }

    // Criar role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: formData.role,
      });

    if (roleError) {
      toast({
        title: 'Erro',
        description: 'Erro ao atribuir role: ' + roleError.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Utilizador criado com sucesso',
    });

    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      employee_number: '',
      role: 'user',
    });

    fetchUsers();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProfile) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        employee_number: formData.employee_number,
      })
      .eq('id', editingProfile.id);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });
      setEditingProfile(null);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        employee_number: '',
        role: 'user',
      });
      fetchUsers();
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

  const handleResetPassword = async (userId: string, email: string) => {
    const newPassword = 'TempPass123!';
    
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao redefinir password',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `Password redefinida para: ${newPassword}`,
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
      role: 'user',
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

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
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

                {!editingProfile && (
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
                )}

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