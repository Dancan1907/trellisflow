import { computeProjection, recentDailyRate } from './goal-projection';

const now = new Date('2026-01-01T00:00:00Z');

describe('computeProjection', () => {
  it('returns ACHIEVED when current >= target', () => {
    const p = computeProjection({
      currentAmount: 2000,
      targetAmount: 2000,
      targetDate: null,
      dailyRate: 5,
      now,
    });
    expect(p.status).toBe('ACHIEVED');
  });

  it('returns NO_DATA when the rate is zero or negative', () => {
    expect(
      computeProjection({
        currentAmount: 0,
        targetAmount: 1000,
        targetDate: null,
        dailyRate: 0,
        now,
      }).status,
    ).toBe('NO_DATA');
    expect(
      computeProjection({
        currentAmount: 0,
        targetAmount: 1000,
        targetDate: null,
        dailyRate: -3,
        now,
      }).status,
    ).toBe('NO_DATA');
  });

  it('returns NO_DATA when projection is beyond ~10 years', () => {
    const p = computeProjection({
      currentAmount: 0,
      targetAmount: 1_000_000,
      targetDate: null,
      dailyRate: 1,
      now,
    });
    expect(p.status).toBe('NO_DATA');
    expect(p.projectedCompletionDate).toBeNull();
  });

  it('projects a date and reports ON_TRACK when ahead of target date', () => {
    const p = computeProjection({
      currentAmount: 1000,
      targetAmount: 2000,
      targetDate: new Date('2026-07-20T00:00:00Z'),
      dailyRate: 10,
      now,
    });
    expect(p.projectedCompletionDate).toBe('2026-04-11');
    expect(p.status).toBe('ON_TRACK');
    expect(p.daysAhead).toBe(100);
  });

  it('reports BEHIND when projected after target date', () => {
    const p = computeProjection({
      currentAmount: 1000,
      targetAmount: 2000,
      targetDate: new Date('2026-03-02T00:00:00Z'),
      dailyRate: 10,
      now,
    });
    expect(p.status).toBe('BEHIND');
    expect(p.daysAhead).toBe(-40);
  });

  it('reports NO_TARGET_DATE when no deadline is set', () => {
    const p = computeProjection({
      currentAmount: 1000,
      targetAmount: 2000,
      targetDate: null,
      dailyRate: 10,
      now,
    });
    expect(p.status).toBe('NO_TARGET_DATE');
    expect(p.projectedCompletionDate).toBe('2026-04-11');
  });

  it('computes the required monthly amount', () => {
    const p = computeProjection({
      currentAmount: 1000,
      targetAmount: 2000,
      targetDate: new Date('2026-04-11T00:00:00Z'),
      dailyRate: 0,
      now,
    });
    expect(p.requiredMonthly).toBeCloseTo(304.375, 1);
  });
});

describe('recentDailyRate', () => {
  const history = [
    { date: '2026-01-01', amount: 0 },
    { date: '2026-04-01', amount: 900 },
  ];

  it('returns 0 for empty history', () => {
    expect(recentDailyRate([], 0, 90, now)).toBe(0);
  });

  it('computes net per day across the window', () => {
    expect(recentDailyRate(history, 900, 90, new Date('2026-04-01T00:00:00Z'))).toBeCloseTo(10, 5);
  });

  it('lets the rate decay when the goal stops growing', () => {
    expect(recentDailyRate(history, 900, 90, new Date('2026-05-01T00:00:00Z'))).toBeCloseTo(7.5, 5);
  });
});
