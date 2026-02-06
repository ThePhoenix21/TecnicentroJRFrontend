import React from 'react';
import type { CashClosingPrintResponse } from '@/types/cash.types';
import ReceiptClosingPDF from './ReceiptClosingPDF';

export interface HistoricalClosingPDFProps {
  data: CashClosingPrintResponse;
  logoSrc?: string;
}

const HistoricalClosingPDF: React.FC<HistoricalClosingPDFProps> = ({ data, logoSrc }) => {
  return <ReceiptClosingPDF data={data} showOrders={false} logoSrc={logoSrc} />;
};

export default HistoricalClosingPDF;
