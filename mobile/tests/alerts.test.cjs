'use strict';
/**
 * Testes unitários para lógica de alertas.
 * Cobre: crossedThresholds, highestCrossed, AlertService.saveAlert.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { crossedThresholds, highestCrossed } = require('../src/utils/alertLogic.ts');
const { AlertService } = require('../src/services/alertService.ts');

// helper inline para testar deduplicateReadings sem importar módulo com React
function deduplicateReadings(readings) {
  if (readings.length === 0) return readings;
  const result = [readings[0]];
  for (let i = 1; i < readings.length; i++) {
    if (readings[i].level !== readings[i - 1].level) result.push(readings[i]);
  }
  return result;
}

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

// ── deduplicateReadings ───────────────────────────────────────────────────────

describe('deduplicateReadings', () => {
  function r(level, id = `m${level}`) {
    return { id, binId: 'B', level, reason: 'level_change', timestamp: new Date().toISOString() };
  }

  test('lista vazia retorna vazia', () => {
    assert.deepEqual(deduplicateReadings([]), []);
  });

  test('sem duplicatas retorna igual', () => {
    const input = [r(80), r(60), r(40)];
    assert.deepEqual(deduplicateReadings(input), input);
  });

  test('remove consecutivos com mesmo level', () => {
    const input = [r(59,'a'), r(59,'b'), r(59,'c'), r(62,'d'), r(62,'e'), r(60,'f')];
    const result = deduplicateReadings(input);
    assert.deepEqual(result.map(x => x.id), ['a', 'd', 'f']);
  });

  test('mantém primeiro de cada grupo (ordem desc — mais recente primeiro)', () => {
    const input = [r(59,'newest'), r(59,'middle'), r(59,'oldest')];
    const result = deduplicateReadings(input);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'newest');
  });

  test('nao remove nao-consecutivos com mesmo level', () => {
    // 59 → 62 → 59: o segundo 59 não é consecutivo, deve aparecer
    const input = [r(59,'a'), r(62,'b'), r(59,'c')];
    const result = deduplicateReadings(input);
    assert.equal(result.length, 3);
  });
});

// ── removeGlitches (ping-pong filter) ─────────────────────────────────────────

describe('removeGlitches (A→B→A pattern < 3min)', () => {
  function r(level, timestamp, id = `m${level}`) {
    return { id, binId: 'B', level, reason: 'level_change', timestamp };
  }

  function time(base, offsetMinutes) {
    return new Date(base.getTime() + offsetMinutes * 60 * 1000).toISOString();
  }

  test('sem oscilação retorna igual', () => {
    const base = new Date('2026-11-21T23:00:00Z');
    const input = [
      r(12, time(base, 0)),
      r(15, time(base, 5)),
      r(20, time(base, 10)),
    ];
    // Simulando a lógica inline do fetchReadingsHistory
    const filtered = [];
    const THREE_MIN = 3 * 60 * 1000;
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const next = input[i + 1];
      const afterNext = input[i + 2];
      if (next && afterNext) {
        const currentTime = new Date(current.timestamp).getTime();
        const afterNextTime = new Date(afterNext.timestamp).getTime();
        const durationMs = Math.abs(currentTime - afterNextTime);
        if (current.level === afterNext.level && durationMs < THREE_MIN) {
          filtered.push(current);
          i++;
          continue;
        }
      }
      filtered.push(current);
    }
    assert.equal(filtered.length, 3);
  });

  test('remove ping-pong 12→48→12 em 2 minutos', () => {
    const base = new Date('2026-11-21T23:00:00Z');
    const input = [
      r(12, time(base, 0), 'a'),
      r(48, time(base, 1), 'b'),  // glitch
      r(12, time(base, 2), 'c'),
    ];
    const filtered = [];
    const THREE_MIN = 3 * 60 * 1000;
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const next = input[i + 1];
      const afterNext = input[i + 2];
      if (next && afterNext) {
        const currentTime = new Date(current.timestamp).getTime();
        const afterNextTime = new Date(afterNext.timestamp).getTime();
        const durationMs = Math.abs(currentTime - afterNextTime);
        if (current.level === afterNext.level && durationMs < THREE_MIN) {
          filtered.push(current);
          i++;
          continue;
        }
      }
      filtered.push(current);
    }
    assert.equal(filtered.length, 2);
    assert.equal(filtered[0].id, 'a');
    assert.equal(filtered[1].id, 'c');
  });

  test('não remove se duração >= 3 minutos (mudança legítima)', () => {
    const base = new Date('2026-11-21T23:00:00Z');
    const input = [
      r(12, time(base, 0), 'a'),
      r(48, time(base, 2), 'b'),  // durou 2 min, depois volta
      r(12, time(base, 4), 'c'),  // total 4 min entre a e c
    ];
    const filtered = [];
    const THREE_MIN = 3 * 60 * 1000;
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const next = input[i + 1];
      const afterNext = input[i + 2];
      if (next && afterNext) {
        const currentTime = new Date(current.timestamp).getTime();
        const afterNextTime = new Date(afterNext.timestamp).getTime();
        const durationMs = Math.abs(currentTime - afterNextTime);
        if (current.level === afterNext.level && durationMs < THREE_MIN) {
          filtered.push(current);
          i++;
          continue;
        }
      }
      filtered.push(current);
    }
    assert.equal(filtered.length, 3); // mantém todos
  });
});
