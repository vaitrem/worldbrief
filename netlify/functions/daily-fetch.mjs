import { getStore } from '@netlify/blobs';

const FEEDS = [
  ['BBC', 'https://feeds.bbci.co.uk/news/world/rss.xml?edition=uk'],
  ['Reuters', 'https://news.google.com/rss/search?q=site%3Areuters.com%20(technology%20OR%20science%20OR%20economy%20OR%20climate%20OR%20space)%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen'],
  ['AP', 'https://news.google.com/rss/search?q=site%3Aapnews.com%20(technology%20OR%20science%20OR%20economy%20OR%20climate%20OR%20space)%20when%3A1d&hl=en-US&gl=US&ceid=US%3Aen'],
  ['The Guardian', 'https://www.theguardian.com/world/rss'],
  ['Nature', 'https://www.nature.com/nature.rss'],
  ['NASA', 'https://www.nasa.gov/rss/dyn/breaking_news.rss']
];

const REMOVE = ['murder','killing','shooting','bombing','terrorist','terrorism','graphic','gore','crime scene','dead body','death toll','massacre','homicide','rape','abuse','kidnap','hostage','war crime','celebrity gossip','paparazzi','reality tv','sensational','shocking','horror'];
const PREFER = ['innovation','discovery','research','scientists','science','technology','ai','robotics','space','renewable','clean energy','solar','wind power','battery','climate solution','adaptation','biodiversity','restoration','conservation','investment','productivity','education','medicine','health research','quantum','semiconductor','fusion','ev','recycling','nature'];

const CATEGORY_RULES = [
  ['Technology', ['technology','artificial intelligence',' ai ','robotics','semiconductor','quantum','software']],
  ['Science', ['science','scientist','research','biology','evolution','medicine','health']],
  ['Climate', ['climate','renewable','solar','wind power','biodiversity','conservation','adaptation','emissions']],
  ['Economy', ['economy','economic','investment','inflation','trade','productivity','employment','markets']],
  ['Space', ['space','nasa','esa','astronomy','moon','mars','satellite']]
];

function stripHtml(value='') {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/s+/g, ' ').trim();
}
function field(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripHtml(m[1]) : '';
}
function fieldUrl(xml) {
  const link = xml.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i);
  if (link) return stripHtml(link[1]);
  const atom = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  return atom ? atom[1] : '';
}
function parseFeed(xml, source) {
  const items = [...xml.matchAll(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi)];
  return items.map(m => {
    const x = m[0];
    return {
      source,
      title: field(x, 'title'),
      text: field(x, 'description') || field(x, 'summary') || field(x, 'content'),
      url: fieldUrl(x),
      published: field(x, 'pubDate') || field(x, 'published') || field(x, 'updated')
    };
  }).filter(x => x.title && x.url);
}
function score(item) {
  const text = `${item.title} ${item.text}`.toLowerCase();
  let value = 0;
  for (const word of PREFER) if (text.includes(word)) value += 2;
  for (const word of REMOVE) if (text.includes(word)) value -= 10;
  return value;
}
function category(item) {
  const text = ` ${item.title} ${item.text}`.toLowerCase();
  for (const [cat, words] of CATEGORY_RULES) if (words.some(w => text.includes(w))) return cat;
  return 'World';
}
function formatTime(dateValue) {
  const d = new Date(dateValue);
  return Number.isNaN(d.getTime()) ? 'Today' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default async () => {
  const results = await Promise.allSettled(FEEDS.map(async ([source, url]) => {
    const response = await fetch(url, { headers: { 'user-agent': 'WorldBrief/1.0' } });
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
    return parseFeed(await response.text(), source);
  }));

  const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const seen = new Set();
  const news = all
    .map(item => ({ ...item, score: score(item) }))
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40)
    .map(item => ({
      cat: category(item),
      tag: category(item),
      title: item.title,
      text: item.text.slice(0, 420),
      source: item.source,
      time: formatTime(item.published),
      published: item.published,
      url: item.url,
      score: item.score
    }));

  const payload = { updatedAt: new Date().toISOString(), news };
  await getStore('worldbrief').setJSON('latest-news.json', payload);
  return new Response(JSON.stringify({ ok: true, count: news.length, updatedAt: payload.updatedAt }), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
