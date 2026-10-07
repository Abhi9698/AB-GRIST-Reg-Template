export type FieldType = "text" | "number" | "date" | "time" | "datetime" | "choice" | "textarea";
export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  choices?: string[];
}
export interface Section {
  title: string;
  fields: FieldDef[];
}

export const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
export const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const SECTIONS: Section[] = [
  {
    title: "Primary Identifiers",
    fields: [
      { id: "matUUID", label: "matUUID", type: "text" },
      { id: "HIOHID", label: "HIOHID", type: "text" },
      { id: "SampleNumber", label: "Sample number", type: "text" },
      { id: "IndividualName", label: "Individual name", type: "text" },
      { id: "IndividualCode", label: "Individual code", type: "text" },
      { id: "Label", label: "Label", type: "text" },
    ],
  },
  {
    title: "Taxonomy & Specimen",
    fields: [
      { id: "Species", label: "Species", type: "text" },
      { id: "CommonName", label: "Common name", type: "text" },
      { id: "Sex", label: "Sex", type: "choice", choices: ["Female", "Male", "Unknown"] },
      { id: "Age", label: "Age", type: "text" },
    ],
  },
  {
    title: "Collection Details",
    fields: [
      { id: "CollectionDate", label: "Collection date", type: "date" },
      { id: "CollectionTime", label: "Collection time", type: "time" },
      { id: "CollectionDay", label: "Day", type: "text" },
      { id: "CollectionMonth", label: "Month", type: "text" },
      { id: "CollectionYear", label: "Year", type: "text" },
      { id: "CollectionDateAdaptation", label: "Date adaptation", type: "text" },
      { id: "Collector", label: "Collector", type: "text" },
      { id: "SamplingMethod", label: "Sampling method", type: "text" },
      { id: "Project", label: "Project", type: "text" },
      { id: "Country", label: "Country", type: "text" },
      { id: "Region", label: "Region", type: "text" },
      { id: "Site", label: "Site", type: "text" },
      { id: "Group", label: "Group", type: "text" },
      { id: "Nest", label: "Nest", type: "text" },
      { id: "GPSLat", label: "GPS lat", type: "number" },
      { id: "GPSLong", label: "GPS long", type: "number" },
      { id: "FieldNotes", label: "Field notes", type: "textarea" },
    ],
  },
  {
    title: "Physical Properties & Storage",
    fields: [
      { id: "SampleType", label: "Sample type", type: "choice", choices: ["Blood", "Feces", "Tissue", "Hair", "Feather", "Swab", "Urine", "Saliva", "Other"] },
      { id: "SampleConsistency", label: "Consistency", type: "text" },
      { id: "SampleVolume", label: "Volume", type: "number" },
      { id: "SampleVolumeUnit", label: "Volume unit", type: "choice", choices: ["µl", "ml", "mg", "g"] },
      { id: "StorageMedium", label: "Storage medium", type: "text" },
      { id: "TubeFormat", label: "Tube format", type: "choice", choices: ["0.5 ml", "1.5 ml", "2.0 ml", "Cryovial", "Other"] },
      { id: "StorageTemperature", label: "Storage temp", type: "choice", choices: ["RT", "4 °C", "-20 °C", "-80 °C", "LN2"] },
      { id: "StorageInfo", label: "Storage info", type: "text" },
      { id: "StorageInfoDate", label: "Storage info date", type: "datetime" },
      { id: "StorageInfoPerson", label: "Storage person", type: "text" },
      { id: "StorageDateTime", label: "Stored at", type: "datetime" },
      { id: "StorageComment", label: "Storage comment", type: "textarea" },
    ],
  },
  {
    title: "Regulatory & Status",
    fields: [
      { id: "StatusSample", label: "Status", type: "choice", choices: ["Registered", "Stored", "In use", "Shipped", "Depleted", "Destroyed"] },
      { id: "StatusInformation", label: "Status info", type: "text" },
      { id: "ResearchPermit", label: "Research permit", type: "text" },
      { id: "ImportPermit", label: "Import permit", type: "text" },
      { id: "BiosafetyClassification", label: "Biosafety", type: "choice", choices: ["BSL-1", "BSL-2", "BSL-3", "BSL-4"] },
      { id: "TransportChain", label: "Transport chain", type: "text" },
      { id: "DataCurationComment", label: "Curation comment", type: "textarea" },
    ],
  },
];

export const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

export const EXTRA_COLUMNS = [
  { id: "BoxID", type: "Text" },
  { id: "BoxPosition", type: "Text" },
  { id: "Photograph", type: "Attachments" },
  { id: "LastModifiedOnBy", type: "DateTime" },
];

export type SampleRecord = Record<string, unknown> & { id?: number };

export function isMiddle(pos: string) {
  return pos.startsWith("E") || pos.slice(1) === "5";
}

export function speciesHue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Grist stores Date as epoch seconds (UTC midnight) and DateTime as epoch seconds. */
export function toGrist(type: FieldType, v: string): unknown {
  if (v === "") return null;
  if (type === "number") return Number(v);
  if (type === "date") return Date.parse(v + "T00:00:00Z") / 1000;
  if (type === "datetime") return Date.parse(v) / 1000;
  return v;
}
export function fromGrist(type: FieldType, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" && type === "date") return new Date(v * 1000).toISOString().slice(0, 10);
  if (typeof v === "number" && type === "datetime") return new Date(v * 1000).toISOString().slice(0, 16);
  return String(v);
}
