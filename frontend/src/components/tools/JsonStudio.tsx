"use client";

import { useState, useMemo, useRef, useEffect, useCallback, ChangeEvent, DragEvent, WheelEvent, PointerEvent } from 'react';
import { jsonrepair } from 'jsonrepair';
import { dump as dumpYaml } from 'js-yaml';
import { JSONPath } from 'jsonpath-plus';
import { createSchema } from 'genson-js';
import JsonToTS from 'json-to-ts';
import { saveAs } from 'file-saver';
import {
    Braces, Network, ListTree, Upload, Download, Copy, Check,
    WandSparkles, Minimize2, ChevronRight, ChevronDown, ChevronUp, CircleAlert, Wrench,
    ArrowDownAZ, FoldVertical, UnfoldVertical, Search, ImageDown, X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import CompressButton from './CompressButton';

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

// Serialize the live graph at full size (not the panned/zoomed viewport) so an
// export shows the whole document. No foreignObject in the SVG, so a canvas
// draw stays untainted and PNG export works.
const PAD = 40;

function graphToSvgText(svg: SVGSVGElement, width: number, height: number): string {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const w = width + PAD * 2;
    const h = height + PAD * 2;
    clone.removeAttribute('class'); // Tailwind classes are dead weight in a standalone file
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
    clone.querySelector('g')?.setAttribute('transform', `translate(${PAD},${PAD})`);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#fafaf9');
    clone.insertBefore(bg, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
}

function GraphView({ data }: { data: unknown }) {
    const { root, truncated } = useMemo(() => buildGraph(data), [data]);
    const size = useMemo(() => (root ? layoutGraph(root) : { width: 0, height: 0 }), [root]);

    const [view, setView] = useState({ tx: 40, ty: 40, scale: 1 });
    const [exporting, setExporting] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);

    const exportImage = async (kind: 'svg' | 'png') => {
        if (!svgRef.current) return;
        setExporting(true);
        try {
            const svgText = graphToSvgText(svgRef.current, size.width, size.height);
            if (kind === 'svg') {
                saveAs(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }), 'json-graph.svg');
                return;
            }
            const scale = 2; // retina-ish, still sane for large graphs
            const w = (size.width + PAD * 2) * scale;
            const h = (size.height + PAD * 2) * scale;
            const img = new Image();
            const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
            try {
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = () => reject(new Error('render failed'));
                    img.src = url;
                });
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, w, h);
                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
                if (blob) saveAs(blob, 'json-graph.png');
            } finally {
                URL.revokeObjectURL(url);
            }
        } finally {
            setExporting(false);
        }
    };

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
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <span className="rounded-full bg-ink-100/80 px-3 py-1 text-xs font-medium text-ink-500">
                    Scroll to zoom · drag to pan
                </span>
                <Button variant="secondary" size="sm" onClick={() => exportImage('png')} disabled={exporting}>
                    <ImageDown className="mr-1.5 h-3.5 w-3.5" /> PNG
                </Button>
                <Button variant="secondary" size="sm" onClick={() => exportImage('svg')} disabled={exporting}>
                    <ImageDown className="mr-1.5 h-3.5 w-3.5" /> SVG
                </Button>
            </div>
            <div
                className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <svg ref={svgRef} className="h-full w-full">
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

// `defaultOpen` is only read on mount; collapse/expand all works by remounting
// the tree with a new key, which is far less code than lifting every node's
// open state into the parent.
function TreeNode({ name, value, depth, defaultOpen }: { name: string; value: unknown; depth: number; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen ?? depth < 2);
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
            {open && entries.map(([k, v]) => <TreeNode key={k} name={k} value={v} depth={depth + 1} defaultOpen={defaultOpen} />)}
        </div>
    );
}

// ---------- Conversions ----------

