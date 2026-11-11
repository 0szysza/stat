/** A shop's countdown measures elapsed time: one day is exactly 24 hours. */
export function calculateRestock(start, fields) {
  const startMs = start instanceof Date ? start.getTime() : NaN;
  if (!Number.isFinite(startMs)) return { error: "Choose a valid starting date and time." };
  const units = [["days", Infinity], ["hours", 23], ["minutes", 59]];
  const values = {};
  for (const [unit, max] of units) {
    const raw = fields[unit] ?? "";
    const value = String(raw).trim() === "" ? 0 : Number(raw);
    if (!Number.isSafeInteger(value) || value < 0 || value > max) {
      return { error: unit === "days" ? "Enter a whole number of days, zero or above."
        : `Enter ${unit} as a whole number from 0 to ${max}.` };
    }
    values[unit] = value;
  }
  const durationMs = (values.days * 1440 + values.hours * 60 + values.minutes) * 60000;
  const resetMs = startMs + durationMs;
  if (!Number.isSafeInteger(durationMs) || !Number.isFinite(new Date(resetMs).getTime())) {
    return { error: "This restock time is out of range. Enter a shorter duration." };
  }
  return { resetAt: new Date(resetMs), durationMs };
}
