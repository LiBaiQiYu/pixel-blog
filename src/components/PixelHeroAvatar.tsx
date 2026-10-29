import React from 'react';

export type PixelHeroKind = 'invoker' | 'yi' | 'ezreal';

const HERO_LABELS: Record<PixelHeroKind, string> = {
  invoker: 'Invoker / 祈求者',
  yi: 'Master Yi / 无极剑圣',
  ezreal: 'Ezreal / 伊泽瑞尔',
};

const InvokerPixel: React.FC = () => (
  <g>
    <rect width="24" height="24" fill="#140A18" />
    <rect width="24" height="2" fill="#231028" />
    <rect y="20" width="24" height="4" fill="#0D0710" />
    <rect x="4" y="15" width="16" height="1" fill="#2B1230" opacity="0.8" />
    <rect x="6" y="2" width="12" height="2" fill="#2B162E" />
    <rect x="5" y="4" width="14" height="4" fill="#BEA98F" />
    <rect x="4" y="6" width="16" height="10" fill="#C7B59E" />
    <rect x="3" y="8" width="2" height="10" fill="#AD987E" />
    <rect x="19" y="8" width="2" height="10" fill="#AD987E" />
    <rect x="4" y="17" width="2" height="4" fill="#8E7A64" />
    <rect x="18" y="17" width="2" height="4" fill="#8E7A64" />
    <rect x="6" y="4" width="2" height="10" fill="#E8D9C2" />
    <rect x="16" y="5" width="2" height="9" fill="#D8C8B4" />
    <rect x="6" y="10" width="1" height="3" fill="#D39B74" />
    <rect x="17" y="10" width="1" height="3" fill="#D39B74" />
    <rect x="7" y="6" width="10" height="11" fill="#D39B74" />
    <rect x="8" y="6" width="8" height="4" fill="#E4B48C" />
    <rect x="8" y="13" width="8" height="4" fill="#C78A64" />
    <rect x="8" y="9" width="3" height="2" fill="#E0F2FE" />
    <rect x="14" y="9" width="3" height="2" fill="#E0F2FE" />
    <rect x="8" y="9" width="1" height="1" fill="#FFFFFF" />
    <rect x="16" y="9" width="1" height="1" fill="#FFFFFF" />
    <rect x="8" y="8" width="3" height="1" fill="#8E5F48" />
    <rect x="14" y="8" width="3" height="1" fill="#8E5F48" />
    <rect x="12" y="11" width="1" height="3" fill="#B87958" />
    <rect x="10" y="14" width="4" height="1" fill="#8C4A43" />
    <rect x="7" y="12" width="1" height="3" fill="#B87958" />
    <rect x="17" y="12" width="1" height="3" fill="#B87958" />
    <rect x="6" y="3" width="12" height="2" fill="#F1E6D3" />
    <rect x="6" y="5" width="2" height="2" fill="#F1E6D3" />
    <rect x="10" y="4" width="4" height="2" fill="#F7EFE2" />
    <rect x="3" y="15" width="3" height="9" fill="#3E0E18" />
    <rect x="18" y="15" width="3" height="9" fill="#3E0E18" />
    <rect x="3" y="14" width="4" height="2" fill="#C9A24A" />
    <rect x="17" y="14" width="4" height="2" fill="#C9A24A" />
    <rect x="5" y="17" width="14" height="7" fill="#6E1D2B" />
    <rect x="5" y="17" width="14" height="1" fill="#C9A24A" />
    <rect x="8" y="18" width="8" height="6" fill="#8E2634" />
    <rect x="11" y="18" width="2" height="6" fill="#3E0E18" />
    <rect x="1" y="20" width="5" height="4" fill="#4A1020" />
    <rect x="18" y="20" width="5" height="4" fill="#4A1020" />
    <rect x="2" y="19" width="3" height="1" fill="#A82B33" />
    <rect x="19" y="19" width="3" height="1" fill="#A82B33" />
    <rect x="0" y="3" width="7" height="7" fill="#0EA5E9" opacity="0.12" />
    <rect x="18" y="2" width="6" height="7" fill="#7C3AED" opacity="0.16" />
    <rect x="17" y="14" width="7" height="8" fill="#EA580C" opacity="0.14" />
    <rect x="2" y="4" width="3" height="1" fill="#7DD3FC" />
    <rect x="1" y="5" width="5" height="3" fill="#0EA5E9" />
    <rect x="2" y="8" width="3" height="1" fill="#0369A1" />
    <rect x="2" y="5" width="2" height="2" fill="#E0F2FE" />
    <rect x="4" y="5" width="1" height="1" fill="#BAE6FD" />
    <rect x="0" y="10" width="1" height="1" fill="#67E8F9" opacity="0.8" />
    <rect x="7" y="6" width="1" height="1" fill="#7DD3FC" opacity="0.6" />
    <rect x="5" y="2" width="1" height="1" fill="#E0F2FE" opacity="0.7" />
    <rect x="19" y="3" width="3" height="1" fill="#C084FC" />
    <rect x="18" y="4" width="5" height="3" fill="#7C3AED" />
    <rect x="19" y="7" width="3" height="1" fill="#4C1D95" />
    <rect x="19" y="4" width="2" height="2" fill="#E879F9" />
    <rect x="19" y="4" width="1" height="1" fill="#F5D0FE" />
    <rect x="17" y="2" width="1" height="1" fill="#E9D5FF" opacity="0.8" />
    <rect x="23" y="8" width="1" height="1" fill="#C084FC" opacity="0.8" />
    <rect x="18" y="9" width="1" height="1" fill="#A855F7" opacity="0.7" />
    <rect x="19" y="15" width="3" height="1" fill="#FBBF24" />
    <rect x="18" y="16" width="5" height="3" fill="#EA580C" />
    <rect x="19" y="19" width="3" height="1" fill="#7C2D12" />
    <rect x="19" y="17" width="2" height="1" fill="#FEF3C7" />
    <rect x="22" y="16" width="1" height="1" fill="#FDBA74" />
    <rect x="17" y="14" width="1" height="1" fill="#F59E0B" opacity="0.8" />
    <rect x="23" y="20" width="1" height="1" fill="#DC2626" opacity="0.8" />
    <rect x="18" y="21" width="1" height="1" fill="#FBBF24" opacity="0.7" />
  </g>
);

