const ocrInstances = new Map();

export async function recognizeReceipt(image, options = {}) {
  const modelVersion = options.modelVersion ?? 'PP-OCRv5';
  options.onStatus?.('載入 OCR 引擎…', '首次使用需下載模型，之後會由瀏覽器快取');
  const ocr = await getOcrInstance(modelVersion);

  options.onStatus?.('辨識繁體中文與英文…', `${modelVersion} 正在分析文字列`);
  const startedAt = performance.now();
  const [result] = await ocr.predict(image, {
    textRecScoreThresh: 0,
    textDetBoxThresh: 0.55,
    textDetLimitSideLen: 2_400,
  });

  return {
    lines: result.items.map((item) => ({
      text: item.text,
      score: item.score,
      poly: item.poly,
    })),
    metrics: {
      ...result.metrics,
      totalMs: result.metrics?.totalMs ?? performance.now() - startedAt,
      modelVersion,
      runtime: result.runtime,
    },
  };
}

async function getOcrInstance(modelVersion) {
  if (!ocrInstances.has(modelVersion)) {
    ocrInstances.set(modelVersion, createOcrInstance(modelVersion));
  }

  try {
    return await ocrInstances.get(modelVersion);
  } catch (error) {
    ocrInstances.delete(modelVersion);
    throw error;
  }
}

async function createOcrInstance(modelVersion) {
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
  return PaddleOCR.create({
    lang: 'ch',
    ocrVersion: modelVersion,
    worker: true,
    ortOptions: {
      backend: 'wasm',
      wasmPaths: 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/',
      numThreads: globalThis.crossOriginIsolated
        ? Math.min(4, navigator.hardwareConcurrency || 2)
        : 1,
      simd: true,
    },
  });
}
