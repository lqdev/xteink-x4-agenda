export const WIDTH = 480;
export const HEIGHT = 800;

export const defaultAgenda = {
  date: null,
  schedule: [
    { time: "08:00", label: "Plan the day" },
    { time: "09:00", label: "Deep work" },
    { time: "10:30", label: "Break / walk" },
    { time: "11:00", label: "Project block" },
    { time: "13:00", label: "Lunch / reset" },
    { time: "14:00", label: "Admin / messages" },
    { time: "16:00", label: "Exercise" },
    { time: "18:00", label: "Shutdown ritual" },
  ],
  calendar: null,
  scheduleLimit: 8,
  footer: "STATIC PLAN / LIVE CALENDAR",
};

export function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function localDate(value) {
  if (!value) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid date "${value}". Use YYYY-MM-DD.`);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function decodeIcsText(value) {
  return String(value ?? "")
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

export function unfoldIcs(textValue) {
  return String(textValue)
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter(Boolean);
}

export function parseIcs(textValue) {
  const events = [];
  let event = null;

  for (const line of unfoldIcs(textValue)) {
    const upperLine = line.toUpperCase();
    if (upperLine === "BEGIN:VEVENT") {
      event = {};
      continue;
    }
    if (upperLine === "END:VEVENT") {
      if (event) events.push(event);
      event = null;
      continue;
    }
    if (!event) continue;

    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const property = line.slice(0, separator).split(";");
    const name = property.shift().toUpperCase();
    const params = {};
    for (const parameter of property) {
      const equals = parameter.indexOf("=");
      if (equals < 0) continue;
      params[parameter.slice(0, equals).toUpperCase()] = parameter.slice(equals + 1);
    }
    event[name] = {
      value: decodeIcsText(line.slice(separator + 1)),
      params,
    };
  }

  return events;
}

export function parseIcsDate(property) {
  if (!property?.value) return null;
  const value = property.value;
  const allDay = property.params.VALUE?.toUpperCase() === "DATE" || /^\d{8}$/.test(value);
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour = "00", minute = "00", second = "00", utc] = match;
  if (allDay) {
    return { allDay: true, dateKey: `${year}-${month}-${day}`, time: "ALL DAY" };
  }

  if (utc) {
    const instant = new Date(Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    ));
    return {
      allDay: false,
      dateKey: dateKey(instant),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(instant),
    };
  }

  return {
    allDay: false,
    dateKey: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

export function calendarSources(calendar) {
  if (!calendar) return [];
  if (typeof calendar === "string") return [calendar];
  if (Array.isArray(calendar.sources)) return calendar.sources;
  return calendar.source ? [calendar.source] : [];
}

export function calendarEventLabel(event, includeRegional) {
  let summary = event.SUMMARY?.value || "Calendar event";
  summary = summary.replace(/^USA:\s*/i, "");
  if (includeRegional && event.LOCATION?.value) {
    const location = event.LOCATION.value.replace(/^USA:\s*/i, "");
    if (location && location.toUpperCase() !== "USA") summary += ` - ${location}`;
  }
  return summary;
}

/**
 * Load one or more ICS sources. The reader is injected so this same logic can
 * consume files/URLs in Node and text selected by a browser user.
 */
export async function loadCalendarData(calendar, agendaDate, readSource) {
  const sources = calendarSources(calendar);
  if (!sources.length) return { today: [], monthEvents: [] };
  if (typeof readSource !== "function") {
    throw new Error("A calendar source reader is required.");
  }

  const includeRegional = typeof calendar === "object" && Boolean(calendar.includeRegional);
  const targetDate = dateKey(localDate(agendaDate));
  const targetMonth = targetDate.slice(0, 7);
  const events = [];

  for (const source of sources) {
    let ics;
    try {
      ics = await readSource(source);
    } catch (error) {
      throw new Error(`Could not read calendar "${source}": ${error.message}`);
    }

    for (const event of parseIcs(ics)) {
      const start = parseIcsDate(event.DTSTART);
      if (!start) continue;
      const location = event.LOCATION?.value || "";
      const summary = event.SUMMARY?.value || "";
      const regional =
        (location && location.toUpperCase() !== "USA") ||
        /\(Regional Holiday\)/i.test(summary);
      if (!includeRegional && regional) continue;
      events.push({
        dateKey: start.dateKey,
        dateLabel: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(localDate(start.dateKey)),
        time: start.time,
        label: calendarEventLabel(event, includeRegional),
        calendarEvent: true,
      });
    }
  }

  const unique = new Map();
  for (const event of events) {
    unique.set(`${event.dateKey}|${event.time}|${event.label}`, event);
  }
  const allEvents = [...unique.values()];
  return {
    today: allEvents.filter((event) => event.dateKey === targetDate),
    monthEvents: allEvents.filter((event) => event.dateKey.startsWith(targetMonth)),
  };
}

export function mergeSchedule(manualSchedule, calendarSchedule, limit) {
  const manual = Array.isArray(manualSchedule) ? manualSchedule : [];
  const all = [...(calendarSchedule || []), ...manual];
  all.sort((left, right) => {
    if (left.time === right.time) return 0;
    if (left.time === "ALL DAY") return -1;
    if (right.time === "ALL DAY") return 1;
    return String(left.time).localeCompare(String(right.time));
  });
  return all.slice(0, Math.max(1, Number(limit) || 8));
}

export function dateParts(value) {
  const date = localDate(value);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date),
    monthDay: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date),
    shortDate: new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
    }).format(date),
  };
}

export function truncate(value, length) {
  const textValue = String(value ?? "");
  return textValue.length > length ? `${textValue.slice(0, length - 3)}...` : textValue;
}

function text(x, y, value, attributes = "") {
  return `<text x="${x}" y="${y}" ${attributes}>${escapeXml(value)}</text>`;
}

function rect(x, y, width, height, attributes = "") {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ${attributes}/>`;
}

