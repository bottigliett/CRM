import prisma from '../config/database';

async function upgradeAdminToSuperAdmin() {
  try {
    const admin = await prisma.user.update({
      where: { username: 'admin' },
      data: { role: 'SUPER_ADMIN' },
    });

    console.log('✅ Admin upgraded to SUPER_ADMIN');
    console.log(`   User: ${admin.username} (${admin.email})`);
    console.log(`   Role: ${admin.role}`);
  } catch (error) {
    console.error('❌ Error upgrading admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

upgradeAdminToSuperAdmin();
