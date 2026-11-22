export function createNumberControls({ isAmountInput = () => false, stepAmount } = {}) {
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
  if (isAmountInput(input)) {
    input.value = stepAmount(input.value, direction);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    return;
  }
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
return { init: initNumberControls };
}
