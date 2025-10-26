import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface SplashAnnouncement {
  id: string;
  title: string;
  message: string;
}

export const SplashAnnouncementModal = () => {
  const [announcement, setAnnouncement] = useState<SplashAnnouncement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;

      // Fetch active announcements for this user's role
      const { data, error } = await supabase
        .from('splash_announcements')
        .select('id, title, message')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching announcement:', error);
        return;
      }

      if (data) {
        // Check if user has already seen this announcement in this session
        const seenKey = `splash_seen_${data.id}`;
        const alreadySeen = sessionStorage.getItem(seenKey);
        
        if (!alreadySeen) {
          setAnnouncement(data);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      // Don't block the page if there's an error
    }
  };

  const handleClose = () => {
    if (announcement) {
      // Mark this announcement as seen for this session
      sessionStorage.setItem(`splash_seen_${announcement.id}`, 'true');
    }
    setOpen(false);
  };

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg border-none shadow-2xl" style={{ background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(210 40% 98%) 100%)' }}>
        <DialogHeader className="space-y-4 pb-2">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <AlertCircle className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div className="flex-1 pt-1">
              <DialogTitle className="text-2xl font-bold text-foreground">
                {announcement.title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-base leading-relaxed whitespace-pre-wrap text-muted-foreground pl-[4.5rem]">
            {announcement.message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-6 pl-[4.5rem]">
          <Button 
            onClick={handleClose}
            className="min-w-[120px] shadow-lg hover:shadow-xl transition-all duration-300"
            size="lg"
          >
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
