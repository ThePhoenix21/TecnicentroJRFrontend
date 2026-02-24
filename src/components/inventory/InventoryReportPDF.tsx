import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventorySessionReport } from '@/types/inventory.types';
import { jwtDecode } from 'jwt-decode';

interface TenantTokenPayload {
  tenantLogoUrl?: string;
}

const resolveTenantLogoUrlFromToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return undefined;
    const decoded = jwtDecode<TenantTokenPayload>(token);
    return decoded.tenantLogoUrl || undefined;
  } catch (error) {
    console.error('Error al obtener tenantLogoUrl del token:', error);
    return undefined;
  }
};

// Registrar fuentes
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

const PAGE_WIDTH = 226.77; // 80mm
const PAGE_HEIGHT = 841.89; // Altura dinámica base, se ajustará al contenido
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
  itemRow: {
    flexDirection: 'row',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  itemDetails: {
    marginLeft: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    color: '#444',
  },
  positiveDiff: {
    color: '#000', // React-pdf no soporta colores semánticos como green/red bien en algunas impresoras, mejor usar negrita o símbolos
  },
  negativeDiff: {
    color: '#000',
  }
});

interface InventoryReportPDFProps {
  data: InventorySessionReport;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: es });
  } catch (e) {
    return dateStr;
  }
};

const InventoryReportPDF: React.FC<InventoryReportPDFProps> = ({ data }) => {
  const { session, summary, items } = data;

  const tenantLogoUrl = resolveTenantLogoUrlFromToken();

  // Filtrar items con diferencias para mostrarlos primero o resaltarlos
  const discrepancyItems = items.filter(item => item.difference !== 0);
  const correctItems = items.filter(item => item.difference === 0);

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              {!!tenantLogoUrl && <Image src={tenantLogoUrl} style={styles.logo} />}
            </View>
            <Text style={styles.textBold}>{session.store.name}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.title}>REPORTE DE INVENTARIO</Text>
          <View style={styles.divider} />

          {/* Info de sesión */}
          <View style={{ marginBottom: 6 }}>
            <View style={styles.row}>
              <Text>Sesión:</Text>
              <Text style={{ flex: 1, textAlign: 'right', marginLeft: 4 }}>{session.name}</Text>
            </View>
            <View style={styles.row}>
              <Text>Creado el:</Text>
              <Text>{formatDate(session.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Finalizado:</Text>
              <Text>{formatDate(session.finalizedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text>Responsable:</Text>
              <Text>{session.createdBy.name}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Resumen */}
          <Text style={[styles.textBold, { marginBottom: 4 }]}>RESUMEN DEL CONTEO</Text>
          <View style={styles.row}>
            <Text>Total Productos:</Text>
            <Text>{summary.totalProducts}</Text>
          </View>
          <View style={styles.row}>
            <Text>Conteos Correctos:</Text>
            <Text>{summary.correctCount}</Text>
          </View>
          <View style={styles.row}>
            <Text>Discrepancias:</Text>
            <Text>{summary.discrepancies}</Text>
          </View>
          <View style={[styles.row, { marginTop: 2 }]}>
            <Text>Sobrantes (+):</Text>
            <Text>{summary.positiveDiscrepancies}</Text>
          </View>
          <View style={styles.row}>
            <Text>Faltantes (-):</Text>
            <Text>{summary.negativeDiscrepancies}</Text>
          </View>

          <View style={styles.divider} />

          {/* Items con Diferencias */}
          {discrepancyItems.length > 0 && (
            <>
              <Text style={[styles.textBold, { marginBottom: 4, fontSize: 9 }]}>DISCREPANCIAS ENCONTRADAS</Text>
              <View style={[styles.row, { borderBottomWidth: 1, borderBottomStyle: 'solid', marginBottom: 2 }]}>
                <Text style={{ width: '50%' }}>Producto</Text>
                <Text style={{ width: '15%', textAlign: 'center' }}>Esp</Text>
                <Text style={{ width: '15%', textAlign: 'center' }}>Fís</Text>
                <Text style={{ width: '20%', textAlign: 'right' }}>Dif</Text>
              </View>
              {discrepancyItems.map((item, idx) => (
                <View key={`diff-${idx}`} style={{ marginBottom: 4 }}>
                  <Text style={{ marginBottom: 1 }}>{item.storeProduct.product.name}</Text>
                  {item.storeProduct.product.description && (
                     <Text style={{ fontSize: 6, color: '#555', marginBottom: 1 }}>{item.storeProduct.product.description}</Text>
                  )}
                  <View style={styles.row}>
                    <Text style={{ width: '50%' }}></Text>
                    <Text style={{ width: '15%', textAlign: 'center' }}>{item.expectedStock}</Text>
                    <Text style={{ width: '15%', textAlign: 'center' }}>{item.physicalStock}</Text>
                    <Text style={{ width: '20%', textAlign: 'right', fontWeight: 'bold' }}>
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.divider} />
            </>
          )}

          {/* Items Correctos (Opcional, puede ser muy largo) */}
          {/* Mostraremos un resumen o lista compacta si se desea, por ahora solo conteo si son muchos */}
          {correctItems.length > 0 && (
            <>
              <Text style={[styles.textBold, { marginBottom: 4 }]}>CONTEOS CORRECTOS ({correctItems.length})</Text>
              {correctItems.map((item, idx) => (
                <View key={`ok-${idx}`} style={styles.row}>
                  <Text style={{ flex: 1, marginRight: 4 }}>{item.storeProduct.product.name}</Text>
                  <Text>{item.physicalStock}</Text>
                </View>
              ))}
            </>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text>Generado automáticamente por el sistema</Text>
            <Text style={{ marginTop: 2 }}>--- FIN DEL REPORTE ---</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
};

export default InventoryReportPDF;
