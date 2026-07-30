import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const [customerRole, adminRole, supportRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'customer' },
      update: {},
      create: { name: 'customer', description: 'Storefront customer' },
    }),
    prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin', description: 'Store administrator' },
    }),
    prisma.role.upsert({
      where: { name: 'support_agent' },
      update: {},
      create: { name: 'support_agent', description: 'Customer support agent' },
    }),
  ]);

  const passwordHash = await hash('Commerce123!', 12);

  await Promise.all([
    prisma.user.upsert({
      where: { email: 'customer@example.com' },
      update: { roles: { set: [{ id: customerRole.id }] } },
      create: {
        email: 'customer@example.com',
        passwordHash,
        firstName: 'Nino',
        lastName: 'Customer',
        roles: { connect: { id: customerRole.id } },
        cart: { create: {} },
        wishlist: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { roles: { set: [{ id: adminRole.id }] } },
      create: {
        email: 'admin@example.com',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Admin',
        roles: { connect: { id: adminRole.id } },
        cart: { create: {} },
        wishlist: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'support@example.com' },
      update: { roles: { set: [{ id: supportRole.id }] } },
      create: {
        email: 'support@example.com',
        passwordHash,
        firstName: 'Mariam',
        lastName: 'Support',
        roles: { connect: { id: supportRole.id } },
        cart: { create: {} },
        wishlist: { create: {} },
      },
    }),
  ]);

  const [footwear, computers] = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'footwear' },
      update: {},
      create: {
        name: 'Footwear',
        slug: 'footwear',
        description: 'Everyday and performance footwear.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'computers' },
      update: {},
      create: {
        name: 'Computers',
        slug: 'computers',
        description: 'Computers for work, study, and creativity.',
      },
    }),
  ]);

  const sneakers = await prisma.product.upsert({
    where: { slug: 'urban-runner-black' },
    update: {},
    create: {
      categoryId: footwear.id,
      name: 'Urban Runner Black',
      slug: 'urban-runner-black',
      description: 'Lightweight black sneakers designed for all-day comfort.',
      shortDescription: 'Comfortable everyday black sneakers.',
      status: 'ACTIVE',
      brand: 'Nexa Motion',
      tags: ['black', 'sneakers', 'everyday'],
      attributes: { color: 'Black', material: 'Mesh' },
      isFeatured: true,
      images: {
        create: {
          url: 'https://images.example.com/urban-runner-black.jpg',
          altText: 'Urban Runner Black sneakers',
        },
      },
      variants: {
        create: [
          {
            sku: 'URB-BLK-42',
            name: 'Black / EU 42',
            price: '179.00',
            attributes: { color: 'Black', size: '42' },
            inventory: { create: { quantity: 24, lowStockThreshold: 5 } },
          },
          {
            sku: 'URB-BLK-43',
            name: 'Black / EU 43',
            price: '179.00',
            attributes: { color: 'Black', size: '43' },
            inventory: { create: { quantity: 18, lowStockThreshold: 5 } },
          },
        ],
      },
    },
  });

  const laptop = await prisma.product.upsert({
    where: { slug: 'forgebook-pro-14' },
    update: {},
    create: {
      categoryId: computers.id,
      name: 'ForgeBook Pro 14',
      slug: 'forgebook-pro-14',
      description:
        'A portable development laptop with ample memory and battery life.',
      shortDescription: 'A capable laptop for software development.',
      status: 'ACTIVE',
      brand: 'Forge',
      tags: ['laptop', 'coding', 'developer'],
      attributes: {
        display: '14 inch',
        memory: '16 GB',
        storage: '512 GB SSD',
      },
      isFeatured: true,
      images: {
        create: {
          url: 'https://images.example.com/forgebook-pro-14.jpg',
          altText: 'ForgeBook Pro 14 laptop',
        },
      },
      variants: {
        create: {
          sku: 'FORGE-14-16-512',
          name: '16 GB / 512 GB',
          price: '2499.00',
          attributes: { memory: '16 GB', storage: '512 GB SSD' },
          inventory: { create: { quantity: 9, lowStockThreshold: 3 } },
        },
      },
    },
  });

  const additionalCategories = await Promise.all(
    [
      ['phones', 'Phones', 'Smartphones and mobile accessories.'],
      ['audio', 'Audio', 'Headphones, speakers, and home audio.'],
      ['gaming', 'Gaming', 'Gaming hardware and accessories.'],
      ['home', 'Home', 'Useful products for every room.'],
      ['outdoors', 'Outdoors', 'Equipment for travel and outdoor activities.'],
      ['fitness', 'Fitness', 'Training and active lifestyle equipment.'],
      [
        'accessories',
        'Accessories',
        'Everyday personal and technology accessories.',
      ],
      ['office', 'Office', 'Products for productive workspaces.'],
    ].map(([slug, name, description]) =>
      prisma.category.upsert({
        where: { slug },
        update: {},
        create: { slug, name, description },
      }),
    ),
  );

  const catalogCategories = [footwear, computers, ...additionalCategories];
  const productTypes = [
    'Runner',
    'Laptop',
    'Phone',
    'Headphones',
    'Controller',
    'Lamp',
    'Backpack',
    'Fitness Kit',
    'Smart Watch',
    'Office Chair',
  ];
  const adjectives = [
    'Essential',
    'Classic',
    'Urban',
    'Pro',
    'Compact',
    'Premium',
    'Active',
    'Modern',
    'Everyday',
    'Studio',
  ];
  const brands = ['Nexa', 'Forge', 'Orbit', 'Summit', 'Pulse'];
  const colors = ['Black', 'White', 'Blue', 'Green', 'Red'];
  const targetProductCount = 500;
  const nonGeneratedProductCount = await prisma.product.count({
    where: { slug: { not: { startsWith: 'catalog-product-' } } },
  });
  const generatedProductCount = Math.max(
    0,
    targetProductCount - nonGeneratedProductCount,
  );
  const batchSize = 25;

  for (
    let batchStart = 0;
    batchStart < generatedProductCount;
    batchStart += batchSize
  ) {
    const batchEnd = Math.min(batchStart + batchSize, generatedProductCount);

    await Promise.all(
      Array.from({ length: batchEnd - batchStart }, (_, batchOffset) => {
        const sequence = batchStart + batchOffset + 3;
        const category = catalogCategories[sequence % catalogCategories.length];
        const productType = productTypes[sequence % productTypes.length];
        const adjective =
          adjectives[
            Math.floor(sequence / productTypes.length) % adjectives.length
          ];
        const brand = brands[sequence % brands.length];
        const color = colors[sequence % colors.length];
        const paddedSequence = sequence.toString().padStart(3, '0');
        const name = `${brand} ${adjective} ${productType} ${paddedSequence}`;
        const slug = `catalog-product-${paddedSequence}`;
        const basePrice = 40 + ((sequence * 37) % 1960);

        return prisma.product.upsert({
          where: { slug },
          update: {},
          create: {
            categoryId: category.id,
            name,
            slug,
            description: `${name} is a dependable ${productType.toLowerCase()} designed for daily use.`,
            shortDescription: `${adjective} ${productType.toLowerCase()} by ${brand}.`,
            status: 'ACTIVE',
            brand,
            tags: [
              category.slug,
              productType.toLowerCase().replace(' ', '-'),
              color.toLowerCase(),
            ],
            attributes: { color, collection: adjective },
            isFeatured: sequence % 25 === 0,
            images: {
              create: {
                url: `https://picsum.photos/seed/catalog-${paddedSequence}/800/800`,
                altText: name,
              },
            },
            variants: {
              create: [
                {
                  sku: `CAT-${paddedSequence}-STD`,
                  name: `${color} / Standard`,
                  price: basePrice.toFixed(2),
                  attributes: { color, size: 'Standard' },
                  inventory: {
                    create: {
                      quantity: (sequence * 13) % 80,
                      lowStockThreshold: 5,
                    },
                  },
                },
                {
                  sku: `CAT-${paddedSequence}-PLUS`,
                  name: `${color} / Plus`,
                  price: (basePrice * 1.2).toFixed(2),
                  attributes: { color, size: 'Plus' },
                  inventory: {
                    create: {
                      quantity: (sequence * 17) % 60,
                      lowStockThreshold: 5,
                    },
                  },
                },
              ],
            },
          },
        });
      }),
    );
  }

  const surplusGeneratedSlugs = Array.from(
    { length: Math.max(0, 498 - generatedProductCount) },
    (_, index) =>
      `catalog-product-${(generatedProductCount + index + 3)
        .toString()
        .padStart(3, '0')}`,
  );

  if (surplusGeneratedSlugs.length > 0) {
    await prisma.product.deleteMany({
      where: { slug: { in: surplusGeneratedSlugs } },
    });
  }

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Ten percent off a first purchase.',
      discountType: 'PERCENTAGE',
      discountValue: '10',
      minimumSpend: '50',
      perUserLimit: 1,
      startsAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  const totalProductCount = await prisma.product.count();

  console.info(
    `Seeded the catalog up to ${targetProductCount} products, including ${sneakers.name} and ${laptop.name}.`,
  );
  console.info(`Products currently in database: ${totalProductCount}`);
  console.info('Development password for seeded users: Commerce123!');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
