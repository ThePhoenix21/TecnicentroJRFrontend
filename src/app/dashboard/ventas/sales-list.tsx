// sales-list.tsx
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import React from "react";
import type { SaleResponse } from "@/services/sale.service";

// Table components with consistent theming
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-border rounded-lg overflow-hidden shadow-sm">
    <table className="w-full">{children}</table>
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-muted/50 border-b border-border">
    {children}
  </thead>
);

const TableHead = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <th 
    scope="col"
    className={cn(
      "px-4 py-3 text-left text-xs font-medium text-foreground/80 uppercase tracking-wider",
      className
    )}
  >
    {children}
  </th>
);

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="bg-card divide-y divide-border">{children}</tbody>
);

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

const TableRow = ({ children, className, ...props }: TableRowProps) => {
  const filteredChildren = React.Children.toArray(children).filter(
    child => typeof child !== 'string' || child.trim() !== ''
  );

  return (
    <tr 
      className={cn(
        "hover:bg-muted/50 transition-colors",
        "border-b border-border last:border-b-0",
        className
      )} 
      {...props}
    >
      {filteredChildren}
    </tr>
  );
};

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

const TableCell = ({ 
  children, 
  className, 
  mobileOnly = false, 
  desktopOnly = false, 
  ...props 
}: TableCellProps) => (
  <td 
    className={cn(
      "px-4 py-3 text-sm text-foreground",
      mobileOnly ? "sm:hidden" : "",
      desktopOnly ? "hidden sm:table-cell" : "",
      className
    )}
    {...props}
  >
    {children}
  </td>
);

const Badge = ({ 
  children, 
  className,
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'default' | 'outline';
}) => (
  <span className={cn(
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    variant === 'default' 
      ? "bg-primary/10 text-primary" 
      : "bg-background border border-border text-foreground",
    className
  )}>
    {children}
  </span>
);

type SalesListProps = {
  sales: SaleResponse[];
  onNewSale: () => void;
  onViewSale: (orderId: string) => void;
};

export function SalesList({ sales, onNewSale, onViewSale }: SalesListProps) {
  const formatDate = (dateString?: string) => {
    return dateString ? format(new Date(dateString), "PP", { locale: es }) : 'N/A';
  };

  const formatTime = (dateString?: string) => {
    return dateString ? format(new Date(dateString), "HH:mm", { locale: es }) : '';
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return { text: 'Completado', className: 'bg-green-100 text-green-800' };
      case 'PENDING':
        return { text: 'Pendiente', className: 'bg-yellow-100 text-yellow-800' };
      case 'CANCELLED':
        return { text: 'Cancelado', className: 'bg-red-100 text-red-800' };
      default:
        return { text: 'Pendiente', className: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Historial de Ventas</h2>
          <p className="text-sm text-muted-foreground">
            {sales.length} {sales.length === 1 ? 'venta' : 'ventas'} registradas
          </p>
        </div>
        <Button 
          onClick={onNewSale} 
          className="w-full sm:w-auto mt-2 sm:mt-0"
          size="sm"
        >
          Nueva Venta
        </Button>
      </div>

      {/* Mobile View - Card Layout */}
      <div className="sm:hidden space-y-3">
        {sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No se encontraron ventas registradas
          </div>
        ) : (
          sales.map((sale) => {
            const status = getStatusBadge(sale.status || 'PENDING');
            return (
              <div 
                key={sale.id} 
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors active:bg-muted/70"
                onClick={() => onViewSale(sale.id || '')}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Venta #{sale.id?.slice(0, 6) || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(sale.createdAt)}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={status.className}
                  >
                    {status.text}
                  </Badge>
                </div>
                
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="font-medium">${sale.totalAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 w-full h-9"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewSale(sale.id || '');
                  }}
                >
                  Ver Detalles
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop View - Table Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="hidden md:table-cell">Productos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden lg:table-cell">Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron ventas registradas
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const status = getStatusBadge(sale.status || 'PENDING');
                return (
                  <TableRow 
                    key={sale.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewSale(sale.id || '')}
                  >
                    <TableCell className="font-medium">
                      #{sale.id?.slice(0, 6) || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatDate(sale.createdAt)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(sale.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1 max-w-[200px]">
                        {sale.products?.slice(0, 2).map((product, index) => (
                          <div key={`${product.productId}-${index}`} className="text-sm truncate">
                            {product.productName || 'Producto'} × {product.quantity}
                          </div>
                        ))}
                        {(sale.products?.length || 0) > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{(sale.products?.length || 0) - 2} más
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      ${sale.totalAmount?.toFixed(2) || '0.00'}
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={status.className}
                      >
                        {status.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSale(sale.id || '');
                        }}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}