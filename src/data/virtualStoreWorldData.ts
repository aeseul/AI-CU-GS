export type StoreZoneId =
  | 'entrance'
  | 'ramen'
  | 'fridge'
  | 'dairy'
  | 'promo'
  | 'snacks'
  | 'microwave'
  | 'checkout'
  | 'basket';

export interface StoreZoneMeta {
  id: StoreZoneId;
  title: string;
  shortLabel: string;
  subtitle: string;
  ariaLabel: string;
  accentColor: string;
  characterTarget: { x: number; y: number };
  productIds: string[];
}

export const VIRTUAL_STORE_ZONES: Record<StoreZoneId, StoreZoneMeta> = {
  entrance: {
    id: 'entrance',
    title: 'GS25 입구 · 자동문',
    shortLabel: '입구',
    subtitle: '선택한 매장 정보와 가상 체험 안내를 확인하거나 입구로 나갈 수 있어요.',
    ariaLabel: '입구와 자동문 열기',
    accentColor: '#319447',
    characterTarget: { x: 245, y: 392 },
    productIds: [],
  },
  fridge: {
    id: 'fridge',
    title: '음료 냉장고',
    shortLabel: '냉장고',
    subtitle: '바나나우유·레쓰비·칠성사이다(1+1)와 조지아 커피(2+1), 생수를 만나보세요.',
    ariaLabel: '음료 냉장고 열기',
    accentColor: '#007CFF',
    characterTarget: { x: 300, y: 215 },
    productIds: ['P007', 'P020', 'P018', 'P019', 'P008', 'P017'],
  },
  dairy: {
    id: 'dairy',
    title: '냉장식품 · 유제품 코너',
    shortLabel: '유제품/계란',
    subtitle: '스트링치즈, 그릭요거트(2+1), 훈제란, 닭가슴살(1+1), 샌드위치가 진열되어 있어요.',
    ariaLabel: '냉장식품 및 유제품 코너 열기',
    accentColor: '#319447',
    characterTarget: { x: 438, y: 185 },
    productIds: ['P005', 'P017', 'P006', 'P016', 'P015', 'P013', 'P007'],
  },
  promo: {
    id: 'promo',
    title: '1+1 · 2+1 행사 코너',
    shortLabel: '행사 코너',
    subtitle: '1+1(바나나우유·사이다·닭가슴살·레쓰비·초코파이)과 2+1 행사 상품을 한눈에 확인하세요.',
    ariaLabel: '행사 상품 코너 열기',
    accentColor: '#F49A24',
    characterTarget: { x: 585, y: 222 },
    productIds: ['P007', 'P020', 'P016', 'P018', 'P023', 'P009', 'P015', 'P017', 'P019', 'P022'],
  },
  ramen: {
    id: 'ramen',
    title: '라면 · 간편식 진열대',
    shortLabel: '라면/간편식',
    subtitle: '불닭·신라면·육개장·짜파게티부터 떡볶이, 한끼 도시락, 삼각김밥까지 다양하게 준비했어요.',
    ariaLabel: '라면 및 간편식 진열대 열기',
    accentColor: '#E85D2C',
    characterTarget: { x: 255, y: 295 },
    productIds: ['P001', 'P010', 'P002', 'P011', 'P012', 'P014', 'P003', 'P004'],
  },
  snacks: {
    id: 'snacks',
    title: '중앙 진열대 (스낵 · 간편식)',
    shortLabel: '중앙 진열대',
    subtitle: '허니버터칩·새우깡(2+1)·초코파이(1+1)·초코바(2+1)와 샌드위치·삼각김밥 코너입니다.',
    ariaLabel: '중앙 스낵 진열대 열기',
    accentColor: '#D98218',
    characterTarget: { x: 455, y: 286 },
    productIds: ['P021', 'P022', 'P023', 'P009', 'P013', 'P003', 'P004', 'P006'],
  },
  microwave: {
    id: 'microwave',
    title: '전자레인지 · 온수기 코너',
    shortLabel: '조리 코너',
    subtitle: '라면·떡볶이·도시락·치즈·소시지 등 전자레인지와 온수 조리 상품을 확인하세요.',
    ariaLabel: '전자레인지 및 온수기 조리 안내 열기',
    accentColor: '#F49A24',
    characterTarget: { x: 642, y: 292 },
    productIds: ['P001', 'P010', 'P002', 'P011', 'P012', 'P014', 'P016', 'P015', 'P003', 'P004', 'P005'],
  },
  checkout: {
    id: 'checkout',
    title: '계산대 · 예산 정산',
    shortLabel: '계산대',
    subtitle: '담은 상품의 행사 할인과 남은 예산을 계산하고 가상 구매를 완료해요.',
    ariaLabel: '계산대 장바구니 및 예산 계산 열기',
    accentColor: '#319447',
    characterTarget: { x: 605, y: 382 },
    productIds: [],
  },
  basket: {
    id: 'basket',
    title: '내 쇼핑 바구니',
    shortLabel: '바구니',
    subtitle: '지금까지 바구니에 담은 상품 수량과 금액을 빠르게 확인합니다.',
    ariaLabel: '쇼핑 바구니 요약 열기',
    accentColor: '#252525',
    characterTarget: { x: 495, y: 405 },
    productIds: [],
  },
};

export const STORE_ZONE_ORDER: StoreZoneId[] = [
  'ramen',
  'fridge',
  'dairy',
  'promo',
  'snacks',
  'microwave',
  'checkout',
  'basket',
  'entrance',
];

export const CHARACTER_GUIDE_TIPS: string[] = [
  '라면 코너에 신라면, 짜파게티, 매콤 떡볶이와 한끼 도시락까지 새로 입고됐어요!',
  '냉장고에서 칠성사이다·레쓰비(1+1)와 조지아 커피·그릭요거트(2+1)를 찾아보세요.',
  '중앙 진열대에서 허니버터칩·새우깡(2+1)·초코파이(1+1) 간식도 골라보세요!',
  '상품을 고른 뒤 오른쪽 아래 계산대를 누르면 모바일 영수증까지 보낼 수 있어요.',
];

export const WORLD_TUTORIAL_STEPS = [
  {
    step: 1,
    title: '진열대를 클릭해 상품을 살펴보세요.',
    description: '라면 코너, 음료 냉장고, 행사 코너 등 원하는 가구를 눌러 23종 상품을 확인해보세요.',
  },
  {
    step: 2,
    title: '상품을 장바구니에 담아보세요.',
    description: '1+1·2+1 행사 할인과 가상 재고 수량이 바로 반영됩니다.',
  },
  {
    step: 3,
    title: '5,000원 안에서 한 끼를 완성해보세요.',
    description: '계산대에서 가상 구매를 완료하거나 맞춤 꿀조합 추천을 받아보세요.',
  },
];
