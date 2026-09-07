import { getUtcDateFromLocal } from '@/app/lib/timezone';

export function getTaskPeriodBounds(recurrence: string, refDate: Date = new Date(), timezone: string = 'America/Mexico_City') {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
  const parts = formatter.formatToParts(refDate);
  const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  if (recurrence === 'DAILY') {
    const startUtc = getUtcDateFromLocal(year, month, day, 0, 0, 0, 0, timezone);
    const endUtc = getUtcDateFromLocal(year, month, day, 23, 59, 59, 999, timezone);
    return { startUtc, endUtc };
  }

  if (recurrence === 'WEEKLY') {
    const localDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayOfWeek = localDate.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(localDate);
    monday.setUTCDate(localDate.getUTCDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const mYear = monday.getUTCFullYear();
    const mMonth = monday.getUTCMonth() + 1;
    const mDay = monday.getUTCDate();

    const sYear = sunday.getUTCFullYear();
    const sMonth = sunday.getUTCMonth() + 1;
    const sDay = sunday.getUTCDate();

    const startUtc = getUtcDateFromLocal(mYear, mMonth, mDay, 0, 0, 0, 0, timezone);
    const endUtc = getUtcDateFromLocal(sYear, sMonth, sDay, 23, 59, 59, 999, timezone);
    return { startUtc, endUtc };
  }

  if (recurrence === 'MONTHLY') {
    const startUtc = getUtcDateFromLocal(year, month, 1, 0, 0, 0, 0, timezone);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const endUtc = getUtcDateFromLocal(year, month, lastDayOfMonth, 23, 59, 59, 999, timezone);
    return { startUtc, endUtc };
  }

  // ONCE or default
  return { startUtc: new Date(0), endUtc: new Date(8640000000000000) };
}

export function isTaskCompletedForCurrentPeriod(
  task: { status: string; recurrence: string; completedAt?: Date | string | null },
  timezone: string = 'America/Mexico_City'
): boolean {
  if (task.status !== 'COMPLETED' || !task.completedAt) {
    return false;
  }
  if (task.recurrence === 'ONCE' || !task.recurrence) {
    return true;
  }

  const completedDate = new Date(task.completedAt);
  const { startUtc, endUtc } = getTaskPeriodBounds(task.recurrence, new Date(), timezone);
  return completedDate >= startUtc && completedDate <= endUtc;
}

export function getEffectiveDueDate(
  task: { recurrence: string; dueDate?: Date | string | null },
  timezone: string = 'America/Mexico_City'
): Date | null {
  if (!task.dueDate) return null;
  const originalDue = new Date(task.dueDate);
  if (isNaN(originalDue.getTime())) return null;
  if (task.recurrence === 'ONCE' || !task.recurrence) return originalDue;

  // Extract time of day from originalDue in target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dueParts = formatter.formatToParts(originalDue);
  const dueHourStr = dueParts.find(p => p.type === 'hour')!.value;
  let dueHour = parseInt(dueHourStr, 10);
  if (dueHour === 24) dueHour = 0;
  const dueMinute = parseInt(dueParts.find(p => p.type === 'minute')!.value, 10);
  const dueSecond = parseInt(dueParts.find(p => p.type === 'second')!.value, 10);

  const nowParts = formatter.formatToParts(new Date());
  const curYear = parseInt(nowParts.find(p => p.type === 'year')!.value, 10);
  const curMonth = parseInt(nowParts.find(p => p.type === 'month')!.value, 10);
  const curDay = parseInt(nowParts.find(p => p.type === 'day')!.value, 10);

  if (task.recurrence === 'DAILY') {
    return getUtcDateFromLocal(curYear, curMonth, curDay, dueHour, dueMinute, dueSecond, 0, timezone);
  }

  if (task.recurrence === 'WEEKLY') {
    const origYear = parseInt(dueParts.find(p => p.type === 'year')!.value, 10);
    const origMonth = parseInt(dueParts.find(p => p.type === 'month')!.value, 10);
    const origDay = parseInt(dueParts.find(p => p.type === 'day')!.value, 10);
    const origDateUtc = new Date(Date.UTC(origYear, origMonth - 1, origDay, 12, 0, 0));
    const targetDayOfWeek = origDateUtc.getUTCDay(); // 0-6

    const localNow = new Date(Date.UTC(curYear, curMonth - 1, curDay, 12, 0, 0));
    const nowDayOfWeek = localNow.getUTCDay();
    const diffToMonday = nowDayOfWeek === 0 ? -6 : 1 - nowDayOfWeek;
    const monday = new Date(localNow);
    monday.setUTCDate(localNow.getUTCDate() + diffToMonday);

    const targetDayOffset = targetDayOfWeek === 0 ? 6 : targetDayOfWeek - 1;
    const targetDate = new Date(monday);
    targetDate.setUTCDate(monday.getUTCDate() + targetDayOffset);

    return getUtcDateFromLocal(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth() + 1,
      targetDate.getUTCDate(),
      dueHour,
      dueMinute,
      dueSecond,
      0,
      timezone
    );
  }

  if (task.recurrence === 'MONTHLY') {
    const origDay = parseInt(dueParts.find(p => p.type === 'day')!.value, 10);
    const lastDay = new Date(Date.UTC(curYear, curMonth, 0)).getUTCDate();
    const targetDay = Math.min(origDay, lastDay);
    return getUtcDateFromLocal(curYear, curMonth, targetDay, dueHour, dueMinute, dueSecond, 0, timezone);
  }

  return originalDue;
}
