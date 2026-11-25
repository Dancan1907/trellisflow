/**
 * Synthetic Safaricom-style M-Pesa SMS examples for deterministic parser tests.
 *
 * These are fabricated fixtures: names, phone numbers, references, and amounts
 * do not belong to real customers. They are contract expectations for tests,
 * not claims about the exact wording of every Safaricom message template.
 */
import { MpesaExtractionDraft } from './mpesa-extraction.schema';

export interface MpesaGoldenFixture {
  id: string;
  description: string;
  sms: string;
  expected: MpesaExtractionDraft;
}

export const MPESA_GOLDEN_FIXTURES: readonly MpesaGoldenFixture[] = [
  {
    id: 'money-received',
    description: 'money received from another person',
    sms: 'ABC123XYZ9 Confirmed. You have received Ksh2,500.00 from TEST SENDER 0712345678 on 24/11/26 at 10:30 AM. New M-PESA balance is Ksh8,400.00.',
    expected: {
      type: 'INCOME',
      amount: 2500,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Money received from TEST SENDER',
      counterparty: 'TEST SENDER',
      mpesaReference: 'ABC123XYZ9',
      confidence: 0.99,
      uncertainties: [],
    },
  },
  {
    id: 'money-sent',
    description: 'money sent to another person',
    sms: 'DEF456XYZ1 Confirmed. Ksh850.00 sent to TEST RECIPIENT 0723456789 on 24/11/26 at 11:05 AM. Transaction cost, Ksh12.00. New M-PESA balance is Ksh7,538.00.',
    expected: {
      type: 'EXPENSE',
      amount: 850,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Money sent to TEST RECIPIENT',
      counterparty: 'TEST RECIPIENT',
      mpesaReference: 'DEF456XYZ1',
      confidence: 0.99,
      uncertainties: [],
    },
  },
  {
    id: 'buy-goods',
    description: 'Buy Goods / Till payment',
    sms: 'GHI789XYZ2 Confirmed. Ksh450.00 paid to TEST MARKET 554433 on 24/11/26 at 12:15 PM. New M-PESA balance is Ksh7,088.00.',
    expected: {
      type: 'EXPENSE',
      amount: 450,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Buy Goods payment to TEST MARKET',
      counterparty: 'TEST MARKET',
      mpesaReference: 'GHI789XYZ2',
      confidence: 0.98,
      uncertainties: [],
    },
  },
  {
    id: 'paybill',
    description: 'PayBill payment with an account number',
    sms: 'JKL012XYZ3 Confirmed. Ksh1,200.00 sent to TEST WATER SERVICES for account 000123 on 24/11/26 at 1:20 PM. New M-PESA balance is Ksh5,888.00.',
    expected: {
      type: 'EXPENSE',
      amount: 1200,
      currency: 'KES',
      date: '2026-11-24',
      description: 'PayBill payment to TEST WATER SERVICES',
      counterparty: 'TEST WATER SERVICES',
      mpesaReference: 'JKL012XYZ3',
      confidence: 0.98,
      uncertainties: [],
    },
  },
  {
    id: 'cash-withdrawal',
    description: 'cash withdrawal (account movement, not an expense)',
    sms: 'MNO345XYZ4 Confirmed. Ksh2,000.00 withdrawn from 07XX XXX XXX at TEST AGENT on 24/11/26 at 2:10 PM. New M-PESA balance is Ksh3,888.00.',
    expected: {
      type: 'TRANSFER',
      amount: 2000,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Cash withdrawal from M-PESA',
      counterparty: 'TEST AGENT',
      mpesaReference: 'MNO345XYZ4',
      confidence: 0.94,
      uncertainties: ['Destination cash account must be selected in the transfer workflow.'],
    },
  },
  {
    id: 'cash-deposit',
    description: 'cash deposited into M-PESA (account movement, not income)',
    sms: 'PQR678XYZ5 Confirmed. Ksh1,000.00 deposited to your M-PESA account at TEST AGENT on 24/11/26 at 2:45 PM. New M-PESA balance is Ksh4,888.00.',
    expected: {
      type: 'TRANSFER',
      amount: 1000,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Cash deposit to M-PESA',
      counterparty: 'TEST AGENT',
      mpesaReference: 'PQR678XYZ5',
      confidence: 0.93,
      uncertainties: ['Source cash account must be selected in the transfer workflow.'],
    },
  },
  {
    id: 'reversal',
    description: 'reversal notice (must not become ordinary income or expense)',
    sms: 'STU901XYZ6 Reversal of transaction DEF456XYZ1. Ksh850.00 has been reversed to your M-PESA account on 24/11/26. New M-PESA balance is Ksh5,738.00.',
    expected: {
      type: 'UNSUPPORTED',
      amount: 850,
      currency: 'KES',
      date: '2026-11-24',
      description: 'M-PESA transaction reversal',
      counterparty: null,
      mpesaReference: 'STU901XYZ6',
      confidence: 0.98,
      uncertainties: ['Reversal must be reconciled with the original transaction.'],
    },
  },
  {
    id: 'fuliza-advance',
    description: 'Fuliza / overdraft advance (must not become income)',
    sms: 'VWX234XYZ7 Confirmed. Fuliza M-PESA amount advanced is Ksh300.00 on 24/11/26 at 3:00 PM. Outstanding Fuliza amount is Ksh300.00.',
    expected: {
      type: 'UNSUPPORTED',
      amount: 300,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Fuliza overdraft advance',
      counterparty: null,
      mpesaReference: 'VWX234XYZ7',
      confidence: 0.97,
      uncertainties: ['Fuliza is a loan or overdraft event, not ordinary income.'],
    },
  },
];
