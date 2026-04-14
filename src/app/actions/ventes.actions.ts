"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

export type LineItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
};

export type CreateDocumentInput = {
  type: "PROFORMA" | "BL" | "BV" | "INVOICE";
  date: Date;
  reference?: string;
  customerId: string;
  paymentMethod?: string;
  warehouseId?: string; // S'il y a une sortie de stock un jour
  grossTotal: number;
  discountTotal: number;
  taxTotal: number;
  stampTax: number;
  netTotal: number;
  lines: LineItemInput[];
};

export async function createSaleDocument(data: CreateDocumentInput) {
  try {
    // 1. Create the document
    const document = await prisma.document.create({
      data: {
        type: data.type,
        date: data.date,
        reference: data.reference,
        status: data.type === 'PROFORMA' ? 'DRAFT' : 'VALIDATED',
        customerId: data.customerId === "COMPTANT" ? null : data.customerId,
        paymentMethod: data.paymentMethod,
        grossTotal: data.grossTotal,
        discountTotal: data.discountTotal,
        taxTotal: data.taxTotal,
        stampTax: data.stampTax,
        netTotal: data.netTotal,
        lines: {
          create: data.lines.map(line => ({
            productId: line.productId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            taxRate: line.taxRate,
          }))
        }
      },
      include: {
        lines: {
          include: {
            product: true
          }
        }
      }
    });

    revalidatePath("/ventes/commandes");
    return { success: true, data: document };
  } catch (error) {
    console.error("Erreur serveur Vente:", error);
    return { success: false, error: "Impossible de créer le document." };
  }
}

export async function getSaleDocuments(typeDoc?: DocumentType) {
  try {
    const docs = await prisma.document.findMany({
      where: {
        type: typeDoc ? typeDoc : { in: ["PROFORMA", "BL", "BV", "INVOICE"] }
      },
      include: {
        customer: true,
        _count: {
          select: { lines: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: docs };
  } catch (error) {
    console.error("Erreur lecture factures:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
