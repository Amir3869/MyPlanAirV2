import { describe, it, expect } from 'vitest';
import {
  getExpenseBudgetAmount,
  isMultiCurrencyExpense,
  getExpensesBudgetTotal,
} from './expenseHelpers';
import type { Expense } from '../store/types';

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1',
  category: 'food',
  label: 'Dîner',
  amount: 50,
  currency: 'EUR',
  amountHome: 50,
  homeCurrency: 'EUR',
  exchangeRate: 1,
  date: '2026-03-15',
  ...overrides,
});

describe('getExpenseBudgetAmount', () => {
  it('returns the paid amount when currency matches the budget currency', () => {
    const expense = makeExpense({ currency: 'EUR', amount: 50, amountHome: 50 });
    expect(getExpenseBudgetAmount(expense, 'EUR')).toBe(50);
  });

  it('returns the converted amount when currency differs from the budget currency', () => {
    const expense = makeExpense({ currency: 'MYR', amount: 50, amountHome: 10.3 });
    expect(getExpenseBudgetAmount(expense, 'EUR')).toBe(10.3);
  });

  it('falls back to the paid amount if the converted amount is invalid', () => {
    const expense = makeExpense({ currency: 'MYR', amount: 50, amountHome: NaN });
    expect(getExpenseBudgetAmount(expense, 'EUR')).toBe(50);
  });

  it('falls back to 0 if the paid amount itself is not finite', () => {
    const expense = makeExpense({ currency: 'EUR', amount: NaN, amountHome: NaN });
    expect(getExpenseBudgetAmount(expense, 'EUR')).toBe(0);
  });
});

describe('isMultiCurrencyExpense', () => {
  it('is false when currencies match', () => {
    expect(isMultiCurrencyExpense(makeExpense({ currency: 'EUR' }), 'EUR')).toBe(false);
  });

  it('is true when currencies differ', () => {
    expect(isMultiCurrencyExpense(makeExpense({ currency: 'MYR' }), 'EUR')).toBe(true);
  });
});

describe('getExpensesBudgetTotal', () => {
  it('sums budget amounts across expenses, converting multi-currency entries', () => {
    const expenses = [
      makeExpense({ id: '1', currency: 'EUR', amount: 20, amountHome: 20 }),
      makeExpense({ id: '2', currency: 'MYR', amount: 100, amountHome: 21.5 }),
    ];
    expect(getExpensesBudgetTotal(expenses, 'EUR')).toBeCloseTo(41.5);
  });

  it('returns 0 for an undefined or empty list', () => {
    expect(getExpensesBudgetTotal(undefined, 'EUR')).toBe(0);
    expect(getExpensesBudgetTotal([], 'EUR')).toBe(0);
  });
});
