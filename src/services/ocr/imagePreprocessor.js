const MAX_IMAGE_PIXELS = 16_000_000;
const TARGET_WIDTH = 2_200;
const BORDER_SIZE = 24;

export async function preprocessReceiptImage(file) {
  const image = await decodeImage(file);
  try {
    const { width, height, scale } = calculateOutputSize(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = width + BORDER_SIZE * 2;
    canvas.height = height + BORDER_SIZE * 2;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image.source, BORDER_SIZE, BORDER_SIZE, width, height);
    normalizeReceiptContrast(context, width, height);

    return {
      canvas,
      metadata: {
        sourceWidth: image.width,
        sourceHeight: image.height,
        outputWidth: canvas.width,
        outputHeight: canvas.height,
        scale,
      },
    };
  } finally {
    image.release();
  }
}

async function decodeImage(file) {
  if ('createImageBitmap' in globalThis) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Safari and some mobile formats require the native image decoder fallback.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const element = new Image();
    element.decoding = 'async';
    element.src = objectUrl;
    await waitForImage(element);
    return {
      source: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('The selected image format could not be decoded.', { cause: error });
  }
}

function waitForImage(image) {
  if (typeof image.decode === 'function') return image.decode();
  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Image decoding failed.'));
  });
}

function calculateOutputSize(sourceWidth, sourceHeight) {
  const maxPixelScale = Math.sqrt(MAX_IMAGE_PIXELS / (sourceWidth * sourceHeight));
  const targetScale = TARGET_WIDTH / sourceWidth;
  const scale = Math.min(2.5, maxPixelScale, targetScale);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
    scale,
  };
}

function normalizeReceiptContrast(context, width, height) {
  const imageData = context.getImageData(BORDER_SIZE, BORDER_SIZE, width, height);
  const histogram = createLuminanceHistogram(imageData.data);
  const low = findPercentile(histogram, width * height, 0.01);
  const high = findPercentile(histogram, width * height, 0.99);
  if (high - low < 35) return;

  const gain = 255 / (high - low);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const luminance = getLuminance(imageData.data, index);
    const normalized = Math.max(0, Math.min(255, (luminance - low) * gain));
    imageData.data[index] = normalized;
    imageData.data[index + 1] = normalized;
    imageData.data[index + 2] = normalized;
  }
  context.putImageData(imageData, BORDER_SIZE, BORDER_SIZE);
}

function createLuminanceHistogram(data) {
  const histogram = new Uint32Array(256);
  for (let index = 0; index < data.length; index += 4) {
    histogram[Math.round(getLuminance(data, index))] += 1;
  }
  return histogram;
}

function getLuminance(data, index) {
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
}

function findPercentile(histogram, pixelCount, percentile) {
  const target = pixelCount * percentile;
  let cumulative = 0;
  for (let value = 0; value < histogram.length; value += 1) {
    cumulative += histogram[value];
    if (cumulative >= target) return value;
  }
  return 255;
}
