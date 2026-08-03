// 工具层冒烟测试：每个注册工具至少一个用例（约定见 docs/conventions.md §6）
import { describe, it, expect } from "vitest";
import registry from "../tools/registry.js";
import * as turf from "@turf/turf";

const { listTools, executeTool } = registry;

const A = turf.bboxPolygon([116.3, 39.85, 116.5, 40.05]);
const B = turf.bboxPolygon([116.4, 39.9, 116.6, 40.1]);
const ptFC = turf.featureCollection([
  turf.point([116.39, 39.9], { name: "天安门" }),
  turf.point([116.6, 39.95], { name: "东" }),
  turf.point([116.45, 39.85], { name: "南" }),
]);

describe("工具注册", () => {
  it("注册了 22 个工具", () => {
    const names = listTools().map((t) => t.name);
    for (const n of ["buffer", "intersect", "geocode", "clip", "summarize"]) {
      expect(names).toContain(n);
    }
    expect(names.length).toBeGreaterThanOrEqual(22);
  });
});

describe("overlay 叠加分析", () => {
  it("intersect 求交", async () => {
    const r = await executeTool("intersect", { input: A, inputB: B });
    expect(r.geojson).toBeTruthy();
  });
  it("union 并集", async () => {
    const r = await executeTool("union", { input: A, inputB: B });
    expect(r.geojson).toBeTruthy();
  });
  it("erase 差集", async () => {
    const r = await executeTool("erase", { input: A, inputB: B });
    expect(r.geojson).toBeTruthy();
  });
  it("symmetricDifference 对称差", async () => {
    const r = await executeTool("symmetricDifference", { input: A, inputB: B });
    expect(r.geojson).toBeTruthy();
  });
});

describe("proximity 邻近分析", () => {
  it("buffer 缓冲区", async () => {
    const r = await executeTool("buffer", { lng: 116.39, lat: 39.9, distance: 5 });
    expect(r.geojson.geometry.type).toBe("Polygon");
  });
  it("multipleRingBuffer 多重缓冲区", async () => {
    const r = await executeTool("multipleRingBuffer", { input: turf.point([116.39, 39.9]), distances: [1, 3] });
    expect(r.geojson.features.length).toBe(2);
  });
  it("nearest 最近点", async () => {
    const r = await executeTool("nearest", { target: { lng: 116.39, lat: 39.9 }, points: ptFC });
    expect(r.summary).toContain("天安门");
  });
  it("thiessen 泰森多边形", async () => {
    const r = await executeTool("thiessen", { points: ptFC });
    expect(r.geojson.features.length).toBe(3);
  });
});

describe("statistics 统计", () => {
  it("summarize 分组统计", async () => {
    const r = await executeTool("summarize", { input: ptFC, groupBy: "name" });
    expect(r.rows.length).toBe(3);
  });
  it("calculateGeometry 面积", async () => {
    const r = await executeTool("calculateGeometry", { input: A, measure: "area" });
    expect(r.summary).toContain("公顷");
  });
});

describe("extraction 提取", () => {
  it("clip 裁剪", async () => {
    const r = await executeTool("clip", { input: turf.featureCollection([A]), clipLayer: B });
    expect(r.geojson).toBeTruthy();
  });
  it("selectByLocation 空间筛选", async () => {
    const r = await executeTool("selectByLocation", { input: ptFC, polygons: A, relation: "within" });
    expect(r.geojson.features.length).toBe(1);
  });
  it("selectByAttributes 属性筛选", async () => {
    const r = await executeTool("selectByAttributes", { input: ptFC, field: "name", operator: "contains", value: "安" });
    expect(r.geojson.features.length).toBe(1);
  });
  it("filter 多条件过滤", async () => {
    const r = await executeTool("filter", { input: ptFC, conditions: [{ field: "name", operator: "contains", value: "安" }] });
    expect(r.geojson.features.length).toBe(1);
  });
});

describe("geoprocessing 数据处理", () => {
  it("dissolve 融合", async () => {
    const r = await executeTool("dissolve", {
      input: turf.featureCollection([
        turf.bboxPolygon([116.3, 39.85, 116.35, 39.9]),
        turf.bboxPolygon([116.35, 39.85, 116.4, 39.9]),
      ]),
    });
    expect(r.geojson.features.length).toBe(1);
  });
  it("spatialJoin 空间连接", async () => {
    const r = await executeTool("spatialJoin", { target: ptFC, join: A, relation: "within" });
    expect(r.geojson.features[0].properties._joinCount).toBeGreaterThan(0);
  });
  it("merge 合并", async () => {
    const r = await executeTool("merge", { inputs: [A, B] });
    expect(r.geojson.features.length).toBe(2);
  });
  it("randomPoints 随机点", async () => {
    const r = await executeTool("randomPoints", { count: 5, extent: A });
    expect(r.geojson.features.length).toBe(5);
  });
  it("geocode 地理编码", async () => {
    const r = await executeTool("geocode", { place: "天安门" });
    expect(r.summary).toContain("116.");
  });
});
