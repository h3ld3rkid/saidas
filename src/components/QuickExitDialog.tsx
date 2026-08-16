import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Zap } from 'lucide-react';

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  ambulance_number: string | null;
}

interface QuickExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const nowDate = () => {
  const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' });
  return d;
};
const nowTime = () =>
  new Date().toLocaleTimeString('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export function QuickExitDialog({ open, onOpenChange }: QuickExitDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model, ambulance_number')
        .eq('is_active', true)
        .order('ambulance_number', { ascending: true });
      setVehicles(data || []);
    };
    load();
  }, [open]);

  const handleConfirm = async () => {
    if (!user) return;
    if (!vehicleId) {
      toast({
        title: 'Viatura obrigatória',
        description: 'Selecione a viatura para registar a saída rápida.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const { data: numberData, error: numberError } = await supabase.rpc(
        'get_next_service_number',
        { p_service_type: 'Emergencia/CODU' }
      );
      if (numberError) throw numberError;
      const serviceNumber = numberData?.[0]?.service_num || 1;
      const totalServiceNumber = numberData?.[0]?.total_num || 1;

      const { data: inserted, error } = await supabase
        .from('vehicle_exits')
        .insert({
          user_id: user.id,
          vehicle_id: vehicleId,
          ambulance_number: vehicle?.ambulance_number || vehicle?.license_plate || null,
          departure_date: nowDate(),
          departure_time: nowTime(),
          purpose: 'Saída rápida — dados por preencher',
          observations: 'REGISTO RÁPIDO: dados a completar posteriormente.',
          exit_type: 'Emergencia/CODU',
          status: 'active',
          service_number: serviceNumber,
          total_service_number: totalServiceNumber,
        } as any)
        .select('id')
        .single();
      if (error) throw error;

      toast({
        title: 'Saída rápida registada',
        description: `Nº ${serviceNumber} · Ficha nº ${totalServiceNumber}. Complete os dados assim que possível.`,
      });
      onOpenChange(false);
      setVehicleId('');
      if (inserted?.id) navigate(`/exits/${inserted.id}/edit`);
      else navigate('/exits');
    } catch (error: any) {
      toast({
        title: 'Erro ao registar saída rápida',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-xl p-0 overflow-hidden">
        <div className="bg-destructive p-5 flex items-center justify-center">
          <div className="p-3 bg-background/20 rounded-full">
            <AlertTriangle className="h-9 w-9 text-destructive-foreground" />
          </div>
        </div>
        <DialogHeader className="px-5 pt-4 text-center">
          <DialogTitle className="text-lg font-bold">Registo de Saída Rápida</DialogTitle>
          <DialogDescription className="text-sm pt-1">
            Está a registar uma <strong>saída rápida CODU</strong> sem os dados obrigatórios. O número
            de serviço e de ficha são atribuídos normalmente e os restantes dados devem ser
            completados por si logo que possível.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4">
          <label className="text-sm font-medium mb-1 block">Viatura</label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar viatura" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.ambulance_number
                    ? `Ambulância ${v.ambulance_number}`
                    : `${v.license_plate} — ${v.make} ${v.model}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="p-5 pt-4 flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto order-1 sm:order-2"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Registar saída rápida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
