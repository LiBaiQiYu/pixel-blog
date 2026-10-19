/**
 * 和风天气代理 - Cloudflare Workers 版本（免费 10 万次/天）
 *
 * 部署步骤：
 *   1. npm i -g wrangler && wrangler login
 *   2. 在 workers/ 目录执行：wrangler deploy
 *   3. 配置密钥（示例，值换成你自己的）：
 *        wrangler secret put QWEATHER_KID
 *        wrangler secret put QWEATHER_PROJECT_ID
 *        wrangler secret put QWEATHER_DEVELOPER_ID
 *        wrangler secret put QWEATHER_HOST
 *        wrangler secret put QWEATHER_PRIVATE_KEY   # 私钥 PEM 全文，换行写成 \n
 *   4. 部署完成后得到 https://<名字>.<账号>.workers.dev/api/weather
 *      把它填到前端构建变量 VITE_WEATHER_API_ENDPOINT 即可。
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

function base64UrlFromBytes(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlFromString(text) {
  return base64UrlFromBytes(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem) {
  const clean = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function createJwt(env) {
  const header = { alg: 'EdDSA', kid: env.QWEATHER_KID };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.QWEATHER_DEVELOPER_ID,
    sub: env.QWEATHER_PROJECT_ID,
    iat: now - 30,
    exp: now + 900,
  };
  const unsigned = `${base64UrlFromString(
    JSON.stringify(header)
  )}.${base64UrlFromString(JSON.stringify(payload))}`;

  // Cloudflare Workers 使用 NODE-ED25519 算法导入 PKCS#8 私钥
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(env.QWEATHER_PRIVATE_KEY.replace(/\\n/g, '\n')),
    { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    { name: 'NODE-ED25519' },
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${base64UrlFromBytes(signature)}`;
}

function formatInTimezone(date, timezone, options, separator = '-') {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    ...options,
  })
    .format(date)
    .replace(/\//g, separator);
}

async function fetchQWeather(env, jwt, path) {
  const res = await fetch(`https://${env.QWEATHER_HOST}${path}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

async function buildWeather(env, lat, lon) {
  const jwt = await createJwt(env);
  const safeLat = Math.round(Number(lat) * 100) / 100;
  const safeLon = Math.round(Number(lon) * 100) / 100;

  const [current, daily, geo] = await Promise.all([
    fetchQWeather(
      env,
      jwt,
      `/weather/v1/current/${safeLat}/${safeLon}?localTime=true&lang=zh`
    ),
    fetchQWeather(
      env,
      jwt,
      `/weather/v1/daily/${safeLat}/${safeLon}?days=3&localTime=true&lang=zh`
    ),
    fetchQWeather(
      env,
      jwt,
      `/geo/v2/city/lookup?location=${safeLon}%2C${safeLat}&number=1&lang=zh`
    ).catch(() => null),
  ]);

  const geoLocation = geo?.location?.[0];
  const timezone = geoLocation?.tz || 'Asia/Shanghai';
  const city = geoLocation?.adm2 || geoLocation?.name || '当前位置';

  return {
    city,
    updatedAt: formatInTimezone(
      new Date(),
      timezone,
      {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }
    ),
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
      date: formatInTimezone(day.forecastStartTime, timezone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      weekday: formatInTimezone(day.forecastStartTime, timezone, {
        weekday: 'short',
      }),
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

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lon = Number(url.searchParams.get('lon'));

    const json = (body, status) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
      });

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      Math.abs(lat) > 90 ||
      Math.abs(lon) > 180
    ) {
      return json({ error: 'Invalid latitude/longitude.' }, 400);
    }

    if (
      !env.QWEATHER_HOST ||
      !env.QWEATHER_KID ||
      !env.QWEATHER_PROJECT_ID ||
      !env.QWEATHER_DEVELOPER_ID ||
      !env.QWEATHER_PRIVATE_KEY
    ) {
      return json({ error: 'Weather service is not configured.' }, 503);
    }

    try {
      const data = await buildWeather(env, lat, lon);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    } catch (err) {
      return json({ error: 'Failed to fetch weather data.' }, 502);
    }
  },
};
