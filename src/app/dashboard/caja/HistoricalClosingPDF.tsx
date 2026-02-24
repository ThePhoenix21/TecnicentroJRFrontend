import React from 'react';
import type { CashClosingPrintResponse } from '@/types/cash.types';
import ReceiptClosingPDF from './ReceiptClosingPDF';

export interface HistoricalClosingPDFProps {
  data: CashClosingPrintResponse;
  logoSrc?: string;
  tenantName?: string;
}

const HistoricalClosingPDF: React.FC<HistoricalClosingPDFProps> = ({ data, logoSrc, tenantName }) => {
  return <ReceiptClosingPDF data={data} showOrders={false} logoSrc={logoSrc} tenantName={tenantName} />;
};

export default HistoricalClosingPDF;
