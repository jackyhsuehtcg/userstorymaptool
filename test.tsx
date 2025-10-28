import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Download, X, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";
import { hierarchy, tree as d3tree } from "d3-hierarchy";

/**
 * 功能樹協作介面 Mockup（完整版 + 按鈕縮放）
 * - 水平樹狀、貼邊父子連線
 * - 交互關係線：避障後輸出平滑曲線（不穿越節點）
 * - 點節點高亮該節點、其交互線與相鄰節點，並高亮祖先鏈；點背景清除
 * - 支援 Ctrl/⌘ + 滾輪縮放 + 右上角 +/- 按鈕與重置
 */

const TEAM_META = { FE: { name: "前端" }, BE: { name: "後端" }, DB: { name: "資料" }, PM: { name: "產品" }, QA: { name: "測試" } };

// 佈局常數
const CARD_W = 260;
const CARD_H = 84;
const H_SPACING = 260;
const V_SPACING = 96;
const PAD = 56;

// Demo 資料
const initialTree = {
  id: "US-1",
  team: "PM",
  summary: "作為使用者，我要能搜尋產品",
  description: "搜尋欄可輸入關鍵字，顯示建議與結果，支援分頁與排序。",
  jiraIds: ["PROJ-101"],
  children: [
    {
      id: "US-1.1",
      team: "FE",
      summary: "顯示搜尋欄與即時建議",
      description: "前端 debounced 輸入與熱門關鍵字。",
      jiraIds: ["FE-210", "FE-211"],
      children: [
        { id: "US-1.1.1", team: "FE", summary: "結果頁列表與高亮關鍵字", description: "分頁與排序 UI。", jiraIds: ["FE-212"], children: [] },
        { id: "US-1.1.2", team: "FE", summary: "搜尋框可清除與回填", description: "快捷鍵與清除圖示。", jiraIds: ["FE-213"], children: [] },
      ],
    },
    {
      id: "US-1.2",
      team: "BE",
      summary: "提供 /search API 與分頁排序",
      description: "REST API，參數 q, page, sort。",
      jiraIds: ["BE-330"],
      children: [
        { id: "US-1.2.1", team: "BE", summary: "快取策略與節流", description: "Redis 短期快取。", jiraIds: ["BE-331", "BE-332"], children: [] },
      ],
    },
    {
      id: "US-1.3",
      team: "DB",
      summary: "建立索引與排名模型",
      description: "全文索引與 BM25 參數。",
      jiraIds: ["DB-120"],
      children: [
        { id: "US-1.3.1", team: "DB", summary: "熱詞字典維護", description: "同義詞與停用詞。", jiraIds: ["DB-121"], children: [] },
      ],
    },
  ],
};

const uid = (prefix = "US-") => `${prefix}${Math.random().toString(36).slice(2, 7)}`;
const uidE = (prefix = "R-") => `${prefix}${Math.random().toString(36).slice(2, 6)}`;

