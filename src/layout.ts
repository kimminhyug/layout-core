// GridItem: 그리드 아이템 정보
export type GridItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
// LayoutAction: 그리드 아이템 추가, 이동, 크기 변경, 제거 등의 작업
export type LayoutAction =
  | { type: "add"; item: GridItem }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "resize"; id: string; w: number; h: number }
  | { type: "remove"; id: string };

export type ComputeLayoutInput = {
  items: GridItem[];
  action: LayoutAction;
  columns: number;
};
// collides: 충돌 여부 확인
export const collides = (a: GridItem, b: GridItem): boolean => {
  if (a.id === b.id) return false;
  const xOverlap = a.x < b.x + b.w && b.x < a.x + a.w;
  const yOverlap = a.y < b.y + b.h && b.y < a.y + a.h;
  return xOverlap && yOverlap;
};
// getCollidingItems: 충돌 여부 확인
export const getCollidingItems = (
  item: GridItem,
  items: GridItem[]
): GridItem[] => items.filter((other) => collides(item, other));

// clampItem: 그리드 아이템 위치 제한
const clampItem = (item: GridItem, columns: number): GridItem => {
  const x = Math.max(0, Math.min(item.x, columns - 1));
  const w = Math.max(1, Math.min(item.w, columns - x));
  const y = Math.max(0, item.y);
  const h = Math.max(1, item.h);
  return { ...item, x, y, w, h };
};

// pushDown: 그리드 아이템 이동
export const pushDown = (
  item: GridItem,
  items: GridItem[],
  columns: number
): GridItem[] => {
  const placed = clampItem(item, columns);
  const others = items.filter((i) => i.id !== placed.id);
  const moved = new Map<string, GridItem>();
  moved.set(placed.id, placed);

  const sortedOthers = [...others].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (const other of sortedOthers) {
    let current = { ...other };
    const allPlaced = (): GridItem[] => [
      placed,
      ...Array.from(moved.values()).filter((i) => i.id !== placed.id),
    ];

    for (;;) {
      const othersPlaced = allPlaced().filter((i) => i.id !== current.id);
      const collision = othersPlaced.find((p) => collides(current, p));
      if (!collision) {
        moved.set(current.id, current);
        break;
      }
      current = { ...current, y: collision.y + collision.h };
    }
  }

  const result: GridItem[] = [placed];
  for (const o of sortedOthers) {
    result.push(moved.get(o.id)!);
  }
  return result;
};

// packUp: 그리드 아이템 제거
export const packUp = (
  items: GridItem[],
  removedId: string,
  columns: number
): GridItem[] => {
  const removed = items.find((i) => i.id === removedId);
  if (!removed) return items;

  const rest = items.filter((i) => i.id !== removedId);
  const removedBottom = removed.y + removed.h;
  const removedLeft = removed.x;
  const removedRight = removed.x + removed.w;

  const overlapsColumn = (item: GridItem): boolean =>
    item.x < removedRight && item.x + item.w > removedLeft;
  const isBelowRemoved = (item: GridItem): boolean => item.y >= removedBottom;

  return rest.map((item) => {
    if (!overlapsColumn(item) || !isBelowRemoved(item)) return item;
    return { ...item, y: Math.max(0, item.y - removed.h) };
  });
};

// findMinNonCollidingY: 충돌 없는 최소 y 찾기
const findMinNonCollidingY = (item: GridItem, items: GridItem[]): number => {
  let y = item.y;
  for (;;) {
    const candidate = { ...item, y };
    const hits = getCollidingItems(candidate, items);
    if (hits.length === 0) return y;
    y = Math.max(...hits.map((c) => c.y + c.h));
  }
};

// computeLayout: 그리드 레이아웃 계산
export const computeLayout = (input: ComputeLayoutInput): GridItem[] => {
  const { items, action, columns } = input;

  switch (action.type) {
    case "add": {
      const added = clampItem(action.item, columns);
      const existing = items.filter((i) => i.id !== added.id);
      const y = findMinNonCollidingY(added, existing);
      return [...existing, { ...added, y }];
    }
    case "move": {
      const target = items.find((i) => i.id === action.id);
      if (!target) return items;
      const moved = {
        ...target,
        x: Math.max(0, Math.min(action.x, columns - 1)),
        y: Math.max(0, action.y),
      };
      const w = Math.min(target.w, columns - moved.x);
      const updated = { ...moved, w };
      const others = items.filter((i) => i.id !== action.id);
      return pushDown(updated, others, columns);
    }
    case "resize": {
      const target = items.find((i) => i.id === action.id);
      if (!target) return items;
      const w = Math.max(1, Math.min(action.w, columns - target.x));
      const h = Math.max(1, action.h);
      const resized = { ...target, w, h };
      const others = items.filter((i) => i.id !== action.id);
      return pushDown(resized, others, columns);
    }
    case "remove":
      return packUp(items, action.id, columns);
    default: {
      const _: never = action;
      return items;
    }
  }
};
