import { PrismaClient } from '@prisma/client';

// This script uses your current DATABASE_URL from .env
// Make sure it points to your local SQLite database before running
const prisma = new PrismaClient();

async function exportToMySQL() {
  try {
    console.log('🔄 Starting database export from SQLite to MySQL...\n');

    // Get all users from current database
    const users = await prisma.user.findMany({
      include: {
        notificationPreference: true,
      }
    });

    console.log(`Found ${users.length} users to export`);
    console.log('Users:', users.map(u => `${u.username} (${u.email})`).join(', '));
    console.log('');

    // Export users as SQL INSERT statements
    console.log('-- SQL INSERT statements for MySQL:\n');
    console.log('-- First, clear existing data (optional):');
    console.log('-- TRUNCATE TABLE users;\n');

    for (const user of users) {
      const values = [
        user.username ? `'${user.username.replace(/'/g, "''")}'` : 'NULL',
        user.email ? `'${user.email.replace(/'/g, "''")}'` : 'NULL',
        user.password ? `'${user.password.replace(/'/g, "''")}'` : 'NULL',
        user.firstName ? `'${user.firstName.replace(/'/g, "''")}'` : 'NULL',
        user.lastName ? `'${user.lastName.replace(/'/g, "''")}'` : 'NULL',
        `'${user.role}'`,
        user.isActive ? '1' : '0',
        user.emailVerified ? '1' : '0',
        user.profileImage ? `'${user.profileImage.replace(/'/g, "''")}'` : 'NULL',
        user.lastLogin ? `'${user.lastLogin.toISOString()}'` : 'NULL',
        user.theme ? `'${user.theme.replace(/'/g, "''")}'` : 'NULL',
        user.language ? `'${user.language.replace(/'/g, "''")}'` : 'NULL',
        user.selectedTheme ? `'${user.selectedTheme.replace(/'/g, "''")}'` : 'NULL',
        user.selectedTweakcnTheme ? `'${user.selectedTweakcnTheme.replace(/'/g, "''")}'` : 'NULL',
        user.selectedRadius ? `'${user.selectedRadius.replace(/'/g, "''")}'` : 'NULL',
        user.importedThemeData ? `'${user.importedThemeData.replace(/'/g, "''")}'` : 'NULL',
        user.brandColors ? `'${user.brandColors.replace(/'/g, "''")}'` : 'NULL',
        user.sidebarVariant ? `'${user.sidebarVariant.replace(/'/g, "''")}'` : 'NULL',
        user.sidebarCollapsible ? `'${user.sidebarCollapsible.replace(/'/g, "''")}'` : 'NULL',
        user.sidebarSide ? `'${user.sidebarSide.replace(/'/g, "''")}'` : 'NULL',
        `'${user.createdAt.toISOString()}'`,
        `'${user.updatedAt.toISOString()}'`
      ].join(', ');

      console.log(`INSERT INTO users (username, email, password, first_name, last_name, role, is_active, email_verified, profile_image, last_login, theme, language, selected_theme, selected_tweakcn_theme, selected_radius, imported_theme_data, brand_colors, sidebar_variant, sidebar_collapsible, sidebar_side, created_at, updated_at) VALUES (${values});`);
    }

    console.log('\n✅ Export completed! Copy the SQL statements above and run them on your MySQL server.');

  } catch (error) {
    console.error('❌ Error during export:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportToMySQL();
