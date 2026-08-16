const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+07:00`);
  }
  return new Date(value);
}

export function formatThaiDate(value?: string): string {
  if (!value) return "-";

  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatThaiDateTime(value?: string): string {
  if (!value) return "-";

  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: BANGKOK_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(", ", " เวลา ") + " น.";
}
