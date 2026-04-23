"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, data: suppliers };
  } catch (error) {
    console.error("Erreur lors de la rcupration des fournisseurs:", error);
    return { success: false, error: "Erreur lors de la rcupration des fournisseurs" };
  }
}

export async function createSupplier(data: Omit<any, "id">) {
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        address: data.address,
        country: data.country,
        contactPerson: data.contactPerson,
        phone: data.phone,
        legalStatus: data.legalStatus,
        rc: data.rc,
        mf: data.mf,
        nis: data.nis,
        ai: data.ai,
        agreement: data.agreement,
      }
    });

    revalidatePath("/achats/fournisseurs");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Erreur création fournisseur:", error);
    return { success: false, error: "Création échouée." };
  }
}

export async function updateSupplier(id: string, data: Omit<any, "id">) {
  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        country: data.country,
        contactPerson: data.contactPerson,
        phone: data.phone,
        legalStatus: data.legalStatus,
        rc: data.rc,
        mf: data.mf,
        nis: data.nis,
        ai: data.ai,
        agreement: data.agreement,
      }
    });

    revalidatePath("/achats/fournisseurs");
    return { success: true, data: supplier };
  } catch (error) {
    console.error("Erreur modification fournisseur:", error);
    return { success: false, error: "Modification échouée." };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await prisma.supplier.delete({
      where: { id }
    });

    revalidatePath("/achats/fournisseurs");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression fournisseur:", error);
    return { success: false, error: "Suppression échouée." };
  }
}
