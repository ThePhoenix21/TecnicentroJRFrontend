import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { SupplyOrderDetail } from '@/types/supply-order.types';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'white',
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  column: {
    flex: 1,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  value: {
    marginBottom: 5,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  tableCellLast: {
    flex: 1,
    padding: 5,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    fontSize: 8,
    textAlign: 'center',
  },
});

interface SupplyOrderPDFProps {
  order: SupplyOrderDetail;
}

export const SupplyOrderPDF: React.FC<SupplyOrderPDFProps> = ({ order }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ORDEN DE SUMINISTRO</Text>
        
        <View style={styles.section}>
          <View style={styles.header}>
            <View style={styles.column}>
              <Text style={styles.label}>Código:</Text>
              <Text style={styles.value}>{order.code}</Text>
              
              <Text style={styles.label}>Estado:</Text>
              <Text style={styles.value}>{order.status}</Text>
              
              <Text style={styles.label}>Fecha de emisión:</Text>
              <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
            </View>
            
            <View style={styles.column}>
              <Text style={styles.label}>Almacén:</Text>
              <Text style={styles.value}>{order.warehouse?.name || '-'}</Text>
              
              <Text style={styles.label}>Creado por:</Text>
              <Text style={styles.value}>{order.createdBy?.name || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Datos del Proveedor:</Text>
          <Text style={styles.value}>{order.provider?.name || '-'}</Text>
          {order.provider?.ruc && <Text style={styles.value}>RUC: {order.provider.ruc}</Text>}
          {order.provider?.phone && <Text style={styles.value}>Tel: {order.provider.phone}</Text>}
          {order.provider?.email && <Text style={styles.value}>Email: {order.provider.email}</Text>}
          {order.provider?.address && <Text style={styles.value}>Dirección: {order.provider.address}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Productos:</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Producto</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
              <Text style={styles.tableCell}>Precio Unit.</Text>
              <Text style={styles.tableCellLast}>Total</Text>
            </View>
            
            {order.products?.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.product?.name || '-'}</Text>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={styles.tableCell}>{formatCurrency(0)}</Text>
                <Text style={styles.tableCellLast}>{formatCurrency(0)}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.totals}>
            <View style={styles.column}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>{formatCurrency(0)}</Text>
              
              <Text style={styles.label}>ITBIS (18%):</Text>
              <Text style={styles.value}>{formatCurrency(0)}</Text>
              
              <Text style={[styles.label, { fontSize: 12 }]}>Total:</Text>
              <Text style={[styles.value, { fontSize: 12, fontWeight: 'bold' }]}>
                {formatCurrency(0)}
              </Text>
            </View>
          </View>
        </View>

        {order.description && (
          <View style={styles.section}>
            <Text style={styles.label}>Descripción:</Text>
            <Text style={styles.value}>{order.description}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>Documento generado automáticamente - Sistema de Gestión</Text>
          <Text>Fecha de impresión: {formatDate(new Date().toISOString())}</Text>
        </View>
      </Page>
    </Document>
  );
};
