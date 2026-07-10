// Letters v2 — newsprint refinement.
// Cooler gray paper, ink-black, single terracotta accent.
// No postmark. Inline DNA + calendar in the letter's header.
// Channels get frequencies (88.6); people-chats get names.
// Pulsing "in the post" indicator on chats where someone is actively writing.

const lettersS = {
  paper:    '#dfdbd2',          // newsprint warm gray
  paper2:   '#d4cfc3',
  card:     '#e9e4d8',
  ink:      '#1c1815',          // deep warm black
  ink2:     '#3a322a',
  ink3:     '#7a705f',
  ink4:     '#a89e8b',
  rule:     'rgba(28,24,21,.16)',
  rule2:    'rgba(28,24,21,.08)',
  accent:   '#b03e1b',          // single warm accent · terracotta ink
  accent2:  '#8b2f12',
  serif:    "'Spectral', 'Iowan Old Style', Georgia, serif",
  sc:       "'Manrope', system-ui, sans-serif",
  mono:     "'JetBrains Mono', ui-monospace, Menlo, monospace",
};

// Mark which chats are channels (get frequency) vs people (get name only)
const KIND = {
  mama: 'person',  soft: 'channel', telegram: 'channel',
  kate: 'person',  dmts: 'channel', liza: 'person',
  mami: 'person',  nastyab2: 'person', katya: 'person',
  natulik: 'person', papa: 'person', ludmila: 'person',
};
const CHANNEL_FREQ = {
  soft:     '88.6',
  telegram: '101.3',
  dmts:     '107.2',
};

// Pretend-active chats (typing / unsent letter en route)
const POSTING = new Set(['mama', 'kate']);

