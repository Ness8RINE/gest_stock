"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getWarehouses() {
  try {
    const data = await prisma.warehouse.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, data };
  } catch (error) {
    console.error("Erreur récupération dépôts:", error);
    return { success: false, error: "Erreur récupération" };
  }
}

export async function createWarehouse(data: { name: string; address?: string; capacity?: number }) {
  try {
    const result = await prisma.warehouse.create({
      data: {
        name: data.name,
        address: data.address || null,
        capacity: data.capacity || null
      }
    });
    revalidatePath("/stock/depots");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Erreur création dépôt:", error);
    if(error.code === 'P2002') return { success: false, error: "Un dépôt avec ce nom existe déjà." };
    return { success: false, error: "Création échouée." };
  }
}

export async function updateWarehouse(id: string, data: { name: string; address?: string; capacity?: number }) {
  try {
    const result = await prisma.warehouse.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address || null,
        capacity: data.capacity || null
      }
    });
    revalidatePath("/stock/depots");
    return { success: true, data: result };
  } catch (error: any) {
    if(error.code === 'P2002') return { success: false, error: "Un dépôt avec ce nom existe déjà." };
    return { success: false, error: "Modification échouée." };
  }
}

export async function deleteWarehouse(id: string) {
  try {
    await prisma.warehouse.delete({
      where: { id }
    });
    revalidatePath("/stock/depots");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression dépôt:", error);
    return { success: false, error: "Impossible de supprimer ce dépôt car il contient probablement des mouvements ou du stock." };
  }
}
