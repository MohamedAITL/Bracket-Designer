import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";

const BASE = import.meta.env.BASE_URL;

// ─── Image natural dimensions ─────────────────────────────────────────────────
const IMG_W = 1280;
const IMG_H = 720;

// ─── Group box layout (px in 1280×720 space) ──────────────────────────────────
// 3 columns × 4 rows on the right side of the image
const COL_LEFT = [740, 918, 1093]; // left edge of each column
const ROW_TOP  = [103, 232, 360, 488]; // top edge of each row

// Flag size in image pixels (small enough to fit inside the slot cards)
const FLAG_W = 32;
const FLAG_H = 18;

// 2×2 slot grid within each group box (offsets from box left/top)
const SLOT_DX = [8, 72];   // flag left edge at box_left + dx
const SLOT_DY = [28, 60];  // flag top  edge at box_top  + dy

// Convert image px → CSS % of image dimensions
const xp = (px: number) => (px / IMG_W) * 100;
const yp = (py: number) => (py / IMG_H) * 100;

// ─── Group assignments ────────────────────────────────────────────────────────
const GROUPS: Record<string, string[]> = {
  A: ["South Korea.png",  "Czech Repuplic.png", "South Africa.png",  "Mexico.png"],
  B: ["Bosnia.png",       "Switzerland.png",    "Canada.png",        "Qatar.png"],
  C: ["Scotland.png",     "Brazil.png",         "Haiti.png",         "Morocco.png"],
  D: ["USA.png",          "Turkey.png",         "Australia.png",     "Paraguay.png"],
  E: ["Curacao.png",      "Ecuador.png",        "Germany.png",       "Ivory Coast.png"],
  F: ["Tunisia.png",      "Sweden.png",         "Netherlands.png",   "Japan.png"],
  G: ["Iran.png",         "Belgium.png",        "New Zealand.png",   "Egypt.png"],
  H: ["Saudi Arabia.png", "Cape Verde.png",     "Spain.png",         "Uruguay.png"],
  I: ["Senegal.png",      "France.png",         "Iraq.png",          "Norway.png"],
  J: ["Argentina.png",    "Algeria.png",        "Austria.png",       "Jordan.png"],
  K: ["Colombia.png",     "DRK.png",            "Portugal.png",      "Uzbekistan.png"],
  L: ["Ghana.png",        "England.png",        "Panama.png",        "Croatia.png"],
};

const GROUP_GRID: Record<string, [number, number]> = {
  A:[0,0], B:[0,1], C:[0,2],
  D:[1,0], E:[1,1], F:[1,2],
  G:[2,0], H:[2,1], I:[2,2],
  J:[3,0], K:[3,1], L:[3,2],
};

