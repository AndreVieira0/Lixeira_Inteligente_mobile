const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, getDocFromServer, getDocs, collection, updateDoc, setDoc, serverTimestamp, Timestamp, terminate } = require('firebase/firestore');
const { AccountService } = require('../../src/services/accountService.ts');
const { createFirebaseGateway } = require('../../src/services/firebase/gateway.ts');

test('CRUD real nos emuladores e isolamento entre usuários pelas regras publicadas', { timeout: 90000 }, async (t) => {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
  assert.ok(authHost && firestoreHost, 'Execute pelo comando test:emulators; nunca usar produção.');
  const projectId = 'demo-lixeira-inteligente';
  const clients = ['owner', 'outsider'].map((name) => {
    const app = initializeApp({ apiKey: 'demo-key', projectId }, `${name}-${Date.now()}`);
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    const db = getFirestore(app);
    const [host, port] = firestoreHost.split(':');
    connectFirestoreEmulator(db, host, Number(port));
    return { app, auth, db, service: new AccountService(createFirebaseGateway(auth, db)) };
  });
  const [owner, outsider] = clients;
  const email = `ana-${Date.now()}@example.com`;
  let uid;
  try {
    await t.test('cadastro persiste perfil sem senha e com data do servidor', async () => {
      await owner.service.register({ nome: 'Ana Silva', email, password: 'Segura123', confirmation: 'Segura123' });
      uid = owner.auth.currentUser.uid;
      const profile = (await getDocFromServer(doc(owner.db, 'users', uid))).data();
      assert.deepEqual(Object.keys(profile).sort(), ['createdAt', 'email', 'nome', 'updatedAt']);
      assert.equal(profile.nome, 'Ana Silva');
      assert.equal(profile.email, email);
      assert.ok(profile.createdAt instanceof Timestamp);
    });
    await t.test('edição atualiza nome sem alterar criação', async () => {
      const reference = doc(owner.db, 'users', uid);
      const before = (await getDocFromServer(reference)).data();
      await owner.service.saveName('Ana Souza');
      const after = (await getDocFromServer(reference)).data();
      assert.equal(after.nome, 'Ana Souza');
      assert.ok(before.createdAt.isEqual(after.createdAt));
    });
    await t.test('regras rejeitam campos extras, mudança de e-mail e data adulterada', async () => {
      const reference = doc(owner.db, 'users', uid);
      await assert.rejects(updateDoc(reference, { role: 'admin', updatedAt: serverTimestamp() }), { code: 'permission-denied' });
      await assert.rejects(updateDoc(reference, { email: 'outro@example.com', updatedAt: serverTimestamp() }), { code: 'permission-denied' });
      await assert.rejects(updateDoc(reference, { createdAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }), { code: 'permission-denied' });
      await assert.rejects(updateDoc(reference, { nome: ' ', updatedAt: serverTimestamp() }), { code: 'permission-denied' });
    });
    await t.test('outro usuário não lê, altera, lista ou cria perfil de terceiros', async () => {
      await outsider.service.register({ nome: 'Outro Usuário', email: `outro-${Date.now()}@example.com`, password: 'Segura123', confirmation: 'Segura123' });
      await assert.rejects(getDocFromServer(doc(outsider.db, 'users', uid)), { code: 'permission-denied' });
      await assert.rejects(updateDoc(doc(outsider.db, 'users', uid), { nome: 'Intruso', updatedAt: serverTimestamp() }), { code: 'permission-denied' });
      await assert.rejects(getDocs(collection(outsider.db, 'users')), { code: 'permission-denied' });
      await assert.rejects(setDoc(doc(outsider.db, 'users', 'forged'), { nome: 'Intruso', email: outsider.auth.currentUser.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }), { code: 'permission-denied' });
    });
    await t.test('logout bloqueia leitura, login errado falha e correto restaura acesso', async () => {
      await owner.service.logout();
      assert.equal(owner.auth.currentUser, null);
      await assert.rejects(getDocFromServer(doc(owner.db, 'users', uid)), { code: 'permission-denied' });
      await assert.rejects(owner.service.login(email, 'errada'));
      await owner.service.login(email, 'Segura123');
      assert.equal(owner.auth.currentUser.uid, uid);
      assert.equal((await getDocFromServer(doc(owner.db, 'users', uid))).data().nome, 'Ana Souza');
    });
    await t.test('recuperação gera e-mail de redefinição no emulador', async () => {
      await owner.service.resetPassword(email);
      const response = await fetch(`http://${authHost}/emulator/v1/projects/${projectId}/oobCodes`);
      const data = await response.json();
      assert.ok(data.oobCodes.some((entry) => entry.email === email && entry.requestType === 'PASSWORD_RESET'));
    });
    await t.test('senha incorreta preserva conta e exclusão correta impede novo login', async () => {
      await assert.rejects(owner.service.deleteAccount('errada'));
      assert.ok((await getDocFromServer(doc(owner.db, 'users', uid))).exists());
      await owner.service.deleteAccount('Segura123');
      assert.equal(owner.auth.currentUser, null);
      await assert.rejects(owner.service.login(email, 'Segura123'));
      // Re-creating this email gets a different identity and a new private profile.
      await owner.service.register({ nome: 'Ana Nova', email, password: 'Segura123', confirmation: 'Segura123' });
      assert.notEqual(owner.auth.currentUser.uid, uid);
    });
    await t.test('adaptador não exclui identidade diferente da que autorizou a operação', async () => {
      const currentUid = outsider.auth.currentUser.uid;
      const gateway = createFirebaseGateway(outsider.auth, outsider.db);
      await assert.rejects(gateway.deleteIdentity(uid), { code: 'account/session-required' });
      assert.equal(outsider.auth.currentUser.uid, currentUid);
    });
  } finally {
    await Promise.all(clients.map(async ({ app, db }) => { await terminate(db); await deleteApp(app); }));
  }
});
