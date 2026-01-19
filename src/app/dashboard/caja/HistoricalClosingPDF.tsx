import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Logo
const logo = '/icons/logo-jr-g.png';

// Registrar fuentes
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

const PAGE_WIDTH = 226.77; // 80mm
const PAGE_HEIGHT = 841.89; // A4 height
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

// Interfaces para la estructura del endpoint histórico
export interface HistoricalCashMovement {
  id: string;
  sessionId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  payment: string;
  description: string;
  createdAt: string;
  relatedOrderId?: string;
  order?: {
    id: string;
    clientId?: string;
    orderNumber: string;
    client?: any;
  };
}

export interface HistoricalCashSession {
  id: string;
  openedAt: string;
  closedAt: string;
  openedById: string;
  closedById: string;
  status: 'OPEN' | 'CLOSED';
  openingAmount: string;
  declaredAmount: string;
  closingAmount: string;
  StoreId: string;
  UserId: string;
  Store: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  cashMovements: HistoricalCashMovement[];
}

export interface HistoricalReceipt {
  businessName: string;
  address: string;
  phone: string;
  currentDate: string;
  currentTime: string;
  orderNumber: string;
  sellerName: string;
  clientName: string;
  clientDni: string;
  clientPhone: string;
  paidAmount: string;
  order: {
    id: string;
    openingAmount: string;
    closingAmount: string;
    status: string;
    openedAt: string;
    closedAt: string;
  };
}

export interface HistoricalClosingData {
  receipt: HistoricalReceipt;
  cashSession: HistoricalCashSession;
  movements: HistoricalCashMovement[];
}

export interface HistoricalClosingPDFProps {
  data: HistoricalClosingData;
}

const formatCurrency = (amount: string | number) => `S/${Number(amount).toFixed(2)}`;
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  } catch (e) {
    return dateStr;
  }
};

const HistoricalClosingPDF: React.FC<HistoricalClosingPDFProps> = ({ data }) => {
  const { receipt, cashSession, movements } = data;
  
  // Calcular totales
  const ingresos = movements
    .filter(m => m.type === 'INCOME')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  
  const egresos = movements
    .filter(m => m.type === 'EXPENSE')
    .reduce((sum, m) => sum + Number(m.amount), 0);
  
  const balanceTeorico = Number(cashSession.openingAmount) + ingresos - egresos;
  const diferencia = Number(cashSession.closingAmount) - balanceTeorico;

  // Agrupar ingresos por método de pago
  const paymentSummary = movements
    .filter(m => m.type === 'INCOME')
    .reduce((acc, m) => {
      const method = m.payment || 'OTROS';
      acc[method] = (acc[method] || 0) + Number(m.amount);
      return acc;
    }, {} as Record<string, number>);

  // Filtrar movimientos
  const expenses = movements.filter(m => m.type === 'EXPENSE');
  const manualIncomes = movements.filter(m => 
    m.type === 'INCOME' && 
    !m.relatedOrderId && 
    !m.description.toLowerCase().includes('apertura')
  );

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image src={logo} style={styles.logo} />
            </View>
            <Text style={styles.textBold}>{receipt.businessName}</Text>
            <Text>{receipt.address}</Text>
            <Text>Tel: {receipt.phone}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.title}>REPORTE DE CIERRE DE CAJA</Text>
          <View style={styles.divider} />

          {/* Info de sesión */}
          <View style={{ marginBottom: 6 }}>
            <View style={styles.row}>
              <Text>ID Sesión:</Text>
              <Text>{cashSession.id.substring(0, 8)}...</Text>
            </View>
            <View style={styles.row}>
              <Text>Apertura:</Text>
              <Text>{formatDate(cashSession.openedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Cierre:</Text>
              <Text>{formatDate(cashSession.closedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Tienda:</Text>
              <Text>{cashSession.Store.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Resumen Financiero */}
          <Text style={[styles.textBold, { marginBottom: 4 }]}>RESUMEN FINANCIERO</Text>
          <View style={styles.row}>
            <Text>Monto Apertura:</Text>
            <Text>{formatCurrency(cashSession.openingAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(+) Ingresos:</Text>
            <Text>{formatCurrency(ingresos)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(-) Egresos:</Text>
            <Text>{formatCurrency(egresos)}</Text>
          </View>
          
          <View style={[styles.divider, { borderBottomStyle: 'solid' }]} />
          
          <View style={[styles.row, styles.textBold]}>
            <Text>BALANCE TEÓRICO:</Text>
            <Text>{formatCurrency(balanceTeorico)}</Text>
          </View>
          <View style={[styles.row, styles.textBold]}>
            <Text>BALANCE REAL:</Text>
            <Text>{formatCurrency(cashSession.closingAmount)}</Text>
          </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text>Diferencia:</Text>
            <Text>{formatCurrency(diferencia)}</Text>
          </View>

          <View style={styles.divider} />

          {/* Resumen por Método de Pago */}
          <Text style={[styles.textBold, { marginBottom: 4 }]}>DESGLOSE DE INGRESOS</Text>
          {Object.entries(paymentSummary).map(([method, amount]) => (
            <View key={method} style={styles.row}>
              <Text>{method}:</Text>
              <Text>{formatCurrency(amount)}</Text>
            </View>
          ))}

          {/* Gastos */}
          {expenses.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.textBold, { marginBottom: 4 }]}>GASTOS REGISTRADOS</Text>
              {expenses.map((expense, idx) => (
                <View key={idx} style={{ marginBottom: 4 }}>
                  <View style={styles.row}>
                    <Text style={{ flex: 1, marginRight: 4 }}>{expense.description}</Text>
                    <Text style={styles.textBold}>{formatCurrency(expense.amount)}</Text>
                  </View>
                  <Text style={{ fontSize: 6, color: '#666' }}>
                    {formatDate(expense.createdAt)}
                  </Text>
                </View>
              ))}
            </>
          )}

          {/* Ingresos Manuales / Varios */}
          {manualIncomes.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.textBold, { marginBottom: 4 }]}>OTROS INGRESOS / COBROS</Text>
              {manualIncomes.map((income, idx) => (
                <View key={idx} style={{ marginBottom: 4 }}>
                  <View style={styles.row}>
                    <Text style={{ flex: 1, marginRight: 4 }}>
                      {income.description.replace(/ - Orden [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i, '')}
                    </Text>
                    <Text style={styles.textBold}>{formatCurrency(income.amount)}</Text>
                  </View>
                  <Text style={{ fontSize: 6, color: '#666' }}>
                    {formatDate(income.createdAt)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text>Impreso el: {receipt.currentDate} {receipt.currentTime}</Text>
            <Text style={{ marginTop: 2 }}>--- FIN DEL REPORTE ---</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
};

export default HistoricalClosingPDF;
