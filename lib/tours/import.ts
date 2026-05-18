import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, posix } from "node:path";
import { promisify } from "node:util";

import type {
  ImportedTourStop,
  TourImportResponse
} from "@/lib/tours/import-types";

const execFileAsync = promisify(execFile);

const headerAliases = {
  date: ["date", "show date", "jour", "day"],
  venue: ["venue", "salle", "room", "club"],
  city: ["city", "ville"],
  country: ["country", "pays"],
  address: ["address", "adresse", "location", "lieu"]
} as const;

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );
}

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

function columnLettersToIndex(columnLetters: string) {
  return columnLetters.split("").reduce((total, letter) => {
    return total * 26 + (letter.charCodeAt(0) - 64);
  }, 0) - 1;
}

function parseSharedStrings(xml: string) {
  const items = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];

  return items.map((item) => {
    const textNodes = Array.from(item.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g));
    return decodeXmlEntities(textNodes.map((match) => match[1]).join(""));
  });
}

function extractCellValue(
  cellXml: string,
  cellType: string | null,
  sharedStrings: string[]
) {
  if (cellType === "inlineStr") {
    const textNodes = Array.from(cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g));
    return decodeXmlEntities(textNodes.map((match) => match[1]).join(""));
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? decodeXmlEntities(valueMatch[1]) : "";

  if (cellType === "s") {
    return sharedStrings[Number(rawValue)] ?? "";
  }

  if (cellType === "b") {
    return rawValue === "1" ? "TRUE" : "FALSE";
  }

  return rawValue;
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rowMatches = Array.from(xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g));

  return rowMatches.map((rowMatch) => {
    const rowContent = rowMatch[1];
    const cells = Array.from(
      rowContent.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)
    );
    const row: string[] = [];

    cells.forEach((cellMatch) => {
      const attributes = cellMatch[1];
      const cellXml = cellMatch[2];
      const reference = attributes.match(/r="([A-Z]+)\d+"/)?.[1];
      const columnIndex = reference ? columnLettersToIndex(reference) : row.length;
      const cellType = attributes.match(/t="([^"]+)"/)?.[1] ?? null;

      row[columnIndex] = extractCellValue(cellXml, cellType, sharedStrings);
    });

    return row.map((cell) => cell ?? "");
  });
}

async function readZipEntry(filePath: string, entryPath: string) {
  const { stdout } = await execFileAsync("unzip", ["-p", filePath, entryPath], {
    maxBuffer: 10 * 1024 * 1024
  });

  return stdout;
}

async function xlsxRowsFromBuffer(buffer: Buffer) {
  const tempDirectory = await mkdtemp(join(tmpdir(), "bandos-tour-import-"));
  const filePath = join(tempDirectory, "upload.xlsx");

  try {
    await writeFile(filePath, buffer);

    const [workbookXml, workbookRelsXml] = await Promise.all([
      readZipEntry(filePath, "xl/workbook.xml"),
      readZipEntry(filePath, "xl/_rels/workbook.xml.rels")
    ]);

    const firstSheetRelId = workbookXml.match(/<sheet\b[^>]*r:id="([^"]+)"/)?.[1];
    if (!firstSheetRelId) {
      throw new Error("Unable to locate the first worksheet.");
    }

    const relPattern = new RegExp(
      `<Relationship[^>]*Id="${firstSheetRelId}"[^>]*Target="([^"]+)"`,
      "i"
    );
    const target = workbookRelsXml.match(relPattern)?.[1];
    if (!target) {
      throw new Error("Unable to resolve the first worksheet target.");
    }

    const normalizedSheetPath = posix.join(
      "xl",
      target.replace(/^\/+/, "").replace(/^xl\//, "")
    );

    const [sheetXml, sharedStringsXml] = await Promise.all([
      readZipEntry(filePath, normalizedSheetPath),
      readZipEntry(filePath, "xl/sharedStrings.xml").catch(() => "")
    ]);

    const sharedStrings = sharedStringsXml ? parseSharedStrings(sharedStringsXml) : [];
    return parseWorksheetRows(sheetXml, sharedStrings);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function excelSerialDateToIso(value: string) {
  const serial = Number(value);

  if (Number.isNaN(serial)) {
    return value;
  }

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function getHeaderIndexes(headerRow: string[]) {
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const indexes = {
    date: -1,
    venue: -1,
    city: -1,
    country: -1,
    address: -1
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
      indexes: {
        date: 0,
        venue: 1,
        city: 2,
        country: 3,
        address: 4
      },
      rowsStartAt: 0
    };
  }

  return {
    indexes,
    rowsStartAt: 1
  };
}

function mapRowsToStops(rows: string[][]) {
  if (!rows.length) {
    return {
      stops: [] as ImportedTourStop[],
      warnings: [
        "The imported file is empty."
      ]
    };
  }

  const { indexes, rowsStartAt } = getHeaderIndexes(rows[0]);
  const warnings: string[] = [];
  const stops = rows
    .slice(rowsStartAt)
    .map((row, rowIndex) => {
      const dateValue = row[indexes.date] ?? "";
      const venue = (row[indexes.venue] ?? "").trim();
      const city = (row[indexes.city] ?? "").trim();
      const country = (row[indexes.country] ?? "").trim();
      const address = (row[indexes.address] ?? "").trim();
      const location = address
        ? [address, city, country].filter(Boolean).join(", ")
        : [venue, city, country].filter(Boolean).join(", ");

      if (!location) {
        warnings.push(`Row ${rowIndex + rowsStartAt + 1} was skipped because no location was found.`);
        return null;
      }

      const formattedDate =
        /^\d+(?:\.\d+)?$/.test(dateValue.trim())
          ? excelSerialDateToIso(dateValue.trim())
          : dateValue.trim();
      const effectiveVenue = venue || city || `Stop ${rowIndex + 1}`;

      return {
        id: `import-stop-${rowIndex + 1}`,
        date: formattedDate || `Stop ${rowIndex + 1}`,
        venue: effectiveVenue,
        city,
        country,
        address,
        label: [city || effectiveVenue, venue && city ? venue : ""]
          .filter(Boolean)
          .join(" • "),
        location
      } satisfies ImportedTourStop;
    })
    .filter((stop): stop is ImportedTourStop => Boolean(stop));

  return { stops, warnings };
}

export async function parseTourImportFile(
  buffer: Buffer,
  fileName: string
): Promise<TourImportResponse> {
  const extension = extname(fileName).toLowerCase();
  let rows: string[][];

  if (extension === ".csv" || extension === ".txt") {
    rows = csvRowsFromText(buffer.toString("utf-8"));
  } else if (extension === ".xlsx") {
    rows = await xlsxRowsFromBuffer(buffer);
  } else {
    throw new Error("Unsupported file type. Use CSV or XLSX.");
  }

  const { stops, warnings } = mapRowsToStops(rows);
  if (stops.length < 2) {
    throw new Error("At least two valid dates are required to build a route.");
  }

  return {
    tourName: basename(fileName, extension),
    fileName,
    warnings,
    stops
  };
}
