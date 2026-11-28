import { describe, it, expect, vi } from 'vitest';
import {
  MAX_LOG_ENTRIES,
  formatArg,
  createLogCollector,
  installLogCollector,
  appLogCollector,
} from '../logCollector';

describe('formatArg', () => {
  it.each([
    [new TypeError('boom'), 'TypeError: boom'],
    ['texte', 'texte'],
    [undefined, 'undefined'],
    [{ a: 1 }, '{"a":1}'],
    [42, '42'],
  ])('%s -> %s', (arg, expected) => {
    expect(formatArg(arg)).toBe(expected);
  });

  it('objet circulaire -> texte de repli', () => {
    const circular = {};
    circular.self = circular;
    expect(formatArg(circular)).toBe('[object Object]');
  });
});

describe('createLogCollector', () => {
  it('enregistre niveau, heure et message', () => {
    const collector = createLogCollector({ now: () => 'T0' });
    collector.add('error', ['Échec', new Error('x')]);
    expect(collector.entries()).toEqual([
      { time: 'T0', level: 'error', message: 'Échec Error: x' },
    ]);
  });

  it('ne garde que les N derniers messages', () => {
    const collector = createLogCollector({ max: 2, now: () => 'T' });
    ['a', 'b', 'c'].forEach((m) => collector.add('warn', [m]));
    expect(collector.entries().map((e) => e.message)).toEqual(['b', 'c']);
  });

  it('entries() renvoie une copie et clear() vide', () => {
    const collector = createLogCollector();
    collector.add('warn', ['a']);
    collector.entries()[0].message = 'modifié';
    expect(collector.entries()[0].message).toBe('a');
    collector.clear();
    expect(collector.entries()).toEqual([]);
  });

  it('valeurs par défaut : 200 messages, heure ISO', () => {
    expect(MAX_LOG_ENTRIES).toBe(200);
    const collector = createLogCollector();
    collector.add('error', ['x']);
    expect(collector.entries()[0].time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(appLogCollector.entries).toBeTypeOf('function');
  });
});

describe('installLogCollector', () => {
  const setup = () => {
    const collector = createLogCollector({ now: () => 'T' });
    const target = new EventTarget();
    const fakeConsole = { error: vi.fn(), warn: vi.fn() };
    const originals = { ...fakeConsole };
    installLogCollector(collector, target, fakeConsole);
    return { collector, target, fakeConsole, originals };
  };

  it('capture console.error et console.warn sans les masquer', () => {
    const { collector, fakeConsole, originals } = setup();
    fakeConsole.error('e1');
    fakeConsole.warn('w1');
    expect(collector.entries().map((e) => [e.level, e.message])).toEqual([
      ['error', 'e1'],
      ['warn', 'w1'],
    ]);
    expect(originals.error).toHaveBeenCalledWith('e1');
    expect(originals.warn).toHaveBeenCalledWith('w1');
  });

  it('capture les erreurs non attrapées et les promesses rejetées', () => {
    const { collector, target } = setup();
    const errorEvent = new Event('error');
    errorEvent.error = new Error('crash');
    target.dispatchEvent(errorEvent);
    const messageOnly = new Event('error');
    messageOnly.message = 'script error';
    target.dispatchEvent(messageOnly);
    const rejection = new Event('unhandledrejection');
    rejection.reason = 'refusé';
    target.dispatchEvent(rejection);
    expect(collector.entries().map((e) => e.message)).toEqual([
      'Error: crash',
      'script error',
      'Unhandled promise rejection: refusé',
    ]);
  });
});
