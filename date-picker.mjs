export function createDatePicker({ ids, readDate, setDateValue, initNumberControls, onChange }) {
const $ = id => document.getElementById(id);
const calendarMonthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const calendarDayFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
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
    cells.push(`<button type="button" class="date-picker__day${selected ? " is-selected" : ""}${isToday ? " is-today" : ""}" data-day="${day}" aria-label="${calendarDayFormat.format(date)}" aria-pressed="${selected}" tabindex="${selected || (!sameDay(new Date(year,month,draft.getDate()),draft) && day===1) ? 0 : -1}">${day}</button>`);
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

for (const id of ids) {
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
    onChange();
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
  if (["previous", "next", "now"].includes(action)) $(`${pickerState.openId}-picker`).querySelector(`[data-calendar-action="${action}"]`)?.focus();
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
return { close: closeDatePicker };
}
