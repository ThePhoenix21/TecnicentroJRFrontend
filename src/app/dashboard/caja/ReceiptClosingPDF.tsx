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

// Interfaces
export interface OrderItem {
  orderNumber: string;
  quantity: number;
  description: string;
  paymentMethod: string;
  price: number;
  status: string;
}

export interface ExpenseItem {
  description: string;
  amount: number;
  time: string;
}

export interface CashMovement {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  orderId?: string;
  createdAt: string;
}

export interface ClosingResponse {
  message: string;
  cashBalance: {
    openingAmount: number;
    totalIngresos: number;
    totalSalidas: number;
    balanceActual: number;
  };
  closingReport: {
    openedAt: string;
    closedAt: string;
    openedBy: string;
    closedBy: string;
    openingAmount: number;
    closingAmount: number;
    storeName: string;
    storeAddress: string;
    storePhone: string;
    printedAt: string;
    orders: OrderItem[];
    paymentSummary?: Record<string, number>;
    expenses?: ExpenseItem[];
    declaredAmount?: number;
    difference?: number;
  };
  movements: CashMovement[];
}

export interface ReceiptClosingPDFProps {
  data: ClosingResponse;
}

const formatCurrency = (amount: number) => `S/${Number(amount).toFixed(2)}`;
const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  } catch (e) {
    return dateStr;
  }
};

const ReceiptClosingPDF: React.FC<ReceiptClosingPDFProps> = ({ data }) => {
  const { closingReport, cashBalance, movements = [] } = data;
  
  // Calcular resumen de pagos si no viene del backend
  const paymentSummary = closingReport.paymentSummary || closingReport.orders.reduce((acc, order) => {
    const method = order.paymentMethod || 'OTROS';
    acc[method] = (acc[method] || 0) + order.price;
    return acc;
  }, {} as Record<string, number>);

  const expenses = closingReport.expenses || [];

  // Filtrar ingresos manuales (INCOME sin orderId y que no sean apertura)
  const manualIncomes = movements.filter(m => 
    m.type === 'INCOME' && 
    !m.orderId && 
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
            <Text style={styles.textBold}>{closingReport.storeName}</Text>
            <Text>{closingReport.storeAddress}</Text>
            <Text>Tel: {closingReport.storePhone}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.title}>REPORTE DE CIERRE DE CAJA</Text>
          <View style={styles.divider} />

          {/* Info de sesión */}
          <View style={{ marginBottom: 6 }}>
            <View style={styles.row}>
              <Text>Apertura:</Text>
              <Text>{formatDate(closingReport.openedAt)}</Text>
            </View>
            <View style={styles.row}>
               <Text>Por:</Text>
               <Text>{closingReport.openedBy}</Text>
            </View>
            <View style={{ marginTop: 2 }} />
            <View style={styles.row}>
              <Text>Cierre:</Text>
              <Text>{formatDate(closingReport.closedAt)}</Text>
            </View>
            <View style={styles.row}>
               <Text>Por:</Text>
               <Text>{closingReport.closedBy}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Resumen Financiero */}
          <Text style={[styles.textBold, { marginBottom: 4 }]}>RESUMEN FINANCIERO</Text>
          <View style={styles.row}>
            <Text>Monto Apertura:</Text>
            <Text>{formatCurrency(cashBalance.openingAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(+) Ingresos:</Text>
            <Text>{formatCurrency(cashBalance.totalIngresos)}</Text>
          </View>
          <View style={styles.row}>
            <Text>(-) Egresos:</Text>
            <Text>{formatCurrency(cashBalance.totalSalidas)}</Text>
          </View>
          
          <View style={[styles.divider, { borderBottomStyle: 'solid' }]} />
          
          <View style={[styles.row, styles.textBold]}>
            <Text>BALANCE TEÓRICO:</Text>
            <Text>{formatCurrency(cashBalance.balanceActual)}</Text>
          </View>
            <View style={[styles.row, styles.textBold]}>
              <Text>BALANCE DECLARADO:</Text>
              <Text>{formatCurrency(closingReport.declaredAmount || 0)}</Text>
            </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text>Diferencia:</Text>
            <Text>{formatCurrency(closingReport.difference || 0)}</Text>
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
                    {formatDate(expense.time)}
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
           
           {/* Detalle de Ventas */}
           <Text style={[styles.textBold, { marginBottom: 4 }]}>
             DETALLE DE VENTAS ({closingReport.orders.length})
           </Text>
            <View style={[styles.row, { borderBottomWidth: 1, borderColor: '#000', marginBottom: 2 }]}>
               <Text style={[styles.textBold, { width: '25%' }]}>Ticket</Text>
               <Text style={[styles.textBold, { width: '50%' }]}>Desc.</Text>
               <Text style={[styles.textBold, { width: '25%', textAlign: 'right' }]}>Monto</Text>
            </View>
           {closingReport.orders.map((order, idx) => (
             <View key={idx} style={{ marginBottom: 2 }}>
                <View style={styles.row}>
                  <Text style={{ width: '25%' }}>{order.orderNumber}</Text>
                  <Text style={{ width: '50%' }}>
                    {order.description}
                  </Text>
                  <Text style={{ width: '25%', textAlign: 'right' }}>
                    {formatCurrency(order.price)}
                  </Text>
                </View>
             </View>
           ))}

          {/* Footer */}
           <View style={styles.footer}>
            <Text>Impreso el: {formatDate(closingReport.printedAt)}</Text>
            <Text style={{ marginTop: 2 }}>--- FIN DEL REPORTE ---</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
};

export default ReceiptClosingPDF;
