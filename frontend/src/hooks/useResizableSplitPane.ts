import { useRef, useState } from 'react';
import { VPL_SPLIT_PANE_INITIAL_PCT, VPL_SPLIT_PANE_MIN_PCT, VPL_SPLIT_PANE_MAX_PCT } from '../constants/vpl';

interface UseResizableSplitPaneOptions {
  initialPct?: number;
  min?: number;
  max?: number;
}

interface UseResizableSplitPaneResult {
  splitPct: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onDragStart: (e: React.MouseEvent) => void;
}

export function useResizableSplitPane(options: UseResizableSplitPaneOptions = {}): UseResizableSplitPaneResult {
  const {
    initialPct = VPL_SPLIT_PANE_INITIAL_PCT,
    min = VPL_SPLIT_PANE_MIN_PCT,
    max = VPL_SPLIT_PANE_MAX_PCT,
  } = options;

  const [splitPct, setSplitPct] = useState(initialPct);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.max(min, Math.min(max, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return { splitPct, containerRef, onDragStart };
}
