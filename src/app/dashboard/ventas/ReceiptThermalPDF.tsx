import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Logo import
const logo = '/icons/logo-jr-g.png';

// Register font for better text rendering
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 700 },
  ],
});

// 80mm = 226.77 points (1mm = 2.83465 points)
const PAGE_WIDTH = 226.77; // 80mm in points
const PAGE_HEIGHT = 841.89; // 297mm in points (A4 height, but we'll limit content)
const MARGIN = 10; // 10 points margin
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
  businessName: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  businessInfo: {
    fontSize: 7,
    textAlign: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  colLeft: {
    flex: 3,
  },
  colRight: {
    flex: 1,
    textAlign: 'right',
  },
  itemName: {
    fontSize: 8,
  },
  itemQty: {
    fontSize: 8,
    textAlign: 'center',
    width: 20,
  },
  itemUnitPrice: {
    fontSize: 8,
    textAlign: 'right',
    width: 35,
  },
  itemPrice: {
    fontSize: 8,
    textAlign: 'right',
    width: 40,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'dashed',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 8,
    fontSize: 7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  textCenter: {
    textAlign: 'center',
  },
  textBold: {
    fontWeight: 'bold',
    marginVertical: 5
  },
  textSmall: {
    fontSize: 6,
  },
});

interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  footerText: string;
}

interface CustomerInfo {
  documentNumber: string;
  documentType: 'dni' | 'ruc' | 'ci' | 'other';
  phone?: string;
  email?: string;
  address?: string;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  type: 'product' | 'service';
  notes?: string;
}

export interface ReceiptThermalPDFProps {
  saleData: any; // Puede ser orden solo productos, solo servicios o ambos
  businessInfo: BusinessInfo;
  isCompleted?: boolean;
}

const formatCurrency = (amount: number): string => {
  return `S/${amount.toFixed(2)}`;
};

const formatDate = (date: Date = new Date()): string[] => {
  const formattedDate = format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const formattedTime = `Hora: ${format(date, "hh:mm a", { locale: es })}`;
  return [formattedDate, formattedTime];
};

