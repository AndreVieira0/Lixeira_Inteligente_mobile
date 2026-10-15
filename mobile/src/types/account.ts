export interface Identity {
  uid: string;
  email: string;
}

export interface UserProfile extends Identity {
  nome: string;
}

export interface Registration {
  nome: string;
  email: string;
  password: string;
  confirmation: string;
}

export interface AccountGateway {
  currentIdentity(): Identity | null;
  createIdentity(email: string, password: string): Promise<Identity>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  readProfile(uid: string): Promise<UserProfile | null>;
  saveProfile(identity: Identity, nome: string): Promise<void>;
  deleteProfile(uid: string): Promise<void>;
  reauthenticate(uid: string, password: string): Promise<void>;
  deleteIdentity(uid: string): Promise<void>;
}
