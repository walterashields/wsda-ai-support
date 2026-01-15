import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const sql = neon(process.env.DATABASE_URL!);

    // Pull content from DB
    const rows = await sql`
      SELECT content, source
      FROM documents
      LIMIT 5
    `;

    return NextResponse.json({
      answer: "DB READ SUCCESS",
      debug: {
        rowsFound: rows.length,
        sources: rows.map(r => r.source),
        sample: rows[0]?.content?.slice(0, 300)
      }
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}
