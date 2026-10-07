import { useEffect, useRef, useState } from "react";

type Mode = "sweep" | "panorama";
const ANGLES = ["0°", "90°", "180°", "270°"];
const STRIP_W = 220; // width of the framing box crop (in source px, scaled)
const SLICE = 6;

export function TubeCamera({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const out = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState("");
  const [mode, setMode] = useState<Mode>("sweep");
  const [shots, setShots] = useState<HTMLCanvasElement[]>([]);
  const [recording, setRecording] = useState(false);
  const [review, setReview] = useState<HTMLCanvasElement | null>(null);
  const [crop, setCrop] = useState({ l: 0, r: 0 });
  const slices = useRef<HTMLCanvasElement[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let s: MediaStream;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment", width: 1280, height: 720 } })
      .then((m) => {
        s = m;
        setStream(m);
        if (video.current) video.current.srcObject = m;
      })
      .catch((e) => setErr(e.message || "Camera unavailable"));
    return () => {
      s?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const grab = (w: number) => {
    const v = video.current!;
    const scale = v.videoWidth / v.clientWidth || 1;
    const sw = w * scale;
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, (v.videoWidth - sw) / 2, 0, sw, v.videoHeight, 0, 0, sw, v.videoHeight);
    return c;
  };

  const compose = (parts: HTMLCanvasElement[]) => {
    const c = document.createElement("canvas");
    c.width = parts.reduce((a, p) => a + p.width, 0);
    c.height = parts[0].height;
    const ctx = c.getContext("2d")!;
    let x = 0;
    for (const p of parts) {
      ctx.drawImage(p, x, 0);
      x += p.width;
    }
    return c;
  };

  const captureAngle = () => {
    const next = [...shots, grab(STRIP_W)];
    setShots(next);
    if (next.length === ANGLES.length) setReview(compose(next));
  };

  const togglePano = () => {
    if (recording) {
      if (timer.current) clearInterval(timer.current);
      setRecording(false);
      if (slices.current.length) setReview(compose(slices.current));
      return;
    }
    slices.current = [];
    setRecording(true);
    timer.current = window.setInterval(() => {
      slices.current.push(grab(SLICE));
      if (slices.current.length >= 240) togglePanoStop();
    }, 80);
  };
  const togglePanoStop = () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    setReview(compose(slices.current));
  };

  useEffect(() => {
    if (!review || !out.current) return;
    const l = Math.floor((crop.l / 100) * review.width);
    const r = Math.floor((crop.r / 100) * review.width);
    const w = Math.max(1, review.width - l - r);
    out.current.width = w;
    out.current.height = review.height;
    out.current.getContext("2d")!.drawImage(review, l, 0, w, review.height, 0, 0, w, review.height);
  }, [review, crop]);

  const reset = () => {
    setReview(null);
    setShots([]);
    setCrop({ l: 0, r: 0 });
  };

  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-destructive">Camera: {err}</p>}
      {!review && (
        <>
          <div className="flex gap-2">
            {(["sweep", "panorama"] as Mode[]).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setShots([]); }} className={mode === m ? "chip chip-on" : "chip"}>
                {m === "sweep" ? "Multi-angle (4 shots)" : "Strip panorama"}
              </button>
            ))}
          </div>
          <div className="relative overflow-hidden rounded-lg bg-muted">
            <video ref={video} autoPlay playsInline muted className="block w-full" />
            {stream && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="viewfinder h-[85%]" style={{ width: mode === "sweep" ? STRIP_W : SLICE * 3 }} />
                <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 font-mono text-xs">
                  {mode === "sweep" ? `Align tube · angle ${ANGLES[shots.length] ?? "done"}` : recording ? `Rotate slowly · ${slices.current.length} slices` : "Center tube, then start & rotate 360°"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {mode === "sweep" ? (
              <button type="button" disabled={!stream} onClick={captureAngle} className="btn-primary">
                Capture {ANGLES[shots.length]}
              </button>
            ) : (
              <button type="button" disabled={!stream} onClick={togglePano} className="btn-primary">
                {recording ? "Stop & stitch" : "Start panorama"}
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </>
      )}
      {review && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-muted p-2">
            <canvas ref={out} className="h-48 max-w-none" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label>Trim left {crop.l}%<input type="range" min={0} max={45} value={crop.l} onChange={(e) => setCrop({ ...crop, l: +e.target.value })} className="w-full" /></label>
            <label>Trim right {crop.r}%<input type="range" min={0} max={45} value={crop.r} onChange={(e) => setCrop({ ...crop, r: +e.target.value })} className="w-full" /></label>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={() => onSave(out.current!.toDataURL("image/jpeg", 0.85))}>Use photo</button>
            <button type="button" className="btn-ghost" onClick={reset}>Retake</button>
          </div>
        </>
      )}
    </div>
  );
}
