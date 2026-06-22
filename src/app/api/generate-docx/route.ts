import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { content, title, type } = await req.json()

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
              text: `Generated on ${new Date().toLocaleDateString()}`,
              spacing: { after: 400 },
            }),
            ...content.split("\n\n").map((paragraph: string) =>
              new Paragraph({
                text: paragraph,
                spacing: { line: 240, after: 200 },
              })
            ),
          ],
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8Array = new Uint8Array(buffer)
    
    return new NextResponse(Buffer.from(uint8Array), {
      headers: {
        "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "-")}.docx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    })
  } catch (err) {
    console.error("Error:", err)
    return NextResponse.json({ error: "Failed to generate DOCX" }, { status: 500 })
  }
}
