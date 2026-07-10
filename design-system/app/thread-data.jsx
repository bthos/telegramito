// Shared sample data for all three reframes. Same conversation, three lenses.

const THREAD = {
  id: 'soft-start-2026',
  title: 'Soft Start · 2026',
  topic: 'Test Drive',
  members: 14,
  unread: 99,
  starred: true,
  // colors used by per-thread "rooms"
  letters:   { paper: '#f6efe1', ink: '#1d1612', accent: '#b54320', mono: 'SS' },
  atelier:   { bg: '#0c1a2e',    fg: '#fdfbf6', accent: '#ff7a4a' },
  broadcast: { freq: '88.6',     band: 'FM',    accent: '#ffb84d' },
};

const PEOPLE = {
  anna:    { name: 'Anna',           color: '#c14a8b' },
  marina:  { name: 'Marina',         color: '#5b8def' },
  devon:   { name: 'Devon',          color: '#4cd9c2' },
  irina:   { name: 'Irina K.',       color: '#e8a93b' },
  you:     { name: 'You',            color: '#3390ec' },
  sasha:   { name: 'Sasha',          color: '#b15bef' },
  liza:    { name: 'Liza',           color: '#ff7a59' },
  nastya:  { name: 'Nastya',         color: '#266b29' },
};

// One day from the thread, cleaned up
const MESSAGES = [
  { id: 1, from: 'irina',  t: '13:47', kind: 'text',
    text: 'Морning everyone. Quick check-in for week 3.' },
  { id: 2, from: 'anna',   t: '13:52', kind: 'text',
    text: 'Анна часто теряет что-то у себя в сумке. Это бесит.' },
  { id: 3, from: 'marina', t: '13:55', kind: 'reaction-quote',
    quoteOf: 2, text: 'lol same. Я нашла наушники в ботинке вчера.', reactions: [{ e: '😂', n: 4 }] },
  { id: 4, from: 'devon',  t: '13:58', kind: 'list',
    title: 'How did you do?',
    items: ['Oof, but hey, I tried ✌️', 'Boom! A hair away 🥲', 'Crushed it 💯'],
    reactions: [{ e: '🥹', n: 4 }] },
  { id: 5, from: 'sasha',  t: '14:02', kind: 'text',
    text: 'Crushed it for me — finally cleared the inbox before lunch.' },
  { id: 6, from: 'you',    t: '14:05', kind: 'text', mine: true,
    text: 'Boom-and-a-hair-away club, reporting in.' },
  { id: 7, from: 'liza',   t: '14:11', kind: 'voice',
    duration: '0:34', waveform: [0.2,0.5,0.7,0.4,0.9,0.6,0.8,0.3,0.5,0.7,0.4,0.6,0.5,0.3,0.7,0.4,0.6,0.8,0.5,0.3,0.5,0.7] },
  { id: 8, from: 'nastya', t: '14:18', kind: 'text',
    text: 'Мой дядя в норме спит меньше 6 часов. Завидую.', reactions: [{ e: '🫠', n: 2 }] },
  { id: 9, from: 'irina',  t: '14:24', kind: 'todo',
    title: 'Next up — week 4 prep',
    items: [
      { done: true,  text: 'Pick the cohort buddy pairs' },
      { done: true,  text: 'Confirm the Sunday call time' },
      { done: false, text: 'Draft the reflection prompt' },
      { done: false, text: 'Mail out the workbook PDFs' },
    ] },
  { id: 10, from: 'devon', t: '14:26', kind: 'text',
    text: 'Я возьму prompt — займусь сегодня вечером.' },
];

const CHATS = [
  { id: 'mama',     name: 'Мама',          tag: 'Photo',                  date: 'Apr 30', kind: 'photo',   tone: 'warm'    },
  { id: 'soft',     name: 'Soft Start · 2026', tag: 'Event',              date: 'Apr 24', kind: 'event',   tone: 'active', unread: '99+', pinned: true, current: true },
  { id: 'telegram', name: 'Telegram',     tag: 'Event',                  date: 'Apr 24', kind: 'event',   tone: 'system' },
  { id: 'kate',     name: 'Kate',         tag: 'Nice to see you again 🤞', date: 'Apr 21', kind: 'text',    tone: 'cool'    },
  { id: 'dmts',     name: 'Дедушка МТС',   tag: 'Sticker',               date: 'Apr 18', kind: 'sticker', tone: 'cool'    },
  { id: 'liza',     name: 'Лиза English',  tag: 'Sticker',               date: 'Apr 16', kind: 'sticker', tone: 'sage'    },
  { id: 'mami',     name: 'Mamá ♥',       tag: 'Photo',                  date: 'Apr 15', kind: 'photo',   tone: 'warm'    },
  { id: 'nastyab2', name: 'Настя B2',     tag: 'Like, comment, любую…',  date: 'Apr 8',  kind: 'text',    tone: 'cool'    },
  { id: 'katya',    name: 'Катя 🐸',      tag: 'Event',                   date: 'Apr 3',  kind: 'event',   tone: 'sage'    },
  { id: 'natulik',  name: 'Натулик 😘',    tag: 'music.yandex.ru/album…', date: 'Mar 28', kind: 'link',    tone: 'rose'    },
  { id: 'papa',     name: 'Папа 😅',       tag: 'GIF',                    date: 'Mar 14', kind: 'gif',     tone: 'cool'    },
  { id: 'ludmila',  name: 'Ludmila',      tag: 'Voice · 0:46',           date: 'Mar 14', kind: 'voice',   tone: 'sage'    },
];

// "Today" digest — what's actively happening across all chats
const TODAY = [
  { t: '14:26', who: 'Devon',    chat: 'Soft Start · 2026', what: 'said «займусь сегодня вечером»' },
  { t: '14:24', who: 'Irina K.', chat: 'Soft Start · 2026', what: 'shared a checklist · 4 items' },
  { t: '14:11', who: 'Liza',     chat: 'Soft Start · 2026', what: 'sent a voice note · 0:34' },
  { t: '13:08', who: 'Mom',      chat: 'Mamá ♥',           what: 'sent a photo' },
  { t: '12:55', who: 'Kate',     chat: 'Kate',             what: '👋 said hi' },
  { t: '11:30', who: 'Natulik',  chat: 'Натулик 😘',        what: 'shared a song · «Pure Imagination»' },
];

// Per-day activity counts for the current thread (for "Thread DNA" panel)
const DNA_DAYS = [
  { d: 'Apr 19', count: 47 },
  { d: 'Apr 20', count: 22 },
  { d: 'Apr 21', count: 8  },
  { d: 'Apr 22', count: 36 },
  { d: 'Apr 23', count: 71 },
  { d: 'Apr 24', count: 99, peak: true },
  { d: 'Apr 25', count: 52 },
  { d: 'Apr 26', count: 19 },
  { d: 'Apr 27', count: 28 },
  { d: 'Apr 28', count: 64 },
  { d: 'Apr 29', count: 41 },
  { d: 'Apr 30', count: 12 },
  { d: 'May 1',  count: 27 },
  { d: 'May 2',  count: 8  },
];

Object.assign(window, { THREAD, PEOPLE, MESSAGES, CHATS, TODAY, DNA_DAYS });
