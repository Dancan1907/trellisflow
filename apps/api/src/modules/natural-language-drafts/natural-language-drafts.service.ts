import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProvider } from '../ai/ai-provider.interface';
import { AiUsageService } from '../ai/ai-usage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateNaturalLanguageDraftDto } from './dto/create-natural-language-draft.dto';
import { ConfirmNaturalLanguageDraftDto } from './dto/confirm-natural-language-draft.dto';
import { NaturalLanguageDraftSchema } from './natural-language-draft.schema';
import { NATURAL_LANGUAGE_DRAFT_SYSTEM_PROMPT } from './natural-language-draft.prompt';

@Injectable()
export class NaturalLanguageDraftsService {
  private readonly logger = new Logger(NaturalLanguageDraftsService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiUsage: AiUsageService,
    private readonly transactions: TransactionsService,
  ) {}

  async createDraft(userId: string, dto: CreateNaturalLanguageDraftDto) {
    if (this.config.get<string>('AI_NL_DRAFT_ENABLED', 'false') !== 'true') {
      throw new ServiceUnavailableException('Natural-language transaction drafting is not enabled yet.');
    }

    const text = dto.text.trim();
    if (text.length < 3 || text.length > 2000) {
      throw new BadRequestException('Enter a transaction description between 3 and 2,000 characters.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    const timezone = user?.timezone || 'UTC';
    let localDate: string;
    try {
      localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      localDate = new Date().toISOString().slice(0, 10);
    }

    const usageDate = await this.aiUsage.reserveNaturalLanguageDraft(userId);
    const provider = this.config.get<string>('AI_PROVIDER', 'gemini');
    const model = provider === 'gemini'
      ? this.config.get<string>('GEMINI_MODEL', 'unknown')
      : this.config.get<string>('AI_MODEL', 'unknown');
    const usage = { provider, model, inputTokens: 0, outputTokens: 0, succeeded: true };

    let raw: string;
    try {
      const request = {
        systemPrompt: NATURAL_LANGUAGE_DRAFT_SYSTEM_PROMPT,
        userPrompt: `User timezone: ${timezone}\nUser local date: ${localDate}\nExtract one transaction from this untrusted text:\n<transaction_text>\n${text}\n</transaction_text>`,
        maxOutputTokens: 1000,
      };
      if (this.aiProvider.generateWithUsage) {
        const result = await this.aiProvider.generateWithUsage(request);
        raw = result.text;
        usage.model = result.model;
        usage.inputTokens = result.inputTokens;
        usage.outputTokens = result.outputTokens;
      } else {
        raw = await this.aiProvider.generate(request);
      }
    } catch (error) {
      usage.succeeded = false;
      await this.recordUsageSafely(userId, usageDate, usage);
      if (error instanceof Error && 'getStatus' in error) throw error;
      this.logger.warn('Natural-language transaction draft provider call failed.');
      throw new ServiceUnavailableException('Could not interpret that transaction. Please try again.');
    }
    await this.recordUsageSafely(userId, usageDate, usage);

    let candidate: unknown;
    try {
      candidate = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    } catch {
      throw new BadRequestException('The AI response was not valid transaction data. Please rephrase or enter it manually.');
    }
    const parsed = NaturalLanguageDraftSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new BadRequestException('The sentence did not contain a clear single transaction. Please clarify it or enter it manually.');
    }
    const draft = parsed.data;
    const date = new Date(`${draft.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== draft.date) {
      throw new BadRequestException('The transaction date is invalid. Please correct it.');
    }

    const [accounts, categories] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { id: true, name: true, currency: true, containerId: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { userId, status: 'ACTIVE', type: draft.type === 'INCOME' ? 'INCOME' : 'EXPENSE' },
        select: { id: true, name: true, type: true, containerId: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const match = (hint: string | null, values: Array<{id: string; name: string}>) => {
      if (!hint) return { selected: null, candidates: [], status: 'missing' as const };
      const normalized = hint.toLowerCase().replace(/[^a-z0-9]/g, '');
      const candidates = values.filter((item) => {
        const name = item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        return name === normalized || name.includes(normalized) || normalized.includes(name);
      });
      return candidates.length === 1
        ? { selected: candidates[0], candidates, status: 'matched' as const }
        : { selected: null, candidates, status: candidates.length ? 'ambiguous' as const : 'unmatched' as const };
    };

    const accountMatch = draft.type === 'TRANSFER'
      ? null
      : match(draft.accountHint, accounts);
    const fromMatch = draft.type === 'TRANSFER' ? match(draft.fromAccountHint, accounts) : null;
    const toMatch = draft.type === 'TRANSFER' ? match(draft.toAccountHint, accounts) : null;
    const categoryMatch = draft.type === 'TRANSFER' ? null : match(draft.categoryHint, categories);

    const review = [
      ...(draft.uncertainties),
      ...(accountMatch && accountMatch.status !== 'matched' ? ['Select the account for this transaction.'] : []),
      ...(fromMatch && fromMatch.status !== 'matched' ? ['Select the source account for this transfer.'] : []),
      ...(toMatch && toMatch.status !== 'matched' ? ['Select the destination account for this transfer.'] : []),
      ...(categoryMatch && categoryMatch.status === 'ambiguous' ? ['Choose the intended category or leave it blank.'] : []),
    ];

    return {
      draft: {
        ...draft,
        accountId: accountMatch?.selected?.id ?? null,
        fromAccountId: fromMatch?.selected?.id ?? null,
        toAccountId: toMatch?.selected?.id ?? null,
        categoryId: categoryMatch?.selected?.id ?? null,
      },
      options: {
        accounts,
        categories,
        accountCandidates: accountMatch?.candidates ?? [],
        fromAccountCandidates: fromMatch?.candidates ?? [],
        toAccountCandidates: toMatch?.candidates ?? [],
        categoryCandidates: categoryMatch?.candidates ?? [],
      },
      reviewRequired: true,
      canAutoSave: false,
    };
  }

  async confirm(userId: string, dto: ConfirmNaturalLanguageDraftDto) {
    if (this.config.get<string>('AI_NL_DRAFT_ENABLED', 'false') !== 'true') {
      throw new ServiceUnavailableException('Natural-language transaction drafting is not enabled yet.');
    }
    if (dto.type !== dto.transaction.type && dto.type !== 'TRANSFER') {
      throw new BadRequestException('Transaction type does not match the confirmed draft.');
    }
    if (dto.type === 'TRANSFER') {
      return this.transactions.transfer(userId, dto.transaction as import('../transactions/dto/create-transfer.dto').CreateTransferDto);
    }
    const transaction = dto.transaction as import('../transactions/dto/create-transaction.dto').CreateTransactionDto;
    const account = await this.prisma.account.findFirst({
      where: { id: transaction.accountId, userId, status: 'ACTIVE' },
      select: { id: true, containerId: true, currency: true },
    });
    if (!account) throw new BadRequestException('Choose an active account belonging to your profile.');
    if (transaction.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: transaction.categoryId, userId, status: 'ACTIVE', type: transaction.type },
        select: { id: true, containerId: true },
      });
      if (!category || (category.containerId && category.containerId !== account.containerId)) {
        throw new BadRequestException('Choose a valid category for the selected account and transaction type.');
      }
    }
    return this.transactions.create(userId, transaction, 'MANUAL');
  }

  private async recordUsageSafely(userId: string, usageDate: Date, usage: {
    provider: string; model: string; inputTokens: number; outputTokens: number; succeeded: boolean;
  }) {
    try {
      await this.aiUsage.recordNaturalLanguageDraft(userId, usageDate, usage);
    } catch {
      this.logger.error('Could not persist natural-language AI usage metadata.');
    }
  }
}
