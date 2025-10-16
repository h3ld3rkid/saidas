// Utilities for exit type normalization and styles
export type ExitTypeStyle = {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
};

export const normalizeExitType = (input: string | null | undefined): string => {
  if (!input) return "";
  const s = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .trim();
  // unify common variants
  if (s === 'emergencia/codu' || s === 'emergencia codu') return 'emergencia/codu';
  if (s === 'emergencia particular' || s === 'emergencia-particular') return 'emergencia particular';
  if (s === 'vsl') return 'vsl';
  if (s === 'outro') return 'outro';
  return s;
};

export const getExitTypeBadgeStyle = (exitType: string | null | undefined): ExitTypeStyle => {
  const key = normalizeExitType(exitType);
  switch (key) {
    case 'emergencia/codu':
      return { variant: 'destructive' };
    case 'emergencia particular':
      return { variant: 'secondary', className: '!bg-green-600 !text-white hover:!bg-green-700' };
    case 'vsl':
      return { variant: 'secondary', className: '!bg-orange-600 !text-white hover:!bg-orange-700' };
    case 'outro':
      return { variant: 'secondary', className: '!bg-blue-600 !text-white hover:!bg-blue-700' };
    default:
      return { variant: 'default' };
  }
};

export const displayExitType = (exitType: string | null | undefined): string => {
  const key = normalizeExitType(exitType);
  switch (key) {
    case 'emergencia/codu':
      return 'Emergência/CODU';
    case 'emergencia particular':
      return 'Emergência Particular';
    case 'vsl':
      return 'VSL';
    case 'outro':
      return 'Outro';
    default:
      return exitType || 'Serviço';
  }
};

export const DEFAULT_EXIT_TYPE_KEYS: Array<{ key: string; label: string }> = [
  { key: 'emergencia/codu', label: 'Emergência/CODU' },
  { key: 'emergencia particular', label: 'Emergência Particular' },
  { key: 'vsl', label: 'VSL' },
  { key: 'outro', label: 'Outro' },
];
