import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Registrar la imagen del logo
const logo = '/icons/logo-jr-g.png';

// Registrar fuentes si es necesario
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
    padding: 10,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  receiptContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 8,
  },
  receipt: {
    marginBottom: 10,
    border: '1px solid #e2e8f0',
    borderRadius: 3,
    padding: 8,
    position: 'relative',
    fontSize: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logo: {
    width: '80px',
    height: 'auto',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  receiptCopy: {
    fontSize: 10,
    position: 'absolute',
    top: 10,
    right: 15,
    backgroundColor: '#f1f5f9',
    padding: '2px 5px',
    borderRadius: 3,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 10,
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 5,
  },
  section: {
    marginBottom: 6,
    fontSize: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 10,
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
    marginBottom: 0.5,
    fontSize: 7,
    lineHeight: 1.1,
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
    marginTop: 8,
    paddingTop: 4,
    borderTop: '1px dashed #cbd5e1',
    fontWeight: 'bold',
    fontSize: 10,
  },
  footer: {
    marginTop: 4,
    fontSize: 6,
    textAlign: 'center',
    color: '#64748b',
    paddingTop: 4,
    borderTop: '1px solid #e2e8f0',
  },
  divider: {
    borderTop: '1px dashed #cbd5e1',
    margin: '10px 0',
  },
  halfPage: {
    height: '50%',
    padding: 10,
  },
});

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  cuit: string;
  footerText: string;
}

interface ReceiptPDFProps {
  saleData: {
    customerName: string;
    customer: {
      documentNumber?: string;
      documentType?: string;
      phone?: string;
      email?: string;
      address?: string;
    };
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      notes?: string;
      type?: 'product' | 'service' | 'custom';
    }>;
    total: number;
    orderId?: string;
    orderNumber?: string;
  };
  businessInfo: BusinessInfo;
}

const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ saleData, businessInfo }) => {
  const currentDate = new Date();
  const formattedDate = format(currentDate, "dd 'de' MMMM 'de' yyyy HH:mm", { locale: es });

  // Verificar si hay servicios en la venta
  const hasServices = saleData.items.some((item) => item.type === 'service');

  const renderReceipt = (copy: 'CLIENTE' | 'COMERCIO') => (
    <View style={styles.receipt}>
      <Text style={styles.receiptCopy}>{copy}</Text>
      
      <View style={styles.logoContainer}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image 
          src={logo} 
          style={styles.logo}
        />
        <View style={styles.header}>
          <Text style={styles.title}>{businessInfo.name}</Text>
          <Text style={styles.subtitle}>{businessInfo.address}</Text>
          <Text style={styles.subtitle}>Tel: {businessInfo.phone} | {businessInfo.email}</Text>
          <Text style={styles.subtitle}>CUIT: {businessInfo.cuit}</Text>
          <Text style={styles.subtitle}>{formattedDate}</Text>
          {saleData.orderNumber && (
            <Text style={styles.subtitle}>Orden N°: {saleData.orderNumber}</Text>
          )}
          {saleData.orderId && !saleData.orderNumber && (
            <Text style={styles.subtitle}>Orden N°: {saleData.orderId}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos del Cliente</Text>
        <View style={styles.row}>
          <Text>Nombre: {saleData.customerName || 'Cliente ocasional'}</Text>
          {saleData.customer.documentNumber && (
            <Text>
              {saleData.customer.documentType?.toUpperCase()}: {saleData.customer.documentNumber}
            </Text>
          )}
        </View>
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
        {saleData.customer.address && (
          <View style={styles.row}>
            <Text>Dirección: {saleData.customer.address}</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detalle de la Venta</Text>
        <View style={[styles.row, { marginBottom: 5 }]}>
          <Text style={[styles.col, { fontWeight: 'bold' }]}>Descripción</Text>
          <Text style={[styles.col, { textAlign: 'center', fontWeight: 'bold' }]}>Cant.</Text>
          <Text style={[styles.colRight, { fontWeight: 'bold' }]}>Importe</Text>
        </View>
        
        {saleData.items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item.name}
              {item.notes && ` (${item.notes})`}
            </Text>
            <Text style={styles.itemQty}>x{item.quantity}</Text>
            <Text style={styles.itemPrice}>S/{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text>TOTAL</Text>
          <Text>S/{saleData.total.toFixed(2)}</Text>
        </View>
      </View>

      {copy === 'CLIENTE' && hasServices && (
        <View style={{
          marginTop: 12,
          padding: 8,
          border: '1px solid #e2e8f0',
          borderRadius: 4,
          backgroundColor: '#f8fafc'
        }}>
          <Text style={{
            fontSize: 9,
            fontWeight: 'bold',
            marginBottom: 6,
            color: '#1e293b',
            textAlign: 'center',
            textTransform: 'uppercase'
          }}>
            Datos de Seguridad
          </Text>
          
          <View style={{ marginBottom: 8 }}>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 8, marginBottom: 2, fontWeight: 'semibold' }}>PIN/Contraseña:</Text>
              <View style={{ 
                borderBottom: '1px solid #cbd5e1', 
                height: 14,
                marginBottom: 8
              }}></View>
            </View>
            
            <View>
              <Text style={{ fontSize: 8, marginBottom: 4, fontWeight: 'semibold' }}>Patrón de desbloqueo:</Text>
              <View style={{ 
                width: '100%', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4
              }}>
                <View style={{
                  width: 60,
                  height: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4
                }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image 
                    src="/9-puntos.png"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text>{businessInfo.footerText}</Text>
        <Text>Gracias por su compra - {copy === 'CLIENTE' ? 'CLIENTE' : 'COMERCIO'}</Text>
      </View>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Primera copia (ORIGINAL) */}
        <View style={{ marginBottom: 15 }}>
          {renderReceipt('CLIENTE')}
        </View>
        
        {/* Línea divisoria */}
        <View style={{ 
          borderTop: '1px dashed #94a3b8', 
          margin: '15px 0',
          position: 'relative'
        }}>
          <Text style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#ffffff',
            padding: '0 10px',
            fontSize: 8,
            color: '#64748b'
          }}>
            COPIA - COMERCIO
          </Text>
        </View>
        
        {/* Segunda copia (DUPLICADO) */}
        <View>
          {renderReceipt('COMERCIO')}
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;