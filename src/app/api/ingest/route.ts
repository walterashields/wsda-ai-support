import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Read from DB
    const rows = await sql`
      SELECT content, source
      FROM documents
      LIMIT 3
    `;

    return NextResponse.json({
      status: "SUCCESS",
      rowsFound: rows.length,
      sources: rows.map(r => r.source),
      preview: rows[0]?.content?.slice(0, 200)
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "DB READ FAILED" },
      { status: 500 }
    );
  }
}
