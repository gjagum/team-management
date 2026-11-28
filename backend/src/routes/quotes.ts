import { Hono } from 'hono';

/**
 * "Quote of the Day" for the dashboard banner.
 *
 * Quotes are curated around the themes we want to reinforce at work:
 * optimism, teamwork, work values, a healthy work environment and mental
 * wellness. The theme rotates daily (so all five are covered every week) and
 * the quote inside the theme is picked from the date, which means:
 *   - everyone sees the same quote for the whole day,
 *   - it changes at midnight,
 *   - a restart doesn't reshuffle it mid-day.
 *
 * Public quote APIs (dummyjson, zenquotes) are general-purpose and can't filter
 * by workplace themes, so the pool is bundled here instead.
 */
const quotesRouter = new Hono();

type Theme = 'optimism' | 'teamwork' | 'values' | 'environment' | 'wellness';

interface Quote {
  text: string;
  author: string;
  theme: Theme;
}

const THEMES: Theme[] = ['optimism', 'teamwork', 'values', 'environment', 'wellness'];

const QUOTES: Quote[] = [
  // Optimism at work
  { theme: 'optimism', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { theme: 'optimism', text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { theme: 'optimism', text: 'The best way to predict the future is to create it.', author: 'Peter Drucker' },
  { theme: 'optimism', text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { theme: 'optimism', text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { theme: 'optimism', text: 'Optimism is the faith that leads to achievement.', author: 'Helen Keller' },
  { theme: 'optimism', text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },

  // Teamwork
  { theme: 'teamwork', text: 'Alone we can do so little; together we can do so much.', author: 'Helen Keller' },
  { theme: 'teamwork', text: 'Coming together is a beginning, staying together is progress, and working together is success.', author: 'Henry Ford' },
  { theme: 'teamwork', text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African proverb' },
  { theme: 'teamwork', text: 'None of us is as smart as all of us.', author: 'Ken Blanchard' },
  { theme: 'teamwork', text: 'The strength of the team is each individual member. The strength of each member is the team.', author: 'Phil Jackson' },
  { theme: 'teamwork', text: 'Talent wins games, but teamwork and intelligence win championships.', author: 'Michael Jordan' },
  { theme: 'teamwork', text: 'Great things in business are never done by one person; they are done by a team of people.', author: 'Steve Jobs' },

  // Work values
  { theme: 'values', text: 'Quality is not an act, it is a habit.', author: 'Aristotle' },
  { theme: 'values', text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { theme: 'values', text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { theme: 'values', text: 'Excellence is doing ordinary things extraordinarily well.', author: 'John W. Gardner' },
  { theme: 'values', text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { theme: 'values', text: 'Integrity is doing the right thing, even when no one is watching.', author: 'C. S. Lewis' },
  { theme: 'values', text: 'Act as if what you do makes a difference. It does.', author: 'William James' },

  // Healthy work environment
  { theme: 'environment', text: 'Respect is how to treat everyone, not just those you want to impress.', author: 'Richard Branson' },
  { theme: 'environment', text: 'Culture eats strategy for breakfast.', author: 'Peter Drucker' },
  { theme: 'environment', text: 'To win in the marketplace you must first win in the workplace.', author: 'Doug Conant' },
  { theme: 'environment', text: 'Employees who believe that management is concerned about them as a whole person are more productive.', author: 'Anne M. Mulcahy' },
  { theme: 'environment', text: 'Kindness is a language which the deaf can hear and the blind can see.', author: 'Mark Twain' },
  { theme: 'environment', text: 'The way you treat your employees is the way they will treat your customers.', author: 'Unknown' },
  { theme: 'environment', text: 'A great place to work is one where people feel valued, heard and safe to speak up.', author: 'Unknown' },

  // Mental wellness
  { theme: 'wellness', text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
  { theme: 'wellness', text: 'You do not have to see the whole staircase, just take the first step.', author: 'Martin Luther King Jr.' },
  { theme: 'wellness', text: 'Take rest; a field that has rested gives a bountiful crop.', author: 'Ovid' },
  { theme: 'wellness', text: 'Rest is not idleness, and to lie sometimes on the grass on a summer day is by no means a waste of time.', author: 'John Lubbock' },
  { theme: 'wellness', text: 'Your calm mind is the ultimate weapon against your challenges.', author: 'Bryant McGill' },
  { theme: 'wellness', text: 'Caring for myself is not self-indulgence, it is self-preservation.', author: 'Audre Lorde' },
  { theme: 'wellness', text: 'Slow down and everything you are chasing will come around and catch you.', author: 'John De Paola' },
];

function dateKey(input?: string): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

quotesRouter.get('/daily', (c) => {
  const date = dateKey(c.req.query('date'));
  const day = dayNumber(date);

  // Rotate the theme daily so every theme appears once per five days.
  const theme = THEMES[day % THEMES.length];
  const pool = QUOTES.filter((q) => q.theme === theme);
  const quote = pool[hash(date) % pool.length];

  return c.json({ ...quote, date, source: 'curated' });
});

export default quotesRouter;
