import React from 'react';
import type { CashClosingPrintResponse } from '@/types/cash.types';
import ReceiptClosingPDF from './ReceiptClosingPDF';

export interface HistoricalClosingPDFProps {
  data: CashClosingPrintResponse;
}

const HistoricalClosingPDF: React.FC<HistoricalClosingPDFProps> = ({ data }) => {
  return <ReceiptClosingPDF data={data} showOrders={false} />;
};

export default HistoricalClosingPDF;
