WorldBrief

A Netlify-ready daily news app focused on useful developments in the economy, technology, science, space and climate.

## How it works

- `index.html` is the mobile-friendly frontend.
- `/.netlify/functions/daily-fetch` collects RSS/news feeds once per day at **06:00 UTC**.
- The collector filters sensational/crime-oriented material and scores stories for useful progress and discovery.
- Selected stories are stored in Netlify Blobs under `latest-news.json`.
- `/.netlify/functions/news` serves the cached stories to the frontend.

## Sources

BBC, Reuters via Google News RSS, Associated Press via Google News RSS, The Guardian, Nature and NASA.

## First deployment

After deploying to Netlify, run the `daily-fetch` scheduled function once from the Netlify Functions interface so the first `latest-news.json` is created. Scheduled functions then run automatically every day at 06:00 UTC.

No API keys are required by this version.

## Important editorial behavior

The filter removes sensational or morbid material, but it does **not** blindly remove every negative fact. Important negative information can remain when it is necessary to understand an economic, scientific, technological or climate development.
