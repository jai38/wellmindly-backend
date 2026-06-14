import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌱 Seeding comprehensive crisis hotlines...');

  // Delete existing hotlines to avoid duplicates
  await prisma.crisisHotline.deleteMany({});
  console.log('🗑️ Cleared existing hotlines from database.');

  // Load the parsed hotlines JSON
  const parsedPath = path.join(__dirname, '../../scratch/hotlines_parsed.json');
  const rawData = fs.readFileSync(parsedPath, 'utf8');
  const hotlines = JSON.parse(rawData);

  console.log(`📂 Loaded ${hotlines.length} hotlines from parsed JSON.`);

  // Insert all hotlines into the database
  let seededCount = 0;
  for (const h of hotlines) {
    // Basic verification of required fields
    if (!h.name || !h.country) continue;
    
    await prisma.crisisHotline.create({
      data: {
        name: h.name,
        description: h.description || '',
        phone: h.phone || 'Online Support',
        website: h.website || '',
        category: h.category || 'Crisis & Suicide Support',
        country: h.country,
      },
    });
    seededCount++;
  }

  console.log(`✅ Successfully seeded ${seededCount} crisis hotlines to the database.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
