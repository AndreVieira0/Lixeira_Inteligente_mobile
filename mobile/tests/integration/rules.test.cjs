'use strict';

/**
 * Testes de segurança das regras do Firestore.
 *
 * Cobre:
 *  - Regressão: users/{uid} (CRUD de perfil) — preserva comportamento atual.
 *  - bins/{binId}: telemetria do ESP32, claim, owner, membros, acesso/negação.
 *  - measurements/{id}: criação pelo ESP32, leitura por membros, negações.
 *  - Concorrência no claim (simulada com transações sequenciais).
 *  - Fase A: medições sem members não aparecem na query do app.
 *  - Fase B (simulada): medições com members aparecem na query.
 *
 * Execução:
 *   npm run test:emulators
 * (equivale a: firebase-tools emulators:exec --only auth,firestore "node --require ./tests/register.cjs --test tests/integration/rules.test.cjs")
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { Timestamp } = require('firebase/firestore');

// UID da conta tecnica do ESP32 (confirmado no Firebase Console).
const ESP32_UID = 'HDEgkFJYYVXItl0BhGD5nyw2IOi2';
const PROJECT_ID = 'demo-lixeira-inteligente';
const BIN_ID = 'BIN-0001';

// UIDs realistas (20-40 chars, [A-Za-z0-9_-])
const UID_A = 'UserAAAAAAAAAAAAAAAaa'; // 20 chars, dono
const UID_B = 'UserBBBBBBBBBBBBBBBbb'; // 21 chars, segundo membro
const UID_C = 'UserCCCCCCCCCCCCCCCcc'; // 21 chars, nao membro

let testEnv;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function authCtx(uid) {
  return testEnv.authenticatedContext(uid);
}
function unauth() {
  return testEnv.unauthenticatedContext();
}
function esp32() {
  return testEnv.authenticatedContext(ESP32_UID);
}

/**
 * Grava um doc de lixeira diretamente (sem passar pelas regras) para preparar
 * o estado inicial de cada teste.
 */
async function seedBin(data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(ctx.firestore(), 'bins', BIN_ID), data);
  });
}
async function seedMeasurement(id, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(ctx.firestore(), 'measurements', id), data);
  });
}
async function seedUser(uid, data) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const { doc, setDoc } = require('firebase/firestore');
    await setDoc(doc(ctx.firestore(), 'users', uid), data);
  });
}

// ---------------------------------------------------------------------------
// setup / teardown
// ---------------------------------------------------------------------------

