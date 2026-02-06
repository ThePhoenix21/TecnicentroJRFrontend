import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CashClosingPrintResponse } from '@/types/cash.types';

// Registrar fuentes
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

const PAGE_WIDTH = 226.77; // 80mm
const PAGE_HEIGHT = 841.89; // A4 height (limit content dynamically in viewer if needed)
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 0,
    width: PAGE_WIDTH,
    maxWidth: PAGE_WIDTH,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  section: {
    margin: 0,
    padding: MARGIN,
    width: CONTENT_WIDTH,
  },
  header: {
    marginBottom: 8,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: {
    marginTop: 25,
    width: '100px',
    height: 'auto',
  },
  title: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
  footer: {
    marginTop: 10,
    fontSize: 7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export interface ReceiptClosingPDFProps {
  data: CashClosingPrintResponse;
  showOrders?: boolean;
  logoSrc?: string;
  tenantName?: string;
}

const formatCurrency = (amount?: number) => `S/${Number(amount ?? 0).toFixed(2)}`;
const formatDate = (dateStr?: string) => {
  try {
    return dateStr ? format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es }) : '';
  } catch (e) {
    return dateStr;
  }
};

const ReceiptClosingPDF: React.FC<ReceiptClosingPDFProps> = ({ data, showOrders = true, logoSrc, tenantName }) => {
  const {
    store,
    session,
    balance,
    paymentSummary,
    expenseSummary,
    orders = [],
    expenses = [],
    printedAt,
    printedBy,
  } = data;

  const resolvedPaymentSummary = paymentSummary && Object.keys(paymentSummary).length > 0
    ? paymentSummary
    : undefined;
  const resolvedExpenseSummary = expenseSummary && Object.keys(expenseSummary).length > 0
    ? expenseSummary
    : undefined;
  const formatPaymentMethod = (method?: string) => (method && method !== 'NINGUNO' ? method : '');
  const groupedOrders = orders.reduce((acc, order) => {
    if (!acc[order.orderNumber]) {
      acc[order.orderNumber] = [];
    }
    acc[order.orderNumber].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);
  const groupedOrderEntries = Object.entries(groupedOrders);

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              {!!logoSrc && <Image src={logoSrc} style={styles.logo} />}
            </View>
            {!!tenantName && (
              <Text style={[styles.textBold, { marginBottom: 4 }, { fontSize: 14 }]}>{tenantName}</Text>
            )}
            <Text style={styles.textBold}>tienda: {store.name}</Text>
            <Text>{store.address}</Text>
            <Text>Tel: {store.phone}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.title}>REPORTE DE CIERRE DE CAJA</Text>
          <View style={styles.divider} />

          {/* Info de sesión */}
          <View style={{ marginBottom: 6 }}>
            <View style={styles.row}>
              <Text>Apertura:</Text>
              <Text>{formatDate(session.openedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Por:</Text>
              <Text>{session.openedBy}</Text>
            </View>
            <View style={{ marginTop: 2 }} />
            <View style={styles.row}>
              <Text>Cierre:</Text>
              <Text>{formatDate(session.closedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Por:</Text>
              <Text>{session.closedBy}</Text>
            </View>
          </View>

          <View style={styles.divider} />
          
          {/* Balance */}
          <View style={[styles.row, styles.textBold]}>
            <Text>BALANCE TEORICO EN EFECTIVO: </Text>
            <Text>{formatCurrency(balance.closingAmount)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text>Balance declarado:</Text>
            <Text>{formatCurrency(balance.declaredAmount)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text>Diferencia:</Text>
            <Text>{formatCurrency(balance.difference)}</Text>
          </View>

          <View style={styles.divider} />
          
          {/* Resumen Financiero */}
          <Text style={[styles.textBold, { marginBottom: 4 }]}>RESUMEN FINANCIERO</Text>
          <View style={styles.row}>
            <Text>Monto Apertura:</Text>
            <Text>{formatCurrency(balance.openingAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(+) Ingresos totales:</Text>
            <Text>{formatCurrency(balance.totalIngresos)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(-) Egresos totales:</Text>
            <Text>{formatCurrency(balance.totalSalidas)}</Text>
          </View>          
          
          <View style={styles.divider} />          

          {/* Resumen de Ingresos por Método de Pago */}
          {resolvedPaymentSummary && (
            <>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>DESGLOSE DE INGRESOS</Text>
              {Object.entries(resolvedPaymentSummary).map(([method, amount]) => (
                <View key={method} style={styles.row}>
                  <Text>{method}:</Text>
                  <Text>{formatCurrency(amount)}</Text>
                </View>
              ))}              
            </>
          )}

          {/* Resumen de Egresos por Método de Pago */}
          {resolvedExpenseSummary && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.textBold, { marginBottom: 4 }]}>DESGLOSE DE EGRESOS</Text>
              {Object.entries(resolvedExpenseSummary).map(([method, amount]) => (
                <View key={`expense-${method}`} style={styles.row}>
                  <Text>{method}:</Text>
                  <Text>{formatCurrency(amount)}</Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />

          {/* Ingresos */}
          {groupedOrderEntries.length > 0 && (
            <>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>INGRESOS REGISTRADOS</Text>
              {groupedOrderEntries.map(([ticket, ticketOrders]) => (
                <View key={ticket} style={{ marginBottom: 6 }}>
                  <Text style={[styles.textBold, { marginBottom: 2 }]}>Ticket {ticket}</Text>
                  {ticketOrders.map((order, idx) => (
                    <View key={`${ticket}-${idx}`} style={styles.row}>
                      <Text style={{ flex: 1, marginRight: 4 }}>
                        {order.description}
                        {formatPaymentMethod(order.paymentMethod) && (
                          <Text style={{ fontSize: 7, color: '#666' }}> ({order.paymentMethod})</Text>
                        )}
                      </Text>
                      <Text style={styles.textBold}>{formatCurrency(order.amount)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}

          {/* Gastos */}
          {expenses.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.textBold, { marginBottom: 4 }]}>GASTOS REGISTRADOS</Text>
              {expenses.map((expense, idx) => (
                <View key={`${expense.description}-${idx}`} style={{ marginBottom: 4 }}>
                  <View style={styles.row}>
                    <Text style={{ flex: 1, marginRight: 4 }}>
                      {expense.description}
                      {' '}
                      <Text style={{ fontSize: 7, color: '#666' }}>({expense.paymentMethod})</Text>
                    </Text>
                    <Text style={styles.textBold}>{formatCurrency(expense.amount)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={[styles.divider, { borderBottomStyle: 'solid' }]} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text>Impreso el: {formatDate(printedAt)}</Text>
            {printedBy && <Text>Impreso por: {printedBy}</Text>}
            <Text style={{ marginTop: 2 }}>--- FIN DEL REPORTE ---</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
};

export default ReceiptClosingPDF;
