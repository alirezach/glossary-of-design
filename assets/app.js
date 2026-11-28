/* Glossary of Design: image + name + copy. No build step. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const FA = "۰۱۲۳۴۵۶۷۸۹", faNum = n => String(n).replace(/\d/g, d => FA[d]);
  const norm = s => (s || "").toString().toLowerCase()
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه").replace(/[أإآ]/g, "ا").replace(/ؤ/g, "و")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/\u200c/g, " ")
    .replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[-_/()،,]/g, " ").replace(/\s+/g, " ").trim();
  const st = { q: "", f: { region: new Set(), family: new Set(), form: new Set(), needs: new Set() }, picked: new Set() };
  let DATA = [], TAX = {}, byId = {}, RECIPES = [];
  const toast = m => { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 1500); };
  const copy = async (txt, m) => { try { await navigator.clipboard.writeText(txt); } catch { const a = document.createElement("textarea"); a.value = txt; document.body.append(a); a.select(); document.execCommand("copy"); a.remove(); } toast(m || "کپی شد"); };

  async function boot() {
    [DATA, TAX] = await Promise.all([fetch("data/styles.json").then(r => r.json()), fetch("data/taxonomy.json").then(r => r.json())]);
    RECIPES = await fetch("data/recipes.json").then(r => r.ok ? r.json() : []).catch(() => []);
    DATA.forEach((s, i) => { byId[s.id] = s; s._n = i + 1; s._h = norm([s.name_fa, s.name_en, s.keyword, TAX.family[s.family]?.fa, ...(s.needs || []).map(n => TAX.needs[n]), ...(s.form || []).map(f => TAX.form[f])].join(" ")); });
    $("#count").textContent = faNum(DATA.length);
    const p = new URLSearchParams(location.search);
    if (p.get("q")) { st.q = p.get("q"); $("#q").value = st.q; }
    for (const k in st.f) (p.get(k) || "").split(",").filter(Boolean).forEach(v => st.f[k].add(v));
    $("#q").addEventListener("input", e => { st.q = e.target.value; render(); url(); });
    $$("nav.tabs button").forEach(b => b.onclick = () => tab(b.dataset.tab));
    document.addEventListener("keydown", e => { if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); tab("dir"); $("#q").focus(); } });
    $("#subject").addEventListener("input", tray);
    $("#tray-copy").onclick = () => copy(compose(), "پرامپت ترکیبی کپی شد");
    $("#tray-clear").onclick = () => { st.picked.clear(); render(); tray(); };
    window.addEventListener("hashchange", openHash);
    render(); recipes(); if (p.get("tab") === "recipes" && !location.hash) tab("recipes"); openHash();
  }

  const rPrompt = r => `${r.subject}, ${r.styles.map(id => byId[id] ? byId[id].keyword : id).join(", ")} style, ${r.extra}`;
  function recipes() {
    const box = $("#recipe-list"); if (!box) return; box.innerHTML = "";
    RECIPES.filter(r => r.styles.every(id => byId[id])).forEach(r => {
      const el = document.createElement("article"); el.className = "rcard";
      el.innerHTML = `<div class="rthumbs n${r.styles.length}">${r.styles.map(id => `<img loading="lazy" src="${byId[id].image}" alt="${byId[id].name_fa}">`).join("")}</div>
        <div class="rbody"><span class="rneed">${TAX.needs[r.need] || ""}</span><h3>${r.title_fa}</h3>
        <p class="rmix">${r.styles.map(id => `<a href="#${id}">${byId[id].name_fa}</a>`).join(" + ")}</p>
        <div class="prompt en">${rPrompt(r)}</div>${r.note_fa ? `<p class="hint">${r.note_fa}</p>` : ""}
        <div class="row"><button type="button" class="chip rcopy">کپی پرامپت</button><button type="button" class="chip ropen">باز کردن در پرامپت‌ساز</button></div></div>`;
      $(".rcopy", el).onclick = () => copy(rPrompt(r), "پرامپت ترکیب کپی شد");
      $(".ropen", el).onclick = () => { st.picked = new Set(r.styles); $("#subject").value = `${r.subject}, ${r.extra}`; tab("dir"); render(); tray(); window.scrollTo({top:0,behavior:"smooth"}); toast("در پرامپت‌ساز باز شد؛ سوژه را عوض کنید"); };
      box.append(el);
    });
  }
  function tab(id) { $$("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === id)); $$("main > section").forEach(s => s.hidden = s.id !== id); }
  function url() { const p = new URLSearchParams(); if (st.q) p.set("q", st.q); for (const [k, v] of Object.entries(st.f)) if (v.size) p.set(k, [...v].join(",")); history.replaceState(null, "", (p.toString() ? "?" + p : location.pathname) + location.hash); }
  const defs = [["region", "خاستگاه", s => [s.region], () => TAX.region], ["family", "خانواده", s => [s.family], () => Object.fromEntries(Object.entries(TAX.family).map(([k, v]) => [k, v.fa]))], ["form", "فرم", s => s.form || [], () => TAX.form], ["needs", "نیاز و کاربرد", s => s.needs || [], () => TAX.needs]];
  const match = (s, skip) => {
    if (st.q && !norm(st.q).split(" ").every(t => s._h.includes(t))) return false;
    for (const [k, , get] of defs) if (k !== skip && st.f[k].size && !get(s).some(v => st.f[k].has(v))) return false;
    return true;
  };
  function facets() {
    const box = $("#facets"); box.innerHTML = "";
    if (st.q || Object.values(st.f).some(s => s.size)) { const c = document.createElement("button"); c.className = "clear"; c.textContent = "پاک‌کردن فیلترها"; c.onclick = () => { Object.values(st.f).forEach(s => s.clear()); st.q = ""; $("#q").value = ""; render(); url(); }; box.append(c); }
    for (const [k, title, get, labels] of defs) {
      const L = labels(), cnt = {}; DATA.filter(s => match(s, k)).forEach(s => get(s).forEach(v => cnt[v] = (cnt[v] || 0) + 1));
      const div = document.createElement("div"); div.className = "facet"; div.innerHTML = `<h3>${title}</h3><div class="chips"></div>`;
      Object.keys(L).forEach(v => {
        const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", st.f[k].has(v));
        b.innerHTML = `${L[v]}<small>${faNum(cnt[v] || 0)}</small>`; if (!cnt[v] && !st.f[k].has(v)) b.disabled = true;
        b.onclick = () => { st.f[k].has(v) ? st.f[k].delete(v) : st.f[k].add(v); render(); url(); };
        $(".chips", div).append(b);
      });
      box.append(div);
    }
  }
  function card(s) {
    const el = document.createElement("article"); el.className = "slide" + (st.picked.has(s.id) ? " picked" : "");
    el.innerHTML = `<button type="button" class="window" aria-label="بزرگ‌نمایی ${s.name_fa}"><img loading="lazy" src="${s.image}" alt="${s.name_fa}"></button>
      <button type="button" class="pick" title="افزودن به پرامپت‌ساز" aria-pressed="${st.picked.has(s.id)}">${st.picked.has(s.id) ? "✓" : "+"}</button>
      <h4><a class="style-title-link" href="styles/${encodeURIComponent(s.id)}.html">${s.name_fa}</a></h4>
      <button type="button" class="kwc" title="کپی نام سبک"><span>${s.keyword}</span><i>کپی</i></button>
      ${s.prompt ? `<span class="has-p">پرامپت نمونه دارد</span>` : ""}`;
    $(".window", el).onclick = () => location.hash = s.id;
    $(".kwc", el).onclick = () => copy(s.keyword, `«${s.keyword}» کپی شد`);
    $(".pick", el).onclick = () => { st.picked.has(s.id) ? st.picked.delete(s.id) : st.picked.add(s.id); render(); tray(); };
    return el;
  }
  function render() {
    facets();
    const list = DATA.filter(s => match(s)); $("#rn").textContent = `${faNum(list.length)} سبک`;
    const root = $("#bands"); root.innerHTML = "";
    if (!list.length) { root.innerHTML = `<p class="empty">چیزی پیدا نشد. واژهٔ دیگری امتحان کنید.</p>`; return; }
    for (const [fid, f] of Object.entries(TAX.family)) {
      const items = list.filter(s => s.family === fid); if (!items.length) continue;
      const band = document.createElement("section"); band.className = "band"; band.id = "f-" + fid;
      band.innerHTML = `<h2>${f.fa}<small>${f.en} · ${faNum(items.length)}</small></h2>${f.desc ? `<p>${f.desc}</p>` : ""}<div class="grid"></div>`;
      items.forEach(s => $(".grid", band).append(card(s))); root.append(band);
    }
  }
  const compose = () => { const sub = $("#subject").value.trim() || "[سوژهٔ شما]"; const k = [...st.picked].map(id => byId[id].keyword); return `${sub}, ${k.join(", ")}`; };
  function tray() { $("#tray").classList.toggle("on", st.picked.size > 0); $("#tray-list").innerHTML = [...st.picked].map(id => `<span>${byId[id].name_fa}</span>`).join(""); $("#tray-preview").textContent = compose(); }
  function openHash() {
    const s = byId[decodeURIComponent(location.hash.slice(1))], dlg = $("#dlg");
    if (!s) { if (dlg.open) dlg.close(); return; }
    tab("dir");
    $("#dlg-inner").innerHTML = `<button class="close" type="button" aria-label="بستن">×</button>
      <figure><img src="${s.image}" alt="${s.name_fa}"><figcaption>${s.kind === "diagram" ? "نمودار حرکت دوربین" : s.kind === "sample" ? ("نمونهٔ " + (s.credit || "منبع")) : "نمونهٔ ساخته‌شده با هوش مصنوعی (GPT Image)"}</figcaption></figure>
      <div class="body"><h2><a class="style-title-link" href="styles/${encodeURIComponent(s.id)}.html">${s.name_fa}</a></h2><span class="lat">${s.name_en}</span>
      <div class="meta"><span>${TAX.family[s.family].fa}</span>${(s.needs || []).map(n => `<span>${TAX.needs[n]}</span>`).join("")}</div>
      <h3>نام سبک برای پرامپت</h3><button type="button" class="kwc big"><span>${s.keyword}</span><i>کپی</i></button>
      <p class="hint">مثال: <span class="en">a poster for a book fair, in ${s.keyword} style</span></p>
      ${s.credit ? `<p class="hint">تصویر نمونه از <a href="${s.credit_url}" target="_blank" rel="noopener">${s.credit}</a></p>` : ""}${s.prompt ? `<h3>پرامپت نمونه</h3><div class="prompt">${s.prompt}<button type="button" class="copy">کپی پرامپت</button></div>${s.note_fa ? `<p class="hint">${s.note_fa}</p>` : ""}` : ""}${s.prompt2 ? `<h3>پرامپت دوم <a href="${s.prompt2_url}" target="_blank" rel="noopener">(کانال یگانه)</a></h3><div class="prompt">${s.prompt2}<button type="button" class="copy2">کپی پرامپت</button></div>${s.prompt2_note ? `<p class="hint">${s.prompt2_note}</p>` : ""}` : ""}
      <div class="row"><button type="button" class="chip" id="dlg-pick">${st.picked.has(s.id) ? "حذف از پرامپت‌ساز" : "افزودن به پرامپت‌ساز"}</button><button type="button" class="chip" id="dlg-link">کپی پیوند</button></div></div>`;
    $(".close", dlg).onclick = () => dlg.close();
    $(".kwc", dlg).onclick = () => copy(s.keyword, `«${s.keyword}» کپی شد`);
    $(".copy", dlg) && ($(".copy", dlg).onclick = () => copy(s.prompt, "پرامپت کپی شد"));
    $(".copy2", dlg) && ($(".copy2", dlg).onclick = () => copy(s.prompt2, "پرامپت کپی شد"));
    $("#dlg-pick").onclick = () => { st.picked.has(s.id) ? st.picked.delete(s.id) : st.picked.add(s.id); render(); tray(); $("#dlg-pick").textContent = st.picked.has(s.id) ? "حذف از پرامپت‌ساز" : "افزودن به پرامپت‌ساز"; };
    $("#dlg-link").onclick = () => copy(location.href, "پیوند کپی شد");
    dlg.onclose = () => { if (location.hash) history.replaceState(null, "", location.pathname + location.search); };
    dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
    if (!dlg.open) dlg.showModal();
  }
  boot();
})();
