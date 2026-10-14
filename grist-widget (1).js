// Paste into the JavaScript tab of Grist's Custom Widget builder
const ROWS = "ABCDEFGHI".split(""), COLS = [1,2,3,4,5,6,7,8,9];
const SECTIONS = [
  ["Primary Identifiers", [["matUUID","text"],["HIOHID","text"],["SampleNumber","text"],["IndividualName","text"],["IndividualCode","text"],["Label","text"]]],
  ["Taxonomy & Specimen", [["Species","text"],["CommonName","text"],["Sex","choice",["Female","Male","Unknown"]],["Age","text"]]],
  ["Collection Details", [["CollectionDate","date"],["CollectionTime","time"],["CollectionDay","text"],["CollectionMonth","text"],["CollectionYear","text"],["CollectionDateAdaptation","text"],["Collector","text"],["SamplingMethod","text"],["Project","text"],["Country","text"],["Region","text"],["Site","text"],["Group","text"],["Nest","text"],["GPSLat","number"],["GPSLong","number"],["FieldNotes","textarea"]]],
  ["Physical Properties & Storage", [["SampleType","choice",["Blood","Feces","Tissue","Hair","Feather","Swab","Urine","Saliva","Other"]],["SampleConsistency","text"],["SampleVolume","number"],["SampleVolumeUnit","choice",["µl","ml","mg","g"]],["StorageMedium","text"],["TubeFormat","choice",["0.5 ml","1.5 ml","2.0 ml","Cryovial","Other"]],["StorageTemperature","choice",["RT","4 °C","-20 °C","-80 °C","LN2"]],["StorageInfo","text"],["StorageInfoDate","datetime"],["StorageInfoPerson","text"],["StorageDateTime","datetime"],["StorageComment","textarea"]]],
  ["Regulatory & Status", [["StatusSample","choice",["Registered","Stored","In use","Shipped","Depleted","Destroyed"]],["StatusInformation","text"],["ResearchPermit","text"],["ImportPermit","text"],["BiosafetyClassification","choice",["BSL-1","BSL-2","BSL-3","BSL-4"]],["TransportChain","text"],["DataCurationComment","textarea"]]],
];
const FIELDS = SECTIONS.flatMap(s => s[1]);

let rows = [], boxId = "BOX-001", unlocked = false, selected = null, label = "SampleNumber";
let shots = [], stream = null, panoDataUrl = null;
const $ = id => document.getElementById(id);
const isMiddle = p => p[0] === "E" || p.slice(1) === "5";
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" })[c]);
const tableId = async () => (await grist.getTable()).getTableId?.() ?? grist.selectedTable.getTableId();

// Grist date conversions (Date/DateTime = epoch seconds)
const toG = (t, v) => v === "" ? null : t === "number" ? Number(v) : t === "date" ? Date.parse(v + "T00:00:00Z") / 1000 : t === "datetime" ? Date.parse(v) / 1000 : v;
const fromG = (t, v) => v == null ? "" : typeof v === "number" && t === "date" ? new Date(v * 1000).toISOString().slice(0, 10)
  : typeof v === "number" && t === "datetime" ? new Date(v * 1000).toISOString().slice(0, 16) : String(v);

const inBox = () => { const m = new Map(); rows.filter(r => r.BoxID === boxId).forEach(r => m.set(String(r.BoxPosition), r)); return m; };

function render() {
  const m = inBox();
  $("boxes").innerHTML = [...new Set(rows.map(r => r.BoxID).filter(Boolean))].sort().map(b => `<option value="${esc(b)}">`).join("");
  $("occ").textContent = `${m.size}/81 filled`;
  $("occBar").style.width = (m.size / 81 * 100) + "%";
  $("lockBtn").className = unlocked ? "warn" : "on";
  $("lockBtn").textContent = unlocked ? "Middle row & column unlocked — click to lock" : "Locked · Unlock middle row";
  document.querySelectorAll(".lblBtn").forEach(b => b.classList.toggle("on", b.dataset.label === label));

  let h = "<div></div>" + COLS.map(c => `<div class="hd">${c}</div>`).join("");
  for (const r of ROWS) {
    h += `<div class="hd">${r}</div>`;
    for (const c of COLS) {
      const p = r + c, rec = m.get(p), locked = !unlocked && isMiddle(p);
      let txt = p, style = "";
      if (locked) txt = "🔒";
      else if (rec) {
        const v = String(rec[label] ?? "");
        txt = label === "Species" ? v.split(" ").map(w => w[0]).join("") : v.replace(/^\D+/, "");
        style = `background:hsl(${hue(String(rec.Species ?? ""))} 55% 38%)`;
      }
      h += `<button class="tube ${locked ? "locked" : rec ? "filled" : ""} ${selected === p ? "sel" : ""}" data-pos="${p}" title="${p}" style="${style}" ${locked ? "disabled" : ""}>${esc(txt)}</button>`;
    }
  }
  $("grid").innerHTML = h;

  const sp = $("selPanel");
  if (!selected) { sp.innerHTML = `<span class="lbl">Selected slot</span><p style="color:var(--mut)">Click a position in the box.</p>`; return; }
  const rec = m.get(selected);
  sp.innerHTML = `<span class="lbl">Selected slot</span><div style="font:24px monospace;color:var(--pri)">${selected}</div>` +
    (rec ? `<dl>${["SampleNumber","Species","SampleType","StatusSample","IndividualName","matUUID"].map(k => `<dt>${k}</dt><dd>${esc(rec[k] ?? "—")}</dd>`).join("")}</dl>` : `<p style="color:var(--mut)">Empty socket</p>`) +
    `<button class="pri" id="openBtn">${rec ? "Edit sample" : "Register sample"}</button>`;
  $("openBtn").onclick = openModal;
}

