import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { Pool } from "pg";

export const runtime = "nodejs";

// Minimal: pulls any PUBLIC blob under Course_* and stores raw text-ish content.
// (We’ll add PDF/XLSX parsing + embeddings next step.)
export async function POST() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // 1) List blobs (start broad; we can tighten prefixes later)
  const blobs = await list({ limit: 1000 });

  // 2) Keep only your course materials
  const courseBlobs = blobs.blobs.filter((b) =>
    /\/Course_\d+\//.test(b.pathname)
  );

  let insertedOrUpdated = 0;

  for (const b of courseBlobs) {
    // Fetch the blob (public URL)
    const res = await fetch(b.url);
    if (!res.ok) continue;

    // For now, store plain text for text-ish files.
    // (Next step we’ll parse CSV/XLSX/PDF properly.)
    const contentType = res.headers.get("content-type") || "";
    const isProbablyText =
      contentType.includes("text") ||
      b.pathname.endsWith(".csv") ||
      b.pathname.endsWith(".txt") ||
      b.pathname.endsWith(".md") ||
      b.pathname.endsWith(".json");

    if (!isProbablyText) {
      // Skip PDFs/XLSX for this step (we’ll handle next)
      continue;
    }

    const text = await res.text();
    const courseMatch = b.pathname.match(/(Course_\d+)\//);
    const course = courseMatch ? courseMatch[1] : "unknown";

    // Upsert (UNIQUE(course, path) already exists)
    await pool.query(
      `
      INSERT INTO documents (course, path, url, content)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (course, path)
      DO UPDATE SET url = EXCLUDED.url, content = EXCLUDED.content
      `,
      [course, b.pathname, b.url, text]
    );

    insertedOrUpdated += 1;
  }

  await pool.end();

  return NextResponse.json({
    ok: true,
    scanned: courseBlobs.length,
    insertedOrUpdated,
    note: "This step only ingests text-like files (CSV/text). Next step adds PDF/XLSX parsing + embeddings.",
  });
}