function line(x1, y1, x2, y2, attributes = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attributes}/>`;
}

export function buildSvg(input) {
  const agenda = { ...defaultAgenda, ...input };
  const agendaDate = localDate(agenda.date);
  const parts = dateParts(agenda.date);
  const schedule = Array.isArray(agenda.schedule) ? agenda.schedule.slice(0, 8) : [];
  const todayEvents = Array.isArray(agenda.calendarToday) ? agenda.calendarToday : [];
  const monthEvents = Array.isArray(agenda.calendarMonthEvents)
    ? agenda.calendarMonthEvents
    : [];
  const todayLabel = todayEvents.length
    ? truncate(todayEvents.map((event) => event.label).join(" / "), 35)
    : "No calendar events";
  const todayNote = todayEvents.length === 1
    ? todayEvents[0].time === "ALL DAY" ? "All day" : todayEvents[0].time
    : todayEvents.length > 1
      ? `${todayEvents.length} calendar events`
      : "Schedule is clear.";
  const output = [];

  output.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    '<rect width="480" height="800" fill="#ffffff"/>',
    '<g fill="#111111" font-family="Arial, Helvetica, sans-serif">',
    text(24, 34, "DAILY AGENDA", 'font-size="13" font-weight="bold" letter-spacing="2"'),
    text(456, 34, parts.shortDate.replace("/", " / "), 'font-size="13" text-anchor="end"'),
    text(24, 76, parts.weekday.toUpperCase(), 'font-size="38" font-weight="bold"'),
    text(24, 101, parts.monthDay.toUpperCase(), 'font-size="17" letter-spacing="1"'),
    line(24, 116, 456, 116, 'stroke="#111111" stroke-width="3"'),
    rect(24, 132, 432, 83, 'fill="#f2f2f2" stroke="#111111" stroke-width="2"'),
    text(40, 153, "TODAY'S CALENDAR", 'font-size="12" font-weight="bold" letter-spacing="1.5"'),
    text(40, 180, todayLabel, 'font-size="21" font-weight="bold"'),
    text(40, 200, todayNote, 'font-size="13"'),
    text(24, 245, "SCHEDULE", 'font-size="13" font-weight="bold" letter-spacing="2"'),
    line(24, 256, 456, 256, 'stroke="#111111" stroke-width="2"'),
  );

  schedule.forEach((item, index) => {
    const y = 279 + index * 31;
    output.push(
      text(24, y, item.time, 'font-size="13" font-weight="bold"'),
      text(112, y + 1, truncate(item.label, 42), 'font-size="13"'),
    );
    if (index < schedule.length - 1) {
      output.push(line(24, y + 15, 456, y + 15, 'stroke="#b5b5b5"'));
    }
  });

  const scheduleBottom = 264 + Math.max(schedule.length, 1) * 31;
  const bottomTop = Math.max(525, scheduleBottom + 15);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(agendaDate).toUpperCase();
  const monthStart = new Date(agendaDate.getFullYear(), agendaDate.getMonth(), 1);
  const daysInMonth = new Date(
    agendaDate.getFullYear(),
    agendaDate.getMonth() + 1,
    0,
  ).getDate();
  const monthEventDays = new Set(monthEvents.map((event) => event.dateKey));
  const calendarLeft = 24;
  const calendarWidth = 432;
  const columnWidth = calendarWidth / 7;
  const weekdayY = bottomTop + 56;
  const firstDayY = bottomTop + 83;
  const rowHeight = 26;
  output.push(
    line(24, bottomTop, 456, bottomTop, 'stroke="#111111" stroke-width="2"'),
    text(24, bottomTop + 25, "MONTH CALENDAR", 'font-size="13" font-weight="bold" letter-spacing="1.5"'),
    text(456, bottomTop + 25, monthLabel, 'font-size="13" font-weight="bold" text-anchor="end"'),
  );

  ["SU", "MO", "TU", "WE", "TH", "FR", "SA"].forEach((weekday, index) => {
    const x = calendarLeft + columnWidth * index + columnWidth / 2;
    output.push(text(x, weekdayY, weekday, 'font-size="11" font-weight="bold" text-anchor="middle"'));
  });

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = monthStart.getDay() + day - 1;
    const column = cell % 7;
    const row = Math.floor(cell / 7);
    const centerX = calendarLeft + columnWidth * column + columnWidth / 2;
    const dayY = firstDayY + row * rowHeight;
    const eventDate = `${agendaDate.getFullYear()}-${String(agendaDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (day === agendaDate.getDate()) {
      output.push(
        rect(centerX - 13, dayY - 16, 26, 23, 'fill="#f2f2f2" stroke="#111111" stroke-width="2"'),
      );
    }
    output.push(text(centerX, dayY, day, 'font-size="13" text-anchor="middle"'));
    if (monthEventDays.has(eventDate)) {
      output.push(`<circle cx="${centerX}" cy="${dayY + 9}" r="2.5" fill="#111111"/>`);
    }
  }

  const footerRuleY = Math.min(760, bottomTop + 230);
  output.push(
    line(24, footerRuleY, 456, footerRuleY, 'stroke="#b5b5b5"'),
    text(456, 786, agenda.footer, 'font-size="11" text-anchor="end"'),
    "</g>",
    "</svg>",
  );

  return output.join("");
}

export function prepareAgenda(config, calendarData) {
  const schedule = mergeSchedule(
    config.schedule,
    calendarData.today,
    config.scheduleLimit,
  );
  return {
    ...config,
    schedule,
    calendarToday: calendarData.today,
    calendarMonthEvents: calendarData.monthEvents,
  };
}
