import { useState, useMemo } from "react";

type Player = 'r' | 'c1' | 'c2';

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const pos = (v: number, n: number) => ({ r: Math.floor((v - 1) / n) + 1, c: (v - 1) % n + 1 });
const dist = (v1: number, v2: number, n: number) => { const a = pos(v1, n), b = pos(v2, n); return Math.abs(a.r - b.r) + Math.abs(a.c - b.c); };
const adjOf = (v: number, n: number): number[] => { const { r, c } = pos(v, n); const a: number[] = []; if (r > 1) a.push(v - n); if (r < n) a.push(v + n); if (c > 1) a.push(v - 1); if (c < n) a.push(v + 1); return a; };
const calcExits = (w: number, k: number, n: number) => Array.from({ length: n * n }, (_, i) => i + 1).filter(v => v !== w && gcd(w, v) > 1 && dist(w, v, n) > k);

export default function App() {
  const [inp, setInp] = useState<Record<string, string | number>>({ n: '5', k: '3' });
  const [phase, setPhase] = useState('setup');
  const [n, setN] = useState(5);
  const [k, setK] = useState(3);
  const [wh, setWh] = useState<number | null>(null);
  const [ex, setEx] = useState<number[]>([]);
  const [pieces, setPieces] = useState<Record<Player, number>>({ r: 1, c1: 24, c2: 25 });
  const [turn, setTurn] = useState<Player>('r');
  const [won, setWon] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [hover, setHover] = useState<number | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const SVG = 460, PAD = 42;
  const cell = n > 1 ? (SVG - 2 * PAD) / (n - 1) : SVG / 2;
  const vr = Math.min(20, Math.max(12, cell * 0.31));
  const xy = (v: number) => { const { r, c } = pos(v, n); return { x: PAD + (c - 1) * cell, y: PAD + (r - 1) * cell }; };

  const valid = useMemo(() => {
    if (phase === 'teleport') return [...ex, wh];
    if (phase !== 'game' || won) return [];
    const p = pieces[turn];
    const m = new Set(adjOf(p, n));
    if (turn === 'r' && p === wh) ex.forEach(e => m.add(e));
    return [...m];
  }, [phase, won, turn, pieces, wh, ex, n]);

  const hoverEx = useMemo(() => phase === 'wormhole' && hover ? calcExits(hover, k, n) : [], [phase, hover, k, n]);

  const doStart = () => {
    const nv = Math.min(9, Math.max(2, parseInt(String(inp.n)) || 5));
    const kv = Math.max(2, parseInt(String(inp.k)) || 3);
    setN(nv); setK(kv);
    setPieces({ r: 1, c1: nv * nv - 1, c2: nv * nv });
    setWh(null); setEx([]); setWon(false); setRounds(1); setTurn('r');
    setLog([`n=${nv}, k=${kv} — Robber@v1, Cop1@v${nv * nv - 1}, Cop2@v${nv * nv}`]);
    setPhase('wormhole');
  };

  const doSelectWh = (v: number) => { setWh(v); setEx(calcExits(v, k, n)); };

  const doConfirmWh = () => {
    if (!wh) return;
    setLog(l => [...l, `Wormhole: v${wh} → ${ex.length} exit${ex.length !== 1 ? 's' : ''} ${ex.length ? '{' + ex.join(',') + '}' : '(none)'}`]);
    setPhase('game');
  };

  const doMove = (v: number) => {
    if (!valid.includes(v)) return;

    if (phase === 'teleport') {
      const isTele = ex.includes(v);
      const np = { ...pieces, r: v };
      const entry = isTele ? `Robber ✨teleports to v${v}` : `Robber stays at v${wh}`;
      setPieces(np);
      setPhase('game');
      const captured = np.r === np.c1 || np.r === np.c2;
      if (captured) {
        setWon(true);
        setLog(l => [...l, entry, '🚔 Cops win! Robber captured!']);
        return;
      }
      setTurn('c1');
      setLog(l => [...l, entry]);
      return;
    }

    const np = { ...pieces, [turn]: v };
    const names = { r: 'Robber', c1: 'Cop 1', c2: 'Cop 2' };

    if (turn === 'r' && v === wh) {
      setPieces(np);
      setLog(l => [...l, `Robber → v${v} (Wormhole)`]);
      setPhase('teleport');
      return;
    }

    const entry = `${names[turn]} → v${v}`;

    const captured = np.r === np.c1 || np.r === np.c2;
    setPieces(np);
    if (captured) {
      setWon(true);
      setLog(l => [...l, entry, '🚔 Cops win! Robber captured!']);
      return;
    }
    const next = turn === 'r' ? 'c1' : turn === 'c1' ? 'c2' : 'r';
    if (next === 'r') setRounds(x => x + 1);
    setTurn(next);
    setLog(l => [...l, entry]);
  };

  const fillOf = (v: number) => {
    if (v === pieces.r) return '#f97316';
    if (v === pieces.c1) return '#3b82f6';
    if (v === pieces.c2) return '#16a34a';
    if (v === wh) return '#dc2626';
    if (phase === 'wormhole' && hover && hoverEx.includes(v)) return '#c084fc';
    if (showWhEdges && ex.includes(v)) return '#9333ea';
    if (valid.includes(v)) return '#fbbf24';
    return '#e5e7eb';
  };

  const txtOf = (v: number) => [pieces.r, pieces.c1, pieces.c2, wh].includes(v)
    || (phase === 'wormhole' && hover && hoverEx.includes(v))
    || (showWhEdges && ex.includes(v)) ? 'white' : '#374151';

  const labelOf = (v: number) => {
    const p = [];
    if (v === pieces.r) p.push('R');
    if (v === pieces.c1) p.push('C1');
    if (v === pieces.c2) p.push('C2');
    return p;
  };

  const edges: [number, number][] = [];
  for (let v = 1; v <= n * n; v++) adjOf(v, n).forEach(u => { if (u > v) edges.push([v, u]); });

  const showWhEdges = pieces.r === wh || hover === wh;
  const whEdges = wh && showWhEdges ? ex.map(e => [wh, e]) : [];
  const prevEdges = phase === 'wormhole' && hover ? hoverEx.map(e => [hover, e]) : [];

  const TCOL: Record<Player, string> = { r: '#f97316', c1: '#3b82f6', c2: '#16a34a' };
  const TLBL: Record<Player, string> = { r: '🦹 Robber', c1: '👮 Cop 1', c2: '👮 Cop 2' };

  return (
    <div style={{ margin: '0 auto', padding: '12px 14px', fontFamily: 'system-ui,sans-serif' }}>
      <h2 style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, margin: '0 0 12px' }}>Wormhole Cops and Robbers</h2>

      {phase === 'setup' ? (
        <div style={{ background: '#f3f4f6', borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            {([['Grid size n', 'n', 2, 9], ['Threshold k', 'k', 2, 20]] as const).map(([lbl, key, mn, mx]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                {lbl}:
                <input type="number" min={mn} max={mx} value={inp[key as string]}
                  onChange={e => setInp(x => ({ ...x, [key as string]: e.target.value }))}
                  style={{ width: 52, padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 6, textAlign: 'center', fontSize: 14 }} />
              </label>
            ))}
            <button onClick={doStart}
              style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Start →
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            Robber starts at v1. Cops start at v(n²−1) and v(n²). Robber moves first.
          </div>
        </div>
      ) : (
        <>
          {/* Status bar */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 12px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}><b>n</b>={n} · <b>k</b>={k} · Round {rounds}</span>
            {phase === 'game' && !won && (
              <span style={{ color: TCOL[turn], fontWeight: 700 }}>{TLBL[turn]}'s turn</span>
            )}
            {won && <span style={{ color: '#15803d', fontWeight: 700 }}>🚔 Cops Win!</span>}
            <div style={{ display: 'flex', gap: 5 }}>
              {phase === 'wormhole' && (
                <button onClick={doConfirmWh} disabled={!wh}
                  style={{ background: wh ? '#16a34a' : '#d1d5db', color: 'white', border: 'none', borderRadius: 6, padding: '4px 11px', cursor: wh ? 'pointer' : 'default', fontSize: 12, fontWeight: 600 }}>
                  {wh ? `Confirm v${wh} →` : 'Select wormhole'}
                </button>
              )}
              <button onClick={() => setPhase('setup')}
                style={{ background: '#9ca3af', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>Reset</button>
            </div>
          </div>

          {/* Instruction */}
          <div style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', borderRadius: 6, padding: '6px 10px', marginBottom: 7 }}>
            {phase === 'teleport' 
              ? '🌀 Robber landed on the wormhole — click a purple exit vertex to teleport, or click the wormhole again to stay.'
              : phase === 'wormhole'
              ? hover
                ? `v${hover}: ${hoverEx.length} exit${hoverEx.length !== 1 ? 's' : ''} — click to set as wormhole`
                : 'Hover a vertex to preview its exit set, then click to choose your wormhole'
              : won
                ? 'Game over. Press Reset to start a new game.'
                : 'Click any highlighted (yellow) vertex to move.'}
          </div>

          {/* SVG Grid */}
          <svg width="100%" viewBox={`0 0 ${SVG} ${SVG}`}
            style={{ display: 'block', border: '1px solid #e5e7eb', borderRadius: 10, background: 'white' }}>

            {edges.map(([v, u]) => {
              const a = xy(v), b = xy(u);
              return <line key={`e${v}-${u}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d1d5db" strokeWidth={1.5} />;
            })}

            {[...whEdges.map(e => ({ pair: e, col: '#9333ea', dash: '5,4', op: 0.55 })),
              ...prevEdges.map(e => ({ pair: e, col: '#c084fc', dash: '4,4', op: 0.4 }))
            ].map(({ pair: [w, v], col, dash, op }, i) => {
              const pw = xy(w), pv = xy(v);
              const cx = (pw.x + pv.x) / 2 + (pv.y - pw.y) * 0.28;
              const cy = (pw.y + pv.y) / 2 - (pv.x - pw.x) * 0.28;
              return <path key={`wh${i}`} d={`M${pw.x},${pw.y} Q${cx},${cy} ${pv.x},${pv.y}`}
                stroke={col} strokeWidth={1.5} strokeDasharray={dash} fill="none" opacity={op} />;
            })}

            {Array.from({ length: n * n }, (_, i) => i + 1).map(v => {
              const { x, y } = xy(v);
              const fill = fillOf(v);
              const labels = labelOf(v);
              const clickable = phase === 'wormhole' || valid.includes(v);

              return (
                <g key={v}
                  onClick={() => phase === 'wormhole' ? doSelectWh(v) : doMove(v)}
                  onMouseEnter={() => setHover(v)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: clickable ? 'pointer' : 'default' }}>
                  {valid.includes(v) && <circle cx={x} cy={y} r={vr + 6} fill="#fef08a" opacity={0.5} />}
                  {hover === v && clickable && <circle cx={x} cy={y} r={vr + 3} fill="none" stroke="#4b5563" strokeWidth={1.5} opacity={0.5} />}
                  <circle cx={x} cy={y} r={vr} fill={fill}
                    stroke={v === wh ? '#991b1b' : '#9ca3af'} strokeWidth={v === wh ? 2.5 : 1.5} />
                  {labels.length > 0 ? (
                    <>
                      <text x={x} y={y - 2} textAnchor="middle" dominantBaseline="middle"
                        fontSize={vr * 0.6} fill="white" fontWeight="700"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {labels.join('+')}
                      </text>
                      <text x={x} y={y + vr * 0.47} textAnchor="middle" dominantBaseline="middle"
                        fontSize={vr * 0.4} fill="rgba(255,255,255,0.65)"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        v{v}
                      </text>
                    </>
                  ) : (
                    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                      fontSize={vr * 0.65} fill={txtOf(v)} fontWeight="600"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {v}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: 11, color: '#6b7280' }}>
            {[['#f97316', 'Robber (R)'], ['#3b82f6', 'Cop 1 (C1)'], ['#16a34a', 'Cop 2 (C2)'],
              ['#dc2626', 'Wormhole'], ['#9333ea', 'Exit vertex'], ['#fbbf24', 'Valid move']
            ].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ background: c, width: 11, height: 11, borderRadius: '50%', display: 'inline-block' }} />
                {l}
              </span>
            ))}
          </div>

          {wh && ex.length === 0 && phase === 'game' && (
            <p style={{ fontSize: 11, color: '#ef4444', margin: '5px 0 0' }}>⚠️ No exits at k={k} — wormhole has no effect</p>
          )}

          {/* Log */}
          <div style={{ marginTop: 8, background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '6px 10px', maxHeight: 72, overflowY: 'auto', fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
            {log.length === 0 ? <span style={{ color: '#d1d5db' }}>Game log will appear here</span> : log.slice(-10).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </>
      )}
    </div>
  );
}