import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

/* GET = health check */
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/ingest is alive"
  });
}

/* POST = verify DB content */
export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const rows = await sql`
      SELECT content, source
      FROM documents
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      rowsFound: rows.length,
      sources: rows.map(r => r.source),
      preview: rows[0]?.content?.slice(0, 200)
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "DB read failed" },
      { status: 500 }
    );
  }
}
