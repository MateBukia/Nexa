import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(now = new Date()) {
    const periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - 30);
    const previousStart = new Date(periodStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 30);
    const revenueWhere: Prisma.OrderWhereInput = {
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    };

    const [
      currentSales,
      previousSales,
      periodOrders,
      totalOrders,
      orderStatuses,
      inventory,
      topProducts,
      supportStatuses,
      openSupport,
      activeProducts,
      customers,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...revenueWhere, createdAt: { gte: periodStart, lt: now } },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.aggregate({
        where: {
          ...revenueWhere,
          createdAt: { gte: previousStart, lt: periodStart },
        },
        _sum: { grandTotal: true },
      }),
      this.prisma.order.count({
        where: { ...revenueWhere, createdAt: { gte: periodStart, lt: now } },
      }),
      this.prisma.order.count(),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.inventory.findMany({
        select: {
          id: true,
          quantity: true,
          reservedQuantity: true,
          lowStockThreshold: true,
          variant: {
            select: {
              id: true,
              sku: true,
              name: true,
              product: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { order: revenueWhere },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.supportTicket.count({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
        },
      }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { roles: { some: { name: 'customer' } } },
      }),
    ]);

    const lowStockInventory = inventory
      .filter(
        (item) =>
          item.quantity - item.reservedQuantity <= item.lowStockThreshold,
      )
      .sort(
        (a, b) =>
          a.quantity - a.reservedQuantity - (b.quantity - b.reservedQuantity),
      );
    const lowStockItems = lowStockInventory.slice(0, 10);
    const revenue = Number(currentSales._sum?.grandTotal ?? 0);
    const previousRevenue = Number(previousSales._sum?.grandTotal ?? 0);

    return {
      period: { days: 30, from: periodStart, to: now },
      sales: {
        revenue,
        previousRevenue,
        changePercent: previousRevenue
          ? ((revenue - previousRevenue) / previousRevenue) * 100
          : null,
        orders: periodOrders,
      },
      totals: {
        orders: totalOrders,
        activeProducts,
        customers,
        openSupport,
        lowStock: lowStockInventory.length,
      },
      ordersByStatus: orderStatuses.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      supportByStatus: supportStatuses.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      lowStock: lowStockItems.map((item) => ({
        inventoryId: item.id,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        variantId: item.variant.id,
        variantName: item.variant.name,
        sku: item.variant.sku,
        available: item.quantity - item.reservedQuantity,
        threshold: item.lowStockThreshold,
      })),
      topProducts: topProducts.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        units: item._sum?.quantity ?? 0,
        revenue: Number(item._sum?.totalPrice ?? 0),
      })),
    };
  }
}
