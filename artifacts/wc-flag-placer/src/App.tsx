import { useRef, useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";

const BASE = import.meta.env.BASE_URL;

const FLAG_FILES = [
  "Algeria.png",
  "Argentina.png",
  "Australia.png",
  "Austria.png",
  "Belgium.png",
  "Bosnia.png",
  "Brazil.png",
  "Canada.png",
  "Cape Verde.png",
  "Colombia.png",
  "Croatia.png",
  "Curacao.png",
  "DRK.png",
  "Czech Repuplic.png",
  "Ecuador.png",
  "Egypt.png",
  "England.png",
  "France.png",
  "Germany.png",
  "Ghana.png",
  "Haiti.png",
  "Iran.png",
  "Iraq.png",
  "Ivory Coast.png",
  "Japan.png",
  "Jordan.png",
  "Mexico.png",
  "Morocco.png",
  "Netherlands.png",
  "New Zealand.png",
  "Norway.png",
  "Panama.png",
  "Paraguay.png",
  "Portugal.png",
  "Qatar.png",
  "Saudi Arabia.png",
  "Scotland.png",
  "Senegal.png",
  "South Africa.png",
  "South Korea.png",
  "Spain.png",
  "Sweden.png",
  "Switzerland.png",
  "Tunisia.png",
  "Turkey.png",
  "Uruguay.png",
  "USA.png",
  "Uzbekistan.png",
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
  const [flags, setFlags] = useState<PlacedFlag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const dragSrc = useRef<string | null>(null);
  const dragName = useRef<string | null>(null);

  const filteredFlags = FLAG_FILES.filter((f) =>
    f.toLowerCase().replace(".png", "").includes(search.toLowerCase())
  );

  const addFlagAtCenter = useCallback((name: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = rect.width / 2 - 40 + (Math.random() - 0.5) * 60;
    const y = rect.height / 2 - 30 + (Math.random() - 0.5) * 60;
    const id = String(nextId++);
    setFlags((prev) => [
      ...prev,
      { id, src: flagUrl(name), name: name.replace(".png", ""), x, y, width: 80, height: 60 },
    ]);
    setSelectedId(id);
  }, []);

  const handleDragStart = (name: string) => {
    dragSrc.current = flagUrl(name);
    dragName.current = name;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragSrc.current || !dragName.current) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left - 40;
      const y = e.clientY - rect.top - 30;
      const id = String(nextId++);
      setFlags((prev) => [
        ...prev,
        {
          id,
          src: dragSrc.current!,
          name: dragName.current!.replace(".png", ""),
          x,
          y,
          width: 80,
          height: 60,
        },
      ]);
      setSelectedId(id);
      dragSrc.current = null;
      dragName.current = null;
    },
    []
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const startMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      setSelectedId(id);
      const flag = flags.find((f) => f.id === id);
      if (!flag) return;
      const startX = e.clientX - flag.x;
      const startY = e.clientY - flag.y;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        setFlags((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, x: ev.clientX - startX, y: ev.clientY - startY }
              : f
          )
        );
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [flags]
  );

  const startResize = useCallback(
    (
      e: React.PointerEvent,
      id: string,
      corner: "se" | "sw" | "ne" | "nw"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const flag = flags.find((f) => f.id === id);
      if (!flag) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origW = flag.width;
      const origH = flag.height;
      const origX = flag.x;
      const origY = flag.y;
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        setFlags((prev) =>
          prev.map((f) => {
            if (f.id !== id) return f;
            let newW = origW;
            let newH = origH;
            let newX = origX;
            let newY = origY;

            if (corner === "se") {
              newW = Math.max(30, origW + dx);
              newH = Math.max(20, origH + dy);
            } else if (corner === "sw") {
              newW = Math.max(30, origW - dx);
              newH = Math.max(20, origH + dy);
              newX = origX + origW - newW;
            } else if (corner === "ne") {
              newW = Math.max(30, origW + dx);
              newH = Math.max(20, origH - dy);
              newY = origY + origH - newH;
            } else if (corner === "nw") {
              newW = Math.max(30, origW - dx);
              newH = Math.max(20, origH - dy);
              newX = origX + origW - newW;
              newY = origY + origH - newH;
            }

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
    },
    [flags]
  );

  const deleteFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((sel) => (sel === id ? null : sel));
  }, []);

  const handleReset = () => {
    setFlags([]);
    setSelectedId(null);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;
    setExporting(true);
    setSelectedId(null);

    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = "world-cup-bracket.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !(e.target instanceof HTMLInputElement)
      ) {
        deleteFlag(selectedId);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, deleteFlag]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === "IMG" && !(e.target as HTMLElement).closest(".placed-flag")) {
      setSelectedId(null);
    }
  };

  return (
    <div className="app-shell">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-brand">
          <span className="toolbar-title">⚽ WC Flag Placer</span>
        </div>

        <div className="search-wrap">
          <input
            type="search"
            className="flag-search"
            placeholder="Search flags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button className="btn btn-reset" onClick={handleReset}>
            Reset
          </button>
          <button
            className="btn btn-export"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export PNG"}
          </button>
        </div>
      </div>

      {/* Flag picker */}
      <div className="flag-picker">
        {filteredFlags.map((name) => (
          <div
            key={name}
            className="flag-thumb"
            draggable
            onDragStart={() => handleDragStart(name)}
            onClick={() => addFlagAtCenter(name)}
            title={`${name.replace(".png", "")} — click to add, drag to place`}
          >
            <img
              src={flagUrl(name)}
              alt={name.replace(".png", "")}
              draggable={false}
            />
            <span className="flag-label">{name.replace(".png", "")}</span>
          </div>
        ))}
        {filteredFlags.length === 0 && (
          <span className="no-results">No flags match "{search}"</span>
        )}
      </div>

      {/* Canvas */}
      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className="bracket-canvas"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleCanvasClick}
        >
          <img
            src={`${BASE}background.jpg`}
            alt="World Cup Bracket"
            className="bg-image"
            draggable={false}
          />

          {flags.map((flag) => (
            <div
              key={flag.id}
              className={`placed-flag${flag.id === selectedId ? " selected" : ""}`}
              style={{
                left: flag.x,
                top: flag.y,
                width: flag.width,
                height: flag.height,
              }}
              onPointerDown={(e) => startMove(e, flag.id)}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(flag.id);
              }}
            >
              <img
                src={flag.src}
                alt={flag.name}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />

              {flag.id === selectedId && (
                <>
                  {/* Delete button */}
                  <button
                    className="flag-delete"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFlag(flag.id);
                    }}
                    title="Delete (Del)"
                  >
                    ×
                  </button>

                  {/* Resize handles */}
                  {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                    <div
                      key={corner}
                      className={`resize-handle resize-${corner}`}
                      onPointerDown={(e) => startResize(e, flag.id, corner)}
                    />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {flags.length === 0 && (
        <div className="empty-hint">
          Drag a flag from the strip above onto the bracket
        </div>
      )}
    </div>
  );
}
