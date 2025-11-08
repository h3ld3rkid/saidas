import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapLocationPickerProps {
  onLocationSelect: (location: string) => void;
  value?: string;
  address?: string;
  parish?: string;
  municipality?: string;
}

interface LocationSuggestion {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export function MapLocationPicker({ onLocationSelect, value, address, parish, municipality }: MapLocationPickerProps) {
  const [mapUrl, setMapUrl] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchLocations = async () => {
    const searchParts = [address, parish, municipality].filter(Boolean);
    const searchQuery = searchParts.join(', ');
    
    if (!searchQuery) {
      toast({
        title: 'Morada incompleta',
        description: 'Por favor, preencha pelo menos um campo de morada.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=YOUR_API_KEY`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        setSuggestions(data.results);
        setShowSuggestions(true);
        
        toast({
          title: 'Sugestões encontradas',
          description: `${data.results.length} localização(ões) encontrada(s).`
        });
      } else if (data.status === 'REQUEST_DENIED') {
        toast({
          title: 'API Key necessária',
          description: 'Configure a Google Maps API Key nas definições.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Nenhuma localização encontrada',
          description: 'Tente refinar a morada ou usar o Google Maps manualmente.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível buscar localizações. A abrir Google Maps...',
        variant: 'destructive'
      });
      // Fallback: open Google Maps directly
      openGoogleMapsDirectly(searchQuery);
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMapsDirectly = (searchQuery: string) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    const { lat, lng } = suggestion.geometry.location;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    setMapUrl(mapsUrl);
    onLocationSelect(mapsUrl);
    setShowSuggestions(false);
    
    toast({
      title: 'Localização selecionada',
      description: suggestion.formatted_address
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
          onClick={searchLocations}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              A pesquisar...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" />
              Buscar Localizações
            </>
          )}
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

      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Selecione a Localização</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">{suggestion.formatted_address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.geometry.location.lat.toFixed(6)}, {suggestion.geometry.location.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}