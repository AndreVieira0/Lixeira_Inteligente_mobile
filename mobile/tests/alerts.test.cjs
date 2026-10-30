'use strict';
/**
 * Testes unitários para lógica de alertas.
 * Cobre: crossedThresholds, highestCrossed, AlertService.saveAlert.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { crossedThresholds, highestCrossed } = require('../src/utils/alertLogic.ts');
const { AlertService } = require('../src/services/alertService.ts');

// ── crossedThresholds ─────────────────────────────────────────────────────────

describe('crossedThresholds — comportamento básico', () => {
  test('nenhum threshold cruzado quando nivel nao muda', () => {
    assert.deepEqual(crossedThresholds(60, 60, [50, 80]), []);
  });

  test('cruzamento para cima detectado', () => {
    assert.deepEqual(crossedThresholds(75, 82, [80]), [80]);
  });

  test('threshold de 50 cruzado entre 45 e 52', () => {
    assert.deepEqual(crossedThresholds(45, 52, [50, 80]), [50]);
  });

  test('dois thresholds cruzados de uma vez (salto grande)', () => {
    const crossed = crossedThresholds(40, 95, [50, 80, 90]);
    assert.deepEqual(crossed.sort((a, b) => a - b), [50, 80, 90]);
  });

  test('queda de nivel nao gera alerta', () => {
    assert.deepEqual(crossedThresholds(90, 60, [50, 80]), []);
  });

  test('nivel exato no threshold conta como cruzamento', () => {
    assert.deepEqual(crossedThresholds(79, 80, [80]), [80]);
  });

  test('nivel ja estava acima do threshold nao re-notifica', () => {
    assert.deepEqual(crossedThresholds(85, 90, [80]), []);
  });

  test('oldLevel null → todos os thresholds <= newLevel cruzados', () => {
    const crossed = crossedThresholds(null, 85, [50, 80, 90]);
    assert.deepEqual(crossed.sort((a, b) => a - b), [50, 80]);
  });

  test('newLevel null retorna vazio', () => {
    assert.deepEqual(crossedThresholds(50, null, [80]), []);
  });

  test('thresholds vazios retorna vazio', () => {
    assert.deepEqual(crossedThresholds(50, 90, []), []);
  });
});

// ── highestCrossed ────────────────────────────────────────────────────────────

describe('highestCrossed', () => {
  test('retorna o maior threshold cruzado', () => {
    assert.equal(highestCrossed(40, 95, [50, 80, 90]), 90);
  });

  test('retorna null quando nenhum cruzado', () => {
    assert.equal(highestCrossed(85, 90, [80]), null);
  });

  test('retorna o unico threshold cruzado', () => {
    assert.equal(highestCrossed(75, 82, [80, 90]), 80);
  });
});

// ── AlertService.saveAlert ────────────────────────────────────────────────────

describe('AlertService.saveAlert — validação', () => {
  function makeGateway(onSave) {
    return {
      listAlerts: async () => [],
      getAlert: async () => null,
      saveAlert: onSave || (async () => {}),
      deleteAlert: async () => {},
    };
  }

  test('remove thresholds inválidos (não presentes nos presets)', async () => {
    let savedThresholds;
    const svc = new AlertService(makeGateway(async (_bin, _uid, t) => { savedThresholds = t; }));
    await svc.saveAlert('BIN-0001', 'uid', [50, 75, 80, 100], true); // 75 nao e preset
    assert.deepEqual(savedThresholds, [50, 80, 100]);
  });

  test('deduplica thresholds', async () => {
    let savedThresholds;
    const svc = new AlertService(makeGateway(async (_b, _u, t) => { savedThresholds = t; }));
    await svc.saveAlert('BIN-0001', 'uid', [80, 80, 50, 50], true);
    assert.deepEqual(savedThresholds, [50, 80]);
  });

  test('ordena thresholds em ordem crescente', async () => {
    let savedThresholds;
    const svc = new AlertService(makeGateway(async (_b, _u, t) => { savedThresholds = t; }));
    await svc.saveAlert('BIN-0001', 'uid', [100, 50, 80, 90], true);
    assert.deepEqual(savedThresholds, [50, 80, 90, 100]);
  });

  test('lista vazia de thresholds é salva (notificações desativadas)', async () => {
    let savedThresholds;
    const svc = new AlertService(makeGateway(async (_b, _u, t) => { savedThresholds = t; }));
    await svc.saveAlert('BIN-0001', 'uid', [], true);
    assert.deepEqual(savedThresholds, []);
  });
});
