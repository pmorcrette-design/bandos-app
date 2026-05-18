import type { AtaCarnetItem } from "@/lib/server/workspace-store";

const ATA_HEADERS = [
  "NOMBRE DE PIECES",
  "FACULTATIF : Emballage / Contenant (valises, fly case, carton...)",
  "DESIGNATION",
  "POIDS",
  "UNITE POIDS",
  "VALEUR HT",
  "ORIGINE (pays de fabrication / Made in...)",
  "NUMERO DE SERIE",
  "NOTES"
] as const;

const headerAliases = {
  pieces: ["nombre de pieces", "nombre de piece", "nb pieces", "pieces"],
  packaging: [
    "facultatif : emballage / contenant (valises, fly case, carton...)",
    "facultatif : emballage / contenant",
    "emballage / contenant",
    "emballage",
    "contenant"
  ],
  designation: ["designation", "designation materiel", "materiel"],
  weight: ["poids"],
  weightUnit: ["unite poids", "unite de poids", "poids unite"],
  valueExVat: ["valeur ht", "valeur", "valeur hors taxes"],
  origin: ["origine (pays de fabrication / made in...)", "origine", "made in"],
  serialNumber: ["numero de serie", "numero série", "serial number", "serie"],
  notes: ["notes", "commentaires"]
} as const;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;

  return semicolonCount > commaCount ? ";" : ",";
}

function csvRowsFromText(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function getHeaderIndexes(headerRow: string[]) {
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const indexes = {
    pieces: -1,
    packaging: -1,
    designation: -1,
    weight: -1,
    weightUnit: -1,
    valueExVat: -1,
    origin: -1,
    serialNumber: -1,
    notes: -1
  };

  (Object.keys(headerAliases) as Array<keyof typeof headerAliases>).forEach((key) => {
    const aliases = headerAliases[key] as readonly string[];
    indexes[key] = normalizedHeaders.findIndex((header) =>
      aliases.includes(header)
    );
  });

  const hasNamedHeaders = Object.values(indexes).some((index) => index >= 0);

  if (!hasNamedHeaders) {
    return {
      ...indexes,
      pieces: 0,
      packaging: 1,
      designation: 2,
      weight: 3,
      weightUnit: 4,
      valueExVat: 5,
      origin: 6,
      serialNumber: 7,
      notes: 8
    };
  }

  return indexes;
}

function parseFrenchNumber(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFrenchNumber(value: number) {
  return value.toString().replace(".", ",");
}

function escapeCsvCell(value: string) {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function parseAtaCarnetCsv(buffer: Buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows = csvRowsFromText(text);

  if (!rows.length) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndexes = getHeaderIndexes(headerRow);

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row, index) => ({
      id: `ata-import-${Date.now()}-${index}`,
      pieces: Math.max(1, Math.floor(parseFrenchNumber(row[headerIndexes.pieces] ?? "1"))),
      packaging: row[headerIndexes.packaging] ?? "",
      designation: row[headerIndexes.designation] ?? `Item ${index + 1}`,
      weight: parseFrenchNumber(row[headerIndexes.weight] ?? "0"),
      weightUnit: row[headerIndexes.weightUnit] ?? "kg",
      valueExVat: parseFrenchNumber(row[headerIndexes.valueExVat] ?? "0"),
      origin: row[headerIndexes.origin] ?? "",
      serialNumber: row[headerIndexes.serialNumber] ?? "",
      notes: row[headerIndexes.notes] ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })) satisfies AtaCarnetItem[];
}

export function buildAtaCarnetCsv(items: AtaCarnetItem[]) {
  const lines = [
    ATA_HEADERS.join(";"),
    ...items.map((item) =>
      [
        item.pieces.toString(),
        item.packaging,
        item.designation,
        formatFrenchNumber(item.weight),
        item.weightUnit,
        formatFrenchNumber(item.valueExVat),
        item.origin,
        item.serialNumber,
        item.notes
      ]
        .map((value) => escapeCsvCell(String(value ?? "")))
        .join(";")
    )
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
