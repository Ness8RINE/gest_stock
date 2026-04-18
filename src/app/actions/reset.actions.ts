"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function dangerFullReset() {
  try {
    console.log("DANGER: Starting full reset...");
    
    // Ordre de nettoyage
    await prisma.auditLog.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.shippingCost.deleteMany();
    await prisma.paymentMatch.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.documentLine.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.document.deleteMany();
    await prisma.importFolder.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.product.deleteMany();
    await prisma.productCategory.deleteMany();
    await prisma.tva.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();

    console.log("Reset successful.");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Reset failed:", error);
    return { success: false, error: error.message };
  }
}
