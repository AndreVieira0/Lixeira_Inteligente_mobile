/** Alert settings stored per user per bin in Firestore `alertSettings/{uid}_{binId}`. */
export interface AlertSettings {
  uid: string;
  binId: string;
  /** Percentage levels that trigger a notification when crossed upward. */
  thresholds: number[];
  /** Master toggle — when false, no notifications are sent. */
  enabled: boolean;
  /** ISO string of last update. */
  updatedAt: string | null;
}

/** Preset thresholds the user can choose from, matching firmware status boundaries. */
export const ALERT_PRESETS: { level: number; label: string; description: string }[] = [
  { level: 50, label: 'Atenção', description: 'Acima de 50% de ocupação' },
  { level: 80, label: 'Próxima de cheia', description: 'Acima de 80% — precisa de coleta' },
  { level: 90, label: 'Crítica', description: 'Acima de 90% — urgente' },
  { level: 100, label: 'Cheia', description: 'Lixeira completamente cheia' },
];

/** Gateway interface for alert settings. */
export interface AlertGateway {
  listAlerts(uid: string): Promise<AlertSettings[]>;
  getAlert(binId: string, uid: string): Promise<AlertSettings | null>;
  saveAlert(binId: string, uid: string, thresholds: number[], enabled: boolean): Promise<void>;
  deleteAlert(binId: string, uid: string): Promise<void>;
}
