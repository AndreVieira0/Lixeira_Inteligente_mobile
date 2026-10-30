import type { AlertGateway, AlertSettings } from '../types/alert';
import { ALERT_PRESETS } from '../types/alert';

const VALID_THRESHOLDS = ALERT_PRESETS.map((p) => p.level);

export class AlertService {
  constructor(private readonly gateway: AlertGateway) {}

  async listAlerts(uid: string): Promise<AlertSettings[]> {
    return this.gateway.listAlerts(uid);
  }

  async getAlert(binId: string, uid: string): Promise<AlertSettings | null> {
    return this.gateway.getAlert(binId, uid);
  }

  async saveAlert(binId: string, uid: string, thresholds: number[], enabled: boolean): Promise<void> {
    // Validate: only allow preset thresholds, deduplicate, sort
    const clean = [...new Set(thresholds)]
      .filter((t) => VALID_THRESHOLDS.includes(t))
      .sort((a, b) => a - b);
    await this.gateway.saveAlert(binId, uid, clean, enabled);
  }

  async deleteAlert(binId: string, uid: string): Promise<void> {
    await this.gateway.deleteAlert(binId, uid);
  }
}
