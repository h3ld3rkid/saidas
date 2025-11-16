import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, ExternalLink, ClipboardPaste } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
interface MapLocationPickerProps {
  onLocationSelect: (location: string) => void;
  value?: string;
  address?: string;
  parish?: string;
  municipality?: string;
}
export function MapLocationPicker({
  onLocationSelect,
  value,
  address,
  parish,
  municipality
}: MapLocationPickerProps) {
  const [mapUrl, setMapUrl] = useState(value || '');
  const openGoogleMaps = () => {
    // Build search query from address fields: Morada + Freguesia + Concelho
    const searchParts = [address, parish, municipality].filter(Boolean);
    const searchQuery = searchParts.join(', ');
    const mapsUrl = searchQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}` : 'https://www.google.com/maps/search/?api=1';

    // Open in new tab
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    toast({
      title: 'Google Maps aberto',
      description: searchQuery ? `A pesquisar: ${searchQuery}` : 'Navegue até à localização desejada, clique no local e copie o URL completo.',
      duration: 5000
    });
  };
  const handleUrlChange = (url: string) => {
    setMapUrl(url);
    onLocationSelect(url);
  };
  const validateAndFormatUrl = () => {
    if (!mapUrl) return;
    try {
      // Check if it's a valid Google Maps URL
      if (mapUrl.includes('google.com/maps') || mapUrl.includes('maps.google.com') || mapUrl.includes('maps.app.goo.gl')) {
        // Keep the original URL as is - don't modify it
        onLocationSelect(mapUrl);
        toast({
          title: 'Localização definida',
          description: 'Link do Google Maps definido com sucesso.'
        });
      } else {
        toast({
          title: 'URL inválido',
          description: 'Por favor, use um link do Google Maps.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'URL inválido.',
        variant: 'destructive'
      });
    }
  };
  const pasteUrlFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast({
          title: 'Área de transferência vazia',
          description: 'Não há nada para colar.',
          variant: 'destructive'
        });
        return;
      }
      setMapUrl(text);
      handleUrlChange(text);
      toast({
        title: 'URL colado!',
        description: 'O link foi colado no campo.'
      });
    } catch (error) {
      toast({
        title: 'Erro ao colar',
        description: 'Não foi possível colar da área de transferência. Certifique-se de ter copiado um URL.',
        variant: 'destructive'
      });
    }
  };
  return <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Localização no Mapa</Label>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={openGoogleMaps} className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Abrir Google Maps
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="map-url" className="text-sm">
          Cole aqui o URL do Google Maps após selecionar a localização:
        </Label>
        <div className="flex gap-2">
          <Input id="map-url" placeholder="https://www.google.com/maps/@... ou https://maps.app.goo.gl/..." value={mapUrl} onChange={e => handleUrlChange(e.target.value)} onBlur={validateAndFormatUrl} />
          <Button type="button" variant="outline" size="icon" onClick={pasteUrlFromClipboard} className="shrink-0" title="Colar URL da área de transferência">
            <ClipboardPaste className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Como usar:
1. Clique em "Abrir Google Maps"
2. Navegue até à localização desejada
3. Clique no local exacto no mapa
4. Copie o URL completo da barra de endereços e colar em cima















































 

 

 

 

 



















 

 

 

 









































 

 

 

 









 

 

 

 

        <strong>Como usar:</strong><br />
          1. Clique em "Abrir Google Maps"<br />
          2. Navegue até à localização desejada<br />
          3. Clique no local exacto no mapa<br />
          4. Copie o URL completo da barra de endereços<br />
          5. Cole o URL no campo abaixo
        </p>
      </div>

      {mapUrl && <div className="p-2 bg-muted rounded text-sm">
          <strong>Link definido:</strong> <br />
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
            {mapUrl}
          </a>
        </div>}
    </div>;
}