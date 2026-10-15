export interface DemoBin {
  id: string;
  name: string;
  location: string;
  level: number;
}

export const DEMO_BINS: DemoBin[] = [
  { id: 'patio', name: 'Lixeira do pátio', location: 'Área externa · Bloco A', level: 92 },
  { id: 'corredor', name: 'Lixeira do corredor', location: '1º andar · Bloco B', level: 64 },
  { id: 'sala', name: 'Lixeira da sala', location: 'Sala 102 · Bloco A', level: 28 },
];

export const DEMO_HISTORY = [
  { day: 'Seg', level: 32 }, { day: 'Ter', level: 48 }, { day: 'Qua', level: 39 },
  { day: 'Qui', level: 67 }, { day: 'Sex', level: 55 }, { day: 'Sáb', level: 43 }, { day: 'Dom', level: 61 },
];

export const dashboardColors = {
  warning: '#91631B', warningSoft: '#FFF4DA', blue: '#406B80', blueSoft: '#EAF2F5',
  overlay: 'rgba(19, 43, 32, 0.5)',
};
