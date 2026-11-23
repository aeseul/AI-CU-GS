import type {
  VirtualCartSummary,
  VirtualPricedLine,
  VirtualProduct,
} from '../types.ts';

export function calculateVirtualLinePricing(
  product: VirtualProduct,
  quantity: number,
): VirtualPricedLine {
  const safeQty = Math.max(1, Math.floor(quantity));
  const unitPrice = product.regularPrice;
  const regularLineTotal = unitPrice * safeQty;

  if (product.promotionType === '1+1') {
    const paidQuantity = Math.ceil(safeQty / 2);
    const freeQuantity = safeQty - paidQuantity;
    const appliedLineTotal = paidQuantity * unitPrice;
    const discountAmount = freeQuantity * unitPrice;
    return {
      productId: product.id,
      product,
      quantity: safeQty,
      paidQuantity,
      freeQuantity,
      regularLineTotal,
      appliedLineTotal,
      discountAmount,
      promoAppliedLabel:
        freeQuantity > 0
          ? `1+1 적용 (${freeQuantity}개 무료)`
          : '1+1 행사 대상 (2개 선택 시 1개 가격)',
    };
  }

  if (product.promotionType === '2+1') {
    const freeQuantity = Math.floor(safeQty / 3);
    const paidQuantity = safeQty - freeQuantity;
    const appliedLineTotal = paidQuantity * unitPrice;
    const discountAmount = freeQuantity * unitPrice;
    return {
      productId: product.id,
      product,
      quantity: safeQty,
      paidQuantity,
      freeQuantity,
      regularLineTotal,
      appliedLineTotal,
      discountAmount,
      promoAppliedLabel:
        freeQuantity > 0
          ? `2+1 적용 (${freeQuantity}개 무료)`
          : '2+1 행사 대상 (3개 선택 시 2개 가격)',
    };
  }

  return {
    productId: product.id,
    product,
    quantity: safeQty,
    paidQuantity: safeQty,
    freeQuantity: 0,
    regularLineTotal,
    appliedLineTotal: regularLineTotal,
    discountAmount: 0,
    promoAppliedLabel: null,
  };
}

export function summarizeVirtualCart(
  lines: VirtualPricedLine[],
  budget: number,
): VirtualCartSummary {
  let regularTotal = 0;
  let totalDiscount = 0;
  let finalTotal = 0;

  for (const line of lines) {
    regularTotal += line.regularLineTotal;
    totalDiscount += line.discountAmount;
    finalTotal += line.appliedLineTotal;
  }

  const remainingBudget = budget - finalTotal;
  const isOverBudget = finalTotal > budget;
  const exceededAmount = isOverBudget ? finalTotal - budget : 0;

  return {
    regularTotal,
    totalDiscount,
    finalTotal,
    remainingBudget,
    isOverBudget,
    exceededAmount,
  };
}