// CSV only has a sane meaning for a flat array of objects; anything else would
// be a guess, so say so rather than emit nonsense.
function toCsv(data: unknown): string {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('CSV needs a non-empty array of objects — this JSON is not a table.');
    }
    const rows = data.filter(r => r !== null && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown>[];
    if (rows.length !== data.length) {
        throw new Error('CSV needs every array item to be an object — this array holds other values too.');
    }
    const columns = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const cell = (v: unknown) => {
        if (v === null || v === undefined) return '';
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [columns.map(cell).join(','), ...rows.map(r => columns.map(c => cell(r[c])).join(','))].join('\n');
}

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeXml = (s: string) => s.replace(/[&<>"]/g, c => XML_ESCAPES[c]);
// XML element names cannot start with a digit or contain spaces.
const xmlName = (k: string) => (/^[A-Za-z_][\w.-]*$/.test(k) ? k : `_${k.replace(/[^\w.-]/g, '_')}`);

function toXml(data: unknown, tag = 'root', depth = 0): string {
    const pad = '  '.repeat(depth);
    if (Array.isArray(data)) {
        return data.map(item => toXml(item, tag, depth)).join('\n');
    }
    if (data !== null && typeof data === 'object') {
        const inner = Object.entries(data as Record<string, unknown>)
            .map(([k, v]) => toXml(v, xmlName(k), depth + 1))
            .join('\n');
        return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`;
    }
    return `${pad}<${tag}>${escapeXml(data === null ? '' : String(data))}</${tag}>`;
}

// Deep key sort — arrays keep their order, only object keys are reordered.
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, sortKeys(v)])
        );
    }
    return value;
}

// ---------- Main component ----------

const EDITOR_PLACEHOLDER = `Paste JSON here, or drop a .json file, e.g.

{
    "name": "My Project",
    "version": 1.0,
    "active": true,
    "tags": ["alpha", "beta"],
    "owner": { "name": "You", "role": "admin" }
}`;

const VIEWS = [
    { id: 'graph', label: 'Graph', icon: Network },
    { id: 'tree', label: 'Tree', icon: ListTree },
    { id: 'query', label: 'Query', icon: Search },
    { id: 'schema', label: 'Schema', icon: Braces },
    { id: 'types', label: 'Types', icon: Braces },
    { id: 'yaml', label: 'YAML', icon: Braces },
    { id: 'csv', label: 'CSV', icon: Braces },
    { id: 'xml', label: 'XML', icon: Braces },
] as const;

type ViewMode = typeof VIEWS[number]['id'];

// The read-only views are all "some text derived from the JSON", so they share
// one pane with copy + download.
function OutputPane({ text, error, filename, language }: { text: string; error: string; filename: string; language: string }) {
    const [copied, setCopied] = useState(false);

    if (error) {
        return (
            <div className="flex h-[32rem] items-center justify-center rounded-xl border-2 border-ink-200 bg-ink-50 p-6">
                <p className="max-w-sm text-center text-sm font-medium text-ink-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex h-[32rem] flex-col overflow-hidden rounded-xl border-2 border-ink-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-ink-200 bg-ink-50 px-3 py-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wide text-ink-500">{language}</span>
                <div className="flex gap-2">
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
                    <Button variant="outline" size="sm" onClick={() => saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)}>
                        <Download className="mr-2 h-4 w-4" /> Download
                    </Button>
                </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-ink-800">{text}</pre>
        </div>
    );
}

export default function JsonStudio() {
    const [text, setText] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('graph');
    const [copied, setCopied] = useState(false);
    const [fixError, setFixError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [query, setQuery] = useState('$..*');
    const [search, setSearch] = useState('');
    const [matchIndex, setMatchIndex] = useState(0);
    const [treeEpoch, setTreeEpoch] = useState(0);
    const [treeDefaultOpen, setTreeDefaultOpen] = useState<boolean | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const gutterRef = useRef<HTMLDivElement>(null);

    useEffect(() => setFixError(''), [text]);

    const parsed = useMemo(() => {
        if (!text.trim()) return { data: undefined as unknown, error: 'Paste or type some JSON to get started' };
        try {
            return { data: JSON.parse(text) as unknown, error: '' };
        } catch (e: any) {
            return { data: undefined as unknown, error: e.message as string };
        }
    }, [text]);

    const lineNumbers = useMemo(
        () => Array.from({ length: text.split('\n').length }, (_, i) => i + 1).join('\n'),
        [text]
    );

    // Search over the raw text, so it works whether or not the JSON parses.
    const matches = useMemo(() => {
        if (!search) return [];
        const found: number[] = [];
        const haystack = text.toLowerCase();
        const needle = search.toLowerCase();
        let i = haystack.indexOf(needle);
        while (i !== -1 && found.length < 5000) {
            found.push(i);
            i = haystack.indexOf(needle, i + Math.max(needle.length, 1));
        }
        return found;
    }, [text, search]);

    useEffect(() => setMatchIndex(0), [search]);

    const goToOffset = useCallback((start: number, length: number) => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.focus();
        ta.setSelectionRange(start, start + length);
        // Rough scroll: line height is 1.5 * 12px monospace text.
        const line = text.slice(0, start).split('\n').length - 1;
        ta.scrollTop = Math.max(0, line * 18 - ta.clientHeight / 2);
        if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
    }, [text]);

    const stepMatch = (delta: number) => {
        if (matches.length === 0) return;
        const next = (matchIndex + delta + matches.length) % matches.length;
        setMatchIndex(next);
        goToOffset(matches[next], search.length);
    };

    // Make the parse error jump to the offending spot. V8 and SpiderMonkey both
    // report "line L column C", but only V8 adds a raw "position N", so prefer
    // line/column. V8's "Unexpected token 'x', ..." carries neither — there the
    // message just stays plain text (and Fix is the answer for it anyway).
    const errorOffset = useMemo(() => {
        const lineCol = /line (\d+) column (\d+)/.exec(parsed.error);
        if (lineCol) {
            const line = Number(lineCol[1]);
            const column = Number(lineCol[2]);
            const lines = text.split('\n');
            if (line <= lines.length) {
                const offset = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
                return offset + column - 1;
            }
        }
        const position = /position (\d+)/.exec(parsed.error);
        return position ? Number(position[1]) : null;
    }, [parsed.error, text]);

    // Every read-only view is a pure transform of the parsed data.
    const output = useMemo((): { text: string; error: string; filename: string; language: string } => {
        const blank = { text: '', filename: 'data.txt', language: viewMode };
        if (parsed.error) return { ...blank, error: text.trim() ? 'Fix the JSON to see this view' : 'Paste JSON to get started' };
        try {
            switch (viewMode) {
                case 'yaml':
                    return { text: dumpYaml(parsed.data), error: '', filename: 'data.yaml', language: 'yaml' };
                case 'csv':
                    return { text: toCsv(parsed.data), error: '', filename: 'data.csv', language: 'csv' };
                case 'xml':
                    return { text: `<?xml version="1.0" encoding="UTF-8"?>\n${toXml(parsed.data)}`, error: '', filename: 'data.xml', language: 'xml' };
                case 'schema':
                    return { text: JSON.stringify(createSchema(parsed.data), null, 2), error: '', filename: 'schema.json', language: 'json schema' };
                case 'types':
                    return { text: JsonToTS(parsed.data).join('\n\n'), error: '', filename: 'types.ts', language: 'typescript' };
                case 'query': {
                    const result = JSONPath({ path: query, json: parsed.data as object });
                    return { text: JSON.stringify(result, null, 2), error: '', filename: 'query-result.json', language: 'json' };
                }
                default:
                    return { ...blank, error: '' };
            }
        } catch (e: any) {
            return { ...blank, error: e?.message || 'Could not convert this JSON.' };
        }
    }, [viewMode, parsed.data, parsed.error, text, query]);

    const readFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => setText(String(reader.result ?? ''));
        reader.readAsText(file);
    };

    const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) readFile(file);
        e.target.value = '';
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) readFile(file);
    };

    // Repair, then pretty-print: covers minified, malformed, and near-JSON
    // input (single quotes, trailing commas, unquoted keys, comments).
    const fix = () => {
        try {
            const repaired = JSON.parse(jsonrepair(text));
            // Repairing prose just wraps it in quotes — valid JSON, but never what
            // someone pasting into a JSON viewer meant. Insist on a real structure.
            if (repaired === null || typeof repaired !== 'object') {
                throw new Error('not a JSON object or array');
            }
            setText(JSON.stringify(repaired, null, 2));
        } catch {
            setFixError("We couldn't repair this automatically — check for missing brackets or quotes.");
        }
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

    const sort = () => {
        if (parsed.error) return;
        setText(JSON.stringify(sortKeys(parsed.data), null, 2));
    };

    const setTreeOpen = (open: boolean) => {
        setTreeDefaultOpen(open);
        setTreeEpoch(e => e + 1);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex max-w-full items-center overflow-x-auto rounded-xl bg-ink-100 p-1">
                    {VIEWS.map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setViewMode(id)}
                            className={cn(
                                "inline-flex shrink-0 items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                                viewMode === id ? "bg-white text-ink-950 shadow-sm" : "text-ink-500 hover:text-ink-900"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); stepMatch(e.shiftKey ? -1 : 1); } }}
                            placeholder="Search"
                            aria-label="Search the JSON"
                            className="h-8 w-40 rounded-lg border-2 border-ink-200 bg-white pl-8 pr-2 text-sm focus:border-brand-400 focus:outline-none"
                        />
                    </div>
                    {search && (
                        <>
                            <span className="font-mono text-xs tabular-nums text-ink-500">
                                {matches.length ? `${matchIndex + 1}/${matches.length}` : '0/0'}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => stepMatch(-1)} disabled={!matches.length} aria-label="Previous match">
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => stepMatch(1)} disabled={!matches.length} aria-label="Next match">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSearch('')} aria-label="Clear search">
                                <X className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                <Button variant="outline" size="sm" onClick={sort} disabled={!!parsed.error}>
                    <ArrowDownAZ className="mr-2 h-4 w-4" /> Sort keys
                </Button>
                {viewMode === 'tree' && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setTreeOpen(false)} disabled={!!parsed.error}>
                            <FoldVertical className="mr-2 h-4 w-4" /> Collapse all
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setTreeOpen(true)} disabled={!!parsed.error}>
                            <UnfoldVertical className="mr-2 h-4 w-4" /> Expand all
                        </Button>
                    </>
                )}
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
                <CompressButton text={text} filename="data.json" />
                <Button variant="outline" size="sm" onClick={() => setText(SAMPLE)}>
                    <Braces className="mr-2 h-4 w-4" /> Sample
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="space-y-2">
                    {/* Above the editor on purpose: the editor is tall enough that
                        anything below it sits off-screen when you need it most. */}
                    {parsed.error && text.trim() && (
                        <div className="flex items-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-3">
                            <CircleAlert className="h-4 w-4 shrink-0 text-red-500" />
                            {errorOffset !== null && !fixError ? (
                                <button
                                    onClick={() => goToOffset(errorOffset, 1)}
                                    className="min-w-0 flex-1 text-left font-mono text-xs text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
                                    title="Jump to this position"
                                >
                                    {parsed.error}
                                </button>
                            ) : (
                                <p className="min-w-0 flex-1 font-mono text-xs text-red-600">{fixError || parsed.error}</p>
                            )}
                            {!fixError && (
                                <Button variant="secondary" size="sm" onClick={fix} className="shrink-0">
                                    <Wrench className="mr-2 h-4 w-4" /> Fix
                                </Button>
                            )}
                        </div>
                    )}
                    <div
                        className={cn(
                            "flex h-[32rem] overflow-hidden rounded-xl border-2 bg-white",
                            isDragging
                                ? "border-brand-400 bg-brand-50"
                                : parsed.error && text.trim() ? "border-red-300 focus-within:border-red-400" : "border-ink-200 focus-within:border-brand-400"
                        )}
                    >
                        <div
                            ref={gutterRef}
                            aria-hidden
                            className="select-none overflow-hidden border-r border-ink-200 bg-ink-50 px-2 py-4 text-right font-mono text-sm leading-[18px] text-ink-400"
                        >
                            <pre>{lineNumbers || '1'}</pre>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onScroll={(e) => { if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            spellCheck={false}
                            className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-[18px] text-ink-800 focus:outline-none"
                            placeholder={EDITOR_PLACEHOLDER}
                        />
                    </div>
                </div>

                {parsed.error && (viewMode === 'graph' || viewMode === 'tree') ? (
                    <div className="flex h-[32rem] items-center justify-center rounded-xl border-2 border-ink-200 bg-ink-50 text-ink-400">
                        <p className="text-sm font-medium">{text.trim() ? 'Fix the JSON to see the visualization' : 'Paste JSON to visualize it'}</p>
                    </div>
                ) : viewMode === 'graph' ? (
                    <GraphView data={parsed.data} />
                ) : viewMode === 'tree' ? (
                    <div className="h-[32rem] overflow-auto rounded-xl border-2 border-ink-200 bg-white p-4">
                        <TreeNode key={treeEpoch} name="root" value={parsed.data} depth={0} defaultOpen={treeDefaultOpen} />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {viewMode === 'query' && (
                            <div className="flex items-center gap-2">
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    spellCheck={false}
                                    aria-label="JSONPath expression"
                                    placeholder="$.store.book[*].author"
                                    className="h-9 flex-1 rounded-lg border-2 border-ink-200 bg-white px-3 font-mono text-sm focus:border-brand-400 focus:outline-none"
                                />
                                <span className="shrink-0 text-xs text-ink-400">JSONPath</span>
                            </div>
                        )}
                        <OutputPane {...output} />
                    </div>
                )}
            </div>
        </div>
    );
}
