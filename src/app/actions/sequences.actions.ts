"use server";

import { getNextReference as getLibNextReference } from "@/lib/sequences";
import { DocumentType } from "@prisma/client";

/**
 * Server Action pour exposer getNextReference aux Client Components
 */
export async function getNextReferenceAction(type: DocumentType) {
  return await getLibNextReference(type);
}
