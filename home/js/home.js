/* Home: the open events (date, time, place, how far along), past ones below with their totals. */
(function () {
  const { $, esc, tally, dayParts, itemsLeft, byDate, icon, summary, peopleWord, piecesWord } = UI;
  let events = null;
  const pledgesFor = {}, peopleFor = {};
  const subs = new Map();

  Store.watchInitiatives(list => {
    events = list;
    const ids = new Set(list.map(e => e.id));
    for (const id of ids) {
      if (!subs.has(id)) subs.set(id, [
        Store.watchPledges(id, p => { pledgesFor[id] = p; render(); }),
        Store.watchPeople(id, p => { peopleFor[id] = p; render(); })
      ]);
    }
    for (const [id, offs] of subs) if (!ids.has(id)) { offs.forEach(off => off()); subs.delete(id); }
    render();
  }, () => {
    $('#openList').innerHTML = '<li class="empty">تعذّر التحميل، حدّث الصفحة</li>';
  });

  const link = id => `event.html?id=${encodeURIComponent(id)}${Store.forced ? '&demo' : ''}`;

  function render() {
    if (!events) return;
    const open = events.filter(e => e.status === 'open').sort(byDate);
    const past = events.filter(e => e.status !== 'open').sort((a, b) => byDate(b, a));
    $('#openList').innerHTML = open.length ? open.map(e => card(e, false)).join('') : '<li class="empty">لا توجد مبادرات حالياً</li>';
    $('#pastWrap').hidden = !past.length;
    $('#pastList').innerHTML = past.map(e => card(e, true)).join('');
  }

  function card(e, past) {
    const d = dayParts(e.date);
    const meta = [
      e.time ? `<span>${icon('clock', 15)}${esc(e.time)}</span>` : '',
      e.place ? `<span>${icon('pin', 15)}${esc(e.place)}</span>` : ''
    ].join('');
    let foot;
    if (past) {
      const s = summary(pledgesFor[e.id], peopleFor[e.id]);
      foot = s.people ? `<span class="done-line">${s.people} ${peopleWord(s.people)} · ${s.pieces.toLocaleString('en')} ${piecesWord(s.pieces)}</span>` : '';
    } else {
      const t = tally(e, pledgesFor[e.id] || []);
      foot = `<span class="event-foot"><span class="bar"><span class="bar-fill" style="width:${t.pct}%"></span></span><small>${t.open ? itemsLeft(t.open) : 'اكتمل كل شي'}</small></span>`;
    }
    return `<li><a class="event" href="${link(e.id)}">
      ${d ? `<span class="cal"><b>${esc(d.day)}</b><span>${esc(d.month)}</span></span>` : ''}
      <span class="event-main">
        <h3>${esc(e.title)}</h3>
        ${meta ? `<span class="meta">${meta}</span>` : ''}
        ${foot}
      </span>
    </a></li>`;
  }
})();
