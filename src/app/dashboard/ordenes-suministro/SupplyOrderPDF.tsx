import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
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

const PAGE_WIDTH = 226.77; // 80mm en puntos
const PAGE_HEIGHT = 841.89; // alto fijo grande
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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
    alignItems: 'center',
    marginBottom: 4,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: {
    width: 60,
    height: 40,
    objectFit: 'contain',
  },
  systemName: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'dashed',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    fontWeight: 'bold',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  colLeft: {
    flex: 4,
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    marginTop: 8,
    fontSize: 7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

interface SupplyOrderPDFProps {
  order: SupplyOrderDetail;
  tenantLogoUrl?: string;
}

export const SupplyOrderPDF: React.FC<SupplyOrderPDFProps> = ({ order, tenantLogoUrl }) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado */}
          <View style={styles.header}>
            {!!tenantLogoUrl && (
              <View style={styles.logoContainer}>
                <Image src={tenantLogoUrl} style={styles.logo} />
              </View>
            )}
            <Text style={styles.systemName}>Sistema de Gestión</Text>
          </View>

          <View style={styles.divider} />

          {/* Título */}
          <Text style={styles.title}>ORDEN DE SUMINISTRO</Text>

          <View style={styles.divider} />

          {/* Datos de la orden */}
          <View style={{ marginBottom: 4 }}>
            <View style={styles.row}>
              <Text style={styles.label}>Código:</Text>
              <Text>{order.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fecha:</Text>
              <Text>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Estado:</Text>
              <Text>{order.status}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Proveedor:</Text>
              <Text>{order.provider?.name || '-'}</Text>
            </View>
            {!!order.provider?.ruc && (
              <View style={styles.row}>
                <Text style={styles.label}>RUC:</Text>
                <Text>{order.provider.ruc}</Text>
              </View>
            )}
            {!!order.createdBy?.name && (
              <View style={styles.row}>
                <Text style={styles.label}>Creado por:</Text>
                <Text>{order.createdBy.name}</Text>
              </View>
            )}
            {!!(order.warehouse?.name || order.store?.name) && (
              <View style={styles.row}>
                <Text style={styles.label}>{order.warehouse?.name ? 'Almacén:' : 'Tienda:'}</Text>
                <Text>{order.warehouse?.name || order.store?.name || '-'}</Text>
              </View>
            )}
            {!!order.description && (
              <View style={styles.row}>
                <Text style={styles.label}>Descripción:</Text>
                <Text>{order.description}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Tabla de productos — solo nombre y cantidad */}
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colLeft}>Producto</Text>
            <Text style={styles.colRight}>Cant.</Text>
          </View>
          <View style={styles.divider} />
          {(order.products ?? []).map((item: any, index: number) => (
            <View key={index} style={styles.row}>
              <Text style={styles.colLeft}>{item.product?.name || '-'}</Text>
              <Text style={styles.colRight}>{item.quantity}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Pie */}
          <Text style={styles.footer}>
            Impreso el {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
