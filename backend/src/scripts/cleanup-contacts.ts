import prisma from '../config/database';

async function cleanup() {
  try {
    await prisma.contact.deleteMany({});
    console.log('✅ All contacts deleted');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanup();
