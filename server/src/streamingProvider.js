/**
 * streamingProvider.js
 *
 * Adapter that fetches streaming availability data for a given movie.
 * Currently backed by Watchmode (https://api.watchmode.com/).
 *
 * To switch to another provider in the future, only this file needs to change.
 * The exported function keeps the same contract regardless of the backend.
 *
 * Contract:
 *   getStreamingInfo(title: string, year: number|null): Promise<object|null>
 *
 *   Returned object shape (provider-agnostic):
 *   {
 *     title: string,
 *     poster: string|null,
 *     genre_names: string[],
 *     runtime_minutes: number|null,
 *     us_rating: string|null,
 *     user_rating: number|null,
 *     critic_score: number|null,
 *     plot_overview: string|null,
 *     sources: Array<{
 *       source_id: string|number,
 *       name: string,
 *       type: 'sub'|'rent'|'buy'|'free',
 *       web_url: string,
 *     }>,
 *   }
 */

const WATCHMODE_API_BASE = 'https://api.watchmode.com/v1';

async function getStreamingInfo(title, year) {
  const apiKey = process.env.WATCHMODE_API_KEY;

  if (!apiKey) {
    const err = new Error(
      'Streaming provider API key not configured. ' +
      'Add WATCHMODE_API_KEY to your .env file (free key at https://api.watchmode.com/).'
    );
    err.code = 'PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const searchUrl =
    `${WATCHMODE_API_BASE}/search/?apiKey=${encodeURIComponent(apiKey)}` +
    `&search_field=name&search_value=${encodeURIComponent(title)}&search_type=3`;

  const searchResp = await fetch(searchUrl);
  const searchData = await searchResp.json();

  if (!searchData.title_results?.length) {
    return null;
  }

  let bestMatch = searchData.title_results[0];
  if (year) {
    const byYear = searchData.title_results.find((r) => r.year === year);
    if (byYear) bestMatch = byYear;
  }

  const detailUrl =
    `${WATCHMODE_API_BASE}/title/${bestMatch.id}/details/` +
    `?apiKey=${encodeURIComponent(apiKey)}&append_to_response=sources`;

  const detailResp = await fetch(detailUrl);
  const detail = await detailResp.json();

  return detail;
}

module.exports = { getStreamingInfo };
