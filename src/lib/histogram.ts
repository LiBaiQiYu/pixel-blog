export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  gray: number[];
}

export type HistogramDataCompressed = HistogramData;

const zeroArray = (length: number) =>
  Array.from({ length }, () => 0);

const compressHistogramBin = (data: number[]) => {
  const compressed = zeroArray(128);
  for (let i = 0; i < data.length; i += 1) {
    compressed[Math.floor(i / 2)] += data[i] ?? 0;
  }
  return compressed;
};

export const calculateHistogramCompressed = (
  imageData: ImageData
): HistogramDataCompressed => {
  const histogram: HistogramData = {
    red: zeroArray(256),
    green: zeroArray(256),
    blue: zeroArray(256),
    gray: zeroArray(256),
  };

  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    histogram.red[r] += 1;
    histogram.green[g] += 1;
    histogram.blue[b] += 1;
    histogram.gray[gray] += 1;
  }

  return {
    red: compressHistogramBin(histogram.red),
    green: compressHistogramBin(histogram.green),
    blue: compressHistogramBin(histogram.blue),
    gray: compressHistogramBin(histogram.gray),
  };
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const canvasAnimationStates = new WeakMap<
  HTMLCanvasElement,
  {
    animationId: number | null;
    isAnimating: boolean;
  }
>();

export const drawHistogramToCanvas = (
  canvas: HTMLCanvasElement,
  histogram: HistogramDataCompressed,
  options: {
    padding: number;
    colors: {
      background: string;
      border: string;
      grid: string;
      red: string;
      green: string;
      blue: string;
      gray: string;
    };
  } = {
    padding: 0,
    colors: {
      background: 'rgba(36, 36, 38, .65)',
      border: 'rgba(255, 255, 255, .1)',
      grid: 'rgba(255, 255, 255, .3)',
      red: 'rgba(255, 98, 89, 1)',
      green: 'rgba(46, 209, 87, 1)',
      blue: 'rgba(59, 154, 255, 1)',
      gray: 'rgba(255, 255, 255, 1)',
    },
  }
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let animationState = canvasAnimationStates.get(canvas);
  if (!animationState) {
    animationState = { animationId: null, isAnimating: false };
    canvasAnimationStates.set(canvas, animationState);
  }

  if (animationState.isAnimating && animationState.animationId) {
    window.clearTimeout(animationState.animationId);
  }

  const canvasRect = canvas.getBoundingClientRect();
  const { width, height } = canvasRect;
  if (width <= 0 || height <= 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const maxCount = Math.max(
    ...histogram.red,
    ...histogram.green,
    ...histogram.blue,
    ...histogram.gray
  );

  if (maxCount === 0) return;

  const logicalWidth = width;
  const logicalHeight = height;
  const chartWidth = logicalWidth - options.padding * 2;
  const chartHeight = logicalHeight - options.padding * 2;

  const drawBars = (
    data: number[],
    color: string,
    opacity = 1,
    progress = 1
  ) => {
    const barWidth = chartWidth / data.length;
    for (let i = 0; i < data.length; i += 1) {
      const fullBarHeight = ((data[i] ?? 0) / maxCount) * chartHeight;
      const barHeight = fullBarHeight * progress;
      const gradient = ctx.createLinearGradient(
        0,
        options.padding + chartHeight - barHeight,
        0,
        options.padding + chartHeight
      );

      gradient.addColorStop(
        0,
        color.replace(/[\d.]+\)$/, `${opacity})`)
      );
      gradient.addColorStop(
        1,
        color.replace(/[\d.]+\)$/, `${opacity * 0.3})`)
      );

      ctx.fillStyle = gradient;
      ctx.globalAlpha = opacity;

      const x = options.padding + i * barWidth;
      const y = options.padding + chartHeight - barHeight;
      const barWidthValue = barWidth * 0.8;
      const radius = Math.min(barWidthValue / 2, 2);

      ctx.beginPath();
      ctx.roundRect(x, y, barWidthValue, barHeight, [
        radius,
        radius,
        0,
        0,
      ]);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const renderFrame = (progress: number) => {
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.fillStyle = options.colors.background;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    ctx.lineWidth = 0.2;
    ctx.strokeStyle = options.colors.grid;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(
        options.padding,
        options.padding + (chartHeight / 4) * i
      );
      ctx.lineTo(
        logicalWidth - options.padding,
        options.padding + (chartHeight / 4) * i
      );
      ctx.stroke();
    }

    drawBars(histogram.gray, options.colors.gray, 0.4, progress);
    ctx.globalCompositeOperation = 'screen';
    drawBars(histogram.red, options.colors.red, 0.8, progress);
    drawBars(histogram.green, options.colors.green, 0.8, progress);
    drawBars(histogram.blue, options.colors.blue, 0.8, progress);
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = options.colors.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      options.padding - 0.5,
      options.padding - 0.5,
      chartWidth + 1,
      chartHeight + 1
    );
  };

  animationState.isAnimating = true;
  const startTime = Date.now();
  const duration = 600;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    renderFrame(easeOutCubic(rawProgress));

    if (rawProgress < 1) {
      animationState.animationId = window.setTimeout(animate, 16);
    } else {
      animationState.isAnimating = false;
      animationState.animationId = null;
    }
  };

  renderFrame(0);
  animate();
};
