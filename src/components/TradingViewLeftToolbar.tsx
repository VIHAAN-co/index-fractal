import React from 'react';
import {
  Crosshair,
  TrendingUp,
  Percent,
  Brush,
  Type,
  Maximize,
  Compass,
  Magnet,
  Lock,
  Eye,
  Trash2,
} from 'lucide-react';

export const TradingViewLeftToolbar: React.FC = () => {
  return (
    <div className="w-[44px] border-r border-[#2a2e39] bg-[#1e222d] flex flex-col items-center py-2 gap-1 text-[#787b86] select-none flex-shrink-0">
      <button className="p-2 rounded hover:bg-[#2a2e39] text-[#2962ff] transition" title="Crosshair">
        <Crosshair className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Trendline">
        <TrendingUp className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Fib Retracement">
        <Percent className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Brush">
        <Brush className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Text">
        <Type className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Pattern Analysis">
        <Compass className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Measure">
        <Maximize className="h-4 w-4" />
      </button>

      <div className="w-5 h-[1px] bg-[#2a2e39] my-2" />

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Magnet Mode">
        <Magnet className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Lock All Drawings">
        <Lock className="h-4 w-4" />
      </button>

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#d1d4dc] transition" title="Hide Drawings">
        <Eye className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      <button className="p-2 rounded hover:bg-[#2a2e39] hover:text-[#f23645] transition" title="Remove Drawings">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};
