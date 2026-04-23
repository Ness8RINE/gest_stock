import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getAttachmentsPath } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join(path.sep);
    const absolutePath = path.join(getAttachmentsPath(), filePath);

    if (!fs.existsSync(absolutePath)) {
      return new NextResponse("Fichier introuvable", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();

    // Détermination du type MIME
    let contentType = "application/octet-stream";
    if (extension === ".pdf") contentType = "application/pdf";
    else if (extension === ".jpg" || extension === ".jpeg") contentType = "image/jpeg";
    else if (extension === ".png") contentType = "image/png";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("API Attachments Error:", error);
    return new NextResponse("Erreur interne", { status: 500 });
  }
}
