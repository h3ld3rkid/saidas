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
    // Open Google Maps in a new window
    const mapsUrl = 'https://www.google.com/maps/@40.2033145,-8.4102573,6z';
    const newWindow = window.open(mapsUrl, '_blank', 'width=800,height=600');
    
    if (newWindow) {
      toast({
        title: 'Google Maps aberto',
        description: 'Clique num local no mapa e copie o URL da barra de endereços.'
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
      if (mapUrl.includes('google.com/maps') || mapUrl.includes('maps.google.com')) {
        // Extract coordinates if possible
        const coordMatch = mapUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          const [, lat, lng] = coordMatch;
          const cleanUrl = `https://www.google.com/maps/@${lat},${lng},17z`;
          setMapUrl(cleanUrl);
          onLocationSelect(cleanUrl);
          toast({
            title: 'Localização definida',
            description: `Coordenadas: ${lat}, ${lng}`
          });
        } else {
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
            placeholder="https://www.google.com/maps/@..."
            value={mapUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={validateAndFormatUrl}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          No Google Maps, clique numa localização, depois copie o URL da barra de endereços e cole aqui.
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