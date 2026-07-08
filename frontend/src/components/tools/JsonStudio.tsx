"use client";

import { useState, useMemo, useRef, useCallback, ChangeEvent, WheelEvent, PointerEvent } from 'react';
import {
    Braces, Network, ListTree, Upload, Download, Copy, Check,
    WandSparkles, Minimize2, ChevronRight, ChevronDown, CircleAlert
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const SAMPLE = JSON.stringify({
    product: 'Sarva',
    version: 2.1,
    openSource: true,
    tools: ['csv', 'xlsx', 'docx', 'pdf'],
    author: { name: 'Anmol', location: { city: 'Delhi', country: 'India' } },
    stats: { users: 12500, rating: 4.8, reviews: 1640 },
}, null, 2);

// ---------- Graph model ----------

interface GraphRow { key: string; value: string; type: string }
interface GraphNode {
    id: number;
    label: string;          // edge label from parent (key or index)
    badge: string;          // e.g. {3} or [5]
    rows: GraphRow[];
    children: GraphNode[];
    // layout
    w: number; h: number; x: number; y: number;
}

const NODE_CAP = 400;
const ROW_H = 22;
const NODE_PAD = 10;
const COL_GAP = 90;
const SIBLING_GAP = 18;

function typeOf(v: unknown): string {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
}

function fmtValue(v: unknown): string {
    if (typeof v === 'string') return `"${v.length > 32 ? v.slice(0, 32) + '…' : v}"`;
    return String(v);
}

function buildGraph(value: unknown): { root: GraphNode | null; truncated: boolean } {
    let nextId = 0;
    let truncated = false;

    const make = (val: unknown, label: string): GraphNode | null => {
        if (nextId >= NODE_CAP) { truncated = true; return null; }
        const node: GraphNode = {
            id: nextId++, label, badge: '', rows: [], children: [],
            w: 0, h: 0, x: 0, y: 0,
        };

        if (Array.isArray(val)) {
            node.badge = `[${val.length}]`;
            val.forEach((item, i) => {
                if (item !== null && typeof item === 'object') {
                    const child = make(item, String(i));
                    if (child) node.children.push(child);
                } else {
                    node.rows.push({ key: String(i), value: fmtValue(item), type: typeOf(item) });
                }
            });
        } else if (val !== null && typeof val === 'object') {
            const entries = Object.entries(val as Record<string, unknown>);
            node.badge = `{${entries.length}}`;
            for (const [k, v] of entries) {
                if (v !== null && typeof v === 'object') {
                    const child = make(v, k);
                    if (child) node.children.push(child);
                } else {
                    node.rows.push({ key: k, value: fmtValue(v), type: typeOf(v) });
                }
            }
        } else {
            node.rows.push({ key: label, value: fmtValue(val), type: typeOf(val) });
        }

        // size
        const texts = node.rows.map(r => `${r.key}: ${r.value}`);
        texts.push(`${node.label} ${node.badge}`);
        const maxChars = Math.max(...texts.map(t => t.length), 8);
        node.w = Math.min(Math.max(maxChars * 7.4 + NODE_PAD * 2, 110), 330);
        node.h = Math.max(node.rows.length, 1) * ROW_H + NODE_PAD * 2 + (node.badge ? 20 : 0);
        return node;
    };

    const root = make(value, 'root');
    return { root, truncated };
}

function layoutGraph(root: GraphNode): { width: number; height: number } {
    // column width per depth
    const colWidth: number[] = [];
    const scan = (n: GraphNode, d: number) => {
        colWidth[d] = Math.max(colWidth[d] ?? 0, n.w);
        n.children.forEach(c => scan(c, d + 1));
    };
    scan(root, 0);

    const colX: number[] = [];
    let acc = 0;
    for (let d = 0; d < colWidth.length; d++) {
        colX[d] = acc;
        acc += colWidth[d] + COL_GAP;
    }

    let cursorY = 0;
    const place = (n: GraphNode, d: number): void => {
        n.x = colX[d];
        if (n.children.length === 0) {
            n.y = cursorY;
            cursorY += n.h + SIBLING_GAP;
            return;
        }
        n.children.forEach(c => place(c, d + 1));
        const first = n.children[0];
        const last = n.children[n.children.length - 1];
        n.y = (first.y + last.y + last.h) / 2 - n.h / 2;
        // guard against overlapping earlier stacked leaves in this column
        cursorY = Math.max(cursorY, n.y + n.h + SIBLING_GAP);
    };
    place(root, 0);

    let maxY = 0;
    const measure = (n: GraphNode) => {
        maxY = Math.max(maxY, n.y + n.h);
        n.children.forEach(measure);
    };
    measure(root);

    return { width: acc, height: maxY };
}

const TYPE_COLORS: Record<string, string> = {
    string: '#16a34a',
    number: '#2563eb',
    boolean: '#9333ea',
    null: '#94a3b8',
};

function GraphView({ data }: { data: unknown }) {
    const { root, truncated } = useMemo(() => buildGraph(data), [data]);
    const size = useMemo(() => (root ? layoutGraph(root) : { width: 0, height: 0 }), [root]);

    const [view, setView] = useState({ tx: 40, ty: 40, scale: 1 });
    const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

    const onWheel = useCallback((e: WheelEvent) => {
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        setView(v => {
            const scale = Math.min(3, Math.max(0.15, v.scale * factor));
            return { ...v, scale };
        });
    }, []);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = { startX: e.clientX, startY: e.clientY, tx: view.tx, ty: view.ty };
    };
    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current;
        if (!d) return;
        setView(v => ({ ...v, tx: d.tx + (e.clientX - d.startX), ty: d.ty + (e.clientY - d.startY) }));
    };
    const onPointerUp = () => { dragRef.current = null; };

    if (!root) return null;

    const nodes: GraphNode[] = [];
    const edges: { from: GraphNode; to: GraphNode }[] = [];
    const collect = (n: GraphNode) => {
        nodes.push(n);
        n.children.forEach(c => { edges.push({ from: n, to: c }); collect(c); });
    };
    collect(root);

    return (
        <div className="relative h-[32rem] overflow-hidden rounded-xl border-2 border-ink-200 bg-[#fafaf9]">
            {truncated && (
                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    <CircleAlert className="h-3.5 w-3.5" /> Large document — showing first {NODE_CAP} nodes
                </div>
            )}
            <div className="absolute right-3 top-3 z-10 rounded-full bg-ink-100/80 px-3 py-1 text-xs font-medium text-ink-500">
                Scroll to zoom · drag to pan
            </div>
            <div
                className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <svg className="h-full w-full">
                    <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
                        {edges.map(({ from, to }, i) => {
                            const x1 = from.x + from.w, y1 = from.y + from.h / 2;
                            const x2 = to.x, y2 = to.y + to.h / 2;
                            const mx = (x1 + x2) / 2;
                            return (
                                <path
                                    key={i}
                                    d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                                    fill="none" stroke="#d6d3d1" strokeWidth={1.5}
                                />
                            );
                        })}
                        {nodes.map(n => (
                            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                                <rect width={n.w} height={n.h} rx={8} fill="white" stroke="#d6d3d1" strokeWidth={1.5} />
                                {n.badge && (
                                    <text x={NODE_PAD} y={NODE_PAD + 10} fontSize={11} fontWeight={700} fill="#b45309" fontFamily="monospace">
                                        {n.label} {n.badge}
                                    </text>
                                )}
                                {n.rows.map((r, i) => {
                                    const y = NODE_PAD + (n.badge ? 20 : 0) + i * ROW_H + 14;
                                    return (
                                        <text key={i} x={NODE_PAD} y={y} fontSize={12} fontFamily="monospace">
                                            <tspan fill="#57534e" fontWeight={600}>{r.key}: </tspan>
                                            <tspan fill={TYPE_COLORS[r.type] ?? '#1c1917'}>{r.value}</tspan>
                                        </text>
                                    );
                                })}
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
}

// ---------- Tree view ----------

function TreeNode({ name, value, depth }: { name: string; value: unknown; depth: number }) {
    const [open, setOpen] = useState(depth < 2);
    const isObj = value !== null && typeof value === 'object';

    if (!isObj) {
        return (
            <div className="flex items-baseline gap-2 py-0.5 font-mono text-sm" style={{ paddingLeft: depth * 20 + 22 }}>
                <span className="font-semibold text-ink-600">{name}:</span>
                <span style={{ color: TYPE_COLORS[typeOf(value)] ?? '#1c1917' }}>{fmtValue(value)}</span>
            </div>
        );
    }

    const entries = Array.isArray(value)
        ? value.map((v, i) => [String(i), v] as const)
        : Object.entries(value as Record<string, unknown>);
    const badge = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;

    return (
        <div>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex w-full items-center gap-1 rounded py-0.5 text-left font-mono text-sm hover:bg-ink-50"
                style={{ paddingLeft: depth * 20 }}
            >
                {open ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-400" />}
                <span className="font-semibold text-ink-800">{name}</span>
                <span className="text-xs font-bold text-amber-700">{badge}</span>
            </button>
            {open && entries.map(([k, v]) => <TreeNode key={k} name={k} value={v} depth={depth + 1} />)}
        </div>
    );
}

// ---------- Main component ----------

const EDITOR_PLACEHOLDER = `Paste or type JSON here, e.g.

{
    "name": "My Project",
    "version": 1.0,
    "active": true,
    "tags": ["alpha", "beta"],
    "owner": { "name": "You", "role": "admin" }
}`;

export default function JsonStudio() {
    const [text, setText] = useState('');
    const [viewMode, setViewMode] = useState<'graph' | 'tree'>('graph');
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parsed = useMemo(() => {
        if (!text.trim()) return { data: undefined as unknown, error: 'Paste or type some JSON to get started' };
        try {
            return { data: JSON.parse(text) as unknown, error: '' };
        } catch (e: any) {
            return { data: undefined as unknown, error: e.message as string };
        }
    }, [text]);

    const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setText(String(reader.result ?? ''));
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'data.json';
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const format = (spaces: number) => {
        if (parsed.error) return;
        setText(JSON.stringify(parsed.data, null, spaces || undefined));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-xl bg-ink-100 p-1">
                    {([['graph', 'Graph', Network], ['tree', 'Tree', ListTree]] as const).map(([id, label, Icon]) => (
                        <button
                            key={id}
                            onClick={() => setViewMode(id)}
                            className={cn(
                                "inline-flex items-center rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200",
                                viewMode === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" /> {label}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Open
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => format(2)} disabled={!!parsed.error}>
                        <WandSparkles className="mr-2 h-4 w-4" /> Format
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => format(0)} disabled={!!parsed.error}>
                        <Minimize2 className="mr-2 h-4 w-4" /> Minify
                    </Button>
                    <Button
                        variant="outline" size="sm"
                        onClick={async () => {
                            await navigator.clipboard.writeText(text);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        }}
                    >
                        {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setText(SAMPLE)}>
                        <Braces className="mr-2 h-4 w-4" /> Sample
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="space-y-2">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                        className={cn(
                            "h-[32rem] w-full resize-y rounded-xl border-2 bg-white p-4 font-mono text-sm text-ink-800 focus:outline-none",
                            parsed.error && text.trim() ? "border-red-300 focus:border-red-400" : "border-ink-200 focus:border-brand-400"
                        )}
                        placeholder={EDITOR_PLACEHOLDER}
                    />
                    {parsed.error && text.trim() && (
                        <div className="flex items-start gap-2 rounded-xl border-2 border-red-200 bg-red-50 p-3">
                            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <p className="font-mono text-xs text-red-600">{parsed.error}</p>
                        </div>
                    )}
                </div>

                {parsed.error ? (
                    <div className="flex h-[32rem] items-center justify-center rounded-xl border-2 border-ink-200 bg-ink-50 text-ink-400">
                        <p className="text-sm font-medium">{text.trim() ? 'Fix the JSON to see the visualization' : 'Paste JSON to visualize it'}</p>
                    </div>
                ) : viewMode === 'graph' ? (
                    <GraphView data={parsed.data} />
                ) : (
                    <div className="h-[32rem] overflow-auto rounded-xl border-2 border-ink-200 bg-white p-4">
                        <TreeNode name="root" value={parsed.data} depth={0} />
                    </div>
                )}
            </div>
        </div>
    );
}
