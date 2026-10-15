import './runtime-shim.js';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Composite from '../vendor/dualsubs/Composite.mjs';

const settings = new URLSearchParams(typeof $argument === 'string' ? $argument.replaceAll('"', '') : '');
const targetLanguage = settings.get('TargetLanguage') || 'zh-Hans';
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const originalBody = $response.body;
const captionURL = new URL($request.url);
const sourceLanguage = captionURL.searchParams.get('lang') || '';
const header = (headers, name) => {
  if (!headers) return undefined;
  for (const candidate of [name, name.toLowerCase(), name.toUpperCase(), name.split('-').map(part => part[0].toUpperCase() + part.slice(1).toLowerCase()).join('-')]) {
    if (headers[candidate] !== undefined) return headers[candidate];
  }
  return Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
};
const fail = code => Object.assign(new Error(code), { code });

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(fail('upstream_timeout')), 9000);
    try {
      $httpClient.get({ url, headers, timeout: 8, 'auto-cookie': false, 'auto-redirect': true }, (error, response, body) => {
        clearTimeout(timer);
        if (error) return reject(fail('upstream_network_error'));
        resolve({ status: Number(response?.status ?? response?.statusCode), headers: response?.headers || {}, body });
      });
    } catch (_) { clearTimeout(timer); reject(fail('http_client_error')); }
  });
}

const xmlOptions = {
  ignoreAttributes: false, attributeNamePrefix: '@', textNodeName: '#',
  parseTagValue: false, parseAttributeValue: false, trimValues: false,
  isArray: (_name, location) => location === 'timedtext.body.p' || location === 'timedtext.head.wp',
};
function textContent(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textContent).join('');
  if (!value || typeof value !== 'object') return '';
  return String(value['#'] ?? '') + textContent(value.s);
}

function mergeCaptions(original, translated, mime) {
  const merger = new Composite({ Position: 'Forward', Tolerance: 100 });
  if (mime.includes('json') || original.trimStart().startsWith('{')) {
    const first = JSON.parse(original), second = JSON.parse(translated);
    if (!Array.isArray(first.events) || !Array.isArray(second.events)) throw fail('unsupported_json');
    for (const transcript of [first, second]) {
      for (const event of transcript.events) {
        if (event.segs) event.segs = [{ utf8: event.segs.map(segment => segment.utf8 || '').join('') }];
        delete event.wWinId;
      }
    }
    const before = first.events.map(event => event.segs?.[0]?.utf8 || '');
    const merged = merger.JSON(first, second, 'captions');
    if (!merged.events.some((event, index) => (event.segs?.[0]?.utf8 || '') !== before[index])) throw fail('no_aligned_translation');
    return JSON.stringify(merged);
  }
  if (mime.includes('xml') || original.trimStart().startsWith('<')) {
    const parser = new XMLParser(xmlOptions);
    const first = parser.parse(original), second = parser.parse(translated);
    if (!Array.isArray(first.timedtext?.body?.p) || !Array.isArray(second.timedtext?.body?.p)) throw fail('unsupported_xml');
    for (const transcript of [first, second]) {
      for (const paragraph of transcript.timedtext.body.p) {
        paragraph['#'] = textContent(paragraph);
        delete paragraph.s;
      }
    }
    const before = first.timedtext.body.p.map(paragraph => paragraph['#']);
    const merged = merger.timedText(first, second, 'captions');
    if (!merged.timedtext.body.p.some((paragraph, index) => paragraph['#'] !== before[index])) throw fail('no_aligned_translation');
    return new XMLBuilder(xmlOptions).build(merged);
  }
  throw fail('unsupported_format');
}

async function processCaption() {
  if (typeof originalBody !== 'string' || !originalBody.trim()) return {};
  if (!['www.youtube.com', 'm.youtube.com'].includes(captionURL.hostname) || captionURL.pathname !== '/api/timedtext') return {};
  if (header($request.headers, 'X-YTB-Internal') === '1') return {};
  if (!sourceLanguage || sourceLanguage.split('-')[0] === targetLanguage.split('-')[0]) return {};
  // A translated track does not contain the source text. Keep it untouched.
  if (captionURL.searchParams.get('tlang')) return {};
  const status = Number($response.status ?? $response.statusCode);
  if (status !== 200) return {};
  const translatedURL = new URL(captionURL.href);
  translatedURL.searchParams.delete('subtype');
  translatedURL.searchParams.set('tlang', targetLanguage);
  const incomingCookie = header($request.headers, 'Cookie');
  const cookie = typeof incomingCookie === 'string' ? incomingCookie : '';
  const incomingUserAgent = header($request.headers, 'User-Agent');
  const browserUserAgent = typeof incomingUserAgent === 'string' && /Chrome|Safari/.test(incomingUserAgent) ? incomingUserAgent : userAgent;
  const translated = await httpGet(translatedURL.href, {
    'User-Agent': browserUserAgent, ...(cookie ? { Cookie: cookie } : {}), Referer: 'https://www.youtube.com/',
    Accept: '*/*', 'X-YTB-Internal': '1',
  });
  if (translated.status !== 200 || typeof translated.body !== 'string' || !translated.body.trim()) throw fail('translation_unavailable');
  const mime = String(header($response.headers, 'content-type') || '');
  const body = mergeCaptions(originalBody, translated.body, mime);
  const headers = Object.fromEntries(Object.entries($response.headers || {}).filter(([key]) => !['content-length', 'content-encoding', 'transfer-encoding', 'etag'].includes(key.toLowerCase())));
  if (mime) headers['Content-Type'] = mime;
  headers['Cache-Control'] = 'no-store';
  return { body, headers };
}

processCaption().then(result => $done(result)).catch(() => $done({}));
