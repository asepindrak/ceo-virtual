/**
 * 🕒 Timezone Helper for Autonomous Office Agents
 * Formats live time and date per agent's assigned timezone.
 */

export interface TimezoneOption {
  value: string;
  label: string;
  city: string;
  utcOffset: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Jakarta', label: 'WIB (Asia/Jakarta)', city: 'Jakarta, ID', utcOffset: 'UTC+7' },
  { value: 'Asia/Makassar', label: 'WITA (Asia/Makassar)', city: 'Makassar / Bali, ID', utcOffset: 'UTC+8' },
  { value: 'Asia/Jayapura', label: 'WIT (Asia/Jayapura)', city: 'Jayapura, ID', utcOffset: 'UTC+9' },
  { value: 'Asia/Tokyo', label: 'JST (Asia/Tokyo)', city: 'Tokyo, JP', utcOffset: 'UTC+9' },
  { value: 'Asia/Singapore', label: 'SGT (Asia/Singapore)', city: 'Singapore, SG', utcOffset: 'UTC+8' },
  { value: 'Asia/Seoul', label: 'KST (Asia/Seoul)', city: 'Seoul, KR', utcOffset: 'UTC+9' },
  { value: 'Asia/Dubai', label: 'GST (Asia/Dubai)', city: 'Dubai, AE', utcOffset: 'UTC+4' },
  { value: 'Europe/London', label: 'GMT/BST (Europe/London)', city: 'London, UK', utcOffset: 'UTC+0/+1' },
  { value: 'Europe/Berlin', label: 'CET (Europe/Berlin)', city: 'Berlin, DE', utcOffset: 'UTC+1/+2' },
  { value: 'Europe/Paris', label: 'CET (Europe/Paris)', city: 'Paris, FR', utcOffset: 'UTC+1/+2' },
  { value: 'America/New_York', label: 'EST/EDT (America/New_York)', city: 'New York, US', utcOffset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'CST/CDT (America/Chicago)', city: 'Chicago, US', utcOffset: 'UTC-6/-5' },
  { value: 'America/Los_Angeles', label: 'PST/PDT (America/Los_Angeles)', city: 'San Francisco, US', utcOffset: 'UTC-8/-7' },
  { value: 'Australia/Sydney', label: 'AEST (Australia/Sydney)', city: 'Sydney, AU', utcOffset: 'UTC+10' },
];

export interface AgentTimeDetail {
  timezone: string;
  timeString: string; // e.g. "14:32:05"
  dateString: string; // e.g. "Jumat, 16 Oktober 2026"
  dayPeriod: string; // "Pagi", "Siang", "Sore", "Malam"
  fullFormatted: string; // "Jumat, 16 Oktober 2026 14:32:05 WIB (Asia/Jakarta)"
}

export function getAgentCurrentTime(timezone: string = 'Asia/Jakarta', dateObj: Date = new Date()): AgentTimeDetail {
  const tz = timezone || 'Asia/Jakarta';

  try {
    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: tz,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const hourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });

    const timeString = timeFormatter.format(dateObj);
    const dateString = dateFormatter.format(dateObj);
    const hourNum = parseInt(hourFormatter.format(dateObj), 10) || 0;

    let dayPeriod = 'Malam';
    if (hourNum >= 5 && hourNum < 11) {
      dayPeriod = 'Pagi';
    } else if (hourNum >= 11 && hourNum < 15) {
      dayPeriod = 'Siang';
    } else if (hourNum >= 15 && hourNum < 18) {
      dayPeriod = 'Sore';
    }

    const tzOption = COMMON_TIMEZONES.find((t) => t.value === tz);
    const label = tzOption?.label || tz;

    return {
      timezone: tz,
      timeString,
      dateString,
      dayPeriod,
      fullFormatted: `${dateString}, ${timeString} (${label})`,
    };
  } catch (err) {
    // Fallback if timezone string is invalid
    return {
      timezone: 'Asia/Jakarta',
      timeString: dateObj.toLocaleTimeString('id-ID'),
      dateString: dateObj.toLocaleDateString('id-ID'),
      dayPeriod: 'Hari',
      fullFormatted: `${dateObj.toLocaleString('id-ID')} (WIB)`,
    };
  }
}
