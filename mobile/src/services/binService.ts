import type { Bin, BinGateway, BinReading } from '../types/bin';
import { BinError } from './firebase/binGateway';

const MAX_HISTORY = 50;
const MAX_MEMBERS = 10;

/** Validates a bin display name. Returns an error string or undefined. */
export function validateBinName(name: string): string | undefined {
  if (!name.trim()) return 'Informe um nome para a lixeira.';
  if (name.trim().length > 80) return 'O nome deve ter até 80 caracteres.';
}

/** Validates a location string. Returns an error string or undefined. */
export function validateBinLocal(local: string): string | undefined {
  if (local.trim().length > 100) return 'A localização deve ter até 100 caracteres.';
}

/** Validates a member UID for add operations. */
function validateUid(uid: string): boolean {
  return /^[A-Za-z0-9_-]{20,40}$/.test(uid);
}

export class BinService {
  constructor(private readonly gateway: BinGateway) {}

  async listBins(uid: string): Promise<Bin[]> {
    return this.gateway.listBins(uid);
  }

  async getBin(binId: string): Promise<Bin | null> {
    return this.gateway.getBin(binId);
  }

  /**
   * Claim an unclaimed bin. The bin must already exist (written by the ESP32).
   * Throws BinError('bin/not-found') or BinError('bin/already-claimed') on failure.
   */
  async claimBin(binId: string, uid: string, name: string, local: string): Promise<void> {
    const nameErr = validateBinName(name);
    if (nameErr) throw new BinError('bin/invalid-name');
    const localErr = validateBinLocal(local);
    if (localErr) throw new BinError('bin/invalid-local');
    if (!binId.trim()) throw new BinError('bin/invalid-id');
    await this.gateway.claimBin(binId.trim().toUpperCase(), uid, name, local);
  }

  async updateBinMeta(binId: string, name: string, local: string): Promise<void> {
    const nameErr = validateBinName(name);
    if (nameErr) throw new BinError('bin/invalid-name');
    const localErr = validateBinLocal(local);
    if (localErr) throw new BinError('bin/invalid-local');
    await this.gateway.updateBinMeta(binId, name, local);
  }

  /**
   * Add a member to a bin. Validates UID format and enforces the max-members limit.
   * The caller (owner) is responsible for ensuring they own the bin (enforced by rules too).
   */
  async addMember(bin: Bin, uid: string): Promise<void> {
    if (!validateUid(uid)) throw new BinError('bin/invalid-uid');
    if (bin.members.includes(uid)) return; // already a member — idempotent
    if (bin.members.length >= MAX_MEMBERS) throw new BinError('bin/members-limit');
    await this.gateway.addMember(bin.id, uid);
  }

  /**
   * Remove a member from a bin. Owner cannot remove themselves.
   */
  async removeMember(bin: Bin, ownerUid: string, targetUid: string): Promise<void> {
    if (targetUid === ownerUid) throw new BinError('bin/cannot-remove-owner');
    if (!bin.members.includes(targetUid)) return; // not a member — idempotent
    await this.gateway.removeMember(bin.id, targetUid);
  }

  async listReadings(binId: string, uid: string): Promise<BinReading[]> {
    return this.gateway.listReadings(binId, uid, MAX_HISTORY);
  }
}
