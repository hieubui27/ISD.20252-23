export function isTodayUTC(date: Date | null | undefined): boolean {
  if (!date) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const compareDate = new Date(date);
  compareDate.setUTCHours(0, 0, 0, 0);

  return compareDate.getTime() === today.getTime();
}

export function getStartOfTodayUTC(): Date {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}
