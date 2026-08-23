import { describe, expect, it } from 'vitest';
import { calculateBill } from '../src/domain/splitting/calculateBill.js';

describe('bill calculation', () => {
  it('splits shared items and proportional service fees', () => {
    const state = {
      people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      items: [
        { name: '主餐', price: 200, quantity: 1, assignees: ['a'] },
        { name: '甜點', price: 100, quantity: 1, assignees: ['a', 'b'] },
      ],
      serviceFee: { enabled: true, percent: 10 },
    };

    const bill = calculateBill(state);
    expect(bill).toMatchObject({ subtotal: 300, serviceFee: 30, grandTotal: 330, unassignedSubtotal: 0 });
    expect(bill.breakdowns[0].grandTotal).toBeCloseTo(275);
    expect(bill.breakdowns[1].grandTotal).toBeCloseTo(55);
  });

  it('reports unassigned items without charging them to a person', () => {
    const state = {
      people: [{ id: 'a', name: 'A' }],
      items: [{ name: '未分配', price: 90, quantity: 1, assignees: [] }],
      serviceFee: { enabled: false, percent: 10 },
    };

    const bill = calculateBill(state);
    expect(bill.unassignedSubtotal).toBe(90);
    expect(bill.breakdowns[0].grandTotal).toBe(0);
  });
});
