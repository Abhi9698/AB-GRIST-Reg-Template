import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { COLS, ROWS, isMiddle, speciesHue, type SampleRecord } from "@/lib/samples";
import { createBridge, type Bridge } from "@/lib/grist-bridge";
import { SampleModal } from "@/components/SampleModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sample Box Registrar — Grist Widget" },
      { name: "description", content: "9×9 tube box visualizer and sample registration widget for Grist, with panoramic tube photography." },
      { property: "og:title", content: "Sample Box Registrar — Grist Widget" },
      { property: "og:description", content: "Register lab samples into a 9×9 box straight from Grist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Widget,
});

function Widget() {
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [rows, setRows] = useState<SampleRecord[]>([]);
  const [boxId, setBoxId] = useState("BOX-001");
  const [unlocked, setUnlocked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [label, setLabel] = useState<"SampleNumber" | "Species">("SampleNumber");

  useEffect(() => {
    createBridge().then((b) => {
      setBridge(b);
      b.subscribe(setRows);
    });
  }, []);

  const boxes = useMemo(() => [...new Set(rows.map((r) => String(r.BoxID ?? "")).filter(Boolean))].sort(), [rows]);
  const inBox = useMemo(() => {
    const m = new Map<string, SampleRecord>();
    rows.filter((r) => r.BoxID === boxId).forEach((r) => m.set(String(r.BoxPosition), r));
    return m;
  }, [rows, boxId]);
  const sel = selected ? inBox.get(selected) : undefined;

  const click = (pos: string) => {
    if (!unlocked && isMiddle(pos)) return;
    setSelected(pos);
    setModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[minmax(260px,1fr)_minmax(0,1.6fr)] md:p-6">
        <aside className="space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Grist · Samples</p>
            <h1 className="text-2xl font-semibold">Box Registrar</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {bridge?.mode === "grist" ? "Connected to Grist" : "Demo mode — data saved in this browser"} ·{" "}
              <Link to="/setup" className="underline">Setup guide</Link>
            </p>
          </div>

          <div className="panel space-y-3 p-4">
            <label className="block">
              <span className="field-label">Box ID</span>
              <input className="field font-mono" list="boxes" value={boxId} onChange={(e) => { setBoxId(e.target.value); setSelected(null); }} />
              <datalist id="boxes">{boxes.map((b) => <option key={b} value={b} />)}</datalist>
            </label>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="field-label">Occupancy</span>
                <span className="font-mono text-sm">{inBox.size}/81 filled</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${(inBox.size / 81) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="panel p-4">
            <span className="field-label">Selected slot</span>
            {selected ? (
              <div className="mt-1 space-y-1 text-sm">
                <p className="font-mono text-2xl text-primary">{selected}</p>
                {sel ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {["SampleNumber", "Species", "SampleType", "StatusSample", "IndividualName", "matUUID"].map((k) => (
                      <Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="truncate font-mono">{String(sel[k] ?? "—")}</dd></Fragment>
                    ))}
                  </dl>
                ) : <p className="text-muted-foreground">Empty socket</p>}
                <button className="btn-primary mt-2" onClick={() => setModal(true)}>{sel ? "Edit sample" : "Register sample"}</button>
              </div>
            ) : <p className="mt-1 text-sm text-muted-foreground">Click a position in the box.</p>}
          </div>
        </aside>

        <main className="panel p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setUnlocked(!unlocked)} className={unlocked ? "chip chip-warn" : "chip chip-on"}>
              {unlocked ? "🔓 Middle row/col unlocked" : "🔒 Unlock middle row"}
            </button>
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">Label:</span>
            {(["SampleNumber", "Species"] as const).map((l) => (
              <button key={l} onClick={() => setLabel(l)} className={label === l ? "chip chip-on" : "chip"}>{l}</button>
            ))}
          </div>
          <div className="box-frame">
            <div className="grid grid-cols-[1.5rem_repeat(9,minmax(0,1fr))] gap-1.5 sm:gap-2">
              <div />
              {COLS.map((c) => <div key={c} className="text-center font-mono text-xs text-muted-foreground">{c}</div>)}
              {ROWS.map((r) => (
                <Fragment key={r}>
                  <div className="flex items-center font-mono text-xs text-muted-foreground">{r}</div>
                  {COLS.map((c) => {
                    const pos = `${r}${c}`;
                    const rec = inBox.get(pos);
                    const locked = !unlocked && isMiddle(pos);
                    const txt = rec ? String(rec[label] ?? "") : "";
                    return (
                      <button
                        key={pos}
                        title={pos}
                        onClick={() => click(pos)}
                        disabled={locked}
                        data-state={locked ? "locked" : rec ? "filled" : "empty"}
                        data-selected={selected === pos}
                        className="tube"
                        style={rec ? ({ "--h": speciesHue(String(rec.Species ?? "")) } as React.CSSProperties) : undefined}
                      >
                        {locked ? <span aria-label="locked">🔒</span> : rec ? <span className="tube-label">{label === "Species" ? txt.split(" ").map((w) => w[0]).join("") : txt.replace(/^\D+/, "")}</span> : <span className="tube-pos">{pos}</span>}
                      </button>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </main>
      </div>
      {modal && selected && bridge && (
        <SampleModal key={boxId + selected} boxId={boxId} pos={selected} record={sel} bridge={bridge} onClose={() => setModal(false)} />
      )}
    </div>
  );
}
