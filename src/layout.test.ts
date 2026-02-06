/**
 * layout 엔진 단위 테스트
 */
import assert from "node:assert";
import { describe, it } from "node:test";
import {
  collides,
  computeLayout,
  packUp,
  pushDown,
  type GridItem,
} from "./layout.js";

const cols = 12;

describe("collides", () => {
  it("x만 겹치고 y 안 겹치면 충돌 아님", () => {
    const a: GridItem = { id: "a", x: 0, y: 0, w: 6, h: 2 };
    const b: GridItem = { id: "b", x: 0, y: 2, w: 6, h: 2 };
    assert.strictEqual(collides(a, b), false);
  });

  it("x 겹치고 y 겹치면 충돌", () => {
    const a: GridItem = { id: "a", x: 0, y: 0, w: 6, h: 2 };
    const b: GridItem = { id: "b", x: 4, y: 1, w: 4, h: 2 };
    assert.strictEqual(collides(a, b), true);
  });

  it("x 인접(y만 겹침)이면 충돌 아님", () => {
    const a: GridItem = { id: "a", x: 0, y: 0, w: 6, h: 2 };
    const b: GridItem = { id: "b", x: 6, y: 0, w: 6, h: 2 };
    assert.strictEqual(collides(a, b), false);
  });

  it("같은 id는 충돌 아님", () => {
    const a: GridItem = { id: "a", x: 0, y: 0, w: 6, h: 2 };
    assert.strictEqual(collides(a, { ...a }), false);
  });
});

describe("pushDown", () => {
  it("충돌 시 한 개 아래로 밀기", () => {
    const items: GridItem[] = [{ id: "a", x: 0, y: 0, w: 6, h: 2 }];
    const placed: GridItem = { id: "b", x: 0, y: 0, w: 6, h: 2 };
    const out = pushDown(placed, items, cols);
    assert.strictEqual(out.length, 2);
    const a = out.find((i) => i.id === "a")!;
    const b = out.find((i) => i.id === "b")!;
    assert.strictEqual(b.y, 0);
    assert.strictEqual(a.y, 2);
  });

  it("연쇄 밀기", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ];
    const placed: GridItem = { id: "c", x: 0, y: 2, w: 6, h: 2 };
    const out = pushDown(placed, items, cols);
    const a = out.find((i) => i.id === "a")!;
    const b = out.find((i) => i.id === "b")!;
    const c = out.find((i) => i.id === "c")!;
    assert.strictEqual(a.y, 0);
    assert.strictEqual(c.y, 2);
    assert.strictEqual(b.y, 4);
  });
});

describe("packUp", () => {
  it("제거 후 같은 열 아래 아이템만 위로 당김", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
      { id: "c", x: 0, y: 4, w: 6, h: 2 },
    ];
    const out = packUp(items, "b", cols);
    assert.strictEqual(out.length, 2);
    const a = out.find((i) => i.id === "a")!;
    const c = out.find((i) => i.id === "c")!;
    assert.strictEqual(a.y, 0);
    assert.strictEqual(c.y, 2); // 4 - 2 = 2
  });

  it("열이 안 겹치면 이동 없음", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 6, y: 2, w: 6, h: 2 },
    ];
    const out = packUp(items, "a", cols);
    const b = out.find((i) => i.id === "b")!;
    assert.strictEqual(b.y, 2);
  });
});

describe("computeLayout", () => {
  it("add: 기존 아이템 안 움직이고 새 아이템만 최소 y에 배치", () => {
    const items: GridItem[] = [{ id: "a", x: 0, y: 0, w: 6, h: 2 }];
    const out = computeLayout({
      items,
      action: { type: "add", item: { id: "b", x: 0, y: 0, w: 6, h: 2 } },
      columns: cols,
    });
    assert.strictEqual(out.length, 2);
    const a = out.find((i) => i.id === "a")!;
    const b = out.find((i) => i.id === "b")!;
    assert.strictEqual(a.y, 0);
    assert.strictEqual(b.y, 2);
  });

  it("move: 대상만 이동, 충돌 시 아래로 밀기", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ];
    const out = computeLayout({
      items,
      action: { type: "move", id: "b", x: 0, y: 0 },
      columns: cols,
    });
    const a = out.find((i) => i.id === "a")!;
    const b = out.find((i) => i.id === "b")!;
    assert.strictEqual(b.y, 0);
    assert.strictEqual(a.y, 2);
  });

  it("resize: w/h 변경, 충돌 시 아래로 밀기", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ];
    const out = computeLayout({
      items,
      action: { type: "resize", id: "b", w: 6, h: 4 },
      columns: cols,
    });
    const b = out.find((i) => i.id === "b")!;
    assert.strictEqual(b.h, 4);
  });

  it("remove: 제거 후 pack-up", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ];
    const out = computeLayout({
      items,
      action: { type: "remove", id: "b" },
      columns: cols,
    });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, "a");
  });

  it("동일 입력 → 동일 출력 (deterministic)", () => {
    const items: GridItem[] = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
    ];
    const out1 = computeLayout({
      items,
      action: { type: "move", id: "a", x: 0, y: 2 },
      columns: cols,
    });
    const out2 = computeLayout({
      items,
      action: { type: "move", id: "a", x: 0, y: 2 },
      columns: cols,
    });
    assert.deepStrictEqual(out1, out2);
  });
});
