export const RECEIPT_CONFIDENCE_THRESHOLD = 0.78;

export function validateReceipt(receipt, threshold = RECEIPT_CONFIDENCE_THRESHOLD) {
  const warnings = [];
  const items = receipt.items.map((item) => {
    const needsReview = item.confidence < threshold;
    if (needsReview) warnings.push(`「${item.name}」辨識信心偏低`);
    return { ...item, needsReview };
  });

  if (receipt.rejectedLines.length > 0) {
    warnings.push(`${receipt.rejectedLines.length} 行疑似包含價格，但無法安全解析`);
  }
  if (items.length === 0) warnings.push('找不到可用的餐點與價格');

  const averageConfidence = items.length
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;

  return {
    ...receipt,
    items,
    warnings,
    averageConfidence,
    needsReview: warnings.length > 0,
  };
}
