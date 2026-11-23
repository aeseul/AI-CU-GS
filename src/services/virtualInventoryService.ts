import type {
  VirtualAvailabilityStatus,
  VirtualCartItem,
  VirtualProduct,
  VirtualReceipt,
} from '../types.ts';
import { VIRTUAL_GS25_PRODUCTS } from '../data/virtualProductData.ts';

const INVENTORY_STORAGE_KEY = 'virtual_gs25_inventory_v1';
const CART_STORAGE_KEY = 'virtual_gs25_cart_v1';
const RECEIPTS_STORAGE_KEY = 'virtual_gs25_receipts_v1';

export function computeAvailabilityStatus(stockQuantity: number): VirtualAvailabilityStatus {
  if (stockQuantity <= 0) return 'OUT_OF_STOCK';
  if (stockQuantity <= 4) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function getAvailabilityLabel(status: VirtualAvailabilityStatus): string {
  switch (status) {
    case 'IN_STOCK':
      return '재고 있음';
    case 'LOW_STOCK':
      return '소량 재고';
    case 'OUT_OF_STOCK':
      return '품절';
  }
}

export function buildInitialVirtualInventory(): VirtualProduct[] {
  return VIRTUAL_GS25_PRODUCTS.map((p) => ({
    ...p,
    availabilityStatus: computeAvailabilityStatus(p.stockQuantity),
  }));
}

export function loadVirtualInventory(): VirtualProduct[] {
  try {
    const raw = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!raw) return buildInitialVirtualInventory();
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (!parsed || typeof parsed !== 'object') return buildInitialVirtualInventory();

    return VIRTUAL_GS25_PRODUCTS.map((base) => {
      const savedQty = parsed[base.id];
      const stockQuantity =
        typeof savedQty === 'number' && Number.isFinite(savedQty) && savedQty >= 0
          ? Math.floor(savedQty)
          : base.stockQuantity;
      return {
        ...base,
        stockQuantity,
        availabilityStatus: computeAvailabilityStatus(stockQuantity),
      };
    });
  } catch {
    return buildInitialVirtualInventory();
  }
}

export function saveVirtualInventory(products: VirtualProduct[]): void {
  try {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.id] = p.stockQuantity;
    }
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetVirtualInventory(): VirtualProduct[] {
  const fresh = buildInitialVirtualInventory();
  saveVirtualInventory(fresh);
  return fresh;
}

export function loadVirtualCart(): VirtualCartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VirtualCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVirtualCart(cart: VirtualCartItem[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadVirtualReceipts(): VirtualReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VirtualReceipt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVirtualReceipts(receipts: VirtualReceipt[]): void {
  try {
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts.slice(0, 20)));
  } catch {
    // Ignore storage quota errors
  }
}

export function validateCartAddition(
  products: VirtualProduct[],
  currentCart: VirtualCartItem[],
  productId: string,
  addQty: number,
): { ok: true; nextQty: number } | { ok: false; reason: string } {
  const product = products.find((p) => p.id === productId);
  if (!product) {
    return { ok: false, reason: '해당 가상 상품을 찾을 수 없습니다.' };
  }
  if (product.stockQuantity <= 0) {
    return { ok: false, reason: `${product.name}은(는) 현재 품절 상태라 장바구니에 담을 수 없습니다.` };
  }

  const existing = currentCart.find((c) => c.productId === productId);
  const currentQty = existing ? existing.quantity : 0;
  const nextQty = currentQty + addQty;

  if (nextQty > product.stockQuantity) {
    return {
      ok: false,
      reason: `${product.name}의 현재 가상 재고는 최대 ${product.stockQuantity}개입니다. 더 담을 수 없습니다.`,
    };
  }

  return { ok: true, nextQty };
}

export function deductVirtualInventory(
  products: VirtualProduct[],
  cartItems: VirtualCartItem[],
): { ok: true; nextProducts: VirtualProduct[] } | { ok: false; reason: string } {
  if (cartItems.length === 0) {
    return { ok: false, reason: '장바구니가 비어 있습니다.' };
  }

  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      return { ok: false, reason: '존재하지 않는 상품이 포함되어 있습니다.' };
    }
    if (product.stockQuantity < item.quantity) {
      return {
        ok: false,
        reason: `${product.name}의 재고(${product.stockQuantity}개)가 요청 수량(${item.quantity}개)보다 부족합니다. 수량을 조정해 주세요.`,
      };
    }
  }

  const qtyMap = new Map(cartItems.map((i) => [i.productId, i.quantity]));
  const nextProducts = products.map((product) => {
    const deduct = qtyMap.get(product.id) ?? 0;
    if (deduct === 0) return product;
    const nextStock = Math.max(0, product.stockQuantity - deduct);
    return {
      ...product,
      stockQuantity: nextStock,
      availabilityStatus: computeAvailabilityStatus(nextStock),
    };
  });

  saveVirtualInventory(nextProducts);
  return { ok: true, nextProducts };
}
