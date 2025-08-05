import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle } from 'lucide-react';

interface Notice {
  id: string;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
}

export function NoticeMarquee() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const fetchNotices = async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (!error && data) {
        setNotices(data);
      }
    };

    fetchNotices();

    // Set up real-time subscription
    const channel = supabase
      .channel('notices')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notices' },
        () => {
          fetchNotices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="font-medium text-warning">Avisos Importantes</span>
      </div>
      <div className="overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          {notices.map((notice, index) => (
            <span key={notice.id} className="inline-block mr-8">
              <strong>{notice.title}:</strong> {notice.content}
              {index < notices.length - 1 && ' • '}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}