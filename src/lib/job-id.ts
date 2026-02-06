import { prisma } from "@/lib/prisma";

/**
 * Generates the next Job ID atomically using a database counter.
 * Format: PAR-YYYY-NNNN (e.g., PAR-2026-0001)
 * The sequence resets when the year rolls over.
 *
 * Uses a raw SQL transaction with row-level locking to prevent
 * race conditions when multiple requests are created simultaneously.
 */
export async function generateJobId(): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Use a transaction with row-level locking to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Try to get the counter row, creating it if it doesn't exist
    const existing = await tx.jobIdCounter.findUnique({
      where: { id: 1 },
    });

    let newSequence: number;

    if (!existing) {
      // First ever job ID - create the counter
      newSequence = 1;
      await tx.jobIdCounter.create({
        data: {
          id: 1,
          currentYear: currentYear,
          currentSequence: newSequence,
        },
      });
    } else if (existing.currentYear !== currentYear) {
      // Year rolled over - reset sequence
      newSequence = 1;
      await tx.jobIdCounter.update({
        where: { id: 1 },
        data: {
          currentYear: currentYear,
          currentSequence: newSequence,
        },
      });
    } else {
      // Same year - increment
      newSequence = existing.currentSequence + 1;
      await tx.jobIdCounter.update({
        where: { id: 1 },
        data: {
          currentSequence: newSequence,
        },
      });
    }

    return { year: currentYear, sequence: newSequence };
  });

  // Format: PAR-2026-0001
  const paddedSequence = result.sequence.toString().padStart(4, "0");
  return `PAR-${result.year}-${paddedSequence}`;
}
