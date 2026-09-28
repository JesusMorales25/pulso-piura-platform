type SlotIdentity = {
  startsAt: string;
  endsAt: string;
};

export function reconcileSelectedSlots<T extends SlotIdentity>(
  selected: T[],
  freshAvailability: { slots: SlotIdentity[] },
): T[] {
  return selected.filter((selectedSlot) =>
    freshAvailability.slots.some(
      (freshSlot) =>
        freshSlot.startsAt === selectedSlot.startsAt &&
        freshSlot.endsAt === selectedSlot.endsAt,
    ),
  );
}
