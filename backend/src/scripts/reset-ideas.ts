import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const now = new Date();
  const futureIdeas = await p.socialPost.findMany({
    where: { stage: "IDEA", ideaStatus: "Programmato" },
    select: { id: true, content: true, scheduledAt: true, promotedToId: true }
  });
  console.log("Total Programmato ideas:", futureIdeas.length);

  for (const idea of futureIdeas) {
    const isFuture = idea.scheduledAt && new Date(idea.scheduledAt) > now;
    const noDate = !idea.scheduledAt;

    if (isFuture || noDate) {
      if (idea.promotedToId) {
        const prod = await p.socialPost.findUnique({
          where: { id: idea.promotedToId },
          select: { id: true, mediaUrls: true }
        });
        if (prod && !prod.mediaUrls) {
          await p.socialPost.delete({ where: { id: prod.id } });
          console.log("  Deleted empty prod post", prod.id);
        }
      }
      await p.socialPost.update({
        where: { id: idea.id },
        data: { ideaStatus: "Da fare", promotedToId: null }
      });
      console.log("  Reset", idea.id, (idea.content || "").slice(0, 40), "-> Da fare");
    } else {
      console.log("  Skipped past", idea.id, (idea.content || "").slice(0, 40));
    }
  }
  console.log("Done");
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