const MasterYiPixel: React.FC = () => (
  <g>
    <rect width="24" height="24" fill="#07130D" />
    <rect width="24" height="4" fill="#10251A" />
    <g opacity="0.9">
      <rect x="1" y="16" width="7" height="1" fill="#65A30D" />
      <rect x="2" y="18" width="5" height="1" fill="#3F6212" />
      <rect x="17" y="15" width="6" height="1" fill="#A3E635" />
      <rect x="18" y="17" width="4" height="1" fill="#4D7C0F" />
      <rect x="1" y="8" width="3" height="1" fill="#D9F99D" />
      <rect x="21" y="5" width="2" height="4" fill="#FBBF24" />
      <rect x="20" y="3" width="1" height="2" fill="#FDE68A" />
    </g>
    <rect x="4" y="1" width="16" height="2" fill="#1C3B27" />
    <rect x="20" y="1" width="1" height="9" fill="#F8FAFC" />
    <rect x="19" y="2" width="1" height="9" fill="#E8C15A" />
    <rect x="18" y="10" width="3" height="2" fill="#B45309" />
    <g fill="#E8C15A">
      <rect x="3" y="4" width="4" height="2" />
      <rect x="2" y="6" width="4" height="2" />
      <rect x="3" y="8" width="3" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="17" y="4" width="4" height="2" />
      <rect x="18" y="6" width="4" height="2" />
      <rect x="18" y="8" width="3" height="2" />
      <rect x="18" y="10" width="2" height="2" />
    </g>
    <g fill="#F7E4A3">
      <rect x="4" y="4" width="2" height="1" />
      <rect x="3" y="6" width="2" height="1" />
      <rect x="4" y="8" width="1" height="1" />
      <rect x="18" y="4" width="2" height="1" />
      <rect x="19" y="6" width="2" height="1" />
      <rect x="19" y="8" width="1" height="1" />
    </g>
    <g fill="#7C5A1F">
      <rect x="2" y="8" width="1" height="1" />
      <rect x="21" y="8" width="1" height="1" />
    </g>
    <rect x="6" y="4" width="12" height="10" fill="#D7DEE8" />
    <rect x="6" y="4" width="12" height="2" fill="#E8C15A" />
    <rect x="7" y="6" width="10" height="7" fill="#E2E8F0" />
    <rect x="8" y="6" width="8" height="1" fill="#F8FAFC" />
    <rect x="7" y="7" width="2" height="4" fill="#94A3B8" />
    <rect x="15" y="7" width="2" height="4" fill="#94A3B8" />
    <rect x="6" y="9" width="12" height="4" fill="#1F2937" />
    <rect x="7" y="10" width="4" height="2" fill="#A3E635" />
    <rect x="13" y="10" width="4" height="2" fill="#A3E635" />
    <rect x="8" y="10" width="1" height="1" fill="#F7FEE7" />
    <rect x="14" y="10" width="1" height="1" fill="#F7FEE7" />
    <rect x="11" y="10" width="2" height="2" fill="#C9A24A" />
    <rect x="7" y="13" width="10" height="4" fill="#6B4A32" />
    <rect x="8" y="15" width="8" height="2" fill="#3F2A1F" />
    <rect x="9" y="14" width="6" height="1" fill="#8A5A3B" />
    <rect x="8" y="16" width="8" height="1" fill="#2B1D15" />
    <rect x="5" y="11" width="2" height="5" fill="#CBD5E1" />
    <rect x="17" y="11" width="2" height="5" fill="#CBD5E1" />
    <rect x="5" y="10" width="2" height="1" fill="#E8C15A" />
    <rect x="17" y="10" width="2" height="1" fill="#E8C15A" />
    <rect x="18" y="13" width="2" height="4" fill="#1F1A17" />
    <rect x="19" y="16" width="1" height="4" fill="#3F2A1F" />
    <rect x="20" y="18" width="1" height="3" fill="#6B4A32" />
    <rect x="2" y="17" width="20" height="7" fill="#17212E" />
    <rect x="3" y="17" width="7" height="4" fill="#D7DEE8" />
    <rect x="14" y="17" width="7" height="4" fill="#E8C15A" />
    <rect x="4" y="17" width="5" height="1" fill="#F8FAFC" />
    <rect x="15" y="17" width="5" height="1" fill="#F7E4A3" />
    <rect x="3" y="20" width="6" height="4" fill="#4A265E" />
    <rect x="15" y="20" width="6" height="4" fill="#4A265E" />
    <rect x="8" y="19" width="8" height="5" fill="#6D3C8A" />
    <rect x="10" y="19" width="4" height="2" fill="#E8C15A" />
    <rect x="11" y="21" width="2" height="3" fill="#A855F7" />
    <rect x="5" y="20" width="2" height="1" fill="#C9A24A" />
    <rect x="17" y="20" width="2" height="1" fill="#C9A24A" />
  </g>
);

