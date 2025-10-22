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
        .single();

      if (error) {
        // No announcements found or error - don't show anything
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
          <DialogDescription className="text-base pt-2 whitespace-pre-wrap">
            {announcement.message}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end mt-4">
          <Button onClick={handleClose}>
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
