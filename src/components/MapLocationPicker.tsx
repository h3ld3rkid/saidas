import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MapLocationPickerProps {
  onLocationSelect: (location: string) => void;
  value?: string;
}

export function MapLocationPicker({ onLocationSelect, value }: MapLocationPickerProps) {
  const [mapUrl, setMapUrl] = useState(value || '');

  const openGoogleMaps = () => {
    // Open Google Maps without specific coordinates so user can navigate freely
    const mapsUrl = 'https://maps.google.com/';
    
    try {
      // Create and click a link element - this avoids popup blockers
      const link = document.createElement('a');
      link.href = mapsUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Add some user-friendly attributes
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // Trigger the click
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      toast({
        title: 'Google Maps aberto',
        description: 'Navegue até à localização desejada, clique no local e copie o URL completo.',
        duration: 5000
      });
    } catch (error) {
      // Fallback - copy URL to clipboard and show instructions
      navigator.clipboard.writeText(mapsUrl).then(() => {
        toast({
          title: 'URL copiado para área de transferência',
          description: 'Cole o URL numa nova aba do navegador para abrir o Google Maps.',
        });
      }).catch(() => {
        toast({
          title: 'Abrir manualmente',
          description: `Vá para: ${mapsUrl}`,
          variant: 'destructive'
        });
      });
    }
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
        // Extract coordinates if possible with improved regex
        const coordMatch = mapUrl.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
        if (coordMatch) {
          const [, lat, lng] = coordMatch;
          const cleanUrl = `https://www.google.com/maps/@${lat},${lng},15z?entry=ttu`;
          setMapUrl(cleanUrl);
          onLocationSelect(cleanUrl);
          toast({
            title: 'Localização definida',
            description: `Coordenadas: ${lat}, ${lng}`
          });
        } else {
          // If no coordinates found but it's a valid Google Maps URL, keep it as is
          onLocationSelect(mapUrl);
          toast({
            title: 'URL aceite',
            description: 'Link do Google Maps definido com sucesso.'
          });
        }
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Localização no Mapa</Label>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={openGoogleMaps}
          className="flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Abrir Google Maps
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="map-url" className="text-sm">
          Cole aqui o URL do Google Maps após selecionar a localização:
        </Label>
        <div className="flex gap-2">
        <Input
          id="map-url"
          placeholder="https://www.google.com/maps/@... ou https://maps.app.goo.gl/..."
          value={mapUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          onBlur={validateAndFormatUrl}
        />
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Como usar:</strong><br/>
          1. Clique em "Abrir Google Maps"<br/>
          2. Navegue até à localização desejada<br/>
          3. Clique no local exacto no mapa<br/>
          4. Copie o URL completo da barra de endereços<br/>
          5. Cole o URL no campo abaixo
        </p>
      </div>

      {mapUrl && (
        <div className="p-2 bg-muted rounded text-sm">
          <strong>Link definido:</strong> <br />
          <a 
            href={mapUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {mapUrl}
          </a>
        </div>
      )}
    </div>
  );
}