const EzrealPixel: React.FC = () => (
  <g>
    <rect width="24" height="24" fill="#081426" />
    <rect width="24" height="3" fill="#102645" />
    <g opacity="0.85">
      <rect x="2" y="6" width="6" height="1" fill="#1D4ED8" />
      <rect x="14" y="2" width="6" height="1" fill="#38BDF8" />
      <rect x="2" y="20" width="8" height="1" fill="#2563EB" />
      <rect x="17" y="18" width="4" height="1" fill="#FBBF24" />
      <rect x="1" y="12" width="2" height="1" fill="#93C5FD" />
      <rect x="21" y="9" width="2" height="1" fill="#93C5FD" />
    </g>
    <rect x="5" y="3" width="14" height="4" fill="#C9962E" />
    <rect x="4" y="5" width="16" height="3" fill="#F6D365" />
    <rect x="5" y="2" width="3" height="2" fill="#F6D365" />
    <rect x="9" y="1" width="2" height="3" fill="#F6D365" />
    <rect x="14" y="2" width="3" height="3" fill="#F6D365" />
    <rect x="18" y="4" width="2" height="3" fill="#C9962E" />
    <rect x="7" y="4" width="6" height="2" fill="#FDE68A" />
    <rect x="16" y="4" width="3" height="2" fill="#FDE68A" />
    <rect x="6" y="4" width="12" height="2" fill="#3F2A1F" />
    <rect x="7" y="3" width="4" height="3" fill="#8A5737" />
    <rect x="13" y="3" width="4" height="3" fill="#8A5737" />
    <rect x="8" y="4" width="2" height="1" fill="#FBBF24" />
    <rect x="14" y="4" width="2" height="1" fill="#FBBF24" />
    <rect x="7" y="5" width="10" height="11" fill="#F1C7A1" />
    <rect x="7" y="5" width="10" height="2" fill="#F6D6B4" />
    <rect x="8" y="13" width="8" height="3" fill="#D89B6B" />
    <rect x="6" y="8" width="1" height="3" fill="#F1C7A1" />
    <rect x="17" y="8" width="1" height="3" fill="#F1C7A1" />
    <rect x="8" y="8" width="3" height="2" fill="#0EA5E9" />
    <rect x="13" y="8" width="3" height="2" fill="#0EA5E9" />
    <rect x="8" y="8" width="1" height="1" fill="#E0F2FE" />
    <rect x="15" y="8" width="1" height="1" fill="#E0F2FE" />
    <rect x="8" y="7" width="3" height="1" fill="#8E5F48" />
    <rect x="13" y="7" width="3" height="1" fill="#8E5F48" />
    <rect x="7" y="11" width="1" height="1" fill="#38BDF8" />
    <rect x="6" y="12" width="2" height="1" fill="#38BDF8" />
    <rect x="16" y="11" width="1" height="1" fill="#38BDF8" />
    <rect x="16" y="12" width="2" height="1" fill="#38BDF8" />
    <rect x="12" y="10" width="1" height="3" fill="#D89B6B" />
    <rect x="11" y="13" width="3" height="1" fill="#B86B4A" />
    <rect x="14" y="13" width="1" height="1" fill="#B86B4A" />
    <rect x="5" y="5" width="2" height="5" fill="#F6D365" />
    <rect x="17" y="5" width="2" height="5" fill="#F6D365" />
    <rect x="4" y="4" width="2" height="3" fill="#C9962E" />
    <rect x="18" y="4" width="2" height="3" fill="#C9962E" />
    <rect x="2" y="15" width="20" height="9" fill="#2E1D18" />
    <rect x="3" y="16" width="5" height="8" fill="#6B3F2A" />
    <rect x="16" y="16" width="5" height="8" fill="#6B3F2A" />
    <rect x="3" y="15" width="5" height="2" fill="#2A8A86" />
    <rect x="16" y="15" width="5" height="2" fill="#2A8A86" />
    <rect x="4" y="15" width="3" height="1" fill="#67E8F9" />
    <rect x="17" y="15" width="3" height="1" fill="#67E8F9" />
    <rect x="8" y="16" width="8" height="8" fill="#1E3A5F" />
    <rect x="10" y="16" width="4" height="1" fill="#F8FAFC" />
    <rect x="9" y="18" width="6" height="6" fill="#152A45" />
    <rect x="17" y="12" width="5" height="8" fill="#1E3A8A" />
    <rect x="18" y="13" width="4" height="6" fill="#3B82F6" />
    <rect x="19" y="14" width="2" height="3" fill="#93C5FD" />
    <rect x="19" y="15" width="1" height="1" fill="#FFFFFF" />
    <rect x="16" y="13" width="1" height="3" fill="#FBBF24" />
    <rect x="18" y="20" width="2" height="2" fill="#60A5FA" />
    <rect x="20" y="11" width="1" height="1" fill="#E0F2FE" />
    <rect x="16" y="10" width="1" height="1" fill="#60A5FA" />
  </g>
);

export const PixelHeroAvatar: React.FC<{
  kind: PixelHeroKind;
  className?: string;
}> = ({ kind, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    shapeRendering="crispEdges"
    className={`h-full w-full select-none pixelated ${className}`}
    role="img"
    aria-label={HERO_LABELS[kind]}
  >
    {kind === 'invoker' ? (
      <InvokerPixel />
    ) : kind === 'yi' ? (
      <MasterYiPixel />
    ) : (
      <EzrealPixel />
    )}
  </svg>
);
