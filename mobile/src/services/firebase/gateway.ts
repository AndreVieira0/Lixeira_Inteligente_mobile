import {
  createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential,
  sendPasswordResetEmail, signInWithEmailAndPassword, signOut, type Auth, type User,
} from 'firebase/auth';
import { doc, getDocFromServer, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';

import type { AccountGateway, Identity, UserProfile } from '../../types/account';
import { AccountError } from '../../utils/authErrors';

export function toIdentity(user: User | null): Identity | null {
  return user?.email ? { uid: user.uid, email: user.email } : null;
}

export function parseProfile(uid: string, data: unknown): UserProfile {
  if (typeof data !== 'object' || data === null || !('nome' in data) || !('email' in data)
    || typeof data.nome !== 'string' || typeof data.email !== 'string') {
    throw new AccountError('account/invalid-profile');
  }
  return { uid, nome: data.nome, email: data.email };
}

export function createFirebaseGateway(auth: Auth, db: Firestore): AccountGateway {
  function requireUser(uid: string): User {
    if (!auth.currentUser || auth.currentUser.uid !== uid) throw new AccountError('account/session-required');
    return auth.currentUser;
  }

  return {
    currentIdentity: () => toIdentity(auth.currentUser),
    async createIdentity(email, password) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      return { uid: user.uid, email: user.email ?? email };
    },
    async signIn(email, password) { await signInWithEmailAndPassword(auth, email, password); },
    async signOut() { await signOut(auth); },
    async sendPasswordReset(email) { await sendPasswordResetEmail(auth, email); },
    async readProfile(uid) {
      const snapshot = await getDocFromServer(doc(db, 'users', uid));
      return snapshot.exists() ? parseProfile(uid, snapshot.data()) : null;
    },
    async saveProfile(identity, nome) {
      const reference = doc(db, 'users', identity.uid);
      // A transaction fails offline instead of leaving an indefinite queued form submission.
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists()) {
          transaction.update(reference, { nome, updatedAt: serverTimestamp() });
        } else {
          transaction.set(reference, { nome, email: identity.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        }
      });
    },
    async deleteProfile(uid) {
      const reference = doc(db, 'users', uid);
      await runTransaction(db, async (transaction) => {
        await transaction.get(reference);
        transaction.delete(reference);
      });
    },
    async reauthenticate(uid, password) {
      const user = requireUser(uid);
      if (!user.email) throw new AccountError('account/session-required');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    },
    async deleteIdentity(uid) { await deleteUser(requireUser(uid)); },
  };
}