export default function FeatureTreeUserStory() {
  const [treeData, setTreeData] = useState(initialTree);
  const [selectedId, setSelectedId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [xEdges, setXEdges] = useState([
    { id: "R1", from: "US-1.1.1", to: "US-1.2", kind: "depends" },
    { id: "R2", from: "US-1.2.1", to: "US-1.1.1", kind: "blocks" },
    { id: "R3", from: "US-1.3", to: "US-1.2", kind: "relates" },
    { id: "R4", from: "US-1.3.1", to: "US-1.2.1", kind: "depends" },
  ]);
  const [showXEdges, setShowXEdges] = useState(true);

  // 視圖縮放平移
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // CRUD helpers
  const mutate = (node, id, fn) => {
    if (node.id === id) return fn(node);
    return { ...node, children: node.children?.map((c) => mutate(c, id, fn)) };
  };
  const addChild = (id) => setTreeData((t) => mutate(t, id, (n) => ({
    ...n,
    children: [
      ...n.children,
      { id: uid(), team: "PM", summary: "新的 User Story", description: "", jiraIds: [], children: [] },
    ],
  })));
  const removeNode = (id) => {
    const rm = (n) => ({ ...n, children: n.children.filter((c) => c.id !== id).map(rm) });
    setTreeData((t) => (t.id === id ? t : rm(t)));
    setXEdges((es) => es.filter((e) => e.from !== id && e.to !== id));
  };
  const updateNode = (id, patch) => setTreeData((t) => mutate(t, id, (n) => ({ ...n, ...patch })));

  const addJira = (id, key) => {
    if (!key) return;
    setTreeData((t) => mutate(t, id, (n) => ({ ...n, jiraIds: Array.from(new Set([...(n.jiraIds || []), key.trim()])) })));
  };
  const removeJira = (id, key) => setTreeData((t) => mutate(t, id, (n) => ({ ...n, jiraIds: (n.jiraIds || []).filter((k) => k !== key) })));

  const exportJSON = () => {
    const payload = { tree: treeData, crossEdges: xEdges };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `user-story-tree-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // 佈局：水平樹狀
  const rootH = useMemo(() => hierarchy(treeData), [treeData]);
  const laid = useMemo(() => d3tree().nodeSize([CARD_H + V_SPACING, CARD_W + H_SPACING]).separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6))(rootH), [rootH]);
  const nodes = laid.descendants();
  const links = laid.links();

  // 索引與尺寸
  const pos = new Map();
  nodes.forEach((d) => pos.set(d.data.id, { x: d.x, y: d.y }));
  const idToNode = new Map();
  nodes.forEach((d) => idToNode.set(d.data.id, d));

  const minX = Math.min(...nodes.map((d) => d.x)) - CARD_H / 2;
  const maxX = Math.max(...nodes.map((d) => d.x)) + CARD_H / 2;
  const minY = Math.min(...nodes.map((d) => d.y));
  const maxY = Math.max(...nodes.map((d) => d.y)) + CARD_W;
  const width = Math.max(1, maxY - minY + PAD * 2);
  const height = Math.max(1, maxX - minX + PAD * 2);

  // 聚焦集合 + 祖先鏈
  const neighborSet = useMemo(() => {
    const s = new Set();
    if (focusId) {
      xEdges.forEach((e) => {
        if (e.from === focusId) s.add(e.to);
        if (e.to === focusId) s.add(e.from);
      });
    }
    return s;
  }, [focusId, xEdges]);

  const ancestorSet = useMemo(() => {
    const s = new Set();
    if (focusId && idToNode.has(focusId)) {
      let cur = idToNode.get(focusId);
      while (cur) { s.add(cur.data.id); cur = cur.parent; }
    }
    return s;
  }, [focusId, idToNode]);

  const isNodeHi = (id) => !focusId || id === focusId || neighborSet.has(id) || ancestorSet.has(id);
  const isXEdgeHi = (e) => !focusId || e.from === focusId || e.to === focusId;
  const isTreeLinkHi = (lk) => {
    if (!focusId) return true;
    const sId = lk.source.data.id, tId = lk.target.data.id;
    if (!(ancestorSet.has(sId) && ancestorSet.has(tId))) return false;
    const s = idToNode.get(sId), t = idToNode.get(tId);
    return (s && s.parent && s.parent.data.id === tId) || (t && t.parent && t.parent.data.id === sId);
  };

  // foreignObject 偏移與連接錨點
  const FOX = -8, FOY = -CARD_H / 2;
  const anchor = (d, side) => {
    const gx = d.x - minX + PAD;   // 垂直（SVG y）
    const gy = d.y - minY + PAD;   // 水平（SVG x）
    const x = gy + FOX + (side === "right" ? CARD_W : 0);
    const y = gx + FOY + CARD_H / 2;
    return { x, y };
  };

  // 父子肘形線（貼邊）
  const elbow = (s, t) => {
    const a = anchor(s, "right");
    const b = anchor(t, "left");
    const midX = (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
  };

  // 交互：避障折線（可視圖）
  const routeCrossPoints = (s, t) => {
    if (!s || !t) return [];
    const MARGIN = 16;
    const obstacles = nodes.map((nd) => {
      const cx = nd.x - minX + PAD; // 垂直
      const cy = nd.y - minY + PAD; // 水平
      return { x1: cy - CARD_W / 2 - MARGIN, y1: cx - CARD_H / 2 - MARGIN, x2: cy + CARD_W / 2 + MARGIN, y2: cx + CARD_H / 2 + MARGIN };
    });
    const from = anchor(s, "right");
    const to = anchor(t, "left");
    const start = { x: from.x + 1, y: from.y };
    const goal = { x: to.x - 1, y: to.y };

    const pts = [start, goal];
    obstacles.forEach((o) => { pts.push({ x: o.x1, y: o.y1 }, { x: o.x1, y: o.y2 }, { x: o.x2, y: o.y1 }, { x: o.x2, y: o.y2 }); });

    const inside = (p) => p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
    const nodesVG = pts.filter(inside);

    const segHitsObs = (a, b) => {
      if (a.x !== b.x && a.y !== b.y) return true;
      const minx = Math.min(a.x, b.x), maxx = Math.max(a.x, b.x);
      const miny = Math.min(a.y, b.y), maxy = Math.max(a.y, b.y);
      for (const o of obstacles) {
        if (a.y === b.y) { if (a.y >= o.y1 && a.y <= o.y2 && !(maxx < o.x1 || minx > o.x2)) return true; }
        if (a.x === b.x) { if (a.x >= o.x1 && a.x <= o.x2 && !(maxy < o.y1 || miny > o.y2)) return true; }
      }
      return false;
    };

    const adj = new Map();
    nodesVG.forEach((_, i) => adj.set(i, []));
    for (let i = 0; i < nodesVG.length; i++) {
      for (let j = i + 1; j < nodesVG.length; j++) {
        const a = nodesVG[i], b = nodesVG[j];
        if ((a.x === b.x || a.y === b.y) && !segHitsObs(a, b)) {
          const w = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          adj.get(i).push({ j, w });
          adj.get(j).push({ j: i, w });
        }
      }
    }

    const idxStart = 0, idxGoal = 1;
    const H = (i) => Math.abs(nodesVG[i].x - nodesVG[idxGoal].x) + Math.abs(nodesVG[i].y - nodesVG[idxGoal].y);
    const open = [{ i: idxStart, g: 0, f: H(idxStart), p: -1 }];
    const best = new Map([[idxStart, open[0]]]);

    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.i === idxGoal) {
        const seq = []; let k = cur; while (k && k.i !== -1) { seq.push(nodesVG[k.i]); k = best.get(k.p); }
        seq.reverse();
        const simp = [seq[0]];
        for (let i = 1; i < seq.length - 1; i++) {
          const A = simp[simp.length - 1], B = seq[i], C = seq[i + 1];
          const col = (A.x === B.x && B.x === C.x) || (A.y === B.y && B.y === C.y);
          if (!col) simp.push(B);
        }
        simp.push(seq[seq.length - 1]);
        return simp;
      }
      for (const e of adj.get(cur.i)) {
        const ng = cur.g + e.w; const prev = best.get(e.j);
        const cand = { i: e.j, g: ng, f: ng + H(e.j), p: cur.i };
        if (!prev || ng < prev.g) { best.set(e.j, cand); open.push(cand); }
      }
    }
    return [start, goal];
  };

  // 折線 → 平滑曲線（Catmull-Rom → Cubic Bezier）
  const polylineToSmoothCurve = (pts, tension = 0.8, fallbackOffset = 48) => {
    if (!pts || pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) {
      const [p0, p1] = pts; const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
      if (p0.y === p1.y) { const m = { x: mid.x, y: mid.y + fallbackOffset }; return `M ${p0.x} ${p0.y} Q ${m.x} ${m.y} ${p1.x} ${p1.y}`; }
      if (p0.x === p1.x) { const m = { x: mid.x + fallbackOffset, y: mid.y }; return `M ${p0.x} ${p0.y} Q ${m.x} ${m.y} ${p1.x} ${p1.y}`; }
      const m = { x: mid.x, y: mid.y + fallbackOffset }; return `M ${p0.x} ${p0.y} Q ${m.x} ${m.y} ${p1.x} ${p1.y}`;
    }
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i === 0 ? pts[0] : pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i + 2 < pts.length ? pts[i + 2] : p2;
      const c1x = p1.x + (p2.x - p0.x) * (tension / 6);
      const c1y = p1.y + (p2.y - p0.y) * (tension / 6);
      const c2x = p2.x - (p3.x - p1.x) * (tension / 6);
      const c2y = p2.y - (p3.y - p1.y) * (tension / 6);
      d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
    }
    return d;
  };

  // 滑鼠縮放（保留）
  const handleWheel = (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // 僅在按下 Ctrl/⌘ 時縮放
    e.preventDefault();
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    const prev = scale; const factor = Math.exp(-e.deltaY * 0.0015);
    let next = Math.min(4, Math.max(0.25, prev * factor));
    const wx = (mx - tx) / prev; const wy = (my - ty) / prev;
    setScale(next);
    setTx(mx - wx * next); setTy(my - wy * next);
  };

  // 按鈕縮放
  const zoom = (dir) => {
    const svg = document.getElementById("ft-svg");
    const rect = svg ? svg.getBoundingClientRect() : { left: 0, top: 0, width, height };
    const mx = rect.width / 2; const my = rect.height / 2; // 以視窗中心為錨
    const prev = scale; const factor = dir > 0 ? 1.2 : 1/1.2;
    let next = Math.min(4, Math.max(0.25, prev * factor));
    const wx = (mx - tx) / prev; const wy = (my - ty) / prev;
    setScale(next); setTx(mx - wx * next); setTy(my - wy * next);
  };
  const resetZoom = () => { setScale(1); setTx(0); setTy(0); };

  // 開發檢查
  useEffect(() => {
    try {
      const a = pos.get("US-1.1.1"); const b = pos.get("US-1.2");
      if (a && b) { const pts = routeCrossPoints(a, b); console.assert(Array.isArray(pts) && pts.length >= 2, "route fail"); }
    } catch {}
  }, [pos]);

  return (
    <div className="h-full w-full grid grid-cols-12 gap-3 p-3">
      <div className="col-span-9">
        <Card className="h-[78vh]">
          <CardHeader className="py-3 flex items-center justify-between">
            <CardTitle className="text-base">User Story 樹（JIRA、多欄位+交互關係）</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Button size="icon" variant="secondary" onClick={() => zoom(-1)} title="縮小"><ZoomOut className="w-4 h-4"/></Button>
              <span className="w-12 text-center">{Math.round(scale*100)}%</span>
              <Button size="icon" variant="secondary" onClick={() => zoom(1)} title="放大"><ZoomIn className="w-4 h-4"/></Button>
              <Button size="icon" variant="ghost" onClick={resetZoom} title="重置"><RefreshCcw className="w-4 h-4"/></Button>
              <span className="ml-3">顯示交互關係</span>
              <Switch checked={showXEdges} onCheckedChange={setShowXEdges} />
            </div>
          </CardHeader>
          <CardContent className="h-[70vh]">
            <div className="relative w-full h-full border rounded-lg overflow-auto bg-neutral-50">
              <svg id="ft-svg" width={width} height={height} onWheel={handleWheel} style={{ touchAction: 'none' }}>
                {/* 背景清除聚焦 */}
                <rect width="100%" height="100%" fill="transparent" onClick={() => { setFocusId(null); setSelectedId(null); }} />
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" style={{ pointerEvents: 'none' }} />

                <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
                  {/* 父子關係 */}
                  {links.map((lk, i) => {
                    const hi = isTreeLinkHi(lk);
                    return (
                      <path
                        key={`e-${lk.source.data.id}-${lk.target.data.id}-${i}`}
                        d={elbow(lk.source, lk.target)}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={hi ? 2 : 1}
                        opacity={hi ? 0.9 : 0.15}
                      />
                    );
                  })}

                  {/* 交互關係（避障曲線） */}
                  {showXEdges && xEdges.map((e) => {
                    const a = pos.get(e.from);
                    const b = pos.get(e.to);
                    if (!a || !b) return null;
                    const pts = routeCrossPoints(a, b);
                    const d = polylineToSmoothCurve(pts, 0.8, 48);
                    const stroke = e.kind === "depends" ? "#f59e0b" : e.kind === "blocks" ? "#ef4444" : "#0ea5e9";
                    const hi = isXEdgeHi(e);
                    return (
                      <path
                        key={e.id}
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={hi ? 2.5 : 1.2}
                        opacity={hi ? 0.95 : 0.15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  {/* 節點 */}
                  {nodes.map((d) => {
                    const node = d.data;
                    const gx = d.x - minX + PAD;
                    const gy = d.y - minY + PAD;
                    const isSelected = selectedId === node.id;
                    const hi = isNodeHi(node.id);
                    return (
                      <g key={`n-${node.id}`} transform={`translate(${gy}, ${gx})`} onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); setFocusId(node.id); }}>
                        <foreignObject x={-8} y={-CARD_H / 2} width={CARD_W} height={CARD_H}>
                          <div className={`rounded-xl border bg-white shadow-sm px-3 py-2 h-full flex flex-col justify-center ${isSelected ? "ring-2 ring-primary" : ""} ${hi ? "opacity-100" : "opacity-30 blur-[1px] grayscale"}`}>
                            <div className="text-[11px] text-muted-foreground">{node.id} · {TEAM_META[node.team].name}</div>
                            <div className="text-sm font-medium truncate" title={node.summary}>{node.summary}</div>
                            <div className="mt-1 flex items-center gap-1 flex-wrap">
                              {(node.jiraIds || []).slice(0,3).map((k) => (
                                <span key={k} className="text-[10px] px-1 py-0.5 border rounded bg-slate-50">{k}</span>
                              ))}
                              {node.jiraIds && node.jiraIds.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{node.jiraIds.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="col-span-3">
        <Card className="h-[78vh]">
          <CardHeader className="py-3"><CardTitle className="text-base">編輯 User Story 與交互關係</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedId ? (
              <NodeEditor
                nodeId={selectedId}
                tree={treeData}
                onAdd={addChild}
                onRemove={removeNode}
                onUpdate={updateNode}
                onAddJira={addJira}
                onRemoveJira={removeJira}
                crossEdges={xEdges}
                onAddEdge={(edge) => setXEdges((es) => [...es, edge])}
                onRemoveEdge={(id) => setXEdges((es) => es.filter((e) => e.id !== id))}
              />
            ) : (
              <div className="text-sm text-muted-foreground">在左側點選節點以編輯。</div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => addChild(treeData.id)}><Plus className="w-4 h-4 mr-1"/>在根新增</Button>
              <Button variant="secondary" onClick={exportJSON}><Download className="w-4 h-4 mr-1"/>匯出 JSON</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NodeEditor({ nodeId, tree, onAdd, onRemove, onUpdate, onAddJira, onRemoveJira, crossEdges, onAddEdge, onRemoveEdge }) {
  const flat = useMemo(() => {
    const arr = []; const walk = (n) => { arr.push(n); (n.children || []).forEach(walk); }; walk(tree); return arr;
  }, [tree]);
  const node = flat.find((n) => n.id === nodeId);
  const [jiraInput, setJiraInput] = useState("");

  const [edgeFrom, setEdgeFrom] = useState(nodeId);
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeKind, setEdgeKind] = useState("relates");

  if (!node) return null;
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">User Story ID</div>
        <div className="text-sm font-mono">{node.id}</div>
      </div>

      <div>
        <div className="mb-1 text-sm">Team</div>
        <Select value={node.team} onValueChange={(v) => onUpdate(node.id, { team: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.keys(TEAM_META).map((k) => (<SelectItem key={k} value={k}>{TEAM_META[k].name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="mb-1 text-sm">Summary（簡述）</div>
        <Input value={node.summary} onChange={(e) => onUpdate(node.id, { summary: e.target.value })} />
      </div>

      <div>
        <div className="mb-1 text-sm">Description（詳細描述）</div>
        <textarea className="w-full border rounded p-2 h-28" value={node.description || ""} onChange={(e) => onUpdate(node.id, { description: e.target.value })} />
      </div>

      <div>
        <div className="mb-1 text-sm">JIRA 單號（可多個）</div>
        <div className="flex gap-2">
          <Input placeholder="例如 PROJ-123" value={jiraInput} onChange={(e)=>setJiraInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ onAddJira(node.id, jiraInput); setJiraInput(""); } }} />
          <Button size="sm" onClick={()=>{ onAddJira(node.id, jiraInput); setJiraInput(""); }}>新增</Button>
        </div>
        <div className="mt-2 flex gap-2 flex-wrap">
          {(node.jiraIds || []).map((k) => (
            <span key={k} className="text-[12px] px-1.5 py-0.5 rounded border bg-slate-50 flex items-center gap-1">
              {k}
              <button className="p-0.5" onClick={()=>onRemoveJira(node.id, k)} aria-label={`remove-${k}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(!node.jiraIds || node.jiraIds.length===0) && (
            <div className="text-xs text-muted-foreground">尚未新增 JIRA 單號</div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="mb-2 text-sm font-medium">交互關係（非父子）</div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={edgeFrom} onValueChange={setEdgeFrom}>
            <SelectTrigger><SelectValue placeholder="來源"/></SelectTrigger>
            <SelectContent>
              {flat.map((n) => (<SelectItem key={n.id} value={n.id}>{n.id}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={edgeTo} onValueChange={setEdgeTo}>
            <SelectTrigger><SelectValue placeholder="目標"/></SelectTrigger>
            <SelectContent>
              {flat.map((n) => (<SelectItem key={n.id} value={n.id}>{n.id}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={edgeKind} onValueChange={(v)=>setEdgeKind(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="depends">depends</SelectItem>
              <SelectItem value="blocks">blocks</SelectItem>
              <SelectItem value="relates">relates</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={()=>{ if(edgeFrom && edgeTo && edgeFrom!==edgeTo){ onAddEdge({ id: uidE(), from: edgeFrom, to: edgeTo, kind: edgeKind }); } }}>新增關係</Button>
        </div>

        <div className="mt-3 space-y-2 max-h-40 overflow-auto">
          {crossEdges.length === 0 && <div className="text-xs text-muted-foreground">尚無交互關係</div>}
          {crossEdges.map((e) => (
            <div key={e.id} className="text-xs border rounded p-2 flex items-center justify-between">
              <span>#{e.id} · {e.kind} · {e.from} → {e.to}</span>
              <Button size="icon" variant="ghost" onClick={()=>onRemoveEdge(e.id)}><Trash2 className="w-4 h-4"/></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={() => onAdd(node.id)}><Plus className="w-4 h-4 mr-1"/>新增子節點</Button>
        {node.id !== tree.id && (
          <Button size="sm" variant="destructive" onClick={() => onRemove(node.id)}><Trash2 className="w-4 h-4 mr-1"/>刪除此節點</Button>
        )}
      </div>
    </div>
  );
}