function getGroupOffset(letter: string): [number, number] {
  let offsetX = 0;
  let offsetY = 0;

  if (/[ADGJ]/.test(letter)) {
    offsetX = 50;
    offsetY = 20;
  } else if (/[BEHK]/.test(letter)) {
    offsetX = 0;
    offsetY = 20;
  } else if (/[CFIL]/.test(letter)) {
    offsetX = -50;
    offsetY = 20;
  }

  if (/[ABC]/.test(letter)) {
    offsetY -= 10;
  }
  if (letter === "A") {
    offsetX -= 10;
  }
  if (/[CFL]/.test(letter)) {
    offsetX += 10;
  }
  if (letter === "C") {
    offsetX += 10;
  }
  if (letter === "F") {
    offsetX += 10;
  }
  if (letter === "I") {
    offsetX += 20;
  }
  if (letter === "L") {
    offsetX += 10;
  }
  if (/[DGJ]/.test(letter)) {
    offsetX -= 10;
  }
  if (letter === "E") {
    offsetX += 5;
  }
  if (/[JKL]/.test(letter)) {
    offsetY += 10;
  }

  return [offsetX, offsetY];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlacedFlag {
  id: string;
  src: string;
  name: string;
  xPct: number;   // left as % of image width
  yPct: number;   // top  as % of image height
  wPct: number;   // width  as % of image width
  hPct: number;   // height as % of image height
}

let _uid = 1;
function buildInitialFlags(): PlacedFlag[] {
  const out: PlacedFlag[] = [];
  for (const [letter, [row, col]] of Object.entries(GROUP_GRID)) {
    GROUPS[letter].forEach((file, i) => {
      const [offsetX, offsetY] = getGroupOffset(letter);
      const bx = COL_LEFT[col] + offsetX;
      const by = ROW_TOP[row] + offsetY;
      const sc = i % 2;            // slot column 0/1
      const sr = Math.floor(i / 2); // slot row    0/1
      out.push({
        id: String(_uid++),
        src: `${BASE}flags/${encodeURIComponent(file)}`,
        name: file.replace(".png", ""),
        xPct: xp(bx + SLOT_DX[sc]),
        yPct: yp(by + SLOT_DY[sr]),
        wPct: xp(FLAG_W),
        hPct: yp(FLAG_H),
      });
    });
  }
  return out;
}

const INITIAL_FLAGS = buildInitialFlags();

// ─── Drag/resize state stored in refs (never stale) ──────────────────────────
interface DragState {
  type: "move" | "resize";
  id: string;
  startCX: number;
  startCY: number;
  origXPct: number;
  origYPct: number;
  origWPct: number;
  origHPct: number;
  corner?: "nw" | "ne" | "sw" | "se";
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef  = useRef<HTMLDivElement>(null);
  const dragRef    = useRef<DragState | null>(null);
  const [flags, setFlags]       = useState<PlacedFlag[]>(INITIAL_FLAGS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting]   = useState(false);

  // ── Global pointer handlers (registered once) ─────────────────────────────
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const ds = dragRef.current;
      const canvas = canvasRef.current;
      if (!ds || !canvas) return;

      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const ddx = (ev.clientX - ds.startCX) / cw * 100;
      const ddy = (ev.clientY - ds.startCY) / ch * 100;

      if (ds.type === "move") {
        setFlags(prev => prev.map(f =>
          f.id === ds.id
            ? { ...f, xPct: ds.origXPct + ddx, yPct: ds.origYPct + ddy }
            : f
        ));
      } else {
        // resize
        setFlags(prev => prev.map(f => {
          if (f.id !== ds.id) return f;
          let nx = ds.origXPct, ny = ds.origYPct;
          let nw = ds.origWPct, nh = ds.origHPct;
          const min = 0.5;
          if (ds.corner === "se") {
            nw = Math.max(min, ds.origWPct + ddx);
            nh = Math.max(min, ds.origHPct + ddy);
          } else if (ds.corner === "sw") {
            nw = Math.max(min, ds.origWPct - ddx); nx = ds.origXPct + ds.origWPct - nw;
            nh = Math.max(min, ds.origHPct + ddy);
          } else if (ds.corner === "ne") {
            nw = Math.max(min, ds.origWPct + ddx);
            nh = Math.max(min, ds.origHPct - ddy); ny = ds.origYPct + ds.origHPct - nh;
          } else if (ds.corner === "nw") {
            nw = Math.max(min, ds.origWPct - ddx); nx = ds.origXPct + ds.origWPct - nw;
            nh = Math.max(min, ds.origHPct - ddy); ny = ds.origYPct + ds.origHPct - nh;
          }
          return { ...f, xPct: nx, yPct: ny, wPct: nw, hPct: nh };
        }));
      }
    };

    const onUp = () => { dragRef.current = null; };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // ── Start move ───────────────────────────────────────────────────────────
  const startMove = (e: React.PointerEvent, flag: PlacedFlag) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedId(flag.id);
    dragRef.current = {
      type: "move", id: flag.id,
      startCX: e.clientX, startCY: e.clientY,
      origXPct: flag.xPct, origYPct: flag.yPct,
      origWPct: flag.wPct, origHPct: flag.hPct,
    };
  };

  // ── Start resize ─────────────────────────────────────────────────────────
  const startResize = (e: React.PointerEvent, flag: PlacedFlag, corner: DragState["corner"]) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      type: "resize", id: flag.id, corner,
      startCX: e.clientX, startCY: e.clientY,
      origXPct: flag.xPct, origYPct: flag.yPct,
      origWPct: flag.wPct, origHPct: flag.hPct,
    };
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteFlag = (id: string) => {
    setFlags(prev => prev.filter(f => f.id !== id));
    setSelectedId(sel => sel === id ? null : sel);
  };

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
  }, [selectedId]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    setSelectedId(null);
    await new Promise(r => setTimeout(r, 120));
    try {
      const c = await html2canvas(canvasRef.current, {
        useCORS: true, allowTaint: true, scale: 2, backgroundColor: null, logging: false,
      });
      const a = document.createElement("a");
      a.download = "world-cup-bracket.png";
      a.href = c.toDataURL("image/png");
      a.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="toolbar">
        <span className="toolbar-logo">⚽ WC Flag Placer</span>
        <div className="toolbar-actions">
          <button className="btn btn-reset" onClick={() => { setFlags(INITIAL_FLAGS); setSelectedId(null); }}>
            Reset
          </button>
          <button className="btn btn-export" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </div>

      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className="bracket-canvas"
          onClick={e => { if (!(e.target as HTMLElement).closest(".placed-flag")) setSelectedId(null); }}
        >
          <img src={`${BASE}background.jpg`} alt="World Cup Bracket" className="bg-image" draggable={false} />

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
              onPointerDown={e => startMove(e, flag)}
              onClick={e => { e.stopPropagation(); setSelectedId(flag.id); }}
            >
              <img src={flag.src} alt={flag.name} draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />

              {flag.id === selectedId && (
                <>
                  <button className="flag-delete"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); deleteFlag(flag.id); }}>
                    ×
                  </button>
                  {(["nw","ne","sw","se"] as const).map(c => (
                    <div key={c} className={`resize-handle resize-${c}`}
                      onPointerDown={e => startResize(e, flag, c)} />
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
