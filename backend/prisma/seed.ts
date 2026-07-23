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
      description: 'A portable development laptop with ample memory and battery life.',
      shortDescription: 'A capable laptop for software development.',
      status: 'ACTIVE',
      brand: 'Forge',
      tags: ['laptop', 'coding', 'developer'],
      attributes: { display: '14 inch', memory: '16 GB', storage: '512 GB SSD' },
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

  console.info(`Seeded products: ${sneakers.name}, ${laptop.name}`);
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