test('Testes de segurança do Firestore', { timeout: 120_000 }, async (t) => {
  const rulesPath = resolve(__dirname, '../../..', 'firebase/firestore/firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1',
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080),
    },
  });

  try {

    // -----------------------------------------------------------------------
    // BLOCO 1: users/{uid} — regressao do CRUD de perfil existente
    // -----------------------------------------------------------------------

    await t.test('users: dono le proprio perfil', async () => {
      await seedUser(UID_A, {
        nome: 'Ana', email: 'ana@example.com',
        createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
      const { doc, getDoc } = require('firebase/firestore');
      await assertSucceeds(getDoc(doc(authCtx(UID_A).firestore(), 'users', UID_A)));
    });

    await t.test('users: nao-dono nao le perfil alheio', async () => {
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(authCtx(UID_B).firestore(), 'users', UID_A)));
    });

    await t.test('users: nao autenticado nao le perfil', async () => {
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(unauth().firestore(), 'users', UID_A)));
    });

    // -----------------------------------------------------------------------
    // BLOCO 2: bins — ESP32 telemetria
    // -----------------------------------------------------------------------

    await t.test('bins: ESP32 atualiza telemetria valida', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertSucceeds(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { currentLevel: 75, status: 'Atencao', lastUpdate: Timestamp.now() }
      ));
    });

    await t.test('bins: ESP32 nao pode mudar members', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { members: [UID_A, UID_B], currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() }
      ));
    });

    await t.test('bins: ESP32 nao pode mudar ownerId', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { ownerId: ESP32_UID, currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() }
      ));
    });

    await t.test('bins: ESP32 rejeita currentLevel fora de 0-100', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { currentLevel: 101, status: 'Normal', lastUpdate: Timestamp.now() }
      ));
    });

    await t.test('bins: ESP32 rejeita currentLevel negativo', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { currentLevel: -1, status: 'Normal', lastUpdate: Timestamp.now() }
      ));
    });

    await t.test('bins: ESP32 rejeita lastUpdate nao-timestamp', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { currentLevel: 50, status: 'Normal', lastUpdate: '2026-01-01T00:00:00Z' }
      ));
    });

    // -----------------------------------------------------------------------
    // BLOCO 3: bins — claim (reivindicacao)
    // -----------------------------------------------------------------------

    await t.test('bins: usuario A reivindica lixeira sem dono', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertSucceeds(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { ownerId: UID_A, members: [UID_A], nome: 'Coordenação', local: 'Bloco A' }
      ));
    });

    await t.test('bins: claim ja com dono e negado', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_B).firestore(), 'bins', BIN_ID),
        { ownerId: UID_B, members: [UID_B], nome: 'Outro', local: 'Bloco B' }
      ));
    });

    await t.test('bins: claim exige que o proprio uid esteja em members', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { ownerId: UID_A, members: [UID_B], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: claim nao pode ter members vazio', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { ownerId: UID_A, members: [], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: claim com uid invalido em members e negado', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now() });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { ownerId: UID_A, members: [UID_A, 'uid-invalido!'], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: concorrencia — dois claims, apenas um vence', async () => {
      const { doc, runTransaction } = require('firebase/firestore');
      await seedBin({ currentLevel: 70, status: 'Atencao', lastUpdate: Timestamp.now() });
      const dbA = authCtx(UID_A).firestore();
      const dbB = authCtx(UID_B).firestore();

      const claimTx = (db, uid) => runTransaction(db, async (tx) => {
        const snap = await tx.get(doc(db, 'bins', BIN_ID));
        if (!snap.exists()) throw new Error('lixeira nao existe');
        if ('ownerId' in snap.data()) throw new Error('ja reivindicada');
        tx.update(doc(db, 'bins', BIN_ID), { ownerId: uid, members: [uid], nome: 'Lixeira', local: 'Local' });
      });

      const [resA, resB] = await Promise.allSettled([claimTx(dbA, UID_A), claimTx(dbB, UID_B)]);
      const venceu = [resA, resB].filter(r => r.status === 'fulfilled').length;
      const perdeu = [resA, resB].filter(r => r.status === 'rejected').length;
      assert.equal(venceu, 1, 'exatamente um claim deve vencer');
      assert.equal(perdeu, 1, 'exatamente um claim deve falhar');
    });

    // -----------------------------------------------------------------------
    // BLOCO 4: bins — leitura por membros e negacoes
    // -----------------------------------------------------------------------

    await t.test('bins: membro le a propria lixeira (get)', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, getDoc } = require('firebase/firestore');
      await assertSucceeds(getDoc(doc(authCtx(UID_A).firestore(), 'bins', BIN_ID)));
    });

    await t.test('bins: nao-membro nao le lixeira alheia (get)', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(authCtx(UID_C).firestore(), 'bins', BIN_ID)));
    });

    await t.test('bins: nao autenticado nao le lixeira', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(unauth().firestore(), 'bins', BIN_ID)));
    });

    await t.test('bins: lixeira sem dono pode ser lida para claim', async () => {
      await seedBin({ currentLevel: 60, status: 'Atencao', lastUpdate: Timestamp.now() });
      const { doc, getDoc } = require('firebase/firestore');
      await assertSucceeds(getDoc(doc(authCtx(UID_C).firestore(), 'bins', BIN_ID)));
    });

    await t.test('bins: list com array-contains retorna proprias lixeiras', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A, UID_B] });
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const q = query(collection(authCtx(UID_A).firestore(), 'bins'), where('members', 'array-contains', UID_A));
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 1, 'deve retornar exatamente a lixeira do UID_A');
    });

    await t.test('bins: list sem array-contains e negada', async () => {
      const { collection, getDocs } = require('firebase/firestore');
      await assertFails(getDocs(collection(authCtx(UID_A).firestore(), 'bins')));
    });

    await t.test('bins: list com uid de outro usuario e negada', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A] });
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const q = query(collection(authCtx(UID_C).firestore(), 'bins'), where('members', 'array-contains', UID_A));
      await assertFails(getDocs(q));
    });

    // -----------------------------------------------------------------------
    // BLOCO 5: bins — owner gerencia membros
    // -----------------------------------------------------------------------

    await t.test('bins: owner adiciona membro (B) com sucesso', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertSucceeds(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { members: [UID_A, UID_B], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: owner nao pode alterar ownerId', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { ownerId: UID_B, members: [UID_B], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: owner nao pode remover a si proprio de members', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A, UID_B], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { members: [UID_B], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: owner nao pode exceder 10 membros', async () => {
      const dez = Array.from({ length: 10 }, (_, i) => `UserMMMMMMMMMMMMMMMM${String(i).padStart(2, '0')}`);
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { members: [UID_A, ...dez], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: owner nao pode inserir uid com formato invalido', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_A).firestore(), 'bins', BIN_ID),
        { members: [UID_A, 'x'], nome: 'X', local: 'Y' }  // 'x' tem 1 char, invalido
      ));
    });

    await t.test('bins: membro nao-owner nao pode alterar members', async () => {
      await seedBin({ currentLevel: 80, status: 'Proxima de cheia', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A, UID_B], nome: 'X', local: 'Y' });
      const { doc, updateDoc } = require('firebase/firestore');
      await assertFails(updateDoc(
        doc(authCtx(UID_B).firestore(), 'bins', BIN_ID),
        { members: [UID_A, UID_B, UID_C], nome: 'X', local: 'Y' }
      ));
    });

    await t.test('bins: telemetria ESP32 nao apaga ownerId nem members', async () => {
      await seedBin({ currentLevel: 50, status: 'Normal', lastUpdate: Timestamp.now(), ownerId: UID_A, members: [UID_A], nome: 'X', local: 'Y' });
      const { doc, updateDoc, getDoc } = require('firebase/firestore');
      await assertSucceeds(updateDoc(
        doc(esp32().firestore(), 'bins', BIN_ID),
        { currentLevel: 90, status: 'Critica', lastUpdate: Timestamp.now() }
      ));
      const snap = await getDoc(doc(testEnv.authenticatedContext(UID_A).firestore(), 'bins', BIN_ID));
      assert.equal(snap.data().ownerId, UID_A, 'ownerId deve permanecer intacto');
      assert.deepEqual(snap.data().members, [UID_A], 'members deve permanecer intacto');
    });

    // -----------------------------------------------------------------------
    // BLOCO 6: measurements — criacao pelo ESP32
    // -----------------------------------------------------------------------

    await t.test('measurements: ESP32 cria medicao valida sem members (Fase A)', async () => {
      await testEnv.clearFirestore();
      const { collection, addDoc } = require('firebase/firestore');
      await assertSucceeds(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'level_change', timestamp: Timestamp.now() }
      ));
    });

    await t.test('measurements: ESP32 cria medicao valida com members (Fase B)', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertSucceeds(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A] }
      ));
    });

    await t.test('measurements: ESP32 rejeita reason invalido', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'manual', timestamp: Timestamp.now() }
      ));
    });

    await t.test('measurements: ESP32 rejeita level fora de 0-100', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 101, reason: 'level_change', timestamp: Timestamp.now() }
      ));
    });

    await t.test('measurements: ESP32 rejeita campo extra nao permitido', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'level_change', timestamp: Timestamp.now(), extra: 'campo-inesperado' }
      ));
    });

    await t.test('measurements: ESP32 rejeita members nao-lista', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'level_change', timestamp: Timestamp.now(), members: 'UID_A' }
      ));
    });

    await t.test('measurements: ESP32 rejeita members com uid invalido', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(esp32().firestore(), 'measurements'),
        { binId: BIN_ID, level: 75, reason: 'level_change', timestamp: Timestamp.now(), members: ['uid-invalido!'] }
      ));
    });

    await t.test('measurements: usuario comum nao pode criar medicao', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      await assertFails(addDoc(
        collection(authCtx(UID_A).firestore(), 'measurements'),
        { binId: BIN_ID, level: 50, reason: 'level_change', timestamp: Timestamp.now() }
      ));
    });

    // -----------------------------------------------------------------------
    // BLOCO 7: measurements — leitura por membros
    // -----------------------------------------------------------------------

    await t.test('measurements: membro le medicoes com seu uid em members (get)', async () => {
      await seedMeasurement('m1', { binId: BIN_ID, level: 60, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A, UID_B] });
      const { doc, getDoc } = require('firebase/firestore');
      await assertSucceeds(getDoc(doc(authCtx(UID_A).firestore(), 'measurements', 'm1')));
      await assertSucceeds(getDoc(doc(authCtx(UID_B).firestore(), 'measurements', 'm1')));
    });

    await t.test('measurements: nao-membro nao le medicao alheia (get)', async () => {
      await seedMeasurement('m2', { binId: BIN_ID, level: 60, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A] });
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(authCtx(UID_C).firestore(), 'measurements', 'm2')));
    });

    await t.test('measurements: medicao sem members nao aparece na query do app (Fase A)', async () => {
      await testEnv.clearFirestore();
      await seedMeasurement('m-sem-members', { binId: BIN_ID, level: 55, reason: 'level_change', timestamp: Timestamp.now() });
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const q = query(collection(authCtx(UID_A).firestore(), 'measurements'), where('members', 'array-contains', UID_A));
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 0, 'medicao sem members nao deve aparecer (Fase A)');
    });

    await t.test('measurements: medicao com members aparece na query do app (Fase B)', async () => {
      await testEnv.clearFirestore();
      await seedMeasurement('m-com-members', { binId: BIN_ID, level: 55, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A] });
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const q = query(collection(authCtx(UID_A).firestore(), 'measurements'), where('members', 'array-contains', UID_A));
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 1, 'medicao com members deve aparecer (Fase B)');
    });

    await t.test('measurements: query com array-contains de uid de outro negada', async () => {
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const q = query(collection(authCtx(UID_C).firestore(), 'measurements'), where('members', 'array-contains', UID_A));
      await assertFails(getDocs(q));
    });

    await t.test('measurements: list sem array-contains negada', async () => {
      const { collection, getDocs } = require('firebase/firestore');
      await assertFails(getDocs(collection(authCtx(UID_A).firestore(), 'measurements')));
    });

    await t.test('measurements: query com orderBy timestamp funciona para membro', async () => {
      await testEnv.clearFirestore();
      const t1 = Timestamp.fromMillis(Date.now() - 2000);
      const t2 = Timestamp.fromMillis(Date.now() - 1000);
      await seedMeasurement('ord1', { binId: BIN_ID, level: 40, reason: 'level_change', timestamp: t1, members: [UID_A] });
      await seedMeasurement('ord2', { binId: BIN_ID, level: 60, reason: 'reconnection', timestamp: t2, members: [UID_A] });
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const q = query(
        collection(authCtx(UID_A).firestore(), 'measurements'),
        where('members', 'array-contains', UID_A),
        orderBy('timestamp', 'desc')
      );
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 2, 'deve retornar 2 medicoes ordenadas');
      assert.equal(snap.docs[0].id, 'ord2', 'mais recente deve vir primeiro');
    });

    await t.test('measurements: membro nao pode update nem delete', async () => {
      await seedMeasurement('m3', { binId: BIN_ID, level: 60, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A] });
      const { doc, updateDoc, deleteDoc } = require('firebase/firestore');
      await assertFails(updateDoc(doc(authCtx(UID_A).firestore(), 'measurements', 'm3'), { level: 99 }));
      await assertFails(deleteDoc(doc(authCtx(UID_A).firestore(), 'measurements', 'm3')));
    });

    // -----------------------------------------------------------------------
    // BLOCO 8: catch-all — negacao geral
    // -----------------------------------------------------------------------

    await t.test('catch-all: nao autenticado nao acessa nada', async () => {
      const { collection, getDocs, doc, getDoc } = require('firebase/firestore');
      await assertFails(getDocs(collection(unauth().firestore(), 'bins')));
      await assertFails(getDocs(collection(unauth().firestore(), 'measurements')));
      await assertFails(getDoc(doc(unauth().firestore(), 'outraColecao', 'docX')));
    });

    await t.test('catch-all: autenticado nao acessa colecao arbitraria', async () => {
      const { doc, getDoc } = require('firebase/firestore');
      await assertFails(getDoc(doc(authCtx(UID_A).firestore(), 'outraColecao', 'docX')));
    });

    // -----------------------------------------------------------------------
    // BLOCO 9: measurements — query ternaria (members + binId + timestamp)
    // Valida o indice composto exigido pelo observeReadings e listReadings.
    // -----------------------------------------------------------------------

    await t.test('measurements: query ternaria members+binId+timestamp retorna apenas docs do binId correto', async () => {
      await testEnv.clearFirestore();
      const t1 = Timestamp.fromMillis(Date.now() - 3000);
      const t2 = Timestamp.fromMillis(Date.now() - 2000);
      const t3 = Timestamp.fromMillis(Date.now() - 1000);
      // Dois docs para BIN-0001, um para outro binId
      await seedMeasurement('tern1', { binId: BIN_ID, level: 30, reason: 'level_change', timestamp: t1, members: [UID_A] });
      await seedMeasurement('tern2', { binId: BIN_ID, level: 60, reason: 'reconnection', timestamp: t2, members: [UID_A] });
      await seedMeasurement('tern3', { binId: 'BIN-OTHER', level: 50, reason: 'level_change', timestamp: t3, members: [UID_A] });
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const q = query(
        collection(authCtx(UID_A).firestore(), 'measurements'),
        where('members', 'array-contains', UID_A),
        where('binId', '==', BIN_ID),
        orderBy('timestamp', 'desc')
      );
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 2, 'deve retornar apenas docs de BIN-0001');
      // Mais recente primeiro (t2 > t1)
      assert.equal(snap.docs[0].id, 'tern2');
      assert.equal(snap.docs[1].id, 'tern1');
    });

    await t.test('measurements: query ternaria nao-membro nao ve docs de outro usuario', async () => {
      await testEnv.clearFirestore();
      await seedMeasurement('sec1', { binId: BIN_ID, level: 50, reason: 'level_change', timestamp: Timestamp.now(), members: [UID_A] });
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const q = query(
        collection(authCtx(UID_C).firestore(), 'measurements'),
        where('members', 'array-contains', UID_C),
        where('binId', '==', BIN_ID),
        orderBy('timestamp', 'desc')
      );
      // UID_C nao esta em members → a query retorna vazio (nao e negada pois o filtro e cobrivel)
      const snap = await assertSucceeds(getDocs(q));
      assert.equal(snap.docs.length, 0, 'nao-membro nao deve ver medicoes');
    });

    await t.test('measurements: query ternaria com uid de outro em array-contains e negada', async () => {
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      // Tentar filtrar por UID_A enquanto autenticado como UID_C → regra nega
      const q = query(
        collection(authCtx(UID_C).firestore(), 'measurements'),
        where('members', 'array-contains', UID_A),
        where('binId', '==', BIN_ID),
        orderBy('timestamp', 'desc')
      );
      await assertFails(getDocs(q));
    });

  } finally {
    await testEnv.cleanup();
  }
});
