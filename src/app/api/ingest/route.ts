import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { list } from "@vercel/blob";

// NOTE:
// Do NOT export `runtime = "edge"` in your project right now
// because your build logs showed it's incompatible with your Next config.

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/ingest is alive" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "debug";
    const prefix = body?.prefix ?? "Course_1/";

    const sql = neon(process.env.DATABASE_URL!);

    // 1) DEBUG MODE: prove DB has your content
    if (action === "debug") {
      const rows = await sql`
        SELECT source, LEFT(content, 300) AS preview
        FROM documents
        ORDER BY id DESC
        LIMIT 5
      `;

      return NextResponse.json({
        ok: true,
        action: "debug",
        rowsFound: rows.length,
        sources: rows.map((r: any) => r.source),
        sample: rows[0]?.preview ?? null,
      });
    }

    // 2) INGEST MODE: pull files from Vercel Blob and insert into Neon
    // Requires Vercel Blob token in env: BLOB_READ_WRITE_TOKEN
    if (action === "ingest") {
      const blobs = await list({ prefix });

      let inserted = 0;

      for (const file of blobs.blobs) {
        const res = await fetch(file.url);
        const text = await res.text();

        await sql`
          INSERT INTO documents (content, source)
          VALUES (${text}, ${file.pathname})
        `;

        inserted += 1;
      }

      return NextResponse.json({
        ok: true,
        action: "ingest",
        prefix,
        filesFound: blobs.blobs.length,
        inserted,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Ingest route failed" }, { status: 500 });
  }
}