const ReceiptThermalPDF: React.FC<ReceiptThermalPDFProps> = ({ saleData, businessInfo, isCompleted = true }) => {
  const now = new Date(); 
  
  // Detectar si la respuesta tiene productos y/o servicios
  const productos = saleData.productos || [];
  const servicios = saleData.servicios || [];

  const adelanto = saleData.adelantos;

  // El backend devuelve client o cliente según el caso
  const rawClient = saleData.client || saleData.cliente || {};
  const cliente = {
    nombre: rawClient.nombre || rawClient.name || 'Cliente',
    documento: rawClient.documento || rawClient.documentNumber || '',
    telefono: rawClient.telefono || rawClient.phone || '',
    email: rawClient.email || '',
    direccion: rawClient.direccion || rawClient.address || ''
  };

  const vendedor = saleData.vendedor || 'Sistema';

  const hasServicios = Array.isArray(servicios) && servicios.length > 0;

  // Calcular totales reales iterando sobre los items para considerar descuentos
  const totalProductos = productos.reduce((sum: number, item: any) => {
    const precio = item.precioUnitario || item.price || 0;
    const cantidad = item.cantidad || item.quantity || 1;
    const descuento = item.descuento || 0;
    return sum + (precio * cantidad) - descuento;
  }, 0);

  const totalServicios = servicios.reduce((sum: number, item: any) => {
    return sum + (item.precio || item.price || 0);
  }, 0);

  const subtotalCalculado = totalProductos + totalServicios;

  // Cálculos para el resumen financiero
  const showAdelanto = adelanto && !isCompleted;
  const totalLabel = (!isCompleted && hasServicios) ? "Pendiente:" : "TOTAL:";
  
  // Lógica de visualización del monto final:
  const totalDisplayAmount = (!isCompleted && hasServicios) 
    ? (subtotalCalculado - (adelanto || 0)) 
    : subtotalCalculado;

  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
        <View style={styles.section}>
          {/* Encabezado del negocio */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                src={logo} 
                style={styles.logo}
              />
            </View>
            <Text style={styles.businessName}>{businessInfo.name}</Text>
            <Text style={styles.businessInfo}>{businessInfo.address}</Text>
            <Text style={styles.businessInfo}>Tel: {businessInfo.phone}</Text>
            <Text style={styles.businessInfo}>
              {formatDate().map((line, index) => (
                <Text key={index} style={styles.businessInfo}>
                  {line}
                  {index < 1 && '\n'}
                </Text>
              ))}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Título del comprobante */}
          {
            (!isCompleted && hasServicios) ? <Text style={styles.title}>ORDEN DE TRABAJO</Text> : <Text style={styles.title}>NOTA DE VENTA</Text>
          }          
          <Text style={styles.subtitle}>
            {saleData.orderNumber || saleData.orderId.substring(0, 8).toUpperCase()}
          </Text>

          <View style={styles.divider} />

          {/* Datos del usuario */}
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.textBold}>Vendedor: {vendedor}</Text>
          </View>

          {/* Datos del cliente */}
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.textBold}>Cliente: {cliente.nombre}</Text>
            {cliente.documento ? (
              <Text>DNI: {cliente.documento}</Text>
            ) : null}
            {cliente.telefono ? (
              <Text>Teléfono: {cliente.telefono}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {!isCompleted  && hasServicios && <View style={{ marginBottom: 6 }}>
            <Text style={styles.textBold}>Datos de Seguridad:</Text>
            <Text>Patron de desbloqueo:</Text>
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
                borderRadius: 4,
                opacity: 0.5,
                marginTop: 14                
              }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image 
                  src={"/9-puntos.png"}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </View>
            </View>
            <Text style={{
              margin: 10
            }}>PIN/contraseña:_____________________</Text>
            <Text style={{
              margin: 2
            }}>Fecha estimada de entrega:</Text>
            <View style={styles.divider} />
          </View>}

          {/* Detalle de productos */}
          {productos.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.textBold}>Productos:</Text>
              <View style={[styles.row, { marginBottom: 2 }]}> 
                <Text style={[styles.textBold, { width: 20 }]}>Cant</Text>
                <Text style={[styles.textBold, { flex: 1, marginLeft: 4 }]}>Descripción</Text>
                <Text style={[styles.textBold, { width: 35, textAlign: 'right' }]}>P. Unit</Text>
                <Text style={[styles.textBold, { width: 40, textAlign: 'right' }]}>Importe</Text>
              </View>
              {productos.map((item: any, index: number) => {
                const cantidad = item.cantidad || item.quantity || 1;
                const unitPrice = item.precioUnitario || item.price || 0;
                const total = unitPrice * cantidad;

                return (
                  <View key={index} style={{ marginBottom: 2 }}>
                    <View style={styles.row}>
                      <Text style={styles.itemQty}>{cantidad}</Text>
                      <Text style={[styles.itemName, { flex: 1, marginLeft: 4 }]}> 
                        {item.nombre || item.name}
                      </Text>
                      <Text style={styles.itemUnitPrice}>
                        {formatCurrency(unitPrice)}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(total)}
                      </Text>
                    </View>
                    {item.descuento > 0 && (
                      <Text style={[styles.textSmall, { marginLeft: 24, marginBottom: 2 }]}> 
                        Descuento: {formatCurrency(item.descuento)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Detalle de servicios */}
          {servicios.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              <Text style={styles.textBold}>Servicios:</Text>
              <View style={[styles.row, { marginBottom: 2 }]}> 
                <Text style={[styles.textBold, { width: 20 }]}>Cant</Text>
                <Text style={[styles.textBold, { flex: 1, marginLeft: 4 }]}>Descripción</Text>
                <Text style={[styles.textBold, { width: 40, textAlign: 'right' }]}>Importe</Text>
              </View>
              {servicios.map((item: any, index: number) => (
                <View key={index} style={{ marginBottom: 2 }}>
                  <View style={styles.row}>
                    <Text style={styles.itemQty}>1</Text>
                    <Text style={[styles.itemName, { flex: 1, marginLeft: 4 }]}> 
                      {item.nombre || item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.precio || item.price || 0)}
                    </Text>
                  </View>
                  {item.descripcion && (
                    <Text style={[styles.textSmall, { marginLeft: 24, marginBottom: 2 }]}> 
                      Nota: {item.descripcion}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.divider} />

          {/* Totales */}
          <View>
            <View style={styles.row}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(subtotalCalculado)}</Text>
            </View>
            {showAdelanto && <View style={styles.row}>
              <Text style={{ marginTop: 4 }}>adelanto:</Text>
              <Text style={{ marginTop: 4 }}>{formatCurrency(adelanto)}</Text>
            </View>}
            <View style={[styles.row, styles.textBold, { marginTop: 4 }]}>
              <Text>{totalLabel}</Text>
              <Text>
                {formatCurrency(totalDisplayAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Datos de seguridad (solo para servicios) */}
          {hasServicios && (
            <View style={{ marginTop: 6, marginBottom: 6 }}>
              <Text style={[styles.textBold, { marginBottom: 2 }]}>DATOS DE SEGURIDAD</Text>
              <Text style={styles.textSmall}>
                En cumplimiento con la normativa vigente, los servicios se prestan bajo las condiciones generales de contratación. 
                Para consultas o reclamos, comuníquese al {businessInfo.phone} o escriba a {businessInfo.email}.
              </Text>
              <Text style={styles.textSmall}>
                <Text style={styles.textBold}>Garantía:</Text> Las reparaciones cuentan con garantía según lo indicado; <Text style={styles.textBold}>transcurridos 30 días desde la entrega, no se aceptarán reclamos</Text> relacionados a la reparación realizada.
              </Text>
              <Text style={styles.textSmall}>
                <Text style={styles.textBold}>Bienes no retirados:</Text> Los productos dejados en nuestras instalaciones deben ser retirados oportunamente. <Text style={styles.textBold}>Pasados 30 días, la empresa no asumirá responsabilidad por daños o pérdida del bien</Text>.
              </Text>
            </View>

          )}

          {/* Pie de página */}
          <View style={styles.footer}>
            <Text>{businessInfo.footerText}</Text>
            <Text style={{ marginTop: 4 }}>¡Gracias por su compra!</Text>
            <Text style={{ fontSize: 6, marginTop: 2 }}>
              Comprobante generado el {format(now, "dd/MM/yyyy HH:mm:ss")}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptThermalPDF;
