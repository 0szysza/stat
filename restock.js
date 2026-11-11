import { calculateRestock } from "./restock.mjs?v=20261111-1";

const $ = id => document.getElementById(id);
const storageKey = "restock-calculator:v1";
const units = ["days", "hours", "minutes"];
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dateInputFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const calendarMonthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const calendarDayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
let mode = "now";
let nowStart = new Date();

function setDateValue(id, date) {
  const selected = new Date(date);
  selected.setSeconds(0, 0);
  $(id).dataset.value = selected.toISOString();
  $(id).value = dateInputFormat.format(selected);
}
function readDate(input) {
  const date = new Date(input.dataset.value);
  return Number.isFinite(date.getTime()) ? date : null;
}
function setText(id, text) {
  if ($(id).textContent !== text) $(id).textContent = text;
}
function durationFields() {
  return Object.fromEntries(units.map(unit => [unit, $(`restock-${unit}`).value]));
}
function saveState() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      mode, nowStart: nowStart.toISOString(),
      selectedStart: $("restock-start").dataset.value, ...durationFields()
    }));
  } catch {
    // Calculations also work when device-local storage is unavailable.
  }
}
function restoreState() {
  setDateValue("restock-start", new Date());
  try {
    const state = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!state || typeof state !== "object") return;
    mode = state.mode === "time" ? "time" : "now";
    const savedNow = typeof state.nowStart === "string" ? new Date(state.nowStart) : null;
    if (savedNow && Number.isFinite(savedNow.getTime())) nowStart = savedNow;
    const selected = typeof state.selectedStart === "string" ? new Date(state.selectedStart) : null;
    if (selected && Number.isFinite(selected.getTime())) setDateValue("restock-start", selected);
    for (const unit of units) {
      if (typeof state[unit] === "string" && state[unit].length <= 100) $(`restock-${unit}`).value = state[unit];
    }
  } catch {
    // Ignore missing or malformed saved settings.
  }
}
function syncMode() {
  $("restock-now-field").hidden = mode !== "now";
  $("restock-time-field").hidden = mode !== "time";
  document.querySelectorAll("[data-restock-mode]").forEach(button => {
    const active = button.dataset.restockMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function render() {
  setText("restock-now", dateInputFormat.format(nowStart));
  const fields = durationFields();
  let error = "";
  for (const unit of units) {
    const input = $(`restock-${unit}`);
    input.setAttribute("aria-invalid", String(!input.validity.valid));
    if (!input.validity.valid && !error) {
      error = unit === "days" ? "Enter a whole number of days, zero or above."
        : `Enter ${unit} as a whole number from 0 to ${input.max}.`;
    }
  }
  const empty = units.every(unit => fields[unit].trim() === "");
  const start = mode === "now" ? nowStart : readDate($("restock-start"));
  const result = !error && !empty ? calculateRestock(start, fields) : null;
  error ||= result?.error || "";
  const valid = result && !error;
  $("restock-empty").hidden = Boolean(valid);
  $("restock-output").hidden = !valid;
  setText("restock-message", error);
  if (!valid) {
    setText("restock-result-title", "Shop restocks at");
    return;
  }
  const remaining = result.resetAt.getTime() - Date.now();
  const restocked = remaining <= 0;
  setText("restock-result-title", restocked ? "Shop restocked at" : "Shop restocks at");
  setText("restock-result-time", timeFormat.format(result.resetAt));
  setText("restock-result-date", dateFormat.format(result.resetAt));
  setText("restock-countdown-label", restocked ? "Status" : "Time left");
  const totalSeconds = Math.max(0, Math.ceil(remaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  setText("restock-countdown", restocked ? "Restocked" : `${days ? days + "d " : ""}${hours}h ${minutes}m ${seconds}s`);
  const duration = result.durationMs / 60000;
  setText("restock-summary", `${Math.floor(duration / 1440)}d ${Math.floor(duration % 1440 / 60)}h ${duration % 60}m from ${dateInputFormat.format(start)}.`);
}

function initNumberControls(root) {
  root.querySelectorAll('input[type="number"], input[data-stat-amount]').forEach((input) => {
    if (input.closest(".number-control")) return;
    const label = input.dataset.stepLabel || input.labels?.[0]?.textContent.trim() || "value";
    const control = document.createElement("div");
    control.className = "number-control";
    input.before(control);
    control.append(input);
    control.insertAdjacentHTML("beforeend", `
      <span class="number-control__steps">
        <button type="button" class="number-control__step" data-direction="1" aria-label="Increase ${label}"><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1.5 6 4.5-4 4.5 4"/></svg></button>
        <button type="button" class="number-control__step" data-direction="-1" aria-label="Decrease ${label}"><svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1.5 2 4.5 4 4.5-4"/></svg></button>
      </span>`);
  });
}

function stepNumber(input, direction) {
  const step = Number(input.dataset.stepSize || (input.step === "any" ? 1 : input.step) || 1);
  const min = input.min === "" ? -Infinity : Number(input.min);
  const max = input.max === "" ? Infinity : Number(input.max);
  const current = input.value.trim() === "" ? NaN : Number(input.value);
  let next = Number.isFinite(current) ? current + direction * step
    : direction > 0 ? Math.max(Number.isFinite(min) ? min : 0, step) : Number.isFinite(min) ? min : 0;
  if (input.dataset.wrap === "true") {
    if (next > max) next = min;
    if (next < min) next = max;
  } else {
    next = Math.min(max, Math.max(min, next));
  }
  next = Number(next.toFixed(4));
  input.value = input.dataset.pad ? String(next).padStart(Number(input.dataset.pad), "0") : String(next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".number-control__step");
  if (!button) return;
  stepNumber(button.closest(".number-control").querySelector("input"), Number(button.dataset.direction));
});


const pickerState = { openId: null, draft: null, year: 0, month: 0 };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const twoDigits = (value) => String(value).padStart(2, "0");

function syncPickerTime() {
  if (!pickerState.openId || !pickerState.draft) return;
  const picker = $(`${pickerState.openId}-picker`);
  const hourInput = picker.querySelector('[data-time-unit="hour"]');
  const minuteInput = picker.querySelector('[data-time-unit="minute"]');
  if (!hourInput || !minuteInput) return;
  const valid = hourInput.value !== "" && minuteInput.value !== "" && hourInput.validity.valid && minuteInput.validity.valid;
  picker.querySelector(".date-picker__apply").disabled = !valid;
  if (!valid) return false;
  const hours = Number(hourInput.value);
  const minutes = Number(minuteInput.value);
  pickerState.draft.setHours(Number.isFinite(hours) && hourInput.value !== "" ? Math.min(23, Math.max(0, Math.trunc(hours))) : pickerState.draft.getHours());
  pickerState.draft.setMinutes(Number.isFinite(minutes) && minuteInput.value !== "" ? Math.min(59, Math.max(0, Math.trunc(minutes))) : pickerState.draft.getMinutes(), 0, 0);
  return true;
}

function renderDatePicker() {
  const { openId, draft, year, month } = pickerState;
  if (!openId) return;
  const picker = $(`${openId}-picker`);
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = Array.from({ length: offset }, () => '<span class="date-picker__empty" aria-hidden="true"></span>');
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(year, month, day);
    const selected = sameDay(date, draft);
    const isToday = sameDay(date, today);
    cells.push(`<button type="button" class="date-picker__day${selected ? " is-selected" : ""}${isToday ? " is-today" : ""}" data-day="${day}" aria-label="${calendarDayFormat.format(date)}" aria-pressed="${selected}">${day}</button>`);
  }
  picker.innerHTML = `
    <div class="date-picker__header">
      <button type="button" class="date-picker__nav" data-calendar-action="previous" aria-label="Previous month"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>
      <strong>${calendarMonthFormat.format(new Date(year, month, 1))}</strong>
      <button type="button" class="date-picker__nav" data-calendar-action="next" aria-label="Next month"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
    <div class="date-picker__weekdays" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
    <div class="date-picker__days" role="group" aria-label="Choose a day">${cells.join("")}</div>
    <div class="date-picker__time">
      <div class="date-picker__time-fields">
        <div class="field"><label for="${openId}-hour">Hour</label><input id="${openId}-hour" type="number" min="0" max="23" step="1" value="${twoDigits(draft.getHours())}" data-time-unit="hour" data-step-label="hour" data-wrap="true" data-pad="2" inputmode="numeric"></div>
        <span class="date-picker__time-colon" aria-hidden="true">:</span>
        <div class="field"><label for="${openId}-minute">Minute</label><input id="${openId}-minute" type="number" min="0" max="59" step="1" value="${twoDigits(draft.getMinutes())}" data-time-unit="minute" data-step-label="minute" data-wrap="true" data-pad="2" inputmode="numeric"></div>
      </div>
    </div>
    <div class="date-picker__footer"><button type="button" data-calendar-action="now">Now</button><span></span><button type="button" data-calendar-action="cancel">Cancel</button><button type="button" class="date-picker__apply" data-calendar-action="apply">Apply</button></div>`;
  initNumberControls(picker);
  if (!picker.hidden) positionDatePicker();
}

function positionDatePicker() {
  const id = pickerState.openId;
  if (!id) return;
  const picker = $(`${id}-picker`);
  picker.classList.remove("is-above", "is-floating");
  const field = $(id).getBoundingClientRect();
  const height = picker.getBoundingClientRect().height;
  if (window.innerHeight - field.bottom >= height + 8) return;
  picker.classList.add(field.top >= height + 8 ? "is-above" : "is-floating");
}

function closeDatePicker(restoreFocus = false) {
  const id = pickerState.openId;
  if (!id) return;
  $(`${id}-picker`).hidden = true;
  $(id).setAttribute("aria-expanded", "false");
  document.querySelector(`[data-date-for="${id}"]`).setAttribute("aria-expanded", "false");
  pickerState.openId = null;
  pickerState.draft = null;
  if (restoreFocus) $(id).focus();
}

function openDatePicker(id) {
  if (pickerState.openId === id) return;
  closeDatePicker();
  pickerState.openId = id;
  pickerState.draft = new Date(readDate($(id)) || new Date());
  pickerState.year = pickerState.draft.getFullYear();
  pickerState.month = pickerState.draft.getMonth();
  renderDatePicker();
  $(`${id}-picker`).hidden = false;
  positionDatePicker();
  $(id).setAttribute("aria-expanded", "true");
  document.querySelector(`[data-date-for="${id}"]`).setAttribute("aria-expanded", "true");
  $(`${id}-picker`).querySelector(".date-picker__day.is-selected")?.focus();
}

window.addEventListener("resize", () => {
  if (pickerState.openId) positionDatePicker();
});

for (const id of ["restock-start"]) {
  const input = $(id);
  input.addEventListener("click", () => openDatePicker(id));
  input.addEventListener("keydown", (event) => {
    if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    openDatePicker(id);
  });
  document.querySelector(`[data-date-for="${id}"]`).addEventListener("click", () => openDatePicker(id));
}

document.addEventListener("click", (event) => {
  const dayButton = event.target.closest(".date-picker__day");
  if (dayButton && pickerState.openId) {
    syncPickerTime();
    const { year, month, draft } = pickerState;
    pickerState.draft = new Date(year, month, Number(dayButton.dataset.day), draft.getHours(), draft.getMinutes());
    renderDatePicker();
    $(`${pickerState.openId}-picker`).querySelector(".date-picker__day.is-selected")?.focus();
    return;
  }
  const action = event.target.closest("[data-calendar-action]")?.dataset.calendarAction;
  if (!action || !pickerState.openId) return;
  if (action === "cancel") return closeDatePicker(true);
  if (action === "apply") {
    if (syncPickerTime() === false) return;
    const id = pickerState.openId;
    setDateValue(id, pickerState.draft);
    closeDatePicker(true);
    render();
    saveState();
    return;
  }
  if (action === "now") {
    pickerState.draft = new Date();
    pickerState.draft.setSeconds(0, 0);
    pickerState.year = pickerState.draft.getFullYear();
    pickerState.month = pickerState.draft.getMonth();
  } else {
    syncPickerTime();
    const view = new Date(pickerState.year, pickerState.month + (action === "next" ? 1 : -1), 1);
    pickerState.year = view.getFullYear();
    pickerState.month = view.getMonth();
  }
  renderDatePicker();
});

document.addEventListener("input", (event) => {
  if (event.target.matches('.date-picker [data-time-unit]')) syncPickerTime();
});
document.addEventListener("pointerdown", (event) => {
  if (pickerState.openId && !event.target.closest(".date-control")) closeDatePicker();
});
document.addEventListener("keydown", (event) => {
  if (!pickerState.openId) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeDatePicker(true);
    return;
  }
  const day = event.target.closest(".date-picker__day");
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
  if (!day || !delta) return;
  event.preventDefault();
  syncPickerTime();
  const { year, month, draft } = pickerState;
  pickerState.draft = new Date(year, month, Number(day.dataset.day) + delta, draft.getHours(), draft.getMinutes());
  pickerState.year = pickerState.draft.getFullYear();
  pickerState.month = pickerState.draft.getMonth();
  renderDatePicker();
  $(`${pickerState.openId}-picker`).querySelector(".date-picker__day.is-selected")?.focus();
});



const toolMenu = document.querySelector(".tool-menu");
document.addEventListener("pointerdown", event => {
  if (!toolMenu.contains(event.target)) toolMenu.open = false;
});
toolMenu.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    toolMenu.open = false;
    toolMenu.querySelector("summary").focus();
  }
});
document.querySelectorAll("[data-restock-mode]").forEach(button => {
  button.addEventListener("click", () => {
    if (mode === button.dataset.restockMode) return;
    closeDatePicker();
    mode = button.dataset.restockMode;
    if (mode === "now") nowStart = new Date();
    syncMode();
    render();
    saveState();
  });
});
for (const unit of units) {
  $(`restock-${unit}`).addEventListener("input", () => {
    if (mode === "now") nowStart = new Date();
    render();
    saveState();
  });
}
$("restock-use-now").addEventListener("click", () => {
  nowStart = new Date();
  render();
  saveState();
});
restoreState();
syncMode();
initNumberControls($("shop-timer-title").closest("section"));
setText("restock-timezone", `All times use your local time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`);
render();
setInterval(render, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
window.addEventListener("pageshow", render);
