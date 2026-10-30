'use strict';
/**
 * Testes para computeStats (HistoryStats) e lógica de formatação (BinHistoryScreen).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { computeStats } = require('../src/utils/binStats.ts');

function makeReading(level, reason = 'level_change', daysAgo = 0) {
  const ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return { id: `m${level}`, binId: 'BIN-0001', level, reason, timestamp: ts };
}

// ── computeStats ──────────────────────────────────────────────────────────────

describe('computeStats — lista vazia', () => {
  test('retorna zeros sem lançar exceção', () => {
    const s = computeStats([]);
    assert.equal(s.avg, 0);
    assert.equal(s.max, 0);
    assert.equal(s.min, 0);
    assert.equal(s.trend, 'stable');
    assert.equal(s.fillRate, 0);
    assert.equal(s.reconCount, 0);
  });
});

describe('computeStats — uma medição', () => {
  test('avg, max e min iguais ao único valor', () => {
    const s = computeStats([makeReading(65)]);
    assert.equal(s.avg, 65);
    assert.equal(s.max, 65);
    assert.equal(s.min, 65);
    assert.equal(s.trend, 'stable');
  });
});

describe('computeStats — múltiplas medições', () => {
  const readings = [
    makeReading(90), makeReading(80), makeReading(70),
    makeReading(60), makeReading(50), makeReading(40),
  ]; // em ordem decrescente (mais recente primeiro)

  test('max = 90, min = 40', () => {
    const s = computeStats(readings);
    assert.equal(s.max, 90);
    assert.equal(s.min, 40);
  });

  test('avg correto', () => {
    const s = computeStats(readings);
    assert.equal(s.avg, Math.round((90+80+70+60+50+40)/6)); // 65
  });

  test('tendência: recentes (90,80,70) > antigos (60,50,40) → up', () => {
    const s = computeStats(readings);
    assert.equal(s.trend, 'up');
  });

  test('fillRate: 2 de 6 acima de 80% → 33%', () => {
    const s = computeStats(readings);
    assert.equal(s.fillRate, 33);
  });
});

describe('computeStats — tendência de queda', () => {
  test('recentes baixos → trend=down', () => {
    const readings = [
      makeReading(30), makeReading(35),   // recentes (primeiros)
      makeReading(80), makeReading(85),   // antigos
    ];
    const s = computeStats(readings);
    assert.equal(s.trend, 'down');
  });
});

describe('computeStats — reconexões', () => {
  test('conta reconexões corretamente', () => {
    const readings = [
      makeReading(50, 'reconnection'),
      makeReading(55, 'level_change'),
      makeReading(60, 'reconnection'),
    ];
    const s = computeStats(readings);
    assert.equal(s.reconCount, 2);
  });
});

describe('computeStats — fillRate extremos', () => {
  test('100% acima de 80 quando todas as medições são >= 80', () => {
    const s = computeStats([makeReading(80), makeReading(90), makeReading(100)]);
    assert.equal(s.fillRate, 100);
  });

  test('0% quando nenhuma medição atinge 80', () => {
    const s = computeStats([makeReading(10), makeReading(50), makeReading(79)]);
    assert.equal(s.fillRate, 0);
  });
});
