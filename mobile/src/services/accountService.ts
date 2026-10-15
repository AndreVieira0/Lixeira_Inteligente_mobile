import type { AccountGateway, Identity, Registration } from '../types/account';
import { AccountError, errorCode } from '../utils/authErrors';
import { normalizeEmail, validateEmail, validateLogin, validateName, validateRegistration } from '../utils/authValidation';

export class AccountService {
  constructor(private readonly gateway: AccountGateway) {}

  private identity(): Identity {
    const identity = this.gateway.currentIdentity();
    if (!identity) throw new AccountError('account/session-required');
    return identity;
  }

  async register(values: Registration): Promise<void> {
    if (Object.keys(validateRegistration(values)).length) throw new AccountError('account/invalid-form');
    const identity = await this.gateway.createIdentity(normalizeEmail(values.email), values.password);
    try {
      await this.gateway.saveProfile(identity, values.nome.trim());
    } catch {
      // Authentication and Firestore cannot commit atomically. Keep the new account recoverable.
      throw new AccountError('account/profile-pending');
    }
  }

  async login(email: string, password: string): Promise<void> {
    if (Object.keys(validateLogin({ email, password })).length) throw new AccountError('account/invalid-form');
    await this.gateway.signIn(normalizeEmail(email), password);
  }

  async resetPassword(email: string): Promise<void> {
    if (validateEmail(email)) throw new AccountError('account/invalid-form');
    try {
      await this.gateway.sendPasswordReset(normalizeEmail(email));
    } catch (error) {
      // Do not reveal whether an email has an account, even without enumeration protection.
      if (errorCode(error) !== 'auth/user-not-found') throw error;
    }
  }

  async saveName(nome: string): Promise<void> {
    if (validateName(nome)) throw new AccountError('account/invalid-form');
    await this.gateway.saveProfile(this.identity(), nome.trim());
  }

  async deleteAccount(password: string): Promise<void> {
    const identity = this.identity();
    if (!password) throw new AccountError('account/invalid-form');
    await this.gateway.reauthenticate(identity.uid, password);
    const backup = await this.gateway.readProfile(identity.uid);
    await this.gateway.deleteProfile(identity.uid);
    try {
      await this.gateway.deleteIdentity(identity.uid);
    } catch (error) {
      if (backup) {
        try {
          await this.gateway.saveProfile(identity, backup.nome);
        } catch {
          throw new AccountError('account/recovery-required');
        }
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.gateway.signOut();
  }
}
