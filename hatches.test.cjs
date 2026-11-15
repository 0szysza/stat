const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync("app.js", "utf8");
const prefix = source.slice(0, source.indexOf("function setDateValue")).replace(/^import .*;\s*$/gm, "");
const storage = source.match(/^const storageKey = .*;$/m)[0];
function config(stat) {
  return vm.runInNewContext(prefix + "\n" + storage + "\n({statUnit,statLabel,storageKey,accountCount,calculatorMode,markup:accountMarkup(accounts[0]),read: amountInput('test','1M')})",
    { document: { body: { dataset: { stat } } }, Intl, Map,
      formatAmount: String, parseAmount: Number, stepAmount: () => {} });
}
test("Hatches shares Bubble defaults and fields with separate saved data", () => {
  const hatch = config("hatches"), bubble = config("bubble"), rebirth = config("rebirth");
  assert.equal(hatch.accountCount, bubble.accountCount);
  assert.equal(hatch.calculatorMode, bubble.calculatorMode);
  assert.equal(hatch.accountCount, 1);
  assert.equal(hatch.calculatorMode, "interval");
  assert.equal(hatch.statUnit, "hatches");
  assert.match(hatch.markup, /Starting hatches/);
  assert.match(hatch.markup, /Target hatches/);
  assert.match(hatch.markup, /Hatches gained/);
  assert.doesNotMatch(hatch.markup, /bubbles|rebirths<\/label>/);
  assert.equal(hatch.markup.replaceAll("hatches","bubbles").replaceAll("Hatches","Bubbles").replaceAll("Hatch","Bubble"), bubble.markup);
  assert.equal(hatch.storageKey, "hatches-calculator:v1");
  assert.equal(bubble.storageKey, "bubble-calculator:v1");
  assert.equal(rebirth.storageKey, "rebirth-calculator:v1");
  assert.equal(rebirth.accountCount, 2);
  assert.equal(rebirth.calculatorMode, "goal");
});
test("Default redirect and all calculator navigation include Hatches", () => {
  const root = fs.readFileSync("index.html", "utf8");
  assert.equal((root.match(/\.\/hatches\//g)||[]).length, 3);
  assert.doesNotMatch(root, /\.\/bubble\//);
  assert.match(root, /location.search \+ location.hash/);
  for (const stat of ["hatches", "bubble", "rebirth", "restock"]) {
    const html = fs.readFileSync(stat + "/index.html", "utf8");
    const nav = html.match(/<nav class="stat-nav"[\s\S]*?<\/nav>/)[0];
    assert.match(nav, /href="\/stat\/hatches\/"/);
    assert.equal((nav.match(/aria-current="page"/g)||[]).length, 1);
    assert.match(nav, new RegExp('href="/stat/' + stat + '/" aria-current="page"'));
    assert.doesNotMatch(html, /og:image|twitter:image|summary_large_image/);
  }
});


