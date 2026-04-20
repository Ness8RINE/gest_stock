"use server";

import prisma from "@/lib/prisma";
import { startOfMonth, subDays, format } from "date-fns";

/**
 * Récupère les indicateurs clés (KPI) pour les cartes du haut
 */
export async function getDashboardKPIs() {
  try {
    const now = new Date();
    const firstOfMonth = startOfMonth(now);

    // 1. Valeur Totale du Stock (Qty * PMP)
    const inventories = await prisma.inventory.findMany({
      include: { batch: true }
    });
    const totalStockValue = inventories.reduce((acc, inv) => {
      return acc + (inv.quantity * (inv.batch?.unitCost || 0));
    }, 0);

    // 2. Chiffre d'Affaires du mois (Documents de type vente validés)
    const monthlySales = await prisma.document.aggregate({
      where: {
        type: { in: ["BL", "BV", "INVOICE"] },
        date: { gte: firstOfMonth },
        status: { not: "CANCELLED" }
      },
      _sum: { netTotal: true },
      _count: { id: true }
    });

    // 3. Produits en alerte (Stock total < 10)
    const products = await prisma.product.findMany({
      include: {
        inventories: true
      }
    });
    const lowStockCount = products.filter(p => {
      const totalQty = p.inventories.reduce((sum, inv) => sum + inv.quantity, 0);
      return totalQty < 10;
    }).length;

    return {
      success: true,
      data: {
        totalStockValue,
        monthlyRevenue: monthlySales._sum.netTotal || 0,
        transactionCount: monthlySales._count.id || 0,
        lowStockCount
      }
    };
  } catch (error) {
    console.error("Dashboard KPIs Error:", error);
    return { success: false, error: "Erreur agrégation KPIs" };
  }
}

/**
 * Récupère les données pour le graphique des ventes (30 derniers jours)
 */
export async function getSalesChartData() {
  try {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const sales = await prisma.document.findMany({
      where: {
        type: { in: ["BL", "BV", "INVOICE"] },
        date: { gte: thirtyDaysAgo },
        status: { not: "CANCELLED" }
      },
      orderBy: { date: 'asc' },
      select: { date: true, netTotal: true }
    });

    // Grouper par jour
    const chartDataMap = new Map();
    sales.forEach(s => {
      const day = format(s.date, "dd/MM");
      chartDataMap.set(day, (chartDataMap.get(day) || 0) + s.netTotal);
    });

    const data = Array.from(chartDataMap.entries()).map(([name, total]) => ({
      name,
      total
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, data: [] };
  }
}

/**
 * Récupère les 5 produits les plus vendus
 */
export async function getTopProducts() {
  try {
    const topLines = await prisma.documentLine.groupBy({
      by: ['productId'],
      where: {
        document: {
          type: { in: ["BL", "BV", "INVOICE"] },
          status: { not: "CANCELLED" }
        }
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    // Récupérer les noms des produits
    const productIds = topLines.map(l => l.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, designation: true }
    });

    const data = topLines.map(line => ({
      name: products.find(p => p.id === line.productId)?.designation || "Inconnu",
      val: line._sum.quantity || 0
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, data: [] };
  }
}

/**
 * Récupère la répartition du stock par catégorie
 */
export async function getCategoryDistribution() {
  try {
    const inventories = await prisma.inventory.findMany({
      include: { 
        product: { 
          include: { category: true } 
        } 
      }
    });

    const categoriesMap = new Map();
    inventories.forEach(inv => {
      const catName = inv.product.category.name;
      categoriesMap.set(catName, (categoriesMap.get(catName) || 0) + inv.quantity);
    });

    const data = Array.from(categoriesMap.entries()).map(([name, value]) => ({
      name,
      value
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, data: [] };
  }
}

/**
 * Récupère les 5 derniers mouvements de stock
 */
export async function getRecentMovements() {
  try {
    const movements = await prisma.stockMovement.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        product: true,
        warehouse: true
      }
    });
    return { success: true, data: movements };
  } catch (error) {
    return { success: false, data: [] };
  }
}
