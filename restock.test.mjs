import test from "node:test";
import assert from "node:assert/strict";
import { calculateRestock } from "./restock.mjs";

test("adds a shop countdown across multiple days", () => {
  const result = calculateRestock(new Date("2026-11-11T20:30:00Z"), {days:"2",hours:"14",minutes:"12"});
  assert.equal(result.resetAt.toISOString(), "2026-11-14T10:42:00.000Z");
});
test("rolls over midnight, month/year boundaries and leap day", () => {
  for (const [start, expected] of [
    ["2026-12-31T23:50:00Z", "2027-01-01T00:10:00.000Z"],
    ["2028-02-28T23:50:00Z", "2028-02-29T00:10:00.000Z"],
    ["2026-04-30T23:50:00Z", "2026-05-01T00:10:00.000Z"]
  ]) assert.equal(calculateRestock(new Date(start), {minutes:20}).resetAt.toISOString(), expected);
});
test("shop days stay 24 elapsed hours across daylight saving changes", () => {
  for (const start of ["2027-03-27T12:00:00+01:00", "2026-10-24T12:00:00+02:00"]) {
    const date = new Date(start);
    assert.equal(calculateRestock(date, {days:1}).resetAt.getTime() - date.getTime(), 86400000);
  }
});
test("blank units mean zero, and zero is an immediate restock", () => {
  const date = new Date("2026-11-11T20:30:45Z");
  assert.equal(calculateRestock(date, {days:"",hours:"",minutes:"12"}).durationMs, 720000);
  assert.equal(calculateRestock(date, {days:0,hours:0,minutes:0}).resetAt.getTime(), date.getTime());
});
test("rejects negative, fractional and out-of-range units and invalid starts", () => {
  const date = new Date("2026-11-11T20:30:00Z");
  for (const fields of [{days:-1},{days:0.5},{hours:24},{minutes:60},{minutes:-1},{hours:"abc"},{days:Infinity},{days:Number.MAX_SAFE_INTEGER}]) {
    assert.ok(calculateRestock(date, fields).error, JSON.stringify(fields));
  }
  assert.ok(calculateRestock(new Date(NaN), {hours:1}).error);
  assert.ok(calculateRestock(null, {hours:1}).error);
});
test("rejects a date outside the Date range without mutating the start", () => {
  const start = new Date(8640000000000000);
  assert.ok(calculateRestock(start, {minutes:1}).error);
  assert.equal(start.getTime(), 8640000000000000);
});
