import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/ingest is alive" });
}

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const rows = await sql`
      SELECT source, left(content, 200) as preview
      FROM documents
      LIMIT 3
    `;

    return NextResponse.json({
      ok: true,
      rowsFound: rows.length,
      sources: rows.map((r: any) => r.source),
      preview: rows[0]?.preview ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "DB read failed" }, { status: 500 });
  }
}
