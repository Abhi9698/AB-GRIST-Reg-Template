import { useState } from "react";
import { SECTIONS, ALL_FIELDS, fromGrist, toGrist, type SampleRecord } from "@/lib/samples";
import type { Bridge } from "@/lib/grist-bridge";
import { TubeCamera } from "./TubeCamera";

export function SampleModal({ boxId, pos, record, bridge, onClose }: { boxId: string; pos: string; record?: SampleRecord; bridge: Bridge; onClose: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_FIELDS.map((f) => [f.id, fromGrist(f.type, record?.[f.id])])),
  );
  const [open, setOpen] = useState<number>(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cam, setCam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const existingPhoto = typeof record?.Photograph === "string" ? (record.Photograph as string) : null;

  const set = (k: string, v: string) => setVals((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      const rec: SampleRecord = { BoxID: boxId, BoxPosition: pos };
      if (record?.id) rec.id = record.id;
      for (const f of ALL_FIELDS) rec[f.id] = toGrist(f.type, vals[f.id]);
      if (!rec.matUUID) rec.matUUID = crypto.randomUUID();
      if (photo) rec.Photograph = await bridge.uploadPhoto(photo, `${boxId}_${pos}.jpg`);
      await bridge.save(rec);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!record?.id || !confirm(`Remove sample from ${pos}?`)) return;
    await bridge.remove(record.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="panel flex max-h-[92vh] w-full max-w-2xl flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{boxId}</p>
            <h2 className="text-xl font-semibold">Slot <span className="font-mono text-primary">{pos}</span> {record ? "· edit" : "· register"}</h2>
          </div>
          <button className="btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {[...SECTIONS.map((s) => s.title), "Tube Photograph"].map((title, i) => (
            <section key={title} className="rounded-lg border border-border">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                <span><span className="mr-2 font-mono text-muted-foreground">{i + 1}</span>{title}</span>
                <span className="text-muted-foreground">{open === i ? "−" : "+"}</span>
              </button>
              {open === i && i < SECTIONS.length && (
                <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-2">
                  {SECTIONS[i].fields.map((f) => (
                    <label key={f.id} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                      <span className="field-label">{f.label}</span>
                      {f.type === "choice" ? (
                        <select className="field" value={vals[f.id]} onChange={(e) => set(f.id, e.target.value)}>
                          <option value="">—</option>
                          {f.choices!.map((c) => <option key={c}>{c}</option>)}
                        </select>
                      ) : f.type === "textarea" ? (
                        <textarea className="field min-h-20" value={vals[f.id]} onChange={(e) => set(f.id, e.target.value)} />
                      ) : (
                        <input
                          className="field"
                          type={f.type === "datetime" ? "datetime-local" : f.type === "number" ? "number" : f.type}
                          step="any"
                          value={vals[f.id]}
                          onChange={(e) => set(f.id, e.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
              {open === i && i === SECTIONS.length && (
                <div className="space-y-3 border-t border-border p-4">
                  {(photo || existingPhoto) && !cam && <img src={photo ?? existingPhoto!} alt="Tube" className="max-h-48 rounded border border-border" />}
                  {cam ? (
                    <TubeCamera onClose={() => setCam(false)} onSave={(d) => { setPhoto(d); setCam(false); }} />
                  ) : (
                    <button type="button" className="btn-primary" onClick={() => setCam(true)}>📷 Capture tube photo</button>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          {err && <span className="text-sm text-destructive">{err}</span>}
          {record?.id && <button className="btn-danger" onClick={remove}>Remove</button>}
          <div className="flex-1" />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save sample"}</button>
        </footer>
      </div>
    </div>
  );
}
