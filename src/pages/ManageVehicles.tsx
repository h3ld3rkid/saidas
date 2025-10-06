import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  is_active: boolean;
  ambulance_number: string | null;
  display_order: number | null;
}

export default function ManageVehicles() {
  const { hasRole } = useUserRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ license_plate: "", make: "", model: "", year: "", ambulance_number: "", is_active: true, display_order: "" });

  useEffect(() => {
    document.title = 'Gerir Viaturas';
    load();
  }, []);

  const load = async () => {
    const { data, error } = await supabase.from('vehicles').select('*').order('display_order', { ascending: true, nullsFirst: false }).order('ambulance_number', { ascending: true });
    if (error) {
      toast({ title: 'Erro ao carregar viaturas', description: error.message, variant: 'destructive' });
    } else {
      setVehicles(data || []);
    }
  };

  const saveVehicle = async () => {
    if (!hasRole('admin')) {
      toast({ title: 'Acesso negado', description: 'Apenas administradores', variant: 'destructive' });
      return;
    }
    setLoading(true);
    
    const vehicleData = {
      license_plate: form.license_plate,
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      ambulance_number: form.ambulance_number || null,
      is_active: form.is_active,
      display_order: form.display_order ? Number(form.display_order) : null,
    };
    
    let error;
    if (editingVehicle) {
      ({ error } = await supabase.from('vehicles').update(vehicleData).eq('id', editingVehicle.id));
    } else {
      ({ error } = await supabase.from('vehicles').insert(vehicleData));
    }
    
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingVehicle ? 'Viatura atualizada' : 'Viatura adicionada' });
      setForm({ license_plate: "", make: "", model: "", year: "", ambulance_number: "", is_active: true, display_order: "" });
      setEditingVehicle(null);
      load();
    }
  };

  const editVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setForm({
      license_plate: vehicle.license_plate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year?.toString() || "",
      ambulance_number: vehicle.ambulance_number || "",
      is_active: vehicle.is_active,
      display_order: vehicle.display_order?.toString() || "",
    });
  };

  const cancelEdit = () => {
    setEditingVehicle(null);
    setForm({ license_plate: "", make: "", model: "", year: "", ambulance_number: "", is_active: true, display_order: "" });
  };

  const toggleActive = async (v: Vehicle) => {
    if (!hasRole('admin')) return;
    const { error } = await supabase.from('vehicles').update({ is_active: !v.is_active }).eq('id', v.id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      load();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Gerir Viaturas</h1>
        <p className="text-muted-foreground">Adicionar e gerir viaturas ativas</p>
      </header>

      {hasRole('admin') && (
        <Card>
          <CardHeader>
            <CardTitle>{editingVehicle ? 'Editar Viatura' : 'Adicionar Viatura'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} placeholder="1" />
              </div>
              <div>
                <Label>Número Ambulância</Label>
                <Input value={form.ambulance_number} onChange={(e) => setForm({ ...form, ambulance_number: e.target.value })} placeholder="01" />
              </div>
              <div>
                <Label>Matrícula</Label>
                <Input value={form.license_plate} onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })} placeholder="AA-00-AA" />
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="flex items-end gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })} id="active" />
                  <Label htmlFor="active">Ativa</Label>
                </div>
                <Button onClick={saveVehicle} disabled={loading}>
                  {editingVehicle ? 'Atualizar' : 'Adicionar'}
                </Button>
                {editingVehicle && (
                  <Button variant="outline" onClick={cancelEdit} disabled={loading}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Viaturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vehicles.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem viaturas.</p>
          )}
          {vehicles.map((v) => (
            <div key={v.id} className="grid grid-cols-2 md:grid-cols-8 gap-2 items-center border rounded-md p-3">
              <span className="text-sm font-medium">Ordem {v.display_order ?? '—'}</span>
              <span className="font-medium">Ambulância {v.ambulance_number || 'N/A'}</span>
              <span className="text-sm text-muted-foreground">{v.license_plate}</span>
              <span>{v.make} {v.model}</span>
              <span className="text-sm text-muted-foreground">{v.year ?? '—'}</span>
              <span className="text-sm">{v.is_active ? 'Ativa' : 'Inativa'}</span>
              {hasRole('admin') && (
                <Button variant="outline" size="sm" onClick={() => editVehicle(v)}>
                  Editar
                </Button>
              )}
              {hasRole('admin') && (
                <Button variant="outline" size="sm" onClick={() => toggleActive(v)}>
                  {v.is_active ? 'Desativar' : 'Ativar'}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
