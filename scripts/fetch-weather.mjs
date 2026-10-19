import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getWeatherConfig,
  fetchWeatherForLocation,
} from '../server/weather-core.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const outputPath = resolve(ROOT, 'src/data/weather.json');

const config = getWeatherConfig();

if (!config) {
  console.log(
    '[weather] 未检测到完整的和风天气环境变量，跳过在线拉取，保留现有 src/data/weather.json。'
  );
  console.log(
    '[weather] 需要配置: QWEATHER_API_HOST / QWEATHER_KID / QWEATHER_PROJECT_ID / QWEATHER_DEVELOPER_ID / QWEATHER_PRIVATE_KEY_PATH'
  );
  process.exit(0);
}

try {
  const data = await fetchWeatherForLocation(config, config.lat, config.lon);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(
    `[weather] 已更新 ${outputPath}（${data.city} ${data.current.text} ${data.current.temp}°C）`
  );
} catch (err) {
  console.error('[weather] 拉取失败:', err.message);
  console.error('[weather] 保留现有 src/data/weather.json，不影响构建。');
  process.exit(0);
}
