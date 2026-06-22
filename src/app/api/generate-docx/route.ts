import { Document, Packer, Paragraph, HeadingLevel } from "docx"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json()

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: new Date().toLocaleDateString(),
              spacing: { after: 400 },
            }),
            ...content.split("\n").map((line: string) =>
              new Paragraph({
                text: line || "",
                spacing: { line: 240 },
              })
            ),
          ],
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "-")}.docx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 })
  }
}