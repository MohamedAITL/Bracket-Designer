import { useRef, useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";

const BASE = import.meta.env.BASE_URL;

// ─── Image natural size ───────────────────────────────────────────────────────
const IMG_W = 1280;
const IMG_H = 720;

// ─── Group layout in the background image (all in px, 1280×720 space) ────────
// 3 columns × 4 rows of group boxes on the right side of the image.
const COL_LEFT  = [740, 918, 1093];   // left edge of each group column
const ROW_TOP   = [103, 232, 360, 488]; // top edge of each group row
const FLAG_W_PX = 75;                 // flag width in image px
const FLAG_H_PX = 43;                 // flag height in image px

// Within each 162×130 group box:
//   header bar = top 25 px
//   2 col × 2 row flag layout below the header
const SLOT_DX = [5, 85];     // left offset of flag cols within box
const SLOT_DY = [28, 73];    // top offset of flag rows within box

// Helper: pixel → percentage of image dimensions
const xp = (px: number) => px / IMG_W * 100;
const yp = (py: number) => py / IMG_H * 100;

// ─── Group assignments (from the uploaded zip) ────────────────────────────────
// Groups[row][col] = [team1, team2, team3, team4]
// Order: top-left, top-right, bottom-left, bottom-right
const GROUPS: Record<string, string[]> = {
  A: ["South Korea.png", "Czech Repuplic.png", "South Africa.png", "Mexico.png"],
  B: ["Bosnia.png",      "Switzerland.png",    "Canada.png",        "Qatar.png"],
  C: ["Scotland.png",    "Brazil.png",         "Haiti.png",         "Morocco.png"],
  D: ["USA.png",         "Turkey.png",         "Australia.png",     "Paraguay.png"],
  E: ["Curacao.png",     "Ecuador.png",        "Germany.png",       "Ivory Coast.png"],
  F: ["Tunisia.png",     "Sweden.png",         "Netherlands.png",   "Japan.png"],
  G: ["Iran.png",        "Belgium.png",        "New Zealand.png",   "Egypt.png"],
  H: ["Saudi Arabia.png","Cape Verde.png",     "Spain.png",         "Uruguay.png"],
  I: ["Senegal.png",     "France.png",         "Iraq.png",          "Norway.png"],
  J: ["Argentina.png",   "Algeria.png",        "Austria.png",       "Jordan.png"],
  K: ["Colombia.png",    "DRK.png",            "Portugal.png",      "Uzbekistan.png"],
  L: ["Ghana.png",       "England.png",        "Panama.png",        "Croatia.png"],
};

// Group grid positions: row 0-3, col 0-2
const GROUP_GRID: Record<string, [number, number]> = {
  A:[0,0], B:[0,1], C:[0,2],
  D:[1,0], E:[1,1], F:[1,2],
  G:[2,0], H:[2,1], I:[2,2],
  J:[3,0], K:[3,1], L:[3,2],
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlacedFlag {
  id: string;
  src: string;
  name: string;
  xPct: number;   // left as % of image width
  yPct: number;   // top as % of image height
  wPct: number;   // width as % of image width
  hPct: number;   // height as % of image height
}

// ─── Build initial pre-placed flags ──────────────────────────────────────────
let _id = 1;
function buildInitialFlags(): PlacedFlag[] {
  const flags: PlacedFlag[] = [];
  for (const [letter, [row, col]] of Object.entries(GROUP_GRID)) {
    const teams = GROUPS[letter];
    const bx = COL_LEFT[col];
    const by = ROW_TOP[row];
    teams.forEach((file, i) => {
      const slotCol = i % 2;       // 0=left, 1=right
      const slotRow = Math.floor(i / 2); // 0=top, 1=bottom
      const px = bx + SLOT_DX[slotCol];
      const py = by + SLOT_DY[slotRow];
      flags.push({
        id: String(_id++),
        src: `${BASE}flags/${encodeURIComponent(file)}`,
        name: file.replace(".png", ""),
        xPct: xp(px),
        yPct: yp(py),
        wPct: xp(FLAG_W_PX),
        hPct: yp(FLAG_H_PX),
      });
    });
  }
  return flags;
}

const INITIAL_FLAGS = buildInitialFlags();

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState<PlacedFlag[]>(INITIAL_FLAGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Convert px delta to percentage delta relative to canvas
  const toPct = useCallback((dxPx: number, dyPx: number) => {
    const el = canvasRef.current;
    if (!el) return { dx: 0, dy: 0 };
    return {
      dx: dxPx / el.clientWidth * 100,
      dy: dyPx / el.clientHeight * 100,
    };
  }, []);

  // ── Move ──────────────────────────────────────────────────────────────────
  const startMove = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const flag = flags.find(f => f.id === id);
    if (!flag) return;
    let lastX = e.clientX;
    let lastY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const { dx, dy } = (() => {
        const el = canvasRef.current;
        if (!el) return { dx: 0, dy: 0 };
        return {
          dx: (ev.clientX - lastX) / el.clientWidth * 100,
          dy: (ev.clientY - lastY) / el.clientHeight * 100,
        };
      })();
      lastX = ev.clientX;
      lastY = ev.clientY;
      setFlags(prev => prev.map(f =>
        f.id === id ? { ...f, xPct: f.xPct + dx, yPct: f.yPct + dy } : f
      ));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [flags]);

  // ── Resize ───────────────────────────────────────────────────────────────
  const startResize = useCallback((e: React.PointerEvent, id: string, corner: "se"|"sw"|"ne"|"nw") => {
    e.stopPropagation(); e.preventDefault();
    const flag = flags.find(f => f.id === id);
    if (!flag) return;
    const startX = e.clientX, startY = e.clientY;
    const { xPct: ox, yPct: oy, wPct: ow, hPct: oh } = flag;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const el = canvasRef.current; if (!el) return;
      const dx = (ev.clientX - startX) / el.clientWidth * 100;
      const dy = (ev.clientY - startY) / el.clientHeight * 100;
      setFlags(prev => prev.map(f => {
        if (f.id !== id) return f;
        let nx = ox, ny = oy, nw = ow, nh = oh;
        if      (corner === "se") { nw = Math.max(2, ow + dx); nh = Math.max(2, oh + dy); }
        else if (corner === "sw") { nw = Math.max(2, ow - dx); nh = Math.max(2, oh + dy); nx = ox + ow - nw; }
        else if (corner === "ne") { nw = Math.max(2, ow + dx); nh = Math.max(2, oh - dy); ny = oy + oh - nh; }
        else if (corner === "nw") { nw = Math.max(2, ow - dx); nh = Math.max(2, oh - dy); nx = ox + ow - nw; ny = oy + oh - nh; }
        return { ...f, xPct: nx, yPct: ny, wPct: nw, hPct: nh };
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [flags]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteFlag = useCallback((id: string) => {
    setFlags(prev => prev.filter(f => f.id !== id));
    setSelectedId(sel => sel === id ? null : sel);
  }, []);

  // ── Keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedId && (e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        deleteFlag(selectedId);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteFlag]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 120));
    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true, allowTaint: true, scale: 2,
        backgroundColor: null, logging: false,
      });
      const link = document.createElement("a");
      link.download = "world-cup-bracket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = () => { setFlags(INITIAL_FLAGS); setSelectedId(null); };

  return (
    <div className="app-shell">

      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">⚽ WC Flag Placer</span>
        <div className="toolbar-actions">
          <button className="btn btn-reset" onClick={handleReset}>Reset</button>
          <button className="btn btn-export" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className="bracket-canvas"
          onClick={e => { if (!(e.target as HTMLElement).closest(".placed-flag")) setSelectedId(null); }}
        >
          <img
            src={`${BASE}background.jpg`}
            alt="World Cup Bracket"
            className="bg-image"
            draggable={false}
          />

          {flags.map(flag => (
            <div
              key={flag.id}
              className={`placed-flag${flag.id === selectedId ? " selected" : ""}`}
              style={{
                left:   `${flag.xPct}%`,
                top:    `${flag.yPct}%`,
                width:  `${flag.wPct}%`,
                height: `${flag.hPct}%`,
              }}
              onPointerDown={e => startMove(e, flag.id)}
              onClick={e => { e.stopPropagation(); setSelectedId(flag.id); }}
            >
              <img
                src={flag.src}
                alt={flag.name}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {flag.id === selectedId && (
                <>
                  <button
                    className="flag-delete"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); deleteFlag(flag.id); }}
                  >×</button>
                  {(["nw","ne","sw","se"] as const).map(c => (
                    <div key={c} className={`resize-handle resize-${c}`}
                      onPointerDown={e => startResize(e, flag.id, c)} />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
