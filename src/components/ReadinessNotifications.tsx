import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface RealtimeNotification {
  id: string;
  alert_id: string;
  responder_name: string;
  message: string;
  created_at: string;
}

export function ReadinessNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('readiness-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_notifications'
        },
        (payload) => {
          const newNotification = payload.new as RealtimeNotification;
          setNotifications(prev => [newNotification, ...prev]);
          setIsOpen(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleDismissAll = () => {
    setNotifications([]);
    setIsOpen(false);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.length <= 1) {
      setIsOpen(false);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Respostas de Prontidão
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between p-3 bg-green-50 rounded-lg border border-green-200">
               <div className="flex-1">
                 <p className="text-sm font-medium text-green-800">
                   {notification.responder_name || notification.message}
                 </p>
                <p className="text-xs text-green-600 mt-1">
                  {new Date(notification.created_at).toLocaleString('pt-PT')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismissNotification(notification.id)}
                className="ml-2 h-6 w-6 p-0 text-green-600 hover:text-green-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleDismissAll}>
            Dispensar Todas
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}