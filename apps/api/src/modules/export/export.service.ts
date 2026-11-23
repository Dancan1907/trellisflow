import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { QueryExportDto } from './dto/query-export.dto';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async generateJson(userId: string) {
    const [user, containers, accounts, categories, transactions, budgets, goals, holdings] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, reportingCurrency: true, tier: true },
        }),
        this.prisma.container.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.account.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.category.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null },
          orderBy: { date: 'desc' },
        }),
        this.prisma.budget.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.savingsGoal.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.holding.findMany({ where: { userId, deletedAt: null } }),
      ]);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        user,
        data: { containers, accounts, categories, transactions, budgets, goals, holdings },
      },
      null,
      2,
    );
  }

  async generateCsv(userId: string, query: QueryExportDto) {
    const where: any = { userId, deletedAt: null };

    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    });

    const header = 'Date,Type,Amount,Currency,Account,Category,Description\n';
    const rows = transactions
      .map((t) => {
        const date = t.date.toISOString().split('T')[0];
        const desc = (t.description || '').replace(/,/g, ' ');
        const cat = (t.category?.name || 'Uncategorized').replace(/,/g, ' ');
        const acc = (t.account?.name || 'Unknown').replace(/,/g, ' ');
        return `${date},${t.type},${t.amount},${t.currency},${acc},${cat},${desc}`;
      })
      .join('\n');

    return header + rows;
  }

  async generatePdf(userId: string): Promise<Buffer> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const latestSnapshot = await this.prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const accounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null, status: 'ACTIVE' },
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('TrellisFlow', { align: 'center' });
      doc.fontSize(14).text('Data Export — Net Worth Statement', { align: 'center' });
      doc.moveDown();

      doc.fontSize(10).text(`Prepared for: ${user.name} (${user.email})`);
      doc.text(`Export Date: ${new Date().toISOString().split('T')[0]}`);
      doc.moveDown();

      if (latestSnapshot) {
        doc.fontSize(12).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .text(
            `Total Net Worth: ${latestSnapshot.currency} ${Number(latestSnapshot.totalNetWorth).toLocaleString()}`,
          );
        doc.text(
          `Personal: ${latestSnapshot.currency} ${Number(latestSnapshot.personalNetWorth).toLocaleString()}`,
        );
        doc.text(
          `Investments: ${latestSnapshot.currency} ${Number(latestSnapshot.investmentsNetWorth).toLocaleString()}`,
        );
        doc.text(
          `Businesses: ${latestSnapshot.currency} ${Number(latestSnapshot.businessesNetWorth).toLocaleString()}`,
        );
        doc.moveDown();
      }

      // Accounts List
      doc.fontSize(12).text('Accounts Breakdown', { underline: true });
      doc.moveDown(0.5);

      if (accounts.length === 0) {
        doc.fontSize(10).text('No active accounts.');
      } else {
        accounts.forEach((acc) => {
          const type = acc.category === 'ASSET' ? 'Asset' : 'Liability';
          doc.fontSize(10).text(`${acc.name} (${acc.accountType} - ${type})`);
          doc.text(`Balance: ${acc.currency} ${Number(acc.currentBalance).toLocaleString()}`, {
            indent: 20,
          });
          doc.moveDown(0.5);
        });
      }

      doc.moveDown();
      doc
        .fontSize(8)
        .fillColor('gray')
        .text('Generated by TrellisFlow. All rights reserved.', { align: 'center' });

      doc.end();
    });
  }
}
