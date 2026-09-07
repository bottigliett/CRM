/**
 * iCalendar (ICS) feed generator for the CRM agenda.
 *
 * Produces a read-only "METHOD:PUBLISH" feed that Apple Calendar (and any CalDAV
 * client) can subscribe to. Events are emitted with a stable UID so that edits and
 * deletions in the CRM are reflected on the subscribed calendar on the next refresh.
 */
import prisma from '../config/database';

const CAL_NAME = 'Mismo - Agenda';
const TZ = 'Europe/Rome';

/** Escape an iCalendar text value (RFC 5545 §3.3.11). */
function icsText(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Format a Date as a UTC iCalendar date-time: YYYYMMDDTHHMMSSZ */
function icsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Return YYYYMMDD for a Date in the configured timezone (used for all-day events). */
function icsZonedDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}${get('month')}${get('day')}`;
}

/** Fold a line to <= 75 octets per RFC 5545 (continuation lines start with a space). */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let out = '';
  let current = '';
  for (const ch of line) {
    const next = current + ch;
    if (encoder.encode(next).length > 75) {
      out += current + '\r\n ';
      current = ch;
    } else {
      current = next;
    }
  }
  return out + current;
}

interface FeedEvent {
  id: number;
  title: string;
  description: string | null;
  startDateTime: Date;
  endDateTime: Date;
  location: string | null;
  notes: string | null;
  status: string | null;
  color: string | null;
  isAllDay: boolean;
  contact?: { name: string } | null;
  category?: { name: string; color: string | null } | null;
}

/** Build one VEVENT block. */
function buildVEvent(e: FeedEvent): string {
  const lines: string[] = [];
  const color = e.category?.color || e.color || '#3b82f6';

  lines.push('BEGIN:VEVENT');
  lines.push(`UID:mismo-event-${e.id}@studiomismo.com`);
  lines.push(`DTSTAMP:${icsUtc(new Date())}`);

  if (e.isAllDay) {
    // All-day: VALUE=DATE, DTEND is exclusive (day after the last day).
    lines.push(`DTSTART;VALUE=DATE:${icsZonedDate(e.startDateTime)}`);
    const end = new Date(e.endDateTime);
    const endYmd = icsZonedDate(end);
    // Add one day to the zoned end date for the exclusive DTEND.
    const [y, m, d] = endYmd.match(/\d{4}|\d{2}/g)!.map(Number);
    const exclusive = new Date(Date.UTC(y, m - 1, d + 1));
    const exYmd = exclusive.toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(`DTEND;VALUE=DATE:${exYmd}`);
  } else {
    lines.push(`DTSTART:${icsUtc(e.startDateTime)}`);
    lines.push(`DTEND:${icsUtc(e.endDateTime)}`);
  }

  lines.push(`SUMMARY:${icsText(e.title)}`);

  const descParts: string[] = [];
  if (e.description) descParts.push(e.description);
  if (e.notes) descParts.push(e.notes);
  if (e.contact?.name) descParts.push(`Contatto: ${e.contact.name}`);
  if (descParts.length) lines.push(`DESCRIPTION:${icsText(descParts.join('\n'))}`);

  if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
  if (color) lines.push(`X-APPLE-CALENDAR-COLOR:${color}`);

  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

/** Generate the complete iCalendar feed for the CRM agenda. */
export async function generateCalendarIcs(): Promise<string> {
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000); // last 60 days
  const events = await prisma.event.findMany({
    where: {
      status: { not: 'cancelled' },
      endDateTime: { gte: since },
    },
    include: {
      category: { select: { name: true, color: true } },
      contact: { select: { name: true } },
    },
    orderBy: { startDateTime: 'asc' },
  });

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mismo Studio//Agenda//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(CAL_NAME)}`,
    `X-WR-TIMEZONE:${TZ}`,
  ].map(foldLine).join('\r\n');

  const body = events.map(buildVEvent).join('\r\n');

  return `${header}\r\n${body}\r\nEND:VCALENDAR\r\n`;
}
