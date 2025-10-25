import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar la imagen del logo
const logo = '/icons/logo-jr-g.png';

// Registrar fuentes
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 15,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  receiptContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 10,
  },
  receipt: {
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: 15,
    backgroundColor: '#ffffff',
    fontSize: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  logo: {
    width: '60px',
    height: 'auto',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  header: {
    marginBottom: 15,
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 2,
  },
  section: {
    marginBottom: 12,
    fontSize: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 4,
    color: '#1e293b',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 9,
  },
  col: {
    flex: 1,
  },
  colRight: {
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    fontSize: 8,
    lineHeight: 1.2,
    padding: '2px 0',
  },
  itemName: {
    flex: 3,
  },
  itemQty: {
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 2,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTop: '1px dashed #cbd5e1',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#1e293b',
  },
  footer: {
    marginTop: 15,
    fontSize: 7,
    textAlign: 'center',
    color: '#64748b',
    paddingTop: 8,
    borderTop: '1px solid #e2e8f0',
  },
  divider: {
    borderTop: '1px dashed #cbd5e1',
    margin: '8px 0',
  },
});

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  ruc: string;
  footerText: string;
}

interface SaleReceiptProps {
  saleData: {
    customerName: string;
    customer: {
      documentNumber?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
      notes?: string;
    }>;
    subtotal: number;
    total: number;
    paymentMethod: string;
    orderId?: string;
    orderNumber?: string;
  };
  businessInfo: BusinessInfo;
}

const SaleReceipt: React.FC<SaleReceiptProps> = ({ saleData, businessInfo }) => {
  console.log("🔍 SaleReceipt renderizado con datos:", saleData);
  console.log("🔍 BusinessInfo:", businessInfo);
  console.log("🔍 Items en saleData:", saleData.items);

  const currentDate = new Date();
  const formattedDate = format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = format(currentDate, "HH:mm:ss");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.receiptContainer}>
          <View style={styles.receipt}>
            {/* Header con logo e información de la empresa */}
            <View style={styles.logoContainer}>
              {/* Logo temporalmente comentado para debugging */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image
                src={logo}
                style={styles.logo}
              /> 
              <View style={[styles.headerInfo, { flex: 1, marginLeft: 0 }]}>
                <View style={styles.header}>
                  <Text style={styles.title}>{businessInfo.name}</Text>
                  <Text style={styles.subtitle}>{businessInfo.address}</Text>
                  <Text style={styles.subtitle}>Tel: {businessInfo.phone}</Text>
                  <Text style={styles.subtitle}>Email: {businessInfo.email}</Text>
                  <Text style={styles.subtitle}>RUC: {businessInfo.ruc}</Text>
                </View>
              </View>
            </View>

            {/* Información de fecha y número de comprobante */}
            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={{ fontWeight: 'bold' }}>Fecha: {formattedDate}</Text>
                <Text style={{ fontWeight: 'bold' }}>Hora: {formattedTime}</Text>
              </View>
              <View style={styles.row}>
                <Text style={{ fontWeight: 'bold' }}>Comprobante de Venta</Text>
                <Text style={{ fontWeight: 'bold' }}>Método: {saleData.paymentMethod}</Text>
              </View>
              {saleData.orderNumber && (
                <View style={[styles.row, { marginTop: 4 }]}>
                  <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Orden N°: {saleData.orderNumber}</Text>
                </View>
              )}
              {saleData.orderId && !saleData.orderNumber && (
                <View style={[styles.row, { marginTop: 4 }]}>
                  <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Orden N°: {saleData.orderId}</Text>
                </View>
              )}
            </View>

            {/* Datos del cliente */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos del Cliente</Text>
              <View style={styles.row}>
                <Text>Nombre: {saleData.customerName || 'Cliente ocasional'}</Text>
              </View>
              {saleData.customer.documentNumber && (
                <View style={styles.row}>
                  <Text>DNI: {saleData.customer.documentNumber}</Text>
                </View>
              )}
              {saleData.customer.phone && (
                <View style={styles.row}>
                  <Text>Teléfono: {saleData.customer.phone}</Text>
                </View>
              )}
              {saleData.customer.email && (
                <View style={styles.row}>
                  <Text>Email: {saleData.customer.email}</Text>
                </View>
              )}
            </View>

            {/* Detalle de productos/servicios */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detalle de la Venta</Text>
              <View style={[styles.row, { marginBottom: 6, fontWeight: 'bold' }]}>
                <Text style={[styles.col]}>Descripción</Text>
                <Text style={[styles.col, { textAlign: 'center' }]}>Cant.</Text>
                <Text style={[styles.colRight]}>Precio Unit.</Text>
                <Text style={[styles.colRight]}>Total</Text>
              </View>

              {saleData.items.map((item, index) => (
                <View key={index}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.name}
                      {item.notes && ` (${item.notes})`}
                    </Text>
                    <Text style={styles.itemQty}>{item.quantity}</Text>
                    <Text style={styles.itemPrice}>S/{item.price.toFixed(2)}</Text>
                    <Text style={styles.itemPrice}>S/{item.total.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Totales */}
            <View style={styles.section}>
              <View style={styles.totalRow}>
                <Text>TOTAL A PAGAR</Text>
                <Text>S/{saleData.total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>{businessInfo.footerText}</Text>
              <Text>¡Gracias por su preferencia!</Text>
              <Text>Este comprobante es válido como prueba de compra</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default SaleReceipt;