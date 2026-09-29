// A slot is due from its hour until the next slot's hour. A morning post that
// failed all morning is dropped once the evening slot opens, instead of going
// out minutes before the evening one.
export function dueSlot(slots, hour, isComplete) {
  const ordered = [...slots].sort(([, left], [, right]) => left - right);
  for (const [index, [name, start]] of ordered.entries()) {
    const end = ordered[index + 1]?.[1] ?? 24;
    if (hour >= start && hour < end) return isComplete(name) ? null : name;
  }
  return null;
}
