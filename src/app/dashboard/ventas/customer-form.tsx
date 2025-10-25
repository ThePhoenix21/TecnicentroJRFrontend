import React from 'react';

export interface CustomerData {
  name: string;
  phone: string;
  documentType: 'dni' | 'ruc' | 'ce' | 'passport' | 'other';
  documentNumber: string;
  email: string;
  address: string;
  notes: string;
}

interface CustomerFormProps {
  customerData: CustomerData;
  onCustomerChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ customerData, onCustomerChange }) => {
  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-medium mb-4">Datos del Cliente</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Nombre Completo *
          </label>
          <input
            type="text"
            name="name"
            value={customerData.name}
            onChange={onCustomerChange}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Ingrese nombre completo"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Teléfono
          </label>
          <input
            type="tel"
            name="phone"
            value={customerData.phone}
            onChange={onCustomerChange}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Ingrese teléfono"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Tipo de Documento
          </label>
          <select
            name="documentType"
            value={customerData.documentType}
            onChange={onCustomerChange}
            className="w-full p-2 bg-muted border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="dni">DNI</option>
            <option value="ruc">RUC</option>
            <option value="ce">Carné de Extranjería</option>
            <option value="passport">Pasaporte</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Número de Documento
          </label>
          <input
            type="text"
            name="documentNumber"
            value={customerData.documentNumber}
            onChange={onCustomerChange}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Ingrese número de documento"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Correo Electrónico
          </label>
          <input
            type="email"
            name="email"
            value={customerData.email}
            onChange={onCustomerChange}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Dirección
          </label>
          <input
            type="text"
            name="address"
            value={customerData.address}
            onChange={onCustomerChange}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Ingrese dirección"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Notas Adicionales
          </label>
          <textarea
            name="notes"
            value={customerData.notes}
            onChange={onCustomerChange}
            rows={2}
            className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Información adicional del cliente"
          />
        </div>
      </div>
    </div>
  );
};
