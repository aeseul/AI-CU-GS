import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Smartphone } from 'lucide-react';
import { resolveAssetPath } from '../utils/assetPath.ts';

interface WoodongsLinkCardProps {
  storeName?: string | null;
  productNames?: string[];
  compact?: boolean;
}

const WOODONGS_QR_BANNER_SRC = resolveAssetPath('/assets/aistudio/___________2026-11-21_______12.02.18_21351fb9.png');
const WOODONGS_OFFICIAL_URL = 'https://m.woodongs.com/';
const GS25_OFFICIAL_URL = 'https://www.gsretail.com/brand/gs25';

export default function WoodongsLinkCard({
  storeName,
  productNames = [],
  compact = false,
}: WoodongsLinkCardProps) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const cleanStoreName = storeName?.replace(/\s*\(샘플\)\s*$/, '').trim() || '';
  const uniqueProducts = Array.from(new Set(productNames.filter(Boolean)));
  const searchSummary =
    uniqueProducts.length > 0
      ? cleanStoreName
        ? `${cleanStoreName} | ${uniqueProducts.join(', ')}`
        : uniqueProducts.join(', ')
      : cleanStoreName;

  const handleCopyText = async (text: string, label: string) => {
    if (!text) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedLabel(label);
        window.setTimeout(() => setCopiedLabel(null), 2500);
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.className = 'fixed opacity-0 pointer-events-none';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(null), 2500);
    } catch {
      // Ignore if clipboard blocked
    }
  };

  return (
    <div
      className={`rounded-2xl border border-[#BBE9F4] bg-[#F5FCFE] ${
        compact ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-3.5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#00B8D9] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-[#124E5B] break-words">
              우리동네GS 공식 앱 · 실시간 재고 연동 안내
            </h3>
            <p className="text-[11px] text-[#356C78]">
              매장별 실시간 재고·픽업·나만의 냉장고·GS Pay는 우리동네GS에서 바로 확인하세요
            </p>
          </div>
        </div>
      </div>

      {/* User-provided Official 우리동네GS QR Banner */}
      <a
        href={WOODONGS_OFFICIAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl overflow-hidden border border-[#CBEAF2] bg-white hover:border-[#00B8D9] transition-colors"
      >
        <img
          src={WOODONGS_QR_BANNER_SRC}
          alt="우리동네GS 앱 다운로드 QR코드 및 안내"
          referrerPolicy="no-referrer"
          className="w-full h-auto object-contain"
        />
      </a>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={WOODONGS_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#00A8C6] hover:bg-[#008FA8] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <span>우리동네GS 열기</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <a
          href={GS25_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#B5DFEA] bg-white hover:bg-[#EAF8FC] text-[#124E5B] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <span>GS25 공식 이벤트</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {searchSummary && (
          <button
            type="button"
            onClick={() => handleCopyText(searchSummary, 'search')}
            className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#B5DFEA] bg-white hover:bg-[#EAF8FC] text-[#124E5B] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedLabel === 'search' ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#0074CC]" />
                <span>재고검색용 복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#00A8C6]" />
                <span>
                  {uniqueProducts.length > 0 ? '매장·상품명 복사' : '매장명 복사'}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[11px] text-[#456B74] leading-relaxed">
        ※ GS리테일(우리동네GS)은 외부 웹용 공개 재고 API를 제공하지 않아 자동 실시간 재고 호출은 지원되지 않습니다. 위 버튼으로 매장·상품명을 복사한 뒤 우리동네GS 앱의 「재고찾기」에서 바로 확인해 보세요.
      </p>
    </div>
  );
}
