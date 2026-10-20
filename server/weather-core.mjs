import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createPrivateKey, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

let envLoaded = false;

function loadEnvFile(fileName) {
  const filePath = resolve(ROOT, fileName);
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function ensureEnvLoaded() {
  if (envLoaded) return;
  envLoaded = true;
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

// Repair PEM strings whose newlines were flattened into spaces by env-var UIs
function normalizePem(pem) {
  let value = (pem || '').trim();
  if (!value) return '';
  if (!/-----BEGIN [^-]+-----/.test(value)) return value;

  const match = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/.exec(value);
  if (!match) return value;
  const label = match[1].trim();
  const body = match[2].replace(/\s+/g, '');
  if (!body) return value;
  const lines = body.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

export function getWeatherConfig() {
  ensureEnvLoaded();
  const env = process.env;

  const host = (env.QWEATHER_API_HOST || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const kid = (env.QWEATHER_KID || '').trim();
  const projectId = (env.QWEATHER_PROJECT_ID || '').trim();
  const developerId = (env.QWEATHER_DEVELOPER_ID || '').trim();

  let keySource = 'none';
  let privateKey = (env.QWEATHER_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n')
    .trim();
  if (privateKey) {
    keySource = 'QWEATHER_PRIVATE_KEY';
  }

  // Plain base64 of the PEM file: avoids env-var UIs that strip or mangle newlines
  if (!privateKey && env.QWEATHER_PRIVATE_KEY_BASE64) {
    try {
      privateKey = Buffer.from(
        env.QWEATHER_PRIVATE_KEY_BASE64.trim().replace(/^["']|["']$/g, ''),
        'base64'
      )
        .toString('utf8')
        .trim();
      keySource = 'QWEATHER_PRIVATE_KEY_BASE64';
    } catch {
      privateKey = '';
    }
  }

  if (!privateKey && env.QWEATHER_PRIVATE_KEY_PATH) {
    const keyPath = resolve(ROOT, env.QWEATHER_PRIVATE_KEY_PATH.trim());
    if (existsSync(keyPath)) {
      privateKey = readFileSync(keyPath, 'utf8').trim();
      keySource = 'QWEATHER_PRIVATE_KEY_PATH';
    }
  }

  privateKey = normalizePem(privateKey);

  if (!host || !kid || !projectId || !developerId || !privateKey) {
    return null;
  }

  return {
    host,
    kid,
    projectId,
    developerId,
    privateKey,
    keySource,
    city: (env.QWEATHER_CITY || '本地').trim(),
    lat: Number(env.QWEATHER_LAT || '31.23'),
    lon: Number(env.QWEATHER_LON || '121.47'),
    timezone: (env.QWEATHER_TIMEZONE || 'Asia/Shanghai').trim(),
  };
}

/** 返回缺失的环境变量名（仅名称，不泄露值），用于部署排障 */
export function getMissingWeatherEnv() {
  ensureEnvLoaded();
  const env = process.env;
  const missing = [];

  if (!(env.QWEATHER_API_HOST || '').trim()) missing.push('QWEATHER_API_HOST');
  if (!(env.QWEATHER_KID || '').trim()) missing.push('QWEATHER_KID');
  if (!(env.QWEATHER_PROJECT_ID || '').trim())
    missing.push('QWEATHER_PROJECT_ID');
  if (!(env.QWEATHER_DEVELOPER_ID || '').trim())
    missing.push('QWEATHER_DEVELOPER_ID');

  let privateKey = (env.QWEATHER_PRIVATE_KEY || '').trim();
  if (!privateKey && (env.QWEATHER_PRIVATE_KEY_BASE64 || '').trim()) {
    privateKey = 'found';
  }
  if (!privateKey && env.QWEATHER_PRIVATE_KEY_PATH) {
    const keyPath = resolve(ROOT, env.QWEATHER_PRIVATE_KEY_PATH.trim());
    if (existsSync(keyPath)) privateKey = 'found';
  }
  if (!privateKey) missing.push('QWEATHER_PRIVATE_KEY');

  return missing;
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

export function createJwt(config, ttlSeconds = 900) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'EdDSA', kid: config.kid };
  const payload = {
    iss: config.developerId,
    sub: config.projectId,
    iat: now - 30,
    exp: now + ttlSeconds,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload)
  )}`;
  let privateKeyObject;
  try {
    privateKeyObject = createPrivateKey(config.privateKey);
  } catch (err) {
    const key = config.privateKey || '';
    const preview = key.slice(0, 30).replace(/\n/g, '⏎');
    throw new Error(
      `密钥解析失败 [来源: ${config.keySource || 'unknown'}, 长度: ${
        key.length
      }, 开头: ${preview}]`
    );
  }
  const signature = sign(null, Buffer.from(unsigned), privateKeyObject);
  return `${unsigned}.${signature.toString('base64url')}`;
}

const COMPASS_MAP = {
  n: '北风',
  nne: '北东北风',
  ne: '东北风',
  ene: '东东北风',
  e: '东风',
  ese: '东东南风',
  se: '东南风',
  sse: '南东南风',
  s: '南风',
  ssw: '南西南风',
  sw: '西南风',
  wsw: '西西南风',
  w: '西风',
  wnw: '西西北风',
  nw: '西北风',
  nnw: '北西北风',
  none: '静风',
  vrb: '风向不定',
};

async function fetchQWeather(config, path, jwt) {
  const res = await fetch(`https://${config.host}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`接口返回非 JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

function formatLocalDate(isoString, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString));
}

function formatWeekday(isoString, timezone) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(isoString));
}

function formatUpdatedAt(timezone) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(/\//g, '-');
}

export async function fetchWeatherForLocation(config, lat, lon) {
  const safeLat = Math.round(Number(lat) * 100) / 100;
  const safeLon = Math.round(Number(lon) * 100) / 100;
  if (
    !Number.isFinite(safeLat) ||
    !Number.isFinite(safeLon) ||
    Math.abs(safeLat) > 90 ||
    Math.abs(safeLon) > 180
  ) {
    throw new Error('无效的经纬度');
  }

  const jwt = createJwt(config);

  const [current, daily, geo] = await Promise.all([
    fetchQWeather(
      config,
      `/weather/v1/current/${safeLat}/${safeLon}?localTime=true&lang=zh`,
      jwt
    ),
    fetchQWeather(
      config,
      `/weather/v1/daily/${safeLat}/${safeLon}?days=3&localTime=true&lang=zh`,
      jwt
    ),
    fetchQWeather(
      config,
      `/geo/v2/city/lookup?location=${safeLon}%2C${safeLat}&number=1&lang=zh`,
      jwt
    ).catch(() => null),
  ]);

  const geoLocation = geo?.location?.[0];
  const timezone = geoLocation?.tz || config.timezone;
  const city = geoLocation?.adm2 || geoLocation?.name || config.city;

  return {
    city,
    updatedAt: formatUpdatedAt(timezone),
    source: '和风天气 QWeather',
    attribution: 'https://www.qweather.com',
    lat: safeLat,
    lon: safeLon,
    timezone,
    current: {
      temp: Math.round(current?.temperature?.value ?? 0),
      feelsLike: Math.round(current?.feelsLike?.value ?? 0),
      text: current?.condition?.text || '未知',
      code: Number(current?.condition?.code ?? 100),
      humidity: Math.round((current?.humidity ?? 0) * 100),
      windDir: COMPASS_MAP[current?.wind?.direction?.compass] || '风向不定',
      windScale: current?.wind?.scale ?? 0,
    },
    daily: (daily?.days || []).slice(0, 3).map((day) => ({
      date: formatLocalDate(day.forecastStartTime, timezone),
      weekday: formatWeekday(day.forecastStartTime, timezone),
      text: day?.daytime?.condition?.text || '未知',
      code: Number(day?.daytime?.condition?.code ?? 100),
      tempMax: Math.round(day?.temperatureMax?.value ?? 0),
      tempMin: Math.round(day?.temperatureMin?.value ?? 0),
      precipProb: Math.round(
        (day?.daytime?.precipitation?.probability ?? 0) * 100
      ),
    })),
  };
}
