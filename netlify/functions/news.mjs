import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore('worldbrief');
  const saved = await store.get('latest-news.json', { type: 'json' });
  return new Response(JSON.stringify({
    updatedAt: saved?.updatedAt ?? null,
    news: Array.isArray(saved?.news) ? saved.news : []
  }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
};
