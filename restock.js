import { createNumberControls } from "./number-controls.mjs?v=20261122";
import { createDatePicker } from "./date-picker.mjs?v=20261122";
import { calculateRestock } from "./restock.mjs?v=20261111-1";

const $ = id => document.getElementById(id);
const storageKey = "restock-calculator:v1";
const units = ["days", "hours", "minutes"];
const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const dateInputFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
  $("restock-now").value = dateInputFormat.format(nowStart);
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
  setText("restock-message", error);
  if (!valid) {
    setText("restock-result-title", "Shop restocks at");
    for (const id of ["restock-result-time", "restock-result-date", "restock-quick-time", "restock-countdown", "restock-summary", "restock-progress-text"]) setText(id, "—");
    setText("restock-countdown-label", "Time left");
    $("restock-progress-bar").style.width = "0%";
    $("restock-progress-bar").parentElement.setAttribute("aria-valuenow", "0");
    return;
  }
  const remaining = result.resetAt.getTime() - Date.now();
  const restocked = remaining <= 0;
  setText("restock-result-title", restocked ? "Shop restocked at" : "Shop restocks at");
  setText("restock-result-time", timeFormat.format(result.resetAt));
  setText("restock-quick-time", timeFormat.format(result.resetAt));
  setText("restock-result-date", dateFormat.format(result.resetAt));
  setText("restock-countdown-label", restocked ? "Status" : "Time left");
  const totalSeconds = Math.max(0, Math.ceil(remaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor(totalSeconds % 86400 / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  setText("restock-countdown", restocked ? "Restocked" : `${days ? days + "d " : ""}${hours}h ${minutes}m ${seconds}s`);
  setText("restock-summary", dateInputFormat.format(start));
  const progress = result.durationMs === 0 ? (restocked ? 100 : 0) : Math.max(0, Math.min(100, (1 - remaining / result.durationMs) * 100));
  const percent = progress.toFixed(1);
  setText("restock-progress-text", `${percent}%`);
  $("restock-progress-bar").style.width = `${progress}%`;
  $("restock-progress-bar").parentElement.setAttribute("aria-valuenow", percent);
}

const { init: initNumberControls } = createNumberControls();
const { close: closeDatePicker } = createDatePicker({ ids: ["restock-start"], readDate, setDateValue, initNumberControls, onChange: () => { render(); saveState(); } });

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
render();
setInterval(render, 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
window.addEventListener("pageshow", render);
