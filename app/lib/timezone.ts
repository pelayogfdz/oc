// Timezone-aware date utilities that run on both client and server.

export function getUtcDateFromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timezone: string
): Date {
  // Approximate UTC date (assume 0 offset)
  const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  
  // Format the approximation to see what local time it is in the target timezone
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
  
  const parts = formatter.formatToParts(approxUtc);
  const lYear = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const lMonth = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const lDay = parseInt(parts.find(p => p.type === 'day')!.value, 10);
  const lHourStr = parts.find(p => p.type === 'hour')!.value;
  let lHour = parseInt(lHourStr, 10);
  if (lHour === 24) lHour = 0;
  const lMinute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);
  const lSecond = parseInt(parts.find(p => p.type === 'second')!.value, 10);

  // Construct local date time in UTC terms
  const localUtc = Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute, lSecond, ms);
  
  // Calculate the offset: approxUtc - localUtc
  const offset = approxUtc.getTime() - localUtc;
  
  // Return the adjusted UTC date
  return new Date(approxUtc.getTime() + offset);
}

export function getLocalTodayRange(timezone: string) {
  const now = new Date();
  
  // Format current time in target timezone to get local date components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find(p => p.type === 'month')!.value, 10);
  const day = parseInt(parts.find(p => p.type === 'day')!.value, 10);

  const startUtc = getUtcDateFromLocal(year, month, day, 0, 0, 0, 0, timezone);
  const endUtc = getUtcDateFromLocal(year, month, day, 23, 59, 59, 999, timezone);
  
  return { startUtc, endUtc };
}

export function formatTime12h(dateStr: string | Date, timezone: string): string {
  const date = new Date(dateStr);
  const timeString = date.toLocaleTimeString('es-MX', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return timeString
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/([ap]\.?m\.?)/g, ' $1')
    .replace(/am/g, 'a.m.')
    .replace(/pm/g, 'p.m.');
}

export function formatDateLocal(
  dateStr: string | Date, 
  timezone: string, 
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateStr);
  const opts = options || { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('es-MX', {
    timeZone: timezone,
    ...opts
  });
}
