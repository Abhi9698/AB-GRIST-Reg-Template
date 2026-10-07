import type { SampleRecord } from "./samples";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Listener = (rows: SampleRecord[]) => void;

export interface Bridge {
  mode: "grist" | "demo";
  subscribe(l: Listener): void;
  save(rec: SampleRecord): Promise<void>;
  remove(id: number): Promise<void>;
  /** Returns the value to store in the Photograph column. */
  uploadPhoto(dataUrl: string, name: string): Promise<unknown>;
}

const LS = "grist-sample-demo";

function demoBridge(): Bridge {
  let rows: SampleRecord[] = JSON.parse(localStorage.getItem(LS) || "null") ?? seed();
  const ls: Listener[] = [];
  const emit = () => {
    localStorage.setItem(LS, JSON.stringify(rows));
    ls.forEach((l) => l([...rows]));
  };
  return {
    mode: "demo",
    subscribe(l) {
      ls.push(l);
      l([...rows]);
    },
    async save(rec) {
      if (rec.id) rows = rows.map((r) => (r.id === rec.id ? { ...r, ...rec } : r));
      else rows.push({ ...rec, id: Math.max(0, ...rows.map((r) => r.id ?? 0)) + 1 });
      emit();
    },
    async remove(id) {
      rows = rows.filter((r) => r.id !== id);
      emit();
    },
    async uploadPhoto(dataUrl) {
      return dataUrl;
    },
  };
}

function seed(): SampleRecord[] {
  const sp = ["Pan troglodytes", "Gorilla gorilla", "Pongo abelii", "Macaca mulatta"];
  const out: SampleRecord[] = [];
  let n = 1;
  for (const r of ["A", "B", "C", "D"])
    for (let c = 1; c <= 9; c++) {
      if (c === 5 || Math.random() < 0.25) continue;
      out.push({
        id: n,
        BoxID: "BOX-001",
        BoxPosition: `${r}${c}`,
        SampleNumber: `S-${String(n).padStart(4, "0")}`,
        Species: sp[n % sp.length],
        SampleType: "Feces",
        StatusSample: "Stored",
        matUUID: crypto.randomUUID(),
      });
      n++;
    }
  return out;
}

function loadScript(src: string) {
  return new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => res();
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function gristBridge(): Promise<Bridge> {
  await loadScript("https://docs.getgrist.com/grist-plugin-api.js");
  const grist = (window as any).grist;
  grist.ready({ requiredAccess: "full" });
  const ls: Listener[] = [];
  let last: SampleRecord[] = [];
  grist.onRecords((recs: SampleRecord[]) => {
    last = recs;
    ls.forEach((l) => l(recs));
  });
  const tableId = async () => (await grist.getTable()).getTableId?.() ?? (await grist.selectedTable.getTableId());
  return {
    mode: "grist",
    subscribe(l) {
      ls.push(l);
      l(last);
    },
    async save(rec) {
      const t = await tableId();
      const { id, ...fields } = rec;
      fields.LastModifiedOnBy = Date.now() / 1000;
      if (id) await grist.docApi.applyUserActions([["UpdateRecord", t, id, fields]]);
      else await grist.docApi.applyUserActions([["AddRecord", t, null, fields]]);
    },
    async remove(id) {
      await grist.docApi.applyUserActions([["RemoveRecord", await tableId(), id]]);
    },
    async uploadPhoto(dataUrl, name) {
      const tok = await grist.docApi.getAccessToken({ readOnly: false });
      const blob = await (await fetch(dataUrl)).blob();
      const fd = new FormData();
      fd.append("upload", blob, name);
      const r = await fetch(`${tok.baseUrl}/attachments?auth=${tok.token}`, { method: "POST", body: fd });
      if (!r.ok) throw new Error("Attachment upload failed");
      const ids: number[] = await r.json();
      return ["L", ...ids];
    },
  };
}

export async function createBridge(): Promise<Bridge> {
  const inIframe = window.self !== window.top;
  if (inIframe) {
    try {
      return await gristBridge();
    } catch {
      /* fall through */
    }
  }
  return demoBridge();
}