function LettersVariant() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: lettersS.paper,
      backgroundImage: `
        repeating-linear-gradient(0deg, rgba(28,24,21,.022) 0 1px, transparent 1px 3px),
        radial-gradient(900px 500px at 100% 0%, rgba(176,62,27,.04), transparent 70%)`,
      color: lettersS.ink,
      fontFamily: lettersS.serif,
      display: 'grid',
      gridTemplateColumns: '300px 1fr 320px',
      gridTemplateRows: '54px 1fr',
      overflow: 'hidden',
    }}>
      <TopBand />
      <CorrespondentsAside />
      <LetterMain />
      <TodaysMail />
      <style>{`
        @keyframes lt-post {
          0%,100% { transform: translateX(0); opacity: .85; }
          50%     { transform: translateX(3px); opacity: 1; }
        }
        @keyframes lt-pulse {
          0%,100% { opacity: .55; }
          50%     { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ───────── Top band ───────── */
function TopBand() {
  return (
    <div style={{
      gridColumn: '1 / -1',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: `1px solid ${lettersS.rule}`,
      background: lettersS.paper2,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{
          fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.22em',
          textTransform: 'uppercase', color: lettersS.ink2, fontWeight: 700,
        }}>Telegramito</span>
        <span style={{ width: 1, height: 14, background: lettersS.rule }}></span>
        <span style={{ fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 14, color: lettersS.ink2 }}>
          Friday, the fifteenth of May
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontFamily: lettersS.sc, fontSize: 11, color: lettersS.ink2, letterSpacing: '.04em' }}>
        <span style={{ color: lettersS.accent, fontWeight: 700, borderBottom: `1.5px solid ${lettersS.accent}`, paddingBottom: 4 }}>Letters</span>
        <span>Drafts</span>
        <span>Returned</span>
        <span style={{ color: lettersS.ink4 }}>·</span>
        <span>Search</span>
        <span style={{
          padding: '4px 10px', border: `1px solid ${lettersS.ink}`,
          fontFamily: lettersS.sc, fontSize: 10, fontWeight: 700,
          letterSpacing: '.14em', textTransform: 'uppercase',
        }}>Write ↗</span>
      </div>
    </div>
  );
}

/* ───────── Left aside — Correspondents ───────── */
function CorrespondentsAside() {
  const people = CHATS.filter(c => KIND[c.id] === 'person').slice(0, 7);
  const channels = CHATS.filter(c => KIND[c.id] === 'channel');
  return (
    <aside style={{
      borderRight: `1px solid ${lettersS.rule}`,
      padding: '20px 0',
      overflow: 'hidden',
      background: lettersS.paper,
    }}>
      <SectionTitle>Correspondents</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {people.map(c => <PersonRow key={c.id} c={c} />)}
      </div>

      <SectionTitle style={{ marginTop: 18 }}>Channels &amp; Bulletins</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {channels.map(c => <ChannelRow key={c.id} c={c} />)}
      </div>
    </aside>
  );
}

function SectionTitle({ children, style }) {
  return (
    <div style={{
      padding: '0 18px 10px',
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      ...style,
    }}>
      <span style={{
        fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.22em',
        textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 700,
      }}>{children}</span>
    </div>
  );
}

function PersonRow({ c }) {
  const posting = POSTING.has(c.id);
  const active = c.current;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      columnGap: 10,
      alignItems: 'baseline',
      padding: '10px 18px 10px 22px',
      borderLeft: `2px solid ${active ? lettersS.accent : 'transparent'}`,
      background: active ? lettersS.card : 'transparent',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: lettersS.serif, fontSize: 15, fontWeight: 500, color: lettersS.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          {c.pinned && <span style={{ color: lettersS.accent, fontSize: 10 }}>✦</span>}
        </div>
        <div style={{
          fontFamily: posting ? lettersS.serif : lettersS.sc,
          fontSize: posting ? 12 : 11,
          fontStyle: posting ? 'italic' : 'normal',
          color: posting ? lettersS.accent : lettersS.ink3,
          letterSpacing: posting ? 0 : '.04em',
          marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {posting && (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: lettersS.accent, animation: 'lt-pulse 1.4s ease-in-out infinite' }}></span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: lettersS.accent, animation: 'lt-pulse 1.4s ease-in-out .2s infinite', marginLeft: 2 }}></span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: lettersS.accent, animation: 'lt-pulse 1.4s ease-in-out .4s infinite', marginLeft: 2 }}></span>
            </span>
          )}
          {posting ? 'in the post…' : c.tag}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: lettersS.sc, fontSize: 10, color: lettersS.ink3, letterSpacing: '.06em' }}>{c.date}</div>
        {c.unread && (
          <div style={{
            display: 'inline-block', marginTop: 3,
            background: lettersS.ink, color: lettersS.paper,
            padding: '0 6px',
            fontFamily: lettersS.sc, fontSize: 10, fontWeight: 700, letterSpacing: '.04em',
          }}>{c.unread}</div>
        )}
      </div>
    </div>
  );
}

function ChannelRow({ c }) {
  const freq = CHANNEL_FREQ[c.id] || '—';
  const posting = c.id === 'soft'; // bulletin currently transmitting
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '54px 1fr auto',
      columnGap: 12,
      alignItems: 'center',
      padding: '11px 18px 11px 18px',
      borderLeft: `2px solid ${c.current ? lettersS.accent : 'transparent'}`,
      background: c.current ? lettersS.card : 'transparent',
    }}>
      <div style={{
        fontFamily: lettersS.mono, fontWeight: 700, fontSize: 15,
        color: c.current ? lettersS.accent : lettersS.ink2,
        letterSpacing: '-.02em', lineHeight: 1,
      }}>
        {freq}
        <span style={{
          display: 'block', fontFamily: lettersS.mono,
          fontSize: 8, color: lettersS.ink3, fontWeight: 500,
          letterSpacing: '.18em', marginTop: 2,
        }}>FM · MHz</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: lettersS.serif, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.name}
        </div>
        <div style={{ fontFamily: lettersS.sc, fontSize: 10, color: posting ? lettersS.accent : lettersS.ink3, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 5 }}>
            {posting && <span style={{ width: 6, height: 6, borderRadius: '50%', background: lettersS.accent, animation: 'lt-pulse 1.3s ease-in-out infinite', flex: 'none' }}></span>}
          {posting ? 'transmitting now' : c.tag}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: lettersS.sc, fontSize: 10, color: lettersS.ink3 }}>{c.date}</div>
        {c.unread && (
          <div style={{
            display: 'inline-block', marginTop: 3,
            background: lettersS.accent, color: lettersS.paper,
            padding: '0 6px',
            fontFamily: lettersS.sc, fontSize: 10, fontWeight: 700,
          }}>{c.unread}</div>
        )}
      </div>
    </div>
  );
}

/* ───────── Center — the letter ───────── */
function LetterMain() {
  return (
    <main style={{ overflow: 'hidden', position: 'relative', padding: '28px 56px 0' }}>
      <LetterHeader />
      <div style={{ height: 1, background: lettersS.ink, opacity: .85, margin: '18px 0' }}></div>

      <div style={{ overflow: 'hidden', position: 'relative', maxHeight: 580 }}>
        <DayMark>April 24, afternoon</DayMark>
        {MESSAGES.slice(0, 7).map(m => <Passage key={m.id} m={m} />)}
        <div style={{ height: 80, background: `linear-gradient(180deg, transparent, ${lettersS.paper})`,
          position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}></div>
      </div>

      <Compose />
    </main>
  );
}

function LetterHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      columnGap: 28,
      alignItems: 'flex-end',
    }}>
      <div>
        <div style={{
          fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.22em',
          textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>Bundle № 24</span>
          <span style={{ width: 14, height: 1, background: lettersS.rule }}></span>
          <span>Test Drive</span>
          <span style={{ width: 14, height: 1, background: lettersS.rule }}></span>
          <span style={{ color: lettersS.accent, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: lettersS.accent, animation: 'lt-pulse 1.2s ease-in-out infinite' }}></span>
            4 hands writing
          </span>
        </div>
        <h1 style={{
          margin: '6px 0 4px', fontFamily: lettersS.serif, fontWeight: 500,
          fontSize: 34, letterSpacing: '-.01em', color: lettersS.ink, lineHeight: 1.05,
        }}>Soft Start · 2026</h1>
        <div style={{ fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 13, color: lettersS.ink3 }}>
          14 correspondents · 99+ pages unread · opened by Irina K.
        </div>
      </div>
      <Insights />
    </div>
  );
}

/* Inline thread DNA + calendar */
function Insights() {
  const max = Math.max(...DNA_DAYS.map(d => d.count));
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1px auto',
      columnGap: 16,
      alignItems: 'stretch',
      padding: '10px 14px',
      background: lettersS.card,
      border: `1px solid ${lettersS.rule}`,
    }}>
      {/* DNA spark */}
      <div>
        <div style={{
          fontFamily: lettersS.sc, fontSize: 9, letterSpacing: '.18em',
          textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 700,
          marginBottom: 6,
        }}>Volume · 14 days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 26 }}>
          {DNA_DAYS.map((d, i) => (
            <div key={i} style={{
              width: 5, height: `${(d.count / max) * 100}%`, minHeight: 2,
              background: d.peak ? lettersS.accent : lettersS.ink2,
              opacity: d.peak ? 1 : 0.6,
            }}></div>
          ))}
        </div>
        <div style={{
          marginTop: 4, fontFamily: lettersS.serif, fontStyle: 'italic',
          fontSize: 11, color: lettersS.ink3,
        }}>peak <span style={{ color: lettersS.accent, fontWeight: 600, fontStyle: 'normal' }}>99</span> · Apr 24</div>
      </div>

      <div style={{ width: 1, background: lettersS.rule }}></div>

      {/* mini calendar — last 4 weeks */}
      <div>
        <div style={{
          fontFamily: lettersS.sc, fontSize: 9, letterSpacing: '.18em',
          textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 700,
          marginBottom: 6,
        }}>Jump by date</div>
        <MiniCalendar />
      </div>
    </div>
  );
}

function MiniCalendar() {
  // Show last 4 weeks ending on May 15 (Fri). Active days = those in DNA_DAYS.
  const activeDates = new Set(DNA_DAYS.map(d => d.d));
  const peakDate = (DNA_DAYS.find(d => d.peak) || {}).d;
  // Build a 4×7 grid ending May 15
  const cells = [];
  // Simple labeling: rows by week, days Apr 18 → May 15 = 28 days
  const start = new Date(2026, 3, 18); // Apr 18
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const key = `${months[d.getMonth()]} ${d.getDate()}`;
    cells.push({ key, day: d.getDate(), active: activeDates.has(key), peak: key === peakDate });
  }
  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 16px)', gap: 3,
      }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 8, color: lettersS.ink4, letterSpacing: '.08em', fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((c, i) => (
          <div key={i} style={{
            width: 16, height: 16,
            display: 'grid', placeItems: 'center',
            fontFamily: lettersS.mono, fontSize: 9, fontWeight: c.active ? 600 : 400,
            color: c.peak ? lettersS.paper : c.active ? lettersS.ink : lettersS.ink4,
            background: c.peak ? lettersS.accent : c.active ? 'rgba(28,24,21,.08)' : 'transparent',
          }}>{c.day}</div>
        ))}
      </div>
    </div>
  );
}

function DayMark({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 14px' }}>
      <span style={{ flex: 1, height: 1, background: lettersS.rule2 }}></span>
      <span style={{ fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 13, color: lettersS.ink3 }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: lettersS.rule2 }}></span>
    </div>
  );
}

function Passage({ m }) {
  const p = PEOPLE[m.from];
  const reactions = m.reactions || [];
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '120px 1fr 116px',
      columnGap: 22,
      padding: '10px 0',
      alignItems: 'flex-start',
      borderBottom: `1px solid ${lettersS.rule2}`,
    }}>
      {/* speaker column */}
      <div style={{ textAlign: 'right', paddingTop: 3 }}>
        <div style={{
          fontFamily: lettersS.sc, fontSize: 9, letterSpacing: '.22em',
          textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 600,
        }}>{m.t}</div>
        <div style={{
          fontFamily: lettersS.serif, fontSize: 13, fontStyle: 'italic',
          color: m.mine ? lettersS.accent : lettersS.ink2, marginTop: 1,
        }}>— {p.name}</div>
      </div>

      {/* body */}
      <div style={{
        fontFamily: lettersS.serif, fontSize: 16, lineHeight: 1.55, color: lettersS.ink,
      }}>
        {m.kind === 'text' && <span style={{ textWrap: 'pretty' }}>{m.text}</span>}
        {m.kind === 'reaction-quote' && (
          <>
            <span style={{
              display: 'block', borderLeft: `2px solid ${lettersS.rule}`,
              paddingLeft: 10, fontStyle: 'italic', color: lettersS.ink3,
              fontSize: 14, marginBottom: 4,
            }}>{(MESSAGES.find(x => x.id === m.quoteOf) || {}).text}</span>
            {m.text}
          </>
        )}
        {m.kind === 'list' && (
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{m.title}</div>
            {m.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 2 }}>
                <span style={{ color: lettersS.ink3, fontFamily: lettersS.sc, fontSize: 13 }}>—</span>
                <span>{it}</span>
              </div>
            ))}
          </div>
        )}
        {m.kind === 'voice' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              border: `1.5px solid ${lettersS.ink}`,
              display: 'grid', placeItems: 'center',
            }}>
              <div style={{ width: 0, height: 0, borderLeft: `8px solid ${lettersS.ink}`, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }}></div>
            </div>
            <svg width="180" height="26" viewBox="0 0 180 26">
              {m.waveform.map((h, i) => (
                <rect key={i} x={i * 8} y={13 - h * 11} width="3" height={Math.max(2, h * 22)}
                  fill={i < 8 ? lettersS.accent : lettersS.ink3} />
              ))}
            </svg>
            <span style={{ fontFamily: lettersS.sc, fontSize: 11, letterSpacing: '.06em', color: lettersS.ink3 }}>{m.duration}</span>
          </div>
        )}
      </div>

      {/* margin annotation */}
      <div style={{
        fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 12, color: lettersS.ink3, paddingTop: 5,
      }}>
        {reactions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {reactions.map((r, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontSize: 13, fontStyle: 'normal' }}>{r.e}</span>
                <span>×{r.n}</span>
              </span>
            ))}
          </div>
        )}
        {m.from === 'irina' && m.id === 1 && (
          <span style={{ borderLeft: `2px solid ${lettersS.accent}`, paddingLeft: 8, color: lettersS.ink2, display: 'block' }}>noted, week 3 ✓</span>
        )}
        {m.kind === 'voice' && (
          <span style={{ color: lettersS.ink3, fontStyle: 'normal', fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>read transcript ›</span>
        )}
      </div>
    </div>
  );
}

function Compose() {
  return (
    <div style={{
      position: 'absolute', left: 56, right: 56, bottom: 20,
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px',
      background: lettersS.paper2,
      border: `1px solid ${lettersS.ink}`,
      boxShadow: `4px 4px 0 ${lettersS.rule}`,
    }}>
      <span style={{
        fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 14, color: lettersS.ink3,
      }}>Reply, in your own hand…</span>
      <span style={{ flex: 1 }}></span>
      <span style={{
        fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.18em',
        textTransform: 'uppercase', color: lettersS.ink3,
      }}>Photo · Voice · File</span>
      <button style={{
        border: 0, background: lettersS.ink, color: lettersS.paper,
        padding: '8px 16px',
        fontFamily: lettersS.sc, fontWeight: 700, fontSize: 11,
        letterSpacing: '.16em', textTransform: 'uppercase', cursor: 'pointer',
      }}>Send →</button>
    </div>
  );
}

/* ───────── Right rail — today's mail ───────── */
function TodaysMail() {
  return (
    <aside style={{
      borderLeft: `1px solid ${lettersS.rule}`,
      padding: '22px 22px',
      overflow: 'hidden',
      background: lettersS.paper2,
    }}>
      <div style={{
        fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.22em',
        textTransform: 'uppercase', color: lettersS.ink3, fontWeight: 700,
      }}>The day's mail</div>
      <div style={{
        fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 13,
        color: lettersS.ink2, margin: '4px 0 16px',
      }}>What arrived while you were away.</div>

      <div style={{ position: 'relative', paddingLeft: 16 }}>
        <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: lettersS.rule }}></div>
        {TODAY.map((it, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
            <div style={{
              position: 'absolute', left: -16, top: 5,
              width: 9, height: 9,
              background: i === 0 ? lettersS.accent : lettersS.paper,
              border: `1.5px solid ${i === 0 ? lettersS.accent : lettersS.ink3}`,
            }}></div>
            <div style={{ fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.14em', color: lettersS.ink3 }}>{it.t}</div>
            <div style={{ fontFamily: lettersS.serif, fontSize: 14, lineHeight: 1.35, color: lettersS.ink, marginTop: 1 }}>
              <span style={{ fontWeight: 600 }}>{it.who}</span> {it.what}
            </div>
            <div style={{ fontFamily: lettersS.sc, fontSize: 10, color: lettersS.ink3 }}>{it.chat}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 4, padding: '12px 0 0', borderTop: `1px dashed ${lettersS.rule}`,
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: lettersS.sc, fontSize: 10, letterSpacing: '.16em',
          textTransform: 'uppercase', color: lettersS.ink3,
        }}>Quiet since 09:14</span>
        <span style={{ fontFamily: lettersS.serif, fontStyle: 'italic', fontSize: 12, color: lettersS.ink3 }}>5h 12m</span>
      </div>
    </aside>
  );
}

Object.assign(window, { LettersVariant });
