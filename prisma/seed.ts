import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const technologyCategory = await prisma.eventCategory.upsert({
    where: {
      slug: 'technology',
    },
    update: {},
    create: {
      name: 'Technology',
      slug: 'technology',
      description: 'Technology conferences, meetups and events.',
    },
  });

  const aiTag = await prisma.tag.upsert({
    where: {
      slug: 'ai',
    },
    update: {},
    create: {
      name: 'AI',
      slug: 'ai',
    },
  });

  const networkingTag = await prisma.tag.upsert({
    where: {
      slug: 'networking',
    },
    update: {},
    create: {
      name: 'Networking',
      slug: 'networking',
    },
  });

  let venue = await prisma.venue.findFirst({
    where: {
      name: 'Eventflow Test Venue',
      city: 'Bamberg',
    },
  });

  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        name: 'Eventflow Test Venue',
        addressLine1: 'Nürnberger Str. 1',
        city: 'Bamberg',
        postalCode: '96050',
        countryCode: 'DE',
      },
    });
  }

  console.log('Development seed created');

  console.log({
    categoryId: technologyCategory.id,
    venueId: venue.id,
    tagIds: [aiTag.id, networkingTag.id],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
