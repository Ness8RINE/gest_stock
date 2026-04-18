"use server";

import prisma from "@/lib/prisma";
import { DocumentType } from "@prisma/client";

const PREFIXES: Record<DocumentType, string> = {
  PROFORMA: "PROF-",
  ORDER: "BCC-",
  BL: "BL-",
  BV: "BV-",
  INVOICE: "FACT-",
  CREDIT_NOTE: "AVV-",
  PURCHASE_ORDER: "BCF-",
  RECEIPT: "BR-",
  PURCHASE_INVOICE: "FACTF-",
  PURCHASE_RETURN: "AVF-",
  EXCHANGE: "BECH-",
  DELIVERY: "BE-",
  TRANSFER: "TRF-",
};

/**
 * Server Action pour calculer la prochaine référence
 * Format: PREFIX-0001
 */
export async function getNextReferenceAction(type: DocumentType) {
  try {
    const prefix = PREFIXES[type];
    
    const lastDoc = await prisma.document.findFirst({
      where: { type },
      orderBy: { reference: 'desc' },
      select: { reference: true }
    });

    if (!lastDoc || !lastDoc.reference || !lastDoc.reference.startsWith(prefix)) {
      return `${prefix}0001`;
    }

    // Extraire le numéro
    const currentNumStr = lastDoc.reference.replace(prefix, "");
    const currentNum = parseInt(currentNumStr);
    
    if (isNaN(currentNum)) {
      return `${prefix}0001`;
    }

    const nextNum = currentNum + 1;
    // Padding de 4 chiffres
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error(`Error generating sequence for ${type}:`, error);
    return "";
  }
}