function openModal() {
  const rec = inBox().get(selected) || {};
  $("mTitle").textContent = `${rec.id ? "Edit" : "Register"} · ${boxId} / ${selected}`;
  $("mDelete").style.display = rec.id ? "" : "none";
  $("form").innerHTML = SECTIONS.map(([title, fs]) => `<h3>${title}</h3><div class="fields">` + fs.map(([id, t, ch]) => {
    let v = fromG(t, rec[id]);
    if (id === "matUUID" && !v) v = crypto.randomUUID();
    const inp = t === "choice" ? `<select data-f="${id}"><option value=""></option>${ch.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : t === "textarea" ? `<textarea data-f="${id}" rows="2">${esc(v)}</textarea>`
      : `<input data-f="${id}" type="${{ number: "number", date: "date", time: "time", datetime: "datetime-local" }[t] || "text"}" ${t === "number" ? 'step="any"' : ""} value="${esc(v)}">`;
    return `<label><span class="lbl">${id}</span>${inp}</label>`;
  }).join("") + "</div>").join("");
  resetCam();
  $("modal").classList.add("open");
}
function closeModal() { stopCam(); $("modal").classList.remove("open"); }

// ---- Camera / panorama ----
function stopCam() { stream?.getTracks().forEach(t => t.stop()); stream = null; $("video").style.display = "none"; $("camShot").disabled = true; }
function resetCam() { stopCam(); shots = []; panoDataUrl = null; $("pano").style.display = "none"; $("camDone").disabled = true; $("camInfo").textContent = ""; }
$("camStart").onclick = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
    $("video").srcObject = stream; $("video").style.display = "block"; $("camShot").disabled = false;
  } catch (e) { alert("Camera not available: " + e.message + "\nIn Grist, the browser may need to allow camera access for this widget."); }
};
$("camShot").onclick = () => {
  const v = $("video"), w = v.videoWidth, h = v.videoHeight, sw = Math.round(w * 0.3);
  const c = document.createElement("canvas"); c.width = sw; c.height = h;
  c.getContext("2d").drawImage(v, (w - sw) / 2, 0, sw, h, 0, 0, sw, h); // centre strip
  shots.push(c); $("camInfo").textContent = `${shots.length} segment(s)`; $("camDone").disabled = false;
};
$("camDone").onclick = () => {
  const h = shots[0].height, W = shots.reduce((a, s) => a + s.width, 0);
  const c = document.createElement("canvas"); c.width = W; c.height = h;
  let x = 0; const g = c.getContext("2d"); shots.forEach(s => { g.drawImage(s, x, 0); x += s.width; });
  panoDataUrl = c.toDataURL("image/jpeg", 0.85);
  $("pano").src = panoDataUrl; $("pano").style.display = "block"; stopCam();
  $("camInfo").textContent = "Panorama ready — uploads on save";
};
$("camReset").onclick = resetCam;

async function uploadPhoto(dataUrl, name) {
  const tok = await grist.docApi.getAccessToken({ readOnly: false });
  const fd = new FormData(); fd.append("upload", await (await fetch(dataUrl)).blob(), name);
  const r = await fetch(`${tok.baseUrl}/attachments?auth=${tok.token}`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Attachment upload failed");
  return await r.json();
}

$("mSave").onclick = async () => {
  const btn = $("mSave"); btn.disabled = true; btn.textContent = "Saving…";
  try {
    const rec = inBox().get(selected) || {};
    const fields = { BoxID: boxId, BoxPosition: selected, LastModifiedOnBy: Date.now() / 1000 };
    document.querySelectorAll("[data-f]").forEach(el => { const t = FIELDS.find(f => f[0] === el.dataset.f)[1]; fields[el.dataset.f] = toG(t, el.value); });
    if (panoDataUrl) {
      const ids = await uploadPhoto(panoDataUrl, `${boxId}_${selected}_${Date.now()}.jpg`);
      const old = Array.isArray(rec.Photograph) ? rec.Photograph.slice(1) : [];
      fields.Photograph = ["L", ...old, ...ids];
    }
    const t = await tableId();
    await grist.docApi.applyUserActions([rec.id ? ["UpdateRecord", t, rec.id, fields] : ["AddRecord", t, null, fields]]);
    closeModal();
  } catch (e) { alert("Save failed: " + e.message); }
  btn.disabled = false; btn.textContent = "Save sample";
};
$("mDelete").onclick = async () => {
  const rec = inBox().get(selected);
  if (!rec?.id || !confirm(`Delete sample at ${selected}?`)) return;
  await grist.docApi.applyUserActions([["RemoveRecord", await tableId(), rec.id]]);
  closeModal();
};
$("mClose").onclick = $("mCancel").onclick = closeModal;

// ---- UI events ----
$("grid").onclick = e => { const b = e.target.closest(".tube"); if (!b || b.disabled) return; selected = b.dataset.pos; render(); openModal(); };
$("boxId").oninput = e => { boxId = e.target.value; selected = null; render(); };
$("lockBtn").onclick = () => { unlocked = !unlocked; render(); };
document.querySelectorAll(".lblBtn").forEach(b => b.onclick = () => { label = b.dataset.label; render(); });

// ---- Grist connection ----
grist.ready({ requiredAccess: "full" });
grist.onRecords(recs => { rows = recs; render(); });
render();
