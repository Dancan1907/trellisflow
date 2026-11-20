import { Test, TestingModule } from '@nestjs/testing';
import { ExternalApiService } from './external-api.service';
import { SummariesService } from '../summaries/summaries.service';
import { ConflictException } from '@nestjs/common';

const mockSummaries = {
  create: jest.fn(),
  findAll: jest.fn(),
  findLatest: jest.fn(),
};

describe('ExternalApiService', () => {
  let service: ExternalApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalApiService, { provide: SummariesService, useValue: mockSummaries }],
    }).compile();

    service = module.get<ExternalApiService>(ExternalApiService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createSummary', () => {
    it('delegates to SummariesService', async () => {
      mockSummaries.create.mockResolvedValue({ id: 'sum-1' });
      const result = await service.createSummary('user-1', 'biz-1', {} as any);
      expect(result.id).toBe('sum-1');
    });

    it('handles idempotency when ConflictException is thrown', async () => {
      mockSummaries.create.mockRejectedValue(new ConflictException());
      mockSummaries.findAll.mockResolvedValue({
        items: [{ id: 'sum-1', date: '2026-11-20', unit: 'Farm #47' }],
      });

      const result = await service.createSummary('user-1', 'biz-1', {
        date: '2026-11-20',
        unit: 'Farm #47',
      } as any);

      expect(result.id).toBe('sum-1');
      expect((result as any).idempotent).toBe(true);
    });
  });

  describe('createBulkSummaries', () => {
    it('processes multiple summaries with partial success', async () => {
      mockSummaries.create
        .mockResolvedValueOnce({ id: 'sum-1' })
        .mockRejectedValueOnce(new Error('Invalid data'));

      const result = await service.createBulkSummaries('user-1', 'biz-1', {
        summaries: [{}, {}],
      } as any);

      expect(result[0].status).toBe('success');
      expect(result[1].status).toBe('error');
    });
  });
});
