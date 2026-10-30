'use strict';
/**
 * Testes unitários para BinService, validadores, helpers de mapeamento e BinError.
 * Não depende de Firebase nem de emulador — roda com node:test diretamente.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// --- helpers to require TypeScript files via register.cjs ---
const { BinService } = require('../src/services/binService.ts');
const { BinError, toBin, toReading } = require('../src/services/firebase/binGateway.ts');
const { validateBinName, validateBinLocal } = require('../src/services/binService.ts');
const { binStatusFromLevel, BIN_STATUS_LABEL } = require('../src/types/bin.ts');

// ---------- binStatusFromLevel ----------

describe('binStatusFromLevel', () => {
  test('0% → Normal', () => assert.equal(binStatusFromLevel(0), 'Normal'));
  test('50% → Normal', () => assert.equal(binStatusFromLevel(50), 'Normal'));
  test('51% → Atencao', () => assert.equal(binStatusFromLevel(51), 'Atencao'));
  test('79% → Atencao', () => assert.equal(binStatusFromLevel(79), 'Atencao'));
  test('80% → Proxima de cheia', () => assert.equal(binStatusFromLevel(80), 'Proxima de cheia'));
  test('89% → Proxima de cheia', () => assert.equal(binStatusFromLevel(89), 'Proxima de cheia'));
  test('90% → Critica', () => assert.equal(binStatusFromLevel(90), 'Critica'));
  test('99% → Critica', () => assert.equal(binStatusFromLevel(99), 'Critica'));
  test('100% → Cheia', () => assert.equal(binStatusFromLevel(100), 'Cheia'));
});

// ---------- BIN_STATUS_LABEL ----------

describe('BIN_STATUS_LABEL', () => {
  test('todos os status tem label', () => {
    for (const key of ['Normal', 'Atencao', 'Proxima de cheia', 'Critica', 'Cheia']) {
      assert.ok(BIN_STATUS_LABEL[key], `label ausente para ${key}`);
    }
  });
  test('Atencao tem acento no label', () => assert.equal(BIN_STATUS_LABEL['Atencao'], 'Atenção'));
  test('Proxima de cheia tem label correto', () => assert.equal(BIN_STATUS_LABEL['Proxima de cheia'], 'Próxima de cheia'));
  test('Critica tem acento no label', () => assert.equal(BIN_STATUS_LABEL['Critica'], 'Crítica'));
});

// ---------- validateBinName ----------

describe('validateBinName', () => {
  test('nome valido retorna undefined', () => assert.equal(validateBinName('Lixeira da sala'), undefined));
  test('nome vazio retorna erro', () => assert.ok(validateBinName('')));
  test('nome so espacos retorna erro', () => assert.ok(validateBinName('   ')));
  test('nome com 80 chars valido', () => assert.equal(validateBinName('a'.repeat(80)), undefined));
  test('nome com 81 chars invalido', () => assert.ok(validateBinName('a'.repeat(81))));
});

// ---------- validateBinLocal ----------

describe('validateBinLocal', () => {
  test('local vazio valido (opcional)', () => assert.equal(validateBinLocal(''), undefined));
  test('local com 100 chars valido', () => assert.equal(validateBinLocal('a'.repeat(100)), undefined));
  test('local com 101 chars invalido', () => assert.ok(validateBinLocal('a'.repeat(101))));
});

// ---------- toBin (mapper) ----------

describe('toBin', () => {
  test('mapeia campos basicos corretamente', () => {
    const now = { toDate: () => new Date('2026-01-15T10:00:00Z') };
    const bin = toBin('BIN-0001', {
      nome: 'Sala', local: 'Bloco A', ownerId: 'uid123', members: ['uid123'],
      currentLevel: 75, status: 'Atencao', lastUpdate: now,
    });
    assert.equal(bin.id, 'BIN-0001');
    assert.equal(bin.name, 'Sala');
    assert.equal(bin.local, 'Bloco A');
    assert.equal(bin.ownerId, 'uid123');
    assert.deepEqual(bin.members, ['uid123']);
    assert.equal(bin.currentLevel, 75);
    assert.equal(bin.status, 'Atencao');
    assert.equal(bin.lastUpdate, '2026-01-15T10:00:00.000Z');
  });

  test('campos ausentes resultam em defaults seguros', () => {
    const bin = toBin('X', {});
    assert.equal(bin.name, '');
    assert.equal(bin.local, '');
    assert.equal(bin.ownerId, '');
    assert.deepEqual(bin.members, []);
    assert.equal(bin.currentLevel, null);
    assert.equal(bin.status, null);
    assert.equal(bin.lastUpdate, null);
  });

  test('lastUpdate como string e preservado', () => {
    const bin = toBin('X', { lastUpdate: '2026-01-01T00:00:00Z' });
    assert.equal(bin.lastUpdate, '2026-01-01T00:00:00Z');
  });
});

// ---------- toReading (mapper) ----------

describe('toReading', () => {
  test('mapeia campos corretamente', () => {
    const ts = { toDate: () => new Date('2026-03-10T08:30:00Z') };
    const r = toReading('m1', { binId: 'BIN-0001', level: 60, reason: 'reconnection', timestamp: ts });
    assert.equal(r.id, 'm1');
    assert.equal(r.binId, 'BIN-0001');
    assert.equal(r.level, 60);
    assert.equal(r.reason, 'reconnection');
    assert.equal(r.timestamp, '2026-03-10T08:30:00.000Z');
  });

  test('reason desconhecido vira level_change', () => {
    const ts = { toDate: () => new Date() };
    const r = toReading('m2', { binId: 'B', level: 0, reason: 'algo_desconhecido', timestamp: ts });
    assert.equal(r.reason, 'level_change');
  });
});

// ---------- BinService validacao ----------

describe('BinService.claimBin validacao', () => {
  function makeGateway(overrides = {}) {
    return {
      listBins: async () => [],
      getBin: async () => null,
      claimBin: async () => {},
      updateBinMeta: async () => {},
      addMember: async () => {},
      removeMember: async () => {},
      listReadings: async () => [],
      ...overrides,
    };
  }

  test('binId vazio lanca bin/invalid-id', async () => {
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.claimBin('', 'uid', 'Nome', ''), { code: 'bin/invalid-id' });
  });

  test('nome vazio lanca bin/invalid-name', async () => {
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.claimBin('BIN-0001', 'uid', '', ''), { code: 'bin/invalid-name' });
  });

  test('local com mais de 100 chars lanca bin/invalid-local', async () => {
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.claimBin('BIN-0001', 'uid', 'Nome', 'x'.repeat(101)), { code: 'bin/invalid-local' });
  });

  test('claim valido chama gateway.claimBin com uppercase binId', async () => {
    let called = null;
    const svc = new BinService(makeGateway({ claimBin: async (id, uid, name, local) => { called = { id, uid, name, local }; } }));
    await svc.claimBin('bin-0001', 'uid123', 'Sala', 'Bloco A');
    assert.equal(called.id, 'BIN-0001');
    assert.equal(called.name, 'Sala');
  });
});

describe('BinService.addMember validacao', () => {
  function makeGateway(overrides = {}) {
    return {
      listBins: async () => [], getBin: async () => null, claimBin: async () => {},
      updateBinMeta: async () => {}, addMember: async () => {}, removeMember: async () => {}, listReadings: async () => [],
      ...overrides,
    };
  }
  function makeBin(members = ['ownerUID12345678901234']) {
    return { id: 'BIN-0001', name: 'X', local: 'Y', ownerId: members[0], members, currentLevel: 50, status: 'Normal', lastUpdate: null };
  }

  test('uid invalido lanca bin/invalid-uid', async () => {
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.addMember(makeBin(), 'x'), { code: 'bin/invalid-uid' });
  });

  test('uid ja membro e idempotente (sem chamada ao gateway)', async () => {
    let called = false;
    const uid = 'ownerUID12345678901234';
    const svc = new BinService(makeGateway({ addMember: async () => { called = true; } }));
    await svc.addMember(makeBin([uid]), uid);
    assert.equal(called, false);
  });

  test('10 membros lanca bin/members-limit', async () => {
    const uids = Array.from({ length: 10 }, (_, i) => `MemberUIDMemberUID${String(i).padStart(4,'0')}`);
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.addMember(makeBin(uids), 'NewMemberUID1234567890'), { code: 'bin/members-limit' });
  });
});

describe('BinService.removeMember validacao', () => {
  function makeGateway(overrides = {}) {
    return {
      listBins: async () => [], getBin: async () => null, claimBin: async () => {},
      updateBinMeta: async () => {}, addMember: async () => {}, removeMember: async () => {}, listReadings: async () => [],
      ...overrides,
    };
  }
  const owner = 'OwnerUID1234567890123456';
  const member = 'MemberUID123456789012345';
  function makeBin() {
    return { id: 'BIN-0001', name: 'X', local: 'Y', ownerId: owner, members: [owner, member], currentLevel: 50, status: 'Normal', lastUpdate: null };
  }

  test('owner nao pode remover a si mesmo', async () => {
    const svc = new BinService(makeGateway());
    await assert.rejects(() => svc.removeMember(makeBin(), owner, owner), { code: 'bin/cannot-remove-owner' });
  });

  test('remover uid que nao e membro e idempotente', async () => {
    let called = false;
    const svc = new BinService(makeGateway({ removeMember: async () => { called = true; } }));
    await svc.removeMember(makeBin(), owner, 'NaoEhMembroUID123456789');
    assert.equal(called, false);
  });

  test('remover membro valido chama gateway', async () => {
    let called = null;
    const svc = new BinService(makeGateway({ removeMember: async (id, uid) => { called = { id, uid }; } }));
    await svc.removeMember(makeBin(), owner, member);
    assert.equal(called.uid, member);
  });
});
