-- AlterTable
ALTER TABLE "users" ADD COLUMN "brand_colors" TEXT;
ALTER TABLE "users" ADD COLUMN "imported_theme_data" TEXT;
ALTER TABLE "users" ADD COLUMN "selected_radius" TEXT DEFAULT '0.5rem';
ALTER TABLE "users" ADD COLUMN "selected_theme" TEXT;
ALTER TABLE "users" ADD COLUMN "selected_tweakcn_theme" TEXT;
ALTER TABLE "users" ADD COLUMN "sidebar_collapsible" TEXT DEFAULT 'offcanvas';
ALTER TABLE "users" ADD COLUMN "sidebar_side" TEXT DEFAULT 'left';
ALTER TABLE "users" ADD COLUMN "sidebar_variant" TEXT DEFAULT 'inset';
