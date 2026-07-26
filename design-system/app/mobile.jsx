// Telegramito Mobile — детский клиент Telegram, метафора «Письма».
// Светлая газетная бумага (Letters v2), без линеек-строчек: ровная тёплая
// бумага + едва заметная терракотовая дымка сверху.
// Все механики мапятся на реальные функции Telegram (MTProto) — см. подписи секции.

const MB_CSS = `
.mb-phone { width: 390px; height: 844px; box-sizing: border-box; position: relative;
  display: flex; flex-direction: column; overflow: hidden;
  background:
    radial-gradient(120% 42% at 50% -8%, rgba(176,62,27,.05), transparent 65%),
    #dfdbd2;
  color: #1c1815; font-family: 'Spectral', Georgia, serif;
  border: 1px solid rgba(28,24,21,.35); border-radius: 34px;
  box-shadow: 0 24px 60px rgba(28,24,21,.22); }
.mb-phone *, .mb-phone *::before, .mb-phone *::after { box-sizing: border-box; }
.mb-ui { font-family: 'Manrope', system-ui, sans-serif; }
.mb-mono { font-family: 'JetBrains Mono', monospace; }

.mb-status { height: 44px; flex: 0 0 auto; display: flex; align-items: flex-end;
  justify-content: space-between; padding: 0 26px 6px;
  font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 700; color: #3a322a; }

/* ── компактная шапка 52px ── */
.mb-top { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; height: 52px;
  padding: 0 8px 0 18px; border-bottom: 1px solid rgba(28,24,21,.14);
  font-family: 'Manrope', sans-serif; }
.mb-word { font-size: 10px; font-weight: 800; letter-spacing: .24em; color: #1c1815; }
.mb-date { font-family: 'Spectral', serif; font-style: italic; font-size: 12.5px; color: #7a705f; margin-top: 1px; }
.mb-iconbtn { width: 44px; height: 44px; border-radius: 12px; border: none; background: transparent;
  color: #3a322a; display: inline-flex; align-items: center; justify-content: center;
  font-size: 19px; flex: 0 0 auto; cursor: pointer; }
.mb-iconbtn:hover { background: rgba(176,62,27,.08); }

.mb-body { flex: 1 1 auto; min-height: 0; position: relative; overflow: hidden;
  display: flex; flex-direction: column; }

/* ── нижняя навигация ── */
.mb-tabbar { flex: 0 0 auto; display: flex; align-items: stretch;
  border-top: 1px solid rgba(28,24,21,.18); background: #d4cfc3; padding-bottom: 16px; }
.mb-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 0 6px; font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .1em; text-transform: uppercase; color: #7a705f;
  border: none; background: none; position: relative; cursor: pointer; min-height: 52px; }
.mb-tab.on { color: #b03e1b; }
.mb-tab.on::before { content: ""; position: absolute; top: -1px; left: 26%; right: 26%;
  height: 2px; background: #b03e1b; }
.mb-tab .g { font-size: 19px; line-height: 1; font-family: 'Spectral', serif; }
.mb-tab .bdg { position: absolute; top: 5px; right: calc(50% - 30px);
  font-size: 8.5px; font-weight: 800; background: #b03e1b; color: #f5f0e6; padding: 1px 5px; }

.mb-fab { position: absolute; right: 18px; bottom: 18px; z-index: 20; height: 50px;
  padding: 0 20px; display: inline-flex; align-items: center; gap: 9px;
  background: #1c1815; color: #f5f0e6; border: none; border-radius: 2px;
  font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .16em;
  box-shadow: 4px 4px 0 rgba(28,24,21,.22); cursor: pointer; }

/* ── список писем ── */
.mb-seg { display: flex; gap: 7px; padding: 14px 16px 10px; font-family: 'Manrope', sans-serif; }
.mb-chip { border: 1px solid rgba(28,24,21,.22); border-radius: 999px; background: transparent;
  color: #3a322a; font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 600;
  padding: 9px 16px; min-height: 36px; cursor: pointer; }
.mb-chip.on { background: rgba(176,62,27,.12); border-color: rgba(176,62,27,.5);
  color: #1c1815; font-weight: 700; }
.mb-sect { padding: 14px 18px 6px; font-family: 'Manrope', sans-serif; font-size: 10px;
  font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #7a705f; }
.mb-row { display: flex; gap: 13px; padding: 13px 16px; border-bottom: 1px solid rgba(28,24,21,.1);
  align-items: center; min-height: 64px; }
.mb-row.active { border-left: 2px solid #b03e1b; background: #e9e4d8; }
.mb-ava { width: 42px; height: 42px; border-radius: 7px; flex: 0 0 auto; background: #e9e4d8;
  display: flex; align-items: center; justify-content: center; font-family: 'Spectral', serif;
  font-size: 17px; color: #3a322a; border: 1px solid rgba(28,24,21,.16); }
.mb-rmain { flex: 1; min-width: 0; }
.mb-rname { font-family: 'Spectral', serif; font-size: 15.5px; font-weight: 500; color: #1c1815;
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mb-rname .tm { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 600;
  color: #7a705f; letter-spacing: .06em; flex: 0 0 auto; }
.mb-rprev { font-size: 13px; color: #7a705f; line-height: 1.4; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.mb-unrd { font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  background: #1c1815; color: #dfdbd2; padding: 2px 6px; margin-left: 7px; }
.mb-post { color: #b03e1b; font-family: 'Manrope', sans-serif; font-size: 11px;
  letter-spacing: .04em; font-style: normal; }
.mb-post .d { display: inline-block; width: 4px; height: 4px; border-radius: 50%;
  background: #b03e1b; margin-right: 3px; animation: mbPulse 1.4s ease-in-out infinite; }
.mb-post .d:nth-child(2) { animation-delay: .2s; }
.mb-post .d:nth-child(3) { animation-delay: .4s; }
@keyframes mbPulse { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mb-post .d { animation: none; } }

/* ── почта дня ── */
.mb-dm-head { padding: 20px 20px 8px; }
.mb-dm-kick { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .24em; text-transform: uppercase; color: #b03e1b; }
.mb-dm-h { font-family: 'Spectral', serif; font-weight: 400; font-size: 30px;
  line-height: 1.1; margin: 6px 0 0; letter-spacing: -.01em; }
.mb-dm-sub { font-family: 'Spectral', serif; font-style: italic; font-size: 13.5px;
  color: #7a705f; margin: 6px 0 0; }
.mb-dm-list { list-style: none; margin: 14px 0 0; padding: 0 20px 20px 34px; position: relative;
  overflow-y: hidden; flex: 1; }
.mb-dm-list::before { content: ""; position: absolute; left: 25px; top: 8px; bottom: 24px;
  width: 1px; background: rgba(28,24,21,.18); }
.mb-dm-item { position: relative; padding: 11px 0 13px; border-bottom: 1px solid rgba(28,24,21,.09); }
.mb-dm-item::before { content: ""; position: absolute; left: -13.5px; top: 16px; width: 9px;
  height: 9px; border: 1.5px solid #7a705f; background: #dfdbd2; }
.mb-dm-item.seen::before { background: #b03e1b; border-color: #b03e1b; }
.mb-dm-time { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 600;
  color: #7a705f; letter-spacing: .08em; }
.mb-dm-line { font-family: 'Spectral', serif; font-size: 15px; line-height: 1.42;
  color: #1c1815; margin: 3px 0 0; }
.mb-dm-line b { font-weight: 600; }
.mb-dm-src { font-family: 'Spectral', serif; font-style: italic; font-size: 11.5px;
  color: #7a705f; margin-top: 3px; }
.mb-quiet { padding: 12px 20px; border-top: 1px solid rgba(28,24,21,.14);
  display: flex; justify-content: space-between; font-family: 'Manrope', sans-serif;
  font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #7a705f; }

/* ── тред ── */
.mb-thead { flex: 0 0 auto; display: flex; align-items: center; gap: 4px; height: 52px;
  padding: 0 6px; border-bottom: 1px solid rgba(28,24,21,.14); font-family: 'Manrope', sans-serif; }
.mb-tt { flex: 1; min-width: 0; padding-left: 2px; }
.mb-tt .nm { font-family: 'Spectral', serif; font-size: 16.5px; font-weight: 500; color: #1c1815;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mb-tt .st { font-size: 10px; font-weight: 600; color: #7a705f; letter-spacing: .05em; margin-top: 1px; }
.mb-tt .st .writing { color: #b03e1b; }
.mb-tscroll { flex: 1; min-height: 0; overflow: hidden; padding: 14px 18px 150px; position: relative; }
.mb-datechip { text-align: center; margin: 2px 0 12px; }
.mb-datechip span { font-family: 'Spectral', serif; font-style: italic; font-size: 12px;
  color: #7a705f; background: #e9e4d8; border: 1px solid rgba(28,24,21,.1);
  border-radius: 999px; padding: 4px 14px; }
.mb-msg { margin: 0 0 15px; position: relative; }
.mb-who { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .2em; text-transform: uppercase; color: #7a705f; }
.mb-who .n { font-family: 'Spectral', serif; font-style: italic; font-size: 13px;
  font-weight: 400; text-transform: none; letter-spacing: 0; color: #3a322a; margin-left: 6px; }
.mb-who.me .n { color: #b03e1b; }
.mb-prose { font-family: 'Spectral', serif; font-size: 15.5px; line-height: 1.58;
  color: #1c1815; margin: 3px 0 0; max-width: 58ch; }
.mb-quote { border-left: 2px solid rgba(28,24,21,.2); padding: 1px 0 2px 10px; margin: 4px 0 5px;
  font-style: italic; font-size: 13.5px; color: #7a705f; line-height: 1.45; }
.mb-note { display: inline-flex; align-items: center; gap: 6px; margin-top: 7px;
  font-family: 'Spectral', serif; font-style: italic; font-size: 12.5px; color: #b03e1b;
  border: 1px solid rgba(176,62,27,.35); background: rgba(176,62,27,.06);
  border-radius: 2px; padding: 4px 10px; }
.mb-catchup { display: flex; align-items: center; gap: 12px; margin: 18px 0;
  font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .18em; text-transform: uppercase; color: #b03e1b; }
.mb-catchup::before, .mb-catchup::after { content: ""; flex: 1; height: 1px;
  background: rgba(176,62,27,.4); }
.mb-newmail { position: absolute; right: 16px; bottom: 158px; z-index: 14; display: inline-flex;
  align-items: center; gap: 8px; background: #e9e4d8; border: 1px solid rgba(176,62,27,.5);
  color: #b03e1b; border-radius: 999px; padding: 9px 16px; min-height: 40px;
  font-family: 'Manrope', sans-serif; font-size: 10.5px; font-weight: 800; letter-spacing: .1em;
  box-shadow: 0 6px 16px rgba(28,24,21,.18); cursor: pointer; }

/* ── компоуз ── */
.mb-compose { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 15;
  background: #d4cfc3; border: 1px solid #1c1815;
  box-shadow: 3px 3px 0 rgba(28,24,21,.16); padding: 10px 12px 9px; }
.mb-c-row { display: flex; align-items: center; gap: 4px; }
.mb-c-ph { flex: 1; font-family: 'Spectral', serif; font-style: italic; font-size: 14.5px;
  color: #7a705f; padding-left: 4px; }
.mb-c-btn { width: 42px; height: 42px; border: none; background: transparent; color: #7a705f;
  font-size: 18px; border-radius: 10px; flex: 0 0 auto; display: inline-flex;
  align-items: center; justify-content: center; cursor: pointer; }
.mb-c-send { height: 42px; padding: 0 16px; border: none; background: #1c1815; color: #dfdbd2;
  border-radius: 2px; font-family: 'Manrope', sans-serif; font-size: 10.5px; font-weight: 800;
  letter-spacing: .14em; flex: 0 0 auto; cursor: pointer; }
.mb-c-foot { display: flex; align-items: center; gap: 6px; margin-top: 7px; padding: 0 4px;
  font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .14em;
  text-transform: uppercase; color: #7a705f; }
.mb-c-foot .lnk { cursor: pointer; }
.mb-c-foot .lnk:hover { color: #1c1815; }
.mb-c-foot .dot { opacity: .8; }
.mb-c-foot .morning { margin-left: auto; color: #b03e1b; display: inline-flex;
  align-items: center; gap: 5px; cursor: pointer; }
.mb-sealed { position: absolute; left: 12px; right: 12px; bottom: 84px; z-index: 16;
  background: #1c1815; color: #dfdbd2; padding: 11px 14px; display: flex; align-items: center;
  gap: 10px; font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 600;
  box-shadow: 4px 4px 0 rgba(28,24,21,.2); }
.mb-sealed .wax { width: 22px; height: 22px; border-radius: 50%; background: #b03e1b;
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #f5f0e6; }
.mb-sealed .undo { margin-left: auto; color: #e8a482; letter-spacing: .1em;
  text-transform: uppercase; font-size: 9.5px; font-weight: 800; cursor: pointer; }

/* ── стол ── */
.mb-desk-scroll { flex: 1; min-height: 0; overflow: hidden; padding: 4px 0 20px; }
.mb-sheet { position: relative; margin: 12px 20px 0; background: #e9e4d8;
  border: 1px solid rgba(28,24,21,.16); padding: 16px 18px 14px;
  box-shadow: 2px 3px 0 rgba(28,24,21,.1); }
.mb-sheet.tilt { transform: rotate(-.7deg); }
.mb-sheet .to { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .2em; text-transform: uppercase; color: #7a705f; }
.mb-sheet .txt { font-family: 'Spectral', serif; font-style: italic; font-size: 16px;
  line-height: 1.5; color: #3a322a; margin: 6px 0 10px; }
.mb-sheet .cont { font-family: 'Manrope', sans-serif; font-size: 10px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase; color: #b03e1b; cursor: pointer; }
.mb-set { margin: 8px 20px 0; border-top: 1px solid rgba(28,24,21,.14); }
.mb-set-row { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  min-height: 54px; padding: 6px 0; border-bottom: 1px solid rgba(28,24,21,.09);
  font-family: 'Manrope', sans-serif; font-size: 14px; color: #1c1815; }
.mb-set-row .lab { display: flex; align-items: center; gap: 12px; }
.mb-set-row .ic { width: 22px; text-align: center; color: #7a705f; font-family: 'Spectral', serif; }
.mb-set-row .val { font-size: 12px; color: #7a705f; }
.mb-segc { display: flex; border: 1px solid rgba(28,24,21,.2); border-radius: 999px; overflow: hidden; flex: 0 0 auto; }
.mb-segc span { padding: 7px 9px; font-size: 10px; font-weight: 700; color: #7a705f; cursor: pointer; white-space: nowrap; }
.mb-segc span.on { background: rgba(176,62,27,.14); color: #1c1815; }

/* ── вечерний выпуск ── */
.mb-evening { background:
  radial-gradient(120% 42% at 50% -8%, rgba(176,62,27,.1), transparent 65%),
  linear-gradient(180deg, #d8d2c4 0%, #dfdbd2 40%); }
.mb-ev-close { margin: 16px 20px 0; border: 1px solid rgba(176,62,27,.4);
  background: rgba(176,62,27,.07); padding: 13px 16px; display: flex; align-items: center;
  gap: 12px; font-family: 'Manrope', sans-serif; }
.mb-ev-close .t { font-size: 12.5px; font-weight: 700; color: #8b2f12; }
.mb-ev-close .s { font-size: 11px; color: #7a705f; margin-top: 2px; }
.mb-ev-h { padding: 16px 20px 4px; font-family: 'Manrope', sans-serif; font-size: 10px;
  font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #7a705f; }
.mb-ev-stat { display: flex; gap: 10px; padding: 8px 20px 0; }
.mb-ev-card { flex: 1; border: 1px solid rgba(28,24,21,.16); background: #e9e4d8;
  padding: 12px 14px; }
.mb-ev-card .n { font-family: 'Spectral', serif; font-size: 24px; color: #1c1815; }
.mb-ev-card .l { font-family: 'Manrope', sans-serif; font-size: 9px; font-weight: 800;
  letter-spacing: .16em; text-transform: uppercase; color: #7a705f; margin-top: 3px; }
.mb-ev-row { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: 0 20px; padding: 12px 0; border-bottom: 1px solid rgba(28,24,21,.1); }
.mb-ev-row .who { font-family: 'Spectral', serif; font-size: 15px; color: #1c1815; }
.mb-ev-row .what { font-family: 'Spectral', serif; font-style: italic; font-size: 12px;
  color: #7a705f; margin-top: 2px; }
.mb-ev-act { font-family: 'Manrope', sans-serif; font-size: 9.5px; font-weight: 800;
  letter-spacing: .14em; text-transform: uppercase; color: #b03e1b; border: 1px solid rgba(176,62,27,.4);
  background: transparent; border-radius: 999px; padding: 9px 14px; cursor: pointer; }
.mb-ev-foot { margin: 18px 20px 0; font-family: 'Spectral', serif; font-style: italic;
  font-size: 13.5px; line-height: 1.5; color: #7a705f; }

/* ── Кружки · corkboard of postcards ── */
.mb-corkboard { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 14px 26px;
  background:
    radial-gradient(circle at 14% 20%, rgba(28,24,21,.06) 0, rgba(28,24,21,0) 2.5px),
    radial-gradient(circle at 82% 15%, rgba(28,24,21,.06) 0, rgba(28,24,21,0) 2.5px),
    radial-gradient(circle at 62% 55%, rgba(28,24,21,.06) 0, rgba(28,24,21,0) 2.5px),
    radial-gradient(circle at 20% 82%, rgba(28,24,21,.06) 0, rgba(28,24,21,0) 2.5px),
    radial-gradient(circle at 88% 78%, rgba(28,24,21,.06) 0, rgba(28,24,21,0) 2.5px),
    #cbb994;
}
.mb-cork-grid { display: flex; flex-wrap: wrap; gap: 20px 12px; }
.mb-postcard { position: relative; width: calc(50% - 6px); background: #f7f2e6; border: none;
  border-radius: 3px; padding: 9px 9px 10px; text-align: left; cursor: pointer;
  box-shadow: 0 4px 9px rgba(28,24,21,.24), 0 1px 0 rgba(255,255,255,.5) inset; }
.mb-postcard:nth-child(6n+1) { transform: rotate(-3deg); }
.mb-postcard:nth-child(6n+2) { transform: rotate(2.5deg); margin-top: 22px; }
.mb-postcard:nth-child(6n+3) { transform: rotate(-1.5deg); }
.mb-postcard:nth-child(6n+4) { transform: rotate(3deg); margin-top: 12px; }
.mb-postcard:nth-child(6n+5) { transform: rotate(-2deg); }
.mb-postcard:nth-child(6n+6) { transform: rotate(1.5deg); margin-top: 6px; }
.mb-postcard .pin { position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  width: 12px; height: 12px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff8a5c, #b03e1b 65%, #7a2a10 100%);
  box-shadow: 0 2px 3px rgba(28,24,21,.35); }
.mb-postcard.own .pin { background: radial-gradient(circle at 35% 30%, #d8d2c2, #948c79 65%, #635b4c 100%); }
.mb-postcard .photo { display: block; height: 76px; border-radius: 2px; margin-bottom: 7px; }
.mb-postcard .who { font-family: 'Manrope', sans-serif; font-size: 10.5px; font-weight: 700;
  color: #3a322a; display: flex; align-items: center; gap: 5px; }
.mb-postcard .fresh { width: 7px; height: 7px; border-radius: 50%; background: #b03e1b;
  box-shadow: 0 0 0 2px #f7f2e6; flex: 0 0 auto; }
.mb-postcard .cap { font-family: 'Spectral', serif; font-style: italic; font-size: 11px;
  color: #7a705f; margin-top: 2px; line-height: 1.32; overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.mb-postcard.read { filter: saturate(.45) brightness(.98); box-shadow: 0 2px 5px rgba(28,24,21,.15); }
.mb-postcard.fallen { width: 48%; transform: rotate(-9deg) translateY(4px) !important; }
.mb-postcard-slot { width: calc(50% - 6px); height: 104px; border: 1.5px dashed rgba(28,24,21,.18);
  border-radius: 4px; }
.mb-postcard-slot:nth-child(1) { transform: rotate(-2deg); }
.mb-postcard-slot:nth-child(2) { transform: rotate(2deg); margin-top: 16px; }
.mb-cork-note { display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; text-align: center; padding: 34px 20px; color: #7a705f; }
.mb-cork-note .g { font-size: 22px; }
.mb-cork-note .t { font-family: 'Spectral', serif; font-size: 14.5px; color: #3a322a; max-width: 230px; }
.mb-cork-note.locked .t { font-family: 'Manrope', sans-serif; font-weight: 700; letter-spacing: .04em;
  font-size: 12.5px; }

/* ── Кружки · Story viewer (full-screen) ── */
.mb-viewer { position: absolute; inset: 0; z-index: 30; background: #0a0806;
  display: flex; flex-direction: column; border-radius: 34px; overflow: hidden; }
.mb-viewer .vg-progress { display: flex; gap: 4px; padding: 14px 10px 0; }
.mb-viewer .vg-seg { flex: 1; height: 2.5px; border-radius: 2px; background: rgba(255,255,255,.28); overflow: hidden; }
.mb-viewer .vg-seg .fill { display: block; height: 100%; background: #f5f0e6; }
.mb-viewer .vg-seg.done .fill { width: 100%; }
.mb-viewer .vg-seg.active .fill { width: 45%; }
.mb-viewer .vg-seg.todo .fill { width: 0; }
.mb-viewer .vg-top { display: flex; align-items: center; gap: 10px; padding: 10px 14px 0; color: #f5f0e6; }
.mb-viewer .vg-av { width: 30px; height: 30px; border-radius: 50%; background: #e9e4d8; border: 1.5px solid rgba(245,240,230,.5); flex: 0 0 auto; }
.mb-viewer .vg-who { font-family: 'Manrope', sans-serif; font-size: 12.5px; font-weight: 700; }
.mb-viewer .vg-when { font-family: 'Manrope', sans-serif; font-size: 11px; color: rgba(245,240,230,.72); margin-left: 6px; }
.mb-viewer .vg-close { margin-left: auto; width: 32px; height: 32px; border: none; background: none;
  color: #f5f0e6; font-size: 17px; cursor: pointer; }
.mb-viewer .vg-media { flex: 1; position: relative; display: flex; align-items: center; justify-content: center;
  background: radial-gradient(90% 70% at 55% 25%, #4a4238 0%, #241d18 65%, #120e0b 100%); }
.mb-viewer .vg-media.photo { background: radial-gradient(80% 60% at 60% 25%, #ffd97a 0%, #ff7a59 42%, #8b2f5b 78%, #241a33 100%); }
.mb-viewer .vg-tapzone { position: absolute; top: 0; bottom: 0; border: none; background: transparent; }
.mb-viewer .vg-tapzone.prev { left: 0; width: 35%; }
.mb-viewer .vg-tapzone.next { left: 35%; width: 65%; }
.mb-viewer .vg-caption { padding: 10px 16px 18px; background: linear-gradient(rgba(10,8,6,0), rgba(10,8,6,.85));
  color: #f5f0e6; font-family: 'Spectral', serif; font-size: 14px; line-height: 1.4; margin-top: -70px; position: relative; z-index: 2; }
.mb-viewer .vg-badge { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
  display: flex; flex-direction: column; align-items: center; gap: 8px; color: rgba(245,240,230,.85); }
.mb-viewer .vg-badge .g { font-size: 26px; }
.mb-viewer .vg-badge .t { font-family: 'Manrope', sans-serif; font-size: 12px; }
.mb-viewer .vg-sound { position: absolute; right: 14px; bottom: 68px; z-index: 2; color: #f5f0e6; opacity: .85; font-size: 15px; }
`;

