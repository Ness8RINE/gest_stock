import prisma from "./prisma";

/**
 * Enregistre une action dans le journal d'audit
 */
export async function logAction(userId: string | null, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}
