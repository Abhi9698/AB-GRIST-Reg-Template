import { createFileRoute, Link } from "@tanstack/react-router";
import { ALL_FIELDS, EXTRA_COLUMNS } from "@/lib/samples";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Setup — Grist Sample Registrar" },
      { name: "description", content: "How to create the Samples table in Grist and add the Box Registrar custom widget." },
      { property: "og:title", content: "Setup — Grist Sample Registrar" },
      { property: "og:description", content: "Samples table schema and widget installation steps." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Setup,
});

const gristType = (t: string) =>
  ({ number: "Numeric", date: "Date", time: "Text", datetime: "DateTime", choice: "Choice", textarea: "Text", text: "Text" })[t] ?? "Text";

function Setup() {
  const cols = [...EXTRA_COLUMNS.slice(0, 2), ...ALL_FIELDS.map((f) => ({ id: f.id, type: gristType(f.type), choices: f.choices })), ...EXTRA_COLUMNS.slice(2)];
  const action = JSON.stringify([["AddTable", "Samples", cols.map((c) => ({ id: c.id, type: c.type }))]]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-foreground">
      <Link to="/" className="text-sm underline">← Back to widget</Link>
      <h1 className="text-3xl font-semibold">Grist setup</h1>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Create a table named <code className="font-mono">Samples</code> with the columns below (exact IDs).</li>
        <li>Add a page widget → <b>Custom</b> → select the Samples table.</li>
        <li>Paste this widget's published URL as the custom URL and grant <b>Full document access</b>.</li>
        <li>Photos upload into the <code className="font-mono">Photograph</code> attachment column.</li>
      </ol>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-2">Column ID</th><th className="p-2">Type</th><th className="p-2">Choices</th></tr></thead>
          <tbody>
            {cols.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-2 font-mono">{c.id}</td><td className="p-2">{c.type}</td>
                <td className="p-2 text-muted-foreground">{"choices" in c && c.choices ? (c.choices as string[]).join(", ") : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">Quick create (Grist API user action)</h2>
        <pre className="panel overflow-x-auto p-3 font-mono text-xs">{action}</pre>
      </div>
    </div>
  );
}
