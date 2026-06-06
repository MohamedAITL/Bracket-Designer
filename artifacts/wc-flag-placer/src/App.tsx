import { useRef, useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";

const BASE = import.meta.env.BASE_URL;

const FLAG_FILES = [
  "Algeria.png", "Argentina.png", "Australia.png", "Austria.png",
  "Belgium.png", "Bosnia.png", "Brazil.png", "Canada.png",
  "Cape Verde.png", "Colombia.png", "Croatia.png", "Curacao.png",
  "Czech Repuplic.png", "DRK.png", "Ecuador.png", "Egypt.png",
  "England.png", "France.png", "Germany.png", "Ghana.png",
  "Haiti.png", "Iran.png", "Iraq.png", "Ivory Coast.png",
  "Japan.png", "Jordan.png", "Mexico.png", "Morocco.png",
  "Netherlands.png", "New Zealand.png", "Norway.png", "Panama.png",
  "Paraguay.png", "Portugal.png", "Qatar.png", "Saudi Arabia.png",
  "Scotland.png", "Senegal.png", "South Africa.png", "South Korea.png",
  "Spain.png", "Sweden.png", "Switzerland.png", "Tunisia.png",
  "Turkey.png", "Uruguay.png", "USA.png", "Uzbekistan.png",
];

function flagUrl(name: string) {
  return `${BASE}flags/${encodeURIComponent(name)}`;
}

interface PlacedFlag {
  id: string;
  src: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

let nextId = 1;

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [flags, setFlags] = useState<PlacedFlag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dragSrc = useRef<string | null>(null);
  const dragName = useRef<string | null>(null);

  const filteredFlags = FLAG_FILES.filter((f) =>
    f.toLowerCase().replace(".png", "").includes(search.toLowerCase())
  );

  /* ── close panel on outside click ── */
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest(".btn-flags")
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  /* ── place flag at canvas center on click ── */
  const addFlagAtCenter = useCallback((name: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = rect.width / 2 - 40 + (Math.random() - 0.5) * 80;
    const y = rect.height / 2 - 30 + (Math.random() - 0.5) * 80;
    const id = String(nextId++);
    setFlags((prev) => [
      ...prev,
      { id, src: flagUrl(name), name: name.replace(".png", ""), x, y, width: 80, height: 60 },
    ]);
    setSelectedId(id);
  }, []);

  /* ── drag from panel ── */
  const handleDragStart = (name: string) => {
    dragSrc.current = flagUrl(name);
    dragName.current = name;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragSrc.current || !dragName.current) return;
    const src = dragSrc.current;
    const name = dragName.current;
    dragSrc.current = null;
    dragName.current = null;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 30;
    const id = String(nextId++);
    setFlags((prev) => [
      ...prev,
      { id, src, name: name.replace(".png", ""), x, y, width: 80, height: 60 },
    ]);
    setSelectedId(id);
  }, []);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  /* ── move placed flag ── */
  const startMove = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const flag = flags.find((f) => f.id === id);
    if (!flag) return;
    const startX = e.clientX - flag.x;
    const startY = e.clientY - flag.y;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      setFlags((prev) =>
        prev.map((f) => f.id === id ? { ...f, x: ev.clientX - startX, y: ev.clientY - startY } : f)
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [flags]);

  /* ── resize placed flag ── */
  const startResize = useCallback((e: React.PointerEvent, id: string, corner: "se" | "sw" | "ne" | "nw") => {
    e.stopPropagation();
    e.preventDefault();
    const flag = flags.find((f) => f.id === id);
    if (!flag) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const { width: origW, height: origH, x: origX, y: origY } = flag;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setFlags((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          let newW = origW, newH = origH, newX = origX, newY = origY;
          if (corner === "se") { newW = Math.max(30, origW + dx); newH = Math.max(20, origH + dy); }
          else if (corner === "sw") { newW = Math.max(30, origW - dx); newH = Math.max(20, origH + dy); newX = origX + origW - newW; }
          else if (corner === "ne") { newW = Math.max(30, origW + dx); newH = Math.max(20, origH - dy); newY = origY + origH - newH; }
          else if (corner === "nw") { newW = Math.max(30, origW - dx); newH = Math.max(20, origH - dy); newX = origX + origW - newW; newY = origY + origH - newH; }
          return { ...f, x: newX, y: newY, width: newW, height: newH };
        })
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [flags]);

  const deleteFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !(e.target instanceof HTMLInputElement)) {
        deleteFlag(selectedId);
      }
      if (e.key === "Escape") { setSelectedId(null); setPanelOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteFlag]);

  /* ── export ── */
  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    setSelectedId(null);
    setPanelOpen(false);
    await new Promise((r) => setTimeout(r, 120));
    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true, allowTaint: true, scale: 2, backgroundColor: null, logging: false,
      });
      const link = document.createElement("a");
      link.download = "world-cup-bracket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app-shell">

      {/* ── Toolbar ── */}
      <div className="toolbar">
        <span className="toolbar-title">⚽ WC Flag Placer</span>

        <div className="toolbar-actions">
          <button
            className={`btn btn-flags${panelOpen ? " active" : ""}`}
            onClick={() => setPanelOpen((v) => !v)}
          >
            🏳 Flags {panelOpen ? "▲" : "▼"}
          </button>
          <button className="btn btn-reset" onClick={() => { setFlags([]); setSelectedId(null); }}>
            Reset
          </button>
          <button className="btn btn-export" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </div>

      {/* ── Floating flag panel ── */}
      {panelOpen && (
        <div className="flag-panel" ref={panelRef}>
          <div className="panel-header">
            <input
              type="search"
              className="panel-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <button className="panel-close" onClick={() => setPanelOpen(false)}>×</button>
          </div>
          <div className="panel-grid">
            {filteredFlags.map((name) => (
              <div
                key={name}
                className="flag-thumb"
                draggable
                onDragStart={() => { handleDragStart(name); setPanelOpen(false); }}
                onClick={() => { addFlagAtCenter(name); }}
                title={`${name.replace(".png", "")} — click to add or drag onto bracket`}
              >
                <img src={flagUrl(name)} alt={name.replace(".png", "")} draggable={false} />
                <span className="flag-label">{name.replace(".png", "")}</span>
              </div>
            ))}
            {filteredFlags.length === 0 && (
              <p className="no-results">No flags match "{search}"</p>
            )}
          </div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className="bracket-canvas"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={(e) => { if (!(e.target as HTMLElement).closest(".placed-flag")) setSelectedId(null); }}
        >
          <img src={`${BASE}background.jpg`} alt="World Cup Bracket" className="bg-image" draggable={false} />

          {flags.map((flag) => (
            <div
              key={flag.id}
              className={`placed-flag${flag.id === selectedId ? " selected" : ""}`}
              style={{ left: flag.x, top: flag.y, width: flag.width, height: flag.height }}
              onPointerDown={(e) => startMove(e, flag.id)}
              onClick={(e) => { e.stopPropagation(); setSelectedId(flag.id); }}
            >
              <img src={flag.src} alt={flag.name} draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />

              {flag.id === selectedId && (
                <>
                  <button
                    className="flag-delete"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); deleteFlag(flag.id); }}
                  >×</button>
                  {(["nw", "ne", "sw", "se"] as const).map((c) => (
                    <div key={c} className={`resize-handle resize-${c}`} onPointerDown={(e) => startResize(e, flag.id, c)} />
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
