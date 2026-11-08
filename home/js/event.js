/* One event: pick what you'll bring (tap a row or use − / +), add anything extra, write your name, confirm. */
(function () {
  const { $, esc, tally, arDate, icon, toast, safeUrl, whatsapp, sameName, summary, peopleWord, piecesWord } = UI;
  const iid = new URLSearchParams(location.search).get('id');
  if (Store.forced) { $('#back').href = 'index.html?demo'; $('.top .brand').href = 'index.html?demo'; }

  const pick = {};          // item id -> how many I'll bring
  let extras = [];          // my own extra items [{name, qty}]
  let ini = null, loaded = false, pledges = [], people = [], got = {}, others = [], submitting = false;
  // sign-ups made on this phone, so the list can mark them
  let mine = new Set();
  try { mine = new Set(JSON.parse(localStorage.getItem('kb-mine') || '[]')); } catch (e) {}
  try { $('#name').value = localStorage.getItem('kb-name') || ''; } catch (e) {}

  if (!iid) return notFound();
  Store.watchInitiative(iid, d => { ini = d; loaded = true; render(); }, failed);
  Store.watchPledges(iid, p => { pledges = p; render(); }, failed);
  Store.watchPeople(iid, p => { people = p; render(); });

  const isOpen = () => !!ini && ini.status === 'open';
  const remaining = it => Math.max(0, (+it.needed || 0) - (got[it.id] || 0));
  // only touch the page when something changed
  const setHTML = (el, html) => { if (el.lastHTML !== html) { el.lastHTML = html; el.innerHTML = html; } };

  /* box events: how much of each item goes in one box, in words ("1 كيس", "3 علب") */
  const perBox = it => Math.max(1, Math.round((+it.needed || 0) / (+ini.boxes || 1)));
  const ONE = { 'أكياس': 'كيس', 'علب': 'علبة', 'غراش': 'غرشة', 'حبات': 'حبة' };
  const TWO = { 'أكياس': 'كيسين', 'علب': 'علبتين', 'غراش': 'غرشتين', 'حبات': 'حبتين' };
  function amount(it) {
    const n = perBox(it), unit = String(it.unit || '').trim();
    if (!ONE[unit]) return `${n} ${unit}`.trim();
    if (n === 2) return TWO[unit];
    return `${n} ${n >= 3 && n <= 10 ? unit : ONE[unit]}`;
  }
  const boxy = () => +ini.boxes > 0;

  function render() {
    if (!loaded) return;
    if (!ini) return notFound();
    $('#loading').hidden = true;
    const t = tally(ini, pledges);
    got = t.got;
    others = t.extras;
    if (!submitting) clampPicks();
    renderHead(t);
    renderBoxes();
    renderItems();
    renderExtras();
    renderWho();
    renderBar();
  }

  // If others sign up while you're choosing, never offer more than is still needed.
  function clampPicks() {
    let changed = false;
    for (const id of Object.keys(pick)) {
      const it = (ini.items || []).find(x => x.id === id);
      if (!it || !isOpen()) { delete pick[id]; continue; }
      if (pick[id] > remaining(it)) { changed = true; if (remaining(it)) pick[id] = remaining(it); else delete pick[id]; }
    }
    if (!isOpen()) extras = [];
    if (changed) toast('تم تحديث الكميات، أحد سجّل للتو');
  }

  function renderHead(t) {
    document.title = `${ini.title} · باص الخير`;
    $('#topTitle').textContent = ini.title;
    $('#title').textContent = ini.title;
    const meta = [];
    if (ini.date) meta.push(`<span>${icon('cal', 16)}${esc(arDate(ini.date))}</span>`);
    if (ini.time) meta.push(`<span>${icon('clock', 16)}${esc(ini.time)}</span>`);
    const map = safeUrl(ini.map);
    if (ini.place || map) meta.push(map
      ? `<a href="${esc(map)}" target="_blank" rel="noopener"><span>${icon('pin', 16)}${esc(ini.place || 'الموقع')}</span></a>`
      : `<span>${icon('pin', 16)}${esc(ini.place)}</span>`);
    const wa = whatsapp(ini.phone, `السلام عليكم، بخصوص ${ini.title}`);
    if (wa) meta.push(`<a href="${esc(wa)}" target="_blank" rel="noopener"><span>${icon('chat', 16)}<span dir="ltr">${esc(ini.phone)}</span></span></a>`);
    setHTML($('#meta'), meta.join(''));
    $('#bar').style.width = t.pct + '%';
    $('#pct').textContent = t.open ? `${t.pct}%` : 'اكتمل';
    $('#head').hidden = false;
    // finished: thank everyone
    const closed = $('#closed');
    closed.hidden = isOpen();
    if (!isOpen()) {
      const s = summary(pledges, people);
      setHTML(closed, `${icon('check', 26)}<div><b>انتهت المبادرة، شكراً للجميع</b><span>${s.people} ${peopleWord(s.people)} · ${s.pieces.toLocaleString('en')} ${piecesWord(s.pieces)}</span></div>`);
    }
  }

  function renderBoxes() {
    $('#boxWrap').hidden = !boxy();
    if (!boxy()) return;
    $('#boxNote').innerHTML = `${icon('box', 20)}كل صندوق فيه — نجهز ${esc(ini.boxes)} صندوق`;
    setHTML($('#boxList'), (ini.items || []).map(it => `<li>${esc(amount(it))} ${esc(it.name)}</li>`).join(''));
  }

  function renderItems() {
    const items = ini.items || [];
    $('#itemsWrap').hidden = !items.length;
    setHTML($('#items'), items.map(it => {
      const left = remaining(it), full = left === 0, n = Math.min(pick[it.id] || 0, left);
      const sub = boxy() ? `${amount(it)} بكل صندوق` : (it.unit || '');
      const status = full ? `<span class="item-left ok">${icon('check', 14)} اكتمل</span>` : `<span class="item-left">باقي <b>${left}</b></span>`;
      // just + until you pick some, then − n +
      const step = isOpen() && !full ? `<span class="stepper">${n ? `
          <button type="button" class="step" data-act="minus" aria-label="إنقاص ${esc(it.name)}">${icon('minus', 16)}</button>
          <span class="qty">${n}</span>` : ''}
          <button type="button" class="step" data-act="plus" aria-label="زيادة ${esc(it.name)}"${n >= left ? ' disabled' : ''}>${icon('plus', 16)}</button>
        </span>` : '';
      return `<li class="item${n ? ' picked' : ''}${full ? ' full' : ''}" data-id="${esc(it.id)}">
        <img class="item-pic" src="${esc(it.img || 'img/logo.png')}" alt="">
        <button type="button" class="item-main" data-act="plus"${isOpen() && !full ? '' : ' disabled'}><span class="item-name">${esc(it.name)}</span>${sub ? `<span class="item-sub">${esc(sub)}</span>` : ''}${status}</button>
        ${step}
      </li>`;
    }).join(''));
  }

  $('#items').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const id = b.closest('.item').dataset.id;
    const it = (ini.items || []).find(x => x.id === id);
    if (!it || !isOpen()) return;
    const n = Math.max(0, Math.min((pick[id] || 0) + (b.dataset.act === 'plus' ? 1 : -1), remaining(it)));
    if (n) pick[id] = n; else delete pick[id];
    renderItems();
    renderBar();
  });

  /* ---------- anything extra ---------- */

  $('#extraForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#exName').value.trim();
    const qty = Math.max(1, parseInt($('#exQty').value, 10) || 1);
    if (!name) return $('#exName').focus();
    const listed = (ini.items || []).find(it => sameName(it.name) === sameName(name));
    if (listed) { toast(`${listed.name} موجود في القائمة`); return; }
    const same = extras.find(x => sameName(x.name) === sameName(name));
    if (same) same.qty += qty; else extras.push({ name, qty });
    $('#exName').value = '';
    $('#exQty').value = 1;
    renderExtras();
    renderBar();
  });

  $('#myExtras').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    extras.splice(+b.dataset.i, 1);
    renderExtras();
    renderBar();
  });

  function renderExtras() {
    $('#extraWrap').hidden = !isOpen();
    setHTML($('#myExtras'), extras.map((x, i) =>
      `<li class="tag mine">${esc(x.name)} × ${x.qty}<button type="button" data-i="${i}" aria-label="إزالة ${esc(x.name)}">×</button></li>`).join(''));
    setHTML($('#others'), others.map(x => `<li class="tag">${esc(x.name)} × ${x.qty}</li>`).join(''));
  }

  /* ---------- who's bringing what (same name shows once, added up) ---------- */

  function renderWho() {
    const items = ini.items || [];
    const names = Object.fromEntries(people.map(p => [p.id, p.name]));
    const rows = pledges.filter(p => names[p.id]).sort((a, b) => a.createdAt - b.createdAt);
    const list = [], byName = new Map();
    for (const p of rows) {
      const name = names[p.id], key = sameName(name);
      let who = byName.get(key);
      if (!who) { who = { name, items: {}, extras: new Map(), mine: false }; byName.set(key, who); list.push(who); }
      for (const x of p.items || []) who.items[x.id] = (who.items[x.id] || 0) + x.qty;
      for (const x of p.extras || []) {
        const k = sameName(x.name), e = who.extras.get(k) || { name: x.name, qty: 0 };
        e.qty += x.qty; who.extras.set(k, e);
      }
      if (mine.has(p.id)) who.mine = true;
    }
    $('#whoWrap').hidden = !list.length;
    $('#whoTitle').textContent = `المشاركون (${list.length})`;
    setHTML($('#who'), list.map(who => {
      const what = [
        ...items.filter(it => who.items[it.id]).map(it => `${it.name} ${who.items[it.id]}`),
        ...[...who.extras.values()].map(x => `${x.name} ${x.qty}`)
      ].join('، ');
      return `<li class="row${who.mine ? ' mine' : ''}">
        <span class="initial">${esc([...who.name.trim()][0] || '؟')}</span>
        <span class="row-main"><b>${esc(who.name)}${who.mine ? ' <span class="pill">أنت</span>' : ''}</b><span>${esc(what)}</span></span>
      </li>`;
    }).join(''));
  }

  /* ---------- name & confirm ---------- */

  function chosen() {
    const items = Object.entries(pick).map(([id, qty]) => ({ id, qty }));
    return { items, extras, count: items.length + extras.length };
  }

  function renderBar() {
    $('#bar2').hidden = !isOpen();
    document.body.classList.toggle('has-bar', isOpen());
    $('#sendBtn').disabled = submitting || !chosen().count;
  }

  $('#sendForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return;
    const name = $('#name').value.trim();
    if (!name) { $('#name').focus(); return; }
    const { items, count } = chosen();
    if (!count) return;
    const lines = [
      ...items.map(x => { const it = ini.items.find(i => i.id === x.id); return `${it.name} × ${x.qty}`; }),
      ...extras.map(x => `${x.name} × ${x.qty}`)
    ];
    submitting = true;
    renderBar();
    try {
      const pid = await Store.pledge(iid, { name, items, extras });
      mine.add(pid);
      try {
        localStorage.setItem('kb-name', name);
        localStorage.setItem('kb-mine', JSON.stringify([...mine].slice(-200)));
      } catch (_) {}
      for (const id of Object.keys(pick)) delete pick[id];
      extras = [];
      showThanks(name, lines);
    } catch (err) {
      toast(isOpen() ? 'لم يتم الحفظ، حاول مرة أخرى' : 'انتهت هذه المبادرة');
    } finally {
      submitting = false;
      render();
    }
  });

  function showThanks(name, lines) {
    $('#thanksTitle').textContent = `شكراً ${name}`;
    $('#thanksWhen').textContent = [arDate(ini.date), ini.time, ini.place].filter(Boolean).join(' · ');
    $('#thanksList').innerHTML = lines.map(l => `<li>${esc(l)}</li>`).join('');
    $('#thanks').hidden = false;
    document.body.classList.add('no-scroll');
    $('#doneBtn').focus();
  }
  $('#doneBtn').addEventListener('click', () => {
    $('#thanks').hidden = true;
    document.body.classList.remove('no-scroll');
    const row = $('#who .row.mine:last-child') || $('#who .row.mine');
    if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  function notFound() {
    document.title = 'غير موجودة · باص الخير';
    $('#loading').innerHTML = `المبادرة غير موجودة<br><a class="btn btn-ghost mt" href="${Store.forced ? 'index.html?demo' : './'}">المبادرات</a>`;
    $('#bar2').hidden = true;
  }
  function failed() { $('#loading').textContent = 'تعذّر التحميل، حدّث الصفحة'; }
})();
