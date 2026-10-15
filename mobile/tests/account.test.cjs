const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AccountService } = require('../src/services/accountService.ts');
const { validateRegistration, validateLogin } = require('../src/utils/authValidation.ts');
const { authErrorMessage } = require('../src/utils/authErrors.ts');

function setup(fail = {}) {
  const state = { identity: null, profile: null, sentEmail: null };
  const gateway = {
    currentIdentity: () => state.identity,
    createIdentity: async (email, password) => {
      if (fail.create) throw fail.create;
      assert.equal(password, 'Segura123');
      state.identity = { uid: 'user-a', email };
      return state.identity;
    },
    signIn: async (email, password) => {
      if (password !== 'Segura123') throw { code: 'auth/invalid-credential' };
      state.identity = { uid: 'user-a', email };
    },
    signOut: async () => { state.identity = null; },
    sendPasswordReset: async (email) => { state.sentEmail = email; },
    readProfile: async () => state.profile,
    saveProfile: async (identity, nome) => {
      if (fail.save) throw fail.save;
      if (identity.uid !== state.identity?.uid) throw { code: 'permission-denied' };
      state.profile = { uid: identity.uid, email: identity.email, nome };
    },
    deleteProfile: async () => {
      if (fail.removeProfile) throw fail.removeProfile;
      state.profile = null;
      if (fail.switchIdentity) state.identity = { uid: 'user-b', email: 'b@example.com' };
    },
    reauthenticate: async (uid, password) => {
      if (uid !== state.identity.uid) throw { code: 'account/session-required' };
      if (password !== 'Segura123') throw { code: 'auth/invalid-credential' };
    },
    deleteIdentity: async (expectedUid) => {
      if (expectedUid && expectedUid !== state.identity.uid) throw { code: 'account/session-required' };
      if (fail.removeIdentity) throw fail.removeIdentity;
      state.identity = null;
    },
  };
  return { state, service: new AccountService(gateway) };
}
const registration = { nome: '  Ana Silva  ', email: ' ANA@EXAMPLE.COM ', password: 'Segura123', confirmation: 'Segura123' };

test('cadastro rejeita campos inválidos, senha fraca e confirmação divergente', () => {
  assert.deepEqual(validateRegistration(registration), {});
  const errors = validateRegistration({ nome: ' ', email: 'invalido', password: '123', confirmation: '456' });
  assert.ok(errors.nome && errors.email && errors.password && errors.confirmation);
  assert.ok(validateRegistration({ ...registration, nome: 'a'.repeat(81) }).nome);
});
test('login não aplica política de criação a senhas existentes', () => {
  assert.deepEqual(validateLogin({ email: 'ana@example.com', password: '123456' }), {});
  assert.ok(validateLogin({ email: '', password: '' }).password);
});
test('cadastro cria identidade e perfil normalizados sem armazenar senha', async () => {
  const { service, state } = setup();
  await service.register(registration);
  assert.deepEqual(state.profile, { uid: 'user-a', nome: 'Ana Silva', email: 'ana@example.com' });
  assert.equal(state.identity.uid, 'user-a');
});
test('cadastro inválido não cria identidade', async () => {
  const { service, state } = setup();
  await assert.rejects(service.register({ ...registration, confirmation: 'outra' }));
  assert.equal(state.identity, null);
});
test('conta duplicada não escreve perfil', async () => {
  const { service, state } = setup({ create: { code: 'auth/email-already-in-use' } });
  await assert.rejects(service.register(registration));
  assert.equal(state.profile, null);
});
test('falha do Firestore mantém conta recuperável sem indicar cadastro completo', async () => {
  const failure = { save: new Error('offline') };
  const { service, state } = setup(failure);
  await assert.rejects(service.register(registration), { code: 'account/profile-pending' });
  assert.equal(state.identity.uid, 'user-a');
  assert.equal(state.profile, null);
  failure.save = null;
  await service.saveName('Ana Silva');
  assert.equal(state.profile.nome, 'Ana Silva');
});
test('login e logout alteram sessão; senha incorreta não autentica', async () => {
  const { service, state } = setup();
  await assert.rejects(service.login('ana@example.com', 'errada'));
  assert.equal(state.identity, null);
  await service.login(' ANA@EXAMPLE.COM ', 'Segura123');
  assert.equal(state.identity.email, 'ana@example.com');
  await service.logout();
  assert.equal(state.identity, null);
});
test('edição exige sessão e preserva identidade e e-mail', async () => {
  const { service, state } = setup();
  await assert.rejects(service.saveName('Ana Silva'));
  await service.register(registration);
  await service.saveName(' Ana Souza ');
  assert.deepEqual(state.profile, { uid: 'user-a', email: 'ana@example.com', nome: 'Ana Souza' });
  await assert.rejects(service.saveName(' '));
  assert.equal(state.profile.nome, 'Ana Souza');
});
test('recuperação normaliza e-mail e rejeita endereço inválido', async () => {
  const { service, state } = setup();
  await assert.rejects(service.resetPassword('invalido'));
  assert.equal(state.sentEmail, null);
  await service.resetPassword(' ANA@EXAMPLE.COM ');
  assert.equal(state.sentEmail, 'ana@example.com');
});
test('exclusão exige senha correta e remove conta e perfil', async () => {
  const { service, state } = setup();
  await service.register(registration);
  await assert.rejects(service.deleteAccount('errada'));
  assert.ok(state.profile && state.identity);
  await service.deleteAccount('Segura123');
  assert.equal(state.profile, null);
  assert.equal(state.identity, null);
});
test('falha ao apagar perfil preserva identidade', async () => {
  const { service, state } = setup({ removeProfile: new Error('offline') });
  await service.register(registration);
  await assert.rejects(service.deleteAccount('Segura123'));
  assert.ok(state.identity && state.profile);
});
test('falha ao apagar identidade restaura perfil e permite tentar de novo', async () => {
  const failure = { removeIdentity: new Error('offline') };
  const { service, state } = setup(failure);
  await service.register(registration);
  await assert.rejects(service.deleteAccount('Segura123'));
  assert.equal(state.profile.nome, 'Ana Silva');
  assert.ok(state.identity);
  failure.removeIdentity = null;
  await service.deleteAccount('Segura123');
  assert.equal(state.identity, null);
});
test('falha também na restauração informa necessidade de recuperação do perfil', async () => {
  const failure = {};
  const { service, state } = setup(failure);
  await service.register(registration);
  failure.removeIdentity = new Error('offline');
  failure.save = new Error('offline');
  await assert.rejects(service.deleteAccount('Segura123'), { code: 'account/recovery-required' });
  assert.ok(state.identity);
});
test('troca de sessão durante exclusão nunca apaga a nova identidade', async () => {
  const { service, state } = setup({ switchIdentity: true });
  await service.register(registration);
  await assert.rejects(service.deleteAccount('Segura123'));
  assert.equal(state.identity.uid, 'user-b');
});
test('mensagens traduzem erros sem expor detalhes internos nem existência no login', () => {
  assert.equal(authErrorMessage({ code: 'auth/user-not-found' }), authErrorMessage({ code: 'auth/wrong-password' }));
  assert.match(authErrorMessage({ code: 'auth/network-request-failed' }), /conexão/i);
  assert.doesNotMatch(authErrorMessage(new Error('private-token')), /private-token/);
});
