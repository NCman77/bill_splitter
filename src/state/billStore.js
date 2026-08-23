const INITIAL_SERVICE_FEE = Object.freeze({ enabled: false, percent: 10 });

export function createBillStore() {
  let state = createInitialState();
  const listeners = new Set();

  const publish = () => listeners.forEach((listener) => listener(state));
  const update = (updater) => {
    state = updater(state);
    publish();
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    addPerson(name) {
      const trimmedName = name.trim();
      if (!trimmedName) return false;
      update((current) => ({
        ...current,
        people: [...current.people, { id: createId('person'), name: trimmedName.slice(0, 30) }],
      }));
      return true;
    },
    removePerson(personId) {
      if (state.people.length <= 1) return false;
      update((current) => ({
        ...current,
        people: current.people.filter((person) => person.id !== personId),
        items: current.items.map((item) => ({
          ...item,
          assignees: item.assignees.filter((id) => id !== personId),
        })),
      }));
      return true;
    },
    addManualItem() {
      update((current) => ({
        ...current,
        items: [...current.items, createItem({ name: '新餐點', price: 100, quantity: 1 })],
      }));
    },
    addReceipt(receipt, { replaceBatchId } = {}) {
      const batchId = createId('receipt');
      update((current) => {
        const retainedItems = replaceBatchId
          ? current.items.filter((item) => item.batchId !== replaceBatchId)
          : current.items;
        const receiptItems = receipt.items.map((item) => createItem({ ...item, batchId }));
        return {
          ...current,
          items: [...retainedItems, ...receiptItems],
          serviceFee: receipt.hasServiceFee
            ? { ...current.serviceFee, enabled: true }
            : current.serviceFee,
        };
      });
      return batchId;
    },
    removeItem(itemId) {
      update((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== itemId),
      }));
    },
    updateItem(itemId, field, rawValue) {
      update((current) => ({
        ...current,
        items: current.items.map((item) => item.id === itemId
          ? updateItemField(item, field, rawValue)
          : item),
      }));
    },
    toggleAssignee(itemId, personId) {
      update((current) => ({
        ...current,
        items: current.items.map((item) => item.id === itemId
          ? { ...item, assignees: togglePerson(item.assignees, personId, current.people) }
          : item),
      }));
    },
    setServiceFeeEnabled(enabled) {
      update((current) => ({
        ...current,
        serviceFee: { ...current.serviceFee, enabled },
      }));
    },
    setServiceFeePercent(rawPercent) {
      const percent = Math.max(0, Number(rawPercent) || 0);
      update((current) => ({
        ...current,
        serviceFee: { ...current.serviceFee, percent },
      }));
    },
    loadScenario() {
      state = createScenarioState();
      publish();
    },
  };
}

function createInitialState() {
  return { people: [], items: [], serviceFee: { ...INITIAL_SERVICE_FEE } };
}

function createItem({
  name,
  price,
  quantity = 1,
  assignees = [],
  confidence = 1,
  needsReview = false,
  bbox,
  batchId,
}) {
  return {
    id: createId('item'),
    name,
    price: Number(price) || 0,
    quantity: Math.max(1, Number.parseInt(quantity, 10) || 1),
    assignees: [...assignees],
    confidence,
    needsReview,
    bbox,
    batchId,
  };
}

function updateItemField(item, field, rawValue) {
  if (field === 'price') return { ...item, price: Math.max(0, Number(rawValue) || 0) };
  if (field === 'quantity') {
    return { ...item, quantity: Math.max(1, Number.parseInt(rawValue, 10) || 1) };
  }
  if (field === 'name') return { ...item, name: String(rawValue).trim().slice(0, 40) || '未命名餐點' };
  return item;
}

function togglePerson(currentAssignees, personId, people) {
  if (personId === 'ALL') {
    return currentAssignees.length === people.length ? [] : people.map((person) => person.id);
  }
  return currentAssignees.includes(personId)
    ? currentAssignees.filter((id) => id !== personId)
    : [...currentAssignees, personId];
}

function createScenarioState() {
  const people = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: createId('person'), name }));
  const personId = (index) => people[index].id;
  const items = [
    ['松露野菇燉飯', 320, 1, [0]], ['雞腿飯', 250, 1, [1]],
    ['青醬海鮮義大利麵', 350, 1, [3]], ['炒泡麵', 120, 1, [4]],
    ['紅醬義大利麵', 350, 1, [2]], ['酥炸洋蔥圈', 150, 1, [0, 1, 2]],
    ['提拉米蘇', 120, 1, [3, 4]], ['熱拿鐵', 130, 1, [0]],
    ['柳橙汁', 99, 2, [1, 2]], ['西瓜汁', 99, 1, [3]],
  ].map(([name, price, quantity, indices]) => createItem({
    name,
    price,
    quantity,
    assignees: indices.map(personId),
  }));

  return { people, items, serviceFee: { ...INITIAL_SERVICE_FEE } };
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
