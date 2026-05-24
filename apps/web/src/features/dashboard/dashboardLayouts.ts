import type { DashboardLayout, DashboardLayoutItem, DashboardType } from './dashboard.types';

export const DEFAULT_STUDENT_LAYOUT: DashboardLayoutItem[] = [
  { id: 'student_deadlines', x: 0, y: 0, w: 2, h: 2, enabled: true },
  { id: 'student_grades', x: 2, y: 0, w: 2, h: 1, enabled: true },
  { id: 'student_announcements', x: 2, y: 1, w: 2, h: 1, enabled: true },
  { id: 'student_courses', x: 0, y: 2, w: 2, h: 2, enabled: true },
  { id: 'student_progress', x: 2, y: 2, w: 2, h: 2, enabled: true },
];

export const DEFAULT_TEACHER_LAYOUT: DashboardLayoutItem[] = [
  { id: 'teacher_needs_grading', x: 0, y: 0, w: 2, h: 2, enabled: true },
  { id: 'teacher_missing_submissions', x: 2, y: 0, w: 2, h: 1, enabled: true },
  { id: 'teacher_deadlines', x: 2, y: 1, w: 2, h: 1, enabled: true },
  { id: 'teacher_recent_submissions', x: 0, y: 2, w: 2, h: 2, enabled: true },
  { id: 'teacher_setup_warnings', x: 2, y: 2, w: 2, h: 2, enabled: true },
];

export const DEFAULT_ADMIN_LAYOUT: DashboardLayoutItem[] = [
  { id: 'admin_system_health', x: 0, y: 0, w: 2, h: 2, enabled: true },
  { id: 'admin_stats', x: 2, y: 0, w: 2, h: 2, enabled: true },
  { id: 'admin_enrollment_issues', x: 0, y: 2, w: 2, h: 1, enabled: true },
  { id: 'admin_setup_warnings', x: 2, y: 2, w: 2, h: 1, enabled: true },
  { id: 'admin_events', x: 0, y: 3, w: 4, h: 1, enabled: true },
];

export function computeGridPositions(items: DashboardLayoutItem[]): DashboardLayoutItem[] {
  const grid: boolean[][] = [];

  const isOccupied = (startX: number, startY: number, w: number, h: number) => {
    for (let y = startY; y < startY + h; y++) {
      if (!grid[y]) grid[y] = Array(4).fill(false);
      for (let x = startX; x < startX + w; x++) {
        if (x >= 4) return true; // Horizontal bound
        if (grid[y][x]) return true;
      }
    }
    return false;
  };

  const occupy = (startX: number, startY: number, w: number, h: number) => {
    for (let y = startY; y < startY + h; y++) {
      if (!grid[y]) grid[y] = Array(4).fill(false);
      for (let x = startX; x < startX + w; x++) {
        grid[y][x] = true;
      }
    }
  };

  return items.map((item) => {
    if (!item.enabled) {
      return { ...item, x: 0, y: 0 };
    }

    let y = 0;
    let x = 0;
    while (true) {
      let found = false;
      for (let testX = 0; testX <= 4 - item.w; testX++) {
        if (!isOccupied(testX, y, item.w, item.h)) {
          x = testX;
          found = true;
          break;
        }
      }
      if (found) {
        break;
      }
      y++;
    }
    occupy(x, y, item.w, item.h);
    return { ...item, x, y };
  });
}

const STORAGE_PREFIX = 'learnsystem_dashboard_layout_v1_';

export function loadDashboardLayout(role: DashboardType): DashboardLayout {
  if (typeof window === 'undefined') {
    return getFallbackLayout(role);
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${role}`);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardLayout;
      if (parsed.version === 1 && parsed.dashboardType === role && Array.isArray(parsed.widgets)) {
        // Ensure all widgets from default are present in loaded layout
        const defaultWidgets = getDefaultWidgets(role);
        const mergedWidgets = [...parsed.widgets];

        // Add any missing default widgets
        for (const defaultWidget of defaultWidgets) {
          if (!mergedWidgets.some((w) => w.id === defaultWidget.id)) {
            mergedWidgets.push(defaultWidget);
          }
        }

        // Clean up any stale or invalid widgets
        const activeIds = defaultWidgets.map((w) => w.id);
        const cleanedWidgets = mergedWidgets.filter((w) => activeIds.includes(w.id));

        return {
          ...parsed,
          widgets: computeGridPositions(cleanedWidgets),
        };
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard layout from localStorage', err);
  }

  return getFallbackLayout(role);
}

export function saveDashboardLayout(role: DashboardType, layout: DashboardLayout): void {
  if (typeof window === 'undefined') return;

  try {
    const dataToSave = {
      ...layout,
      widgets: computeGridPositions(layout.widgets),
    };
    localStorage.setItem(`${STORAGE_PREFIX}${role}`, JSON.stringify(dataToSave));
  } catch (err) {
    console.error('Failed to save dashboard layout to localStorage', err);
  }
}

export function resetDashboardLayout(role: DashboardType): DashboardLayout {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${role}`);
    } catch (err) {
      console.error('Failed to clear dashboard layout', err);
    }
  }
  return getFallbackLayout(role);
}

function getFallbackLayout(role: DashboardType): DashboardLayout {
  const defaultWidgets = getDefaultWidgets(role);
  return {
    version: 1,
    dashboardType: role,
    widgets: computeGridPositions(defaultWidgets),
  };
}

function getDefaultWidgets(role: DashboardType): DashboardLayoutItem[] {
  switch (role) {
    case 'STUDENT':
      return DEFAULT_STUDENT_LAYOUT;
    case 'TEACHER':
      return DEFAULT_TEACHER_LAYOUT;
    case 'ADMIN':
      return DEFAULT_ADMIN_LAYOUT;
  }
}
