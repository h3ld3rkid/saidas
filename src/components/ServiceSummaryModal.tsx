import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ServiceSummaryModalProps {
  open: boolean;
  onClose: () => void;
  serviceType: string;
  serviceNumber: number;
  totalServiceNumber: number;
}

export function ServiceSummaryModal({ 
  open, 
  onClose, 
  serviceType, 
  serviceNumber, 
  totalServiceNumber 
}: ServiceSummaryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <DialogTitle className="text-xl">Saída Registada com Sucesso!</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Tipo de Serviço</p>
              <Badge variant="default" className="text-lg px-4 py-2">
                {serviceType}
              </Badge>
              <p className="text-2xl font-bold mt-2">Nº {serviceNumber}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Número de Ficha Total</p>
              <p className="text-3xl font-bold text-primary">#{totalServiceNumber}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total geral de todos os serviços
              </p>
            </div>
          </div>
          
          <Button onClick={onClose} className="w-full">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}