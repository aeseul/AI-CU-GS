import type {
  FlavorTheme,
  MealSituation,
  PreferenceOption,
  RecipeStep,
  VirtualPricedLine,
  VirtualProduct,
  VirtualRecommendationItemSpec,
  VirtualRecommendationResult,
} from '../types.ts';
import { VIRTUAL_COMBO_RECIPES } from '../data/virtualProductData.ts';
import { calculateVirtualLinePricing, summarizeVirtualCart } from './virtualPricingService.ts';

interface VirtualRecommendationInput {
  budget: number;
  flavors: FlavorTheme[];
  mealSituation: MealSituation;
  preferences: PreferenceOption[];
  products: VirtualProduct[];
}

interface CandidateComboTemplate {
  key: string;
  title: string;
  description: string;
  items: VirtualRecommendationItemSpec[];
  customReason?: string;
  customRecipe?: RecipeStep[];
}

function buildGenericRecipe(lines: VirtualPricedLine[]): RecipeStep[] {
  const steps: RecipeStep[] = [];
  let idx = 1;

  const hotItems = lines.filter((l) => l.product.requiresHotWater || l.product.isMicrowaveSuitable);
  const readyItems = lines.filter(
    (l) => !l.product.requiresHotWater && !l.product.isMicrowaveSuitable,
  );

  for (const line of hotItems) {
    const name = line.product.name;
    if (/불닭/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 표시선까지 온수를 부어 2~3분 익힌 뒤, 물을 2큰술만 남기고 따라내 액상 소스와 후레이크를 골고루 비벼줍니다.`,
        minutes: Math.max(2, line.product.estimatedPrepMinutes),
      });
    } else if (/짜파게티|짜파/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 표시선까지 온수를 부어 약 3분 익힌 뒤 물을 적당량만 남기고 짜장 분말스프와 올리브유를 골고루 비벼줍니다.`,
        minutes: Math.max(2, line.product.estimatedPrepMinutes),
      });
    } else if (/떡볶이/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 떡과 소스를 넣고 표시선까지 온수를 부은 뒤 전자레인지에 약 2~3분 조리합니다.`,
        minutes: Math.max(2, line.product.estimatedPrepMinutes),
      });
    } else if (line.product.requiresHotWater) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 뚜껑을 1/3 열고 스프를 넣은 뒤 용기 안쪽 표시선까지 온수를 부어 약 3분간 조리합니다.`,
        minutes: Math.max(1, line.product.estimatedPrepMinutes),
      });
    } else if (/삼각김밥/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 김이 찢어지지 않게 1·2·3 순서로 포장을 개봉하거나 살짝 튼 뒤 전자레인지에 20~30초 데워 준비합니다.`,
        minutes: Math.max(1, line.product.estimatedPrepMinutes),
      });
    } else if (/도시락/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 소스·김 등 별도 소포장을 분리한 뒤 뚜껑을 살짝 열어 전자레인지에 약 2분 데워 준비합니다.`,
        minutes: Math.max(2, line.product.estimatedPrepMinutes),
      });
    } else if (/치즈/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 비닐을 벗겨 결대로 가늘게 찢어 올린 뒤 전자레인지에 20~30초 데워 사르르 녹여줍니다.`,
        minutes: Math.max(1, line.product.estimatedPrepMinutes),
      });
    } else if (line.product.isMicrowaveSuitable) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 포장 모서리를 살짝 뜯은 뒤 안내 시간에 맞춰 전자레인지로 알맞게 데워 준비합니다.`,
        minutes: Math.max(1, line.product.estimatedPrepMinutes),
      });
    }
  }

  for (const line of readyItems) {
    const name = line.product.name;
    if (/훈제란|반숙란|계란/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name}은(는) 껍질을 까서 반으로 쪼개 면이나 밥 위에 올려 곁들입니다 (달걀 통째 전자레인지 가열 금지).`,
        minutes: 0,
      });
    } else if (/샌드위치/.test(name)) {
      steps.push({
        step: idx++,
        instruction: `${name} 포장을 깔끔하게 개봉해 메인 식사·음료와 함께 곁들여 먹습니다.`,
        minutes: 0,
      });
    } else {
      steps.push({
        step: idx++,
        instruction: `${name} 포장을 개봉해 메인 메뉴와 함께 한 상으로 곁들입니다.`,
        minutes: 0,
      });
    }
  }

  steps.push({
    step: idx,
    instruction:
      '실제 상품 포장지의 조리 지침을 우선 확인하고, 뜨거운 용기 취급 및 은박 포장재 제거 등 전자레인지 안전에 주의해 완성합니다.',
    minutes: 0,
  });

  return steps;
}

function verifyCandidateWithPricing(
  template: CandidateComboTemplate,
  productMap: Map<string, VirtualProduct>,
  input: VirtualRecommendationInput,
): VirtualRecommendationResult | null {
  const pricedLines: VirtualPricedLine[] = [];

  for (const spec of template.items) {
    const product = productMap.get(spec.productId);
    if (!product) return null;
    if (product.stockQuantity < spec.quantity) return null;

    if (input.preferences.includes('행사 상품 제외') && product.promotionType !== 'NONE') {
      return null;
    }
    if (input.preferences.includes('3분 이내 조리') && product.estimatedPrepMinutes > 3) {
      return null;
    }
    if (
      input.preferences.includes('전자레인지 사용 가능') &&
      !product.isMicrowaveSuitable &&
      product.estimatedPrepMinutes > 0
    ) {
      return null;
    }
    if (input.preferences.includes('온수 사용 가능') && product.requiresHotWater === false && product.category === '면류') {
      return null;
    }

    pricedLines.push(calculateVirtualLinePricing(product, spec.quantity));
  }

  if (pricedLines.length === 0) return null;

  const summary = summarizeVirtualCart(pricedLines, input.budget);
  if (summary.isOverBudget) return null;

  const estimatedCookingMinutes = Math.max(
    ...pricedLines.map((l) => l.product.estimatedPrepMinutes),
    0,
  );
  const usesMicrowave = pricedLines.some((l) => l.product.isMicrowaveSuitable);
  const usesHotWater = pricedLines.some((l) => l.product.requiresHotWater);

  const matchedFlavors = input.flavors.filter((f) =>
    pricedLines.some((l) => l.product.tasteTags.includes(f)),
  );
  const reasonParts: string[] = [];
  if (matchedFlavors.length > 0) {
    reasonParts.push(`선택하신 '${matchedFlavors.join(', ')}' 맛 테마에 맞고`);
  }
  if (summary.totalDiscount > 0) {
    reasonParts.push(
      `가상 행사 할인(-${summary.totalDiscount.toLocaleString('ko-KR')}원)이 적용되며`,
    );
  }
  reasonParts.push(
    `${input.mealSituation}에 어울리는 구성을 예산 ${input.budget.toLocaleString('ko-KR')}원 이내로 검증했습니다.`,
  );

  const recipe = template.customRecipe || buildGenericRecipe(pricedLines);

  return {
    id: `${template.key}_${Date.now()}`,
    title: template.title,
    description: template.description,
    items: pricedLines,
    regularTotal: summary.regularTotal,
    totalDiscount: summary.totalDiscount,
    totalPrice: summary.finalTotal,
    remainingBudget: summary.remainingBudget,
    budget: input.budget,
    estimatedCookingMinutes,
    usesMicrowave,
    usesHotWater,
    reason: template.customReason || reasonParts.join(' '),
    prepNote: '실제 상품 포장지의 조리 지침과 매장 내 전자레인지·온수기 이용 가능 여부를 먼저 확인해 주세요.',
    safetyNote: '조리 직후 뜨거운 용기나 국물에 의한 화상에 주의하고, 금속·은박 포장재는 전자레인지에 넣지 마세요.',
    recipe,
    imageUrl: pricedLines[0].product.imageUrl,
    isDemoNote: '가상 편의점 상품 가격 및 재고에 기반한 규칙 추천 결과입니다.',
  };
}

function scoreCombo(
  combo: VirtualRecommendationResult,
  input: VirtualRecommendationInput,
): number {
  let score = 0;
  const products = combo.items.map((l) => l.product);

  for (const f of input.flavors) {
    if (products.some((p) => p.tasteTags.includes(f))) {
      score += 10;
    }
  }

  if (products.some((p) => p.mealTags.includes(input.mealSituation))) {
    score += 10;
  }

  if (input.mealSituation === '한 끼 식사') {
    const hasMain = products.some((p) => p.category === '면류' || p.category === '즉석식품');
    const hasSideOrProtein = products.some(
      (p) => p.category === '유제품' || p.category === '계란',
    );
    if (hasMain) score += 6;
    if (hasSideOrProtein) score += 6;
  }

  if (input.preferences.includes('1+1 행사 상품 우선')) {
    if (combo.items.some((l) => l.product.promotionType === '1+1' && l.freeQuantity > 0)) {
      score += 15;
    } else if (products.some((p) => p.promotionType === '1+1')) {
      score += 8;
    }
  }

  if (input.preferences.includes('2+1 행사 상품 우선')) {
    if (combo.items.some((l) => l.product.promotionType === '2+1' && l.freeQuantity > 0)) {
      score += 15;
    } else if (products.some((p) => p.promotionType === '2+1')) {
      score += 8;
    }
  }

  if (input.preferences.includes('고단백 상품 우선')) {
    const hasVerifiedProtein = products.some(
      (p) => p.nutrition !== null && p.nutrition.proteinGrams >= 6,
    );
    if (hasVerifiedProtein) score += 12;
  }

  if (input.preferences.includes('3분 이내 조리') && combo.estimatedCookingMinutes <= 3) {
    score += 5;
  }

  score += Math.min(8, Math.floor((combo.totalPrice / Math.max(input.budget, 1)) * 8));
  return score;
}

export function generateVirtualRecommendations(
  input: VirtualRecommendationInput,
): VirtualRecommendationResult[] {
  const availableProducts = input.products.filter((p) => p.stockQuantity > 0);
  const productMap = new Map(availableProducts.map((p) => [p.id, p]));

  const curatedTemplates: CandidateComboTemplate[] = [
    {
      key: 'combo_buldak_cheese_egg',
      title: '치즈 불닭 계란범벅',
      description: '매콤한 불닭볶음면에 고소한 스트링치즈와 훈제란을 더한 대표 꿀조합',
      items: [
        { productId: 'P001', quantity: 1 },
        { productId: 'P005', quantity: 1 },
        { productId: 'P006', quantity: 1 },
      ],
      customReason:
        '매콤한 맛과 고소한 치즈, 담백한 훈제란이 어우러져 5,000원 이하(4,300원)로 균형 잡힌 포만감을 주는 인기 조합입니다.',
      customRecipe: VIRTUAL_COMBO_RECIPES.combo_buldak_cheese_egg,
    },
    {
      key: 'combo_jjapabuldak_cheese',
      title: '치즈 짜파불닭 꿀조합',
      description: '불닭볶음면과 짜파게티 범벅을 섞고 스트링치즈로 풍미를 올린 매콤단짠 면 조합',
      items: [
        { productId: 'P001', quantity: 1 },
        { productId: 'P011', quantity: 1 },
        { productId: 'P005', quantity: 1 },
      ],
      customRecipe: VIRTUAL_COMBO_RECIPES.combo_jjapabuldak_cheese,
    },
    {
      key: 'combo_tteokbokki_tuna_cheese',
      title: '치즈 국물 떡볶이 + 참치마요 정식',
      description: '매콤 국물 떡볶이에 스트링치즈를 녹이고 참치마요 삼각김밥을 국물에 찍어 먹는 꿀조합',
      items: [
        { productId: 'P012', quantity: 1 },
        { productId: 'P003', quantity: 1 },
        { productId: 'P005', quantity: 1 },
      ],
      customRecipe: VIRTUAL_COMBO_RECIPES.combo_tteokbokki_tuna_cheese,
    },
    {
      key: 'combo_shin_jeonju_egg',
      title: '신라면 큰사발 + 전주비빔 + 훈제란 정식',
      description: '얼큰한 신라면 국물에 전주비빔 삼각김밥과 훈제란을 곁들인 든든한 정석 한 끼',
      items: [
        { productId: 'P010', quantity: 1 },
        { productId: 'P004', quantity: 1 },
        { productId: 'P006', quantity: 1 },
      ],
    },
    {
      key: 'combo_dosirak_water',
      title: '한끼 정식 도시락 + 생수 5,000원 정식',
      description: '고기·계란 반찬이 알차게 담긴 한끼 정식 도시락에 생수를 곁들인 5,000원 딱 맞는 한 끼',
      items: [
        { productId: 'P014', quantity: 1 },
        { productId: 'P008', quantity: 1 },
      ],
    },
    {
      key: 'combo_sandwich_letsbe_1plus1',
      title: '에그 햄 샌드위치 + 레쓰비 1+1 브런치 세트',
      description: '조리 없이 깔끔하게 즐기는 에그 햄 샌드위치와 1+1 레쓰비 캔커피 2캔 가성비 세트',
      items: [
        { productId: 'P013', quantity: 1 },
        { productId: 'P018', quantity: 2 },
      ],
    },
    {
      key: 'combo_protein_chicken_yogurt',
      title: '닭가슴살 1+1 + 그릭요거트 고단백 세트',
      description: '1+1 그릴드 닭가슴살 2개와 꾸덕한 그릭요거트로 단백질을 꽉 채운 건강 식단 조합',
      items: [
        { productId: 'P016', quantity: 2 },
        { productId: 'P017', quantity: 1 },
      ],
    },
    {
      key: 'combo_shin_cider_1plus1',
      title: '신라면 + 칠성사이다 1+1 + 훈제란 야식 세트',
      description: '얼큰한 신라면과 훈제란에 1+1 칠성사이다 2병까지 챙기는 시원한 조합',
      items: [
        { productId: 'P010', quantity: 1 },
        { productId: 'P020', quantity: 2 },
        { productId: 'P006', quantity: 1 },
      ],
    },
    {
      key: 'combo_sausage_saeukkang_cider',
      title: '닭가슴살 소시지 + 새우깡 + 사이다 1+1 안주 세트',
      description: '짭짤한 새우깡과 탱글한 소시지, 청량한 칠성사이다 1+1을 묶은 가성비 야식·안주 조합',
      items: [
        { productId: 'P015', quantity: 1 },
        { productId: 'P022', quantity: 1 },
        { productId: 'P020', quantity: 2 },
      ],
    },
    {
      key: 'combo_honeybutter_chocopie_coffee',
      title: '허니버터칩 + 초코파이 1+1 + 레쓰비 1+1 간식팩',
      description: '단짠 허니버터칩과 1+1 초코파이·레쓰비 커피를 한 번에 담는 달콤 당충전 간식팩',
      items: [
        { productId: 'P021', quantity: 1 },
        { productId: 'P023', quantity: 2 },
        { productId: 'P018', quantity: 2 },
      ],
    },
    {
      key: 'combo_yukgaejang_tuna_egg',
      title: '얼큰 육개장 참치마요 정식',
      description: '따뜻한 육개장 사발면에 참치마요 삼각김밥과 훈제란을 곁들인 든든한 한 끼',
      items: [
        { productId: 'P002', quantity: 1 },
        { productId: 'P003', quantity: 1 },
        { productId: 'P006', quantity: 1 },
      ],
    },
    {
      key: 'combo_buldak_banana_1plus1',
      title: '매운 불닭 + 바나나우유 1+1 매콤단짠 세트',
      description: '화끈한 불닭볶음면의 매운맛을 1+1 바나나우유로 중화하는 가성비 야식 조합',
      items: [
        { productId: 'P001', quantity: 1 },
        { productId: 'P007', quantity: 2 },
      ],
    },
    {
      key: 'combo_chocobar_2plus1_snack',
      title: '초코바 2+1 + 바나나우유 달콤 간식팩',
      description: '2+1 초코바 3개에 바나나우유 2개(1+1)를 담은 행사 혜택 최대치 간식 조합',
      items: [
        { productId: 'P009', quantity: 3 },
        { productId: 'P007', quantity: 2 },
      ],
    },
    {
      key: 'combo_hangover_quick',
      title: '육개장 + 훈제란 + 생수 해장 세트',
      description: '따뜻한 국물과 수분, 훈제란을 3,000원 예산에 맞춘 해장 조합',
      items: [
        { productId: 'P002', quantity: 1 },
        { productId: 'P006', quantity: 1 },
        { productId: 'P008', quantity: 1 },
      ],
    },
    {
      key: 'combo_mini_tuna_water',
      title: '참치마요 삼각김밥 + 생수 2,000원 실속 세트',
      description: '가벼운 예산에서도 간단하게 한 끼를 해결할 수 있는 초알뜰 조합',
      items: [
        { productId: 'P003', quantity: 1 },
        { productId: 'P008', quantity: 1 },
      ],
    },
  ];

  const verifiedList: Array<{ combo: VirtualRecommendationResult; score: number }> = [];
  const seenSignatures = new Set<string>();

  for (const tpl of curatedTemplates) {
    const sig = tpl.items
      .map((i) => `${i.productId}:${i.quantity}`)
      .sort()
      .join('|');
    if (seenSignatures.has(sig)) continue;

    const verified = verifyCandidateWithPricing(tpl, productMap, input);
    if (verified) {
      seenSignatures.add(sig);
      verifiedList.push({ combo: verified, score: scoreCombo(verified, input) });
    }
  }

  if (verifiedList.length < 3) {
    for (let i = 0; i < availableProducts.length && verifiedList.length < 6; i++) {
      for (let j = i + 1; j < availableProducts.length && verifiedList.length < 6; j++) {
        const a = availableProducts[i];
        const b = availableProducts[j];
        const items: VirtualRecommendationItemSpec[] = [
          { productId: a.id, quantity: 1 },
          { productId: b.id, quantity: 1 },
        ];
        const sig = items
          .map((x) => `${x.productId}:${x.quantity}`)
          .sort()
          .join('|');
        if (seenSignatures.has(sig)) continue;

        const tpl: CandidateComboTemplate = {
          key: `combo_dyn_${a.id}_${b.id}`,
          title: `${a.name} · ${b.name} 알뜰 조합`,
          description: `${input.mealSituation}에 맞춰 예산 내에서 구성한 2품목 조합`,
          items,
        };
        const verified = verifyCandidateWithPricing(tpl, productMap, input);
        if (verified) {
          seenSignatures.add(sig);
          verifiedList.push({ combo: verified, score: scoreCombo(verified, input) });
        }
      }
    }
  }

  verifiedList.sort((a, b) => b.score - a.score);
  return verifiedList.slice(0, 3).map((entry) => entry.combo);
}
