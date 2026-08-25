-- Migration: SocialPostMedia join table → SocialPost.mediaUrls JSON field
-- Run this BEFORE dropping SocialMedia and SocialPostMedia tables

-- Step 1: Populate mediaUrls on SocialPost from existing join table data
UPDATE social_posts sp
SET media_urls = (
  SELECT JSON_ARRAYAGG(sm.r2_url)
  FROM social_post_media spm
  JOIN social_media sm ON sm.id = spm.media_id
  WHERE spm.post_id = sp.id
  ORDER BY spm.position
)
WHERE EXISTS (
  SELECT 1 FROM social_post_media spm WHERE spm.post_id = sp.id
);

-- Step 2: Verify migration (run manually and inspect)
-- SELECT id, media_urls FROM social_posts WHERE media_urls IS NOT NULL LIMIT 10;

-- Step 3: After verification, the SocialMedia and SocialPostMedia models
-- can be removed from schema.prisma and their tables dropped via:
-- DROP TABLE IF EXISTS social_post_media;
-- DROP TABLE IF EXISTS social_media;
-- ponytail: keep tables until migration is verified in production