function MbStatus() {
  return (
    <div className="mb-status"><span>9:41</span><span>LTE · 87%</span></div>
  );
}

function MbTop({ actions }) {
  return (
    <div className="mb-top">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mb-word">TELEGRAMITO</div>
        <div className="mb-date">Пятница, десятое июля</div>
      </div>
      {actions}
    </div>
  );
}

function MbTabBar({ active }) {
  const tabs = [
    { k: 'letters', g: '✉', l: 'Письма' },
    { k: 'daymail', g: '☙', l: 'Почта дня', badge: '14' },
    { k: 'circles', g: '◎', l: 'Кружки' },
    { k: 'desk', g: '❦', l: 'Стол' },
  ];
  return (
    <div className="mb-tabbar">
      {tabs.map((t) => (
        <button key={t.k} type="button" className={t.k === active ? 'mb-tab on' : 'mb-tab'}>
          <span className="g">{t.g}</span>{t.l}
          {t.badge && t.k !== active ? <span className="bdg">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ═══ A · Письма ═══ */
function MobLetters() {
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={<button className="mb-iconbtn" aria-label="Поиск">⌕</button>} />
      <div className="mb-body">
        <div className="mb-seg">
          <button className="mb-chip on">Письма</button>
          <button className="mb-chip">Черновики</button>
          <button className="mb-chip">Отложенные</button>
        </div>
        <div className="mb-row active">
          <div className="mb-ava">СС</div>
          <div className="mb-rmain">
            <div className="mb-rname"><span>Soft Start · 2026 <span className="mb-unrd">99+</span></span><span className="tm">14:26</span></div>
            <div className="mb-rprev mb-post"><span className="d"></span><span className="d"></span><span className="d"></span> в пути… · 2 пишут</div>
          </div>
        </div>
        <div className="mb-row">
          <div className="mb-ava">М</div>
          <div className="mb-rmain">
            <div className="mb-rname"><span>Мама <span className="mb-unrd">2</span></span><span className="tm">13:08</span></div>
            <div className="mb-rprev">Фотография · «посмотри, что выросло»</div>
          </div>
        </div>
        <div className="mb-row">
          <div className="mb-ava">K</div>
          <div className="mb-rmain">
            <div className="mb-rname"><span>Kate 🐸</span><span className="tm">12:55</span></div>
            <div className="mb-rprev">said hi</div>
          </div>
        </div>
        <div className="mb-row">
          <div className="mb-ava">Л</div>
          <div className="mb-rmain">
            <div className="mb-rname"><span>Лиза English</span><span className="tm">11:14</span></div>
            <div className="mb-rprev">Голосовое письмо · 0:34</div>
          </div>
        </div>
        <div className="mb-sect">Каналы и бюллетени</div>
        <div className="mb-row">
          <div className="mb-ava mb-mono" style={{ fontSize: 12, fontWeight: 700 }}>88.6</div>
          <div className="mb-rmain">
            <div className="mb-rname"><span>Ведомости дня <span className="mb-unrd">3</span></span><span className="tm">09:05</span></div>
            <div className="mb-rprev">Свежий выпуск · летние маршруты</div>
          </div>
        </div>
        <button className="mb-fab">Написать ✎</button>
      </div>
      <MbTabBar active="letters" />
    </div>
  );
}

/* ═══ B · Почта дня ═══ */
function MobDayMail() {
  const items = [
    { t: '14:26', seen: true, line: <span><b>Devon</b> пишет: «займусь сегодня вечером»</span>, src: 'Кружок · Soft Start · 2026' },
    { t: '14:24', line: <span><b>Irina K.</b> делится списком дел · 4 пункта</span>, src: 'Кружок · Soft Start · 2026' },
    { t: '14:11', line: <span><b>Лиза</b> оставила голосовое письмо · 0:34</span>, src: 'Переписка · Лиза English' },
    { t: '13:08', line: <span><b>Мама</b> прислала фотографию: «посмотри, что выросло»</span>, src: 'Переписка · Мама ♥' },
    { t: '12:55', line: <span><b>Kate</b> 🐸 передаёт привет</span>, src: 'Переписка · Kate' },
    { t: '11:30', line: <span><b>Натулик</b> делится песней «Pure Imagination»</span>, src: 'Переписка · Натулик' },
  ];
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={<button className="mb-iconbtn" aria-label="Поиск">⌕</button>} />
      <div className="mb-body">
        <div className="mb-dm-head">
          <div className="mb-dm-kick">Утренний выпуск</div>
          <h2 className="mb-dm-h">Почта дня</h2>
          <p className="mb-dm-sub">Что пришло, пока вас не было — свежее сверху.</p>
        </div>
        <ul className="mb-dm-list">
          {items.map((it, i) => (
            <li key={i} className={it.seen ? 'mb-dm-item seen' : 'mb-dm-item'}>
              <div className="mb-dm-time">{it.t}</div>
              <p className="mb-dm-line">{it.line}</p>
              <p className="mb-dm-src">{it.src}</p>
            </li>
          ))}
        </ul>
        <div className="mb-quiet"><span>Тихо с 09:14</span><span>5ч 12м</span></div>
      </div>
      <MbTabBar active="daymail" />
    </div>
  );
}

/* ═══ C · Письмо (тред) ═══ */
function MobThread() {
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <div className="mb-thead">
        <button className="mb-iconbtn" aria-label="Назад">‹</button>
        <div className="mb-tt">
          <div className="nm">Soft Start · 2026</div>
          <div className="st">14 корреспондентов · <span className="writing">2 пишут…</span></div>
        </div>
        <button className="mb-iconbtn" aria-label="К дате" style={{ fontSize: 16 }}>▦</button>
        <button className="mb-iconbtn" aria-label="Сведения">ⓘ</button>
      </div>
      <div className="mb-body">
        <div className="mb-tscroll">
          <div className="mb-datechip"><span>24 апреля, после полудня</span></div>
          <div className="mb-msg">
            <div className="mb-who">13:47 <span className="n">— Irina K.</span></div>
            <p className="mb-prose">Доброе утро всем! Короткая перекличка третьей недели.</p>
            <span className="mb-note">❧ обсудить за ужином</span>
          </div>
          <div className="mb-msg">
            <div className="mb-who">13:52 <span className="n">— Anna</span></div>
            <p className="mb-prose">Анна часто теряет что-то у себя в сумке. Это бесит.</p>
          </div>
          <div className="mb-catchup">Вы остановились здесь · 24 апреля</div>
          <div className="mb-msg">
            <div className="mb-who">13:55 <span className="n">— Marina</span></div>
            <div className="mb-quote">Анна часто теряет что-то у себя в сумке. Это бесит.</div>
            <p className="mb-prose">lol same. Я нашла наушники в ботинке вчера.</p>
          </div>
          <div className="mb-msg">
            <div className="mb-who mb-who me">14:05 <span className="n">— Вы</span></div>
            <p className="mb-prose">Клуб «бум — и волосы назад», как слышно, приём.</p>
          </div>
        </div>
        <button className="mb-newmail">▾ свежая почта · 99+</button>
        <div className="mb-sealed">
          <span className="wax">✦</span>
          Запечатано — уйдёт через 5 с
          <span className="undo">Распечатать</span>
        </div>
        <div className="mb-compose">
          <div className="mb-c-row">
            <span className="mb-c-ph">Ответить своей рукой…</span>
            <button className="mb-c-btn" aria-label="Эмодзи">☺</button>
            <button className="mb-c-btn" aria-label="Вложение">✚</button>
            <button className="mb-c-send">Отправить</button>
          </div>
          <div className="mb-c-foot">
            <span className="lnk">Фото</span><span className="dot">·</span>
            <span className="lnk">Голос</span><span className="dot">·</span>
            <span className="lnk">Файл</span>
            <span className="morning">🕗 утренней почтой</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ D · Стол ═══ */
function MobDesk() {
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={null} />
      <div className="mb-body">
        <div className="mb-desk-scroll">
          <div className="mb-sect" style={{ paddingTop: 16 }}>На столе · неоконченные письма</div>
          <div className="mb-sheet tilt">
            <div className="to">Кому · Мама ♥</div>
            <p className="txt">«Мам, а помнишь, ты обещала показать, как печь тот пирог с…»</p>
            <span className="cont">Продолжить письмо ✎</span>
          </div>
          <div className="mb-sheet">
            <div className="to">Кому · Kate 🐸</div>
            <p className="txt">«Hi! I watched the film you told me about and…»</p>
            <span className="cont">Продолжить письмо ✎</span>
          </div>
          <div className="mb-sect" style={{ paddingTop: 20 }}>Хозяйство</div>
          <div className="mb-set">
            <div className="mb-set-row">
              <span className="lab"><span className="ic">☾</span>Тема</span>
              <span className="mb-segc"><span>Светлая</span><span className="on">Системная</span><span>Тёмная</span></span>
            </div>
            <div className="mb-set-row">
              <span className="lab"><span className="ic">❦</span>Режим</span>
              <span className="mb-segc"><span className="on">Ребёнок</span><span>Родитель · PIN</span></span>
            </div>
            <div className="mb-set-row">
              <span className="lab"><span className="ic">✉</span>Запросы доступа</span>
              <span className="val">2 новых ›</span>
            </div>
            <div className="mb-set-row">
              <span className="lab"><span className="ic">⚙</span>Настройки</span>
              <span className="val">›</span>
            </div>
            <div className="mb-set-row" style={{ borderBottom: 'none' }}>
              <span className="lab" style={{ color: '#b03e1b' }}><span className="ic">⎋</span>Выйти</span>
            </div>
          </div>
        </div>
      </div>
      <MbTabBar active="desk" />
    </div>
  );
}

/* ═══ E · Вечерний выпуск ═══ */
function MobEvening() {
  return (
    <div className="mb-phone mb-evening">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={null} />
      <div className="mb-body">
        <div className="mb-dm-head">
          <div className="mb-dm-kick">Вечерний выпуск · 20:18</div>
          <h2 className="mb-dm-h">Итог дня</h2>
          <p className="mb-dm-sub">Двенадцать писем от четырёх корреспондентов.</p>
        </div>
        <div className="mb-ev-stat">
          <div className="mb-ev-card"><div className="n">12</div><div className="l">Пришло</div></div>
          <div className="mb-ev-card"><div className="n">7</div><div className="l">Отправлено</div></div>
          <div className="mb-ev-card"><div className="n">2</div><div className="l">Ждут ответа</div></div>
        </div>
        <div className="mb-ev-h" style={{ paddingTop: 22 }}>Остались без ответа</div>
        <div className="mb-ev-row">
          <div>
            <div className="who">Мама ♥</div>
            <div className="what">прислала фотографию · 13:08</div>
          </div>
          <button className="mb-ev-act">Ответить</button>
        </div>
        <div className="mb-ev-row">
          <div>
            <div className="who">Лиза English</div>
            <div className="what">голосовое письмо · 14:11</div>
          </div>
          <button className="mb-ev-act">Ответить</button>
        </div>
        <div className="mb-ev-close">
          <span style={{ fontFamily: 'Spectral, serif', fontSize: 20 }}>☾</span>
          <div>
            <div className="t">Почта закрывается через 42 минуты</div>
            <div className="s">Написанное после 21:00 уйдёт утренней почтой в 8:00</div>
          </div>
        </div>
        <p className="mb-ev-foot">Спокойной ночи. Утром вас будет ждать свежий выпуск «Почты дня».</p>
      </div>
      <MbTabBar active="daymail" />
    </div>
  );
}

/* ═══ F · Кружки (доска открыток) ═══ */
function MobCircles() {
  const items = [
    { k: 'me', who: 'Вы', cap: 'ваш кружок · 6 просмотров', own: true,
      photo: 'linear-gradient(135deg, #e9e4d8, #cfc9ba 70%, #b6ae9b)' },
    { k: 'a', who: 'Anna', cap: 'сегодня вечером у гавани 🌅', unread: true,
      photo: 'linear-gradient(135deg, #ffd97a, #ff7a59 55%, #8b2f5b)' },
    { k: 'b', who: 'Marco', cap: 'студийная запись, новый рифф', unread: true,
      photo: 'linear-gradient(135deg, #7ec8e3, #3a6ea5 60%, #1c2b4a)' },
    { k: 'c', who: 'Dana', cap: 'утро в парке, тихо и туманно',
      photo: 'linear-gradient(135deg, #cfe3c9, #7fae72 60%, #3c5a34)' },
    { k: 'd', who: 'Ravi', cap: 'новый день, старый маршрут',
      photo: 'linear-gradient(135deg, #e3c9df, #a771a0 60%, #5a3457)' },
  ];
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={null} />
      <div className="mb-body">
        <div className="mb-corkboard">
          <div className="mb-cork-grid" role="list" aria-label="Кружки — открытки на доске">
            {items.map((it) => (
              <button
                key={it.k}
                type="button"
                role="listitem"
                className={`mb-postcard${it.own ? ' own' : ''}${!it.unread && !it.own ? ' read' : ''}`}
                aria-label={`${it.who}${it.own ? ' — ваш кружок' : it.unread ? ' — новый кружок, не просмотрен' : ' — просмотрено'}`}
              >
                <span className="pin" aria-hidden="true" />
                <span className="photo" style={{ background: it.photo }} />
                <span className="who">{it.who}{it.unread ? <span className="fresh" aria-hidden="true" /> : null}</span>
                <span className="cap">{it.cap}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <MbTabBar active="circles" />
    </div>
  );
}

/* ═══ F′ · Кружки — пусто / загрузка / заблокировано / ошибка ═══ */
function MobCirclesEmpty({ variant = 'empty' }) {
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <MbStatus />
      <MbTop actions={null} />
      <div className="mb-body">
        {variant === 'loading' ? (
          <div className="mb-corkboard">
            <div className="mb-cork-grid" role="status" aria-busy="true" aria-label="Загрузка кружков">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="mb-postcard" aria-hidden="true">
                  <span className="pin" />
                  <span className="photo skeleton" />
                  <span className="skeleton" style={{ display: 'block', height: 9, width: '55%', borderRadius: 4 }} />
                  <span className="skeleton" style={{ display: 'block', height: 8, width: '80%', borderRadius: 4, marginTop: 5 }} />
                </div>
              ))}
            </div>
          </div>
        ) : variant === 'locked' ? (
          <div className="mb-corkboard">
            <div className="mb-cork-note locked" role="status" style={{ paddingTop: 96 }}>
              <span className="g">☾</span>
              <p className="t">Кружки закрыты до 8:00</p>
            </div>
          </div>
        ) : variant === 'error' ? (
          <div className="mb-corkboard">
            <div className="mb-cork-grid" aria-hidden="true" style={{ justifyContent: 'center' }}>
              <div className="mb-postcard fallen">
                <span className="pin" />
                <span className="photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, background: 'rgba(192,51,31,.12)' }}>⚠</span>
                <span className="who">Кружки</span>
                <span className="cap">открытка упала с доски</span>
              </div>
            </div>
            <div className="mb-cork-note" role="status" style={{ paddingTop: 8 }}>
              <p className="t">Не удалось загрузить кружки</p>
              <button className="mb-ev-act" type="button">Повторить</button>
            </div>
          </div>
        ) : (
          <div className="mb-corkboard">
            <div className="mb-cork-grid" aria-hidden="true">
              <span className="mb-postcard-slot" />
              <span className="mb-postcard-slot" />
            </div>
            <div className="mb-cork-note" role="status">
              <span className="g">📌</span>
              <p className="t">Доска пуста — пока никто не приколол открытку</p>
            </div>
          </div>
        )}
      </div>
      <MbTabBar active="circles" />
    </div>
  );
}

/* ═══ G · Кружок — полноэкранный просмотр ═══ */
function MobStoryViewer({ variant = 'photo' }) {
  const isVideo = variant === 'video';
  const isLoading = variant === 'loading';
  const isError = variant === 'error';
  return (
    <div className="mb-phone">
      <style>{MB_CSS}</style>
      <div className="mb-viewer">
        <div className="vg-progress" aria-hidden>
          <span className="vg-seg done"><span className="fill" /></span>
          <span className="vg-seg active"><span className="fill" /></span>
          <span className="vg-seg todo"><span className="fill" /></span>
          <span className="vg-seg todo"><span className="fill" /></span>
        </div>
        <div className="vg-top">
          <span className="vg-av" />
          <span className="vg-who">Anna</span>
          <span className="vg-when">· 3ч</span>
          <button className="vg-close" type="button" aria-label="Закрыть">✕</button>
        </div>
        <div className={`vg-media ${isVideo || isError || isLoading ? '' : 'photo'}`}>
          <button className="vg-tapzone prev" type="button" aria-label="Предыдущий кружок" />
          <button className="vg-tapzone next" type="button" aria-label="Следующий кружок" />
          {isLoading ? (
            <span className="vg-badge"><span className="g skeleton" style={{ width: 40, height: 40, borderRadius: '50%', display: 'block' }} /><span className="t">Загрузка…</span></span>
          ) : isError ? (
            <span className="vg-badge"><span className="g">⚠</span><span className="t">Не удалось загрузить</span></span>
          ) : isVideo ? (
            <span className="vg-sound" aria-hidden>♪</span>
          ) : null}
        </div>
        {!isLoading && !isError ? (
          <div className="vg-caption">tonight at the harbor 🌅</div>
        ) : null}
      </div>
    </div>
  );
}

Object.assign(window, { MobLetters, MobDayMail, MobThread, MobDesk, MobEvening, MobCircles, MobCirclesEmpty, MobStoryViewer });
