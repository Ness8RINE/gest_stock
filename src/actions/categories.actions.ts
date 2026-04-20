"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' }
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error("Erreur récupération catégories:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

export async function createCategory(data: { name: string; description?: string }) {
  try {
    const newCat = await prisma.productCategory.create({
      data: {
        name: data.name,
        description: data.description || null
      }
    });
    revalidatePath("/stock/categories");
    revalidatePath("/stock/produits");
    return { success: true, data: newCat };
  } catch (error: any) {
    console.error("Erreur création catégorie:", error);
    if(error.code === 'P2002') return { success: false, error: "Cette catégorie existe déjà." };
    return { success: false, error: "Erreur création." };
  }
}

export async function updateCategory(id: string, data: { name: string; description?: string }) {
  try {
    const updated = await prisma.productCategory.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description || null
      }
    });
    revalidatePath("/stock/categories");
    revalidatePath("/stock/produits");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Erreur modification catégorie:", error);
    if(error.code === 'P2002') return { success: false, error: "Cette catégorie existe déjà." };
    return { success: false, error: "Erreur modification." };
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.productCategory.delete({
      where: { id }
    });
    revalidatePath("/stock/categories");
    revalidatePath("/stock/produits");
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression catégorie:", error);
    return { success: false, error: "Impossible de supprimer. Des produits utilisent sûrement cette catégorie." };
  }
}
