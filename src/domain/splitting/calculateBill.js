export function calculateBill(state) {
  const subtotal = state.items.reduce((sum, item) => sum + item.amount, 0);
  const serviceFee = state.serviceFee.enabled
    ? subtotal * (state.serviceFee.percent / 100)
    : 0;
  const grandTotal = subtotal + serviceFee;
  const breakdowns = createEmptyBreakdowns(state.people);

  let assignedSubtotal = 0;
  for (const item of state.items) {
    const itemTotal = item.amount;
    if (item.assignees.length === 0) continue;
    assignedSubtotal += itemTotal;
    assignItemToPeople(item, itemTotal, breakdowns);
  }

  for (const breakdown of Object.values(breakdowns)) {
    breakdown.feeShare = assignedSubtotal > 0
      ? serviceFee * (breakdown.baseTotal / assignedSubtotal)
      : 0;
    breakdown.grandTotal = breakdown.baseTotal + breakdown.feeShare;
  }

  return {
    subtotal,
    serviceFee,
    grandTotal,
    assignedSubtotal,
    unassignedSubtotal: subtotal - assignedSubtotal,
    breakdowns: Object.values(breakdowns),
  };
}

function createEmptyBreakdowns(people) {
  return Object.fromEntries(people.map((person) => [person.id, {
    id: person.id,
    name: person.name,
    items: [],
    baseTotal: 0,
    feeShare: 0,
    grandTotal: 0,
  }]));
}

function assignItemToPeople(item, itemTotal, breakdowns) {
  const share = itemTotal / item.assignees.length;
  for (const personId of item.assignees) {
    const breakdown = breakdowns[personId];
    if (!breakdown) continue;
    breakdown.items.push({
      name: item.name,
      quantity: item.quantity,
      splitCount: item.assignees.length,
      share,
    });
    breakdown.baseTotal += share;
  }
}
