import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    const blobs = await list({ prefix: "Course_1/" });

    for (const file of blobs.blobs) {
      const res = await fetch(file.url);
      const text = await res.text();

      await sql`
        INSERT INTO documents (content, source)
        VALUES (${text}, ${file.pathname})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
