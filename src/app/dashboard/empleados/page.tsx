"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { employedService } from "@/services/employed.service";
import { userService, type UserLookupItem } from "@/services/user.service";
import { storeService } from "@/services/store.service";
import { warehouseService } from "@/services/warehouse.service";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/utils";
import { uniqueBy } from "@/utils/array";
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDeniedView } from '@/components/auth/access-denied-view';
import { ProtectedButton } from '@/components/auth/protected-button';
import { PermissionGuard } from '@/components/auth/permission-guard';
import type {
  EmployedDetail,
  EmployedListItem,
  EmployedStatus,
  EmployedNameLookupItem,
  EmployedPositionLookupItem,
  EmployedStatusLookupItem,
  CreateEmployedDto,
  RecreateEmployedDto,
  UpdateEmployedDto,
} from "@/types/employed.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ActiveFilters } from "@/components/ui/active-filters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PermissionsSelector } from '@/components/ui/permissions-selector-new';
import { 
  Plus, 
  Search, 
  Trash2, 
  RotateCcw, 
  Edit2, 
  Save, 
  CheckCircle2,
  AlertTriangle,
  Users 
} from "lucide-react";

type AssignmentMode = "STORE" | "WAREHOUSE";

type StoreOption = { id: string; name: string };

type WarehouseOption = { id: string; name: string };

const toUtcRange = (from: string, to: string) => {
  const fromDate = `${from}T00:00:00.000Z`;
  const toDate = `${to}T23:59:59.999Z`;
  return { fromDate, toDate };
};

const statusLabel: Record<EmployedStatus, string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  SUSPENDED: "SUSPENDIDO",
};

export default function EmpleadosPage() {
  const { canViewEmployees, hasAllPermissions } = usePermissions();
  const canRecreateEmployee = hasAllPermissions(['RECREATE_EMPLOYEE', 'MANAGE_EMPLOYEES']);
  
  // Verificar permisos de acceso a la vista
  if (!canViewEmployees()) {
    return <AccessDeniedView />;
  }
  
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployedListItem[]>([]);

  const [firstNameFilter, setFirstNameFilter] = useState("");
  const [firstNameQuery, setFirstNameQuery] = useState("");
  const [showFirstNameSuggestions, setShowFirstNameSuggestions] = useState(false);
  const [lastNameFilter, setLastNameFilter] = useState("");
  const [lastNameQuery, setLastNameQuery] = useState("");
  const [showLastNameSuggestions, setShowLastNameSuggestions] = useState(false);
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EmployedStatus | "all">("all");
  const [storeIdFilter, setStoreIdFilter] = useState("all");
  const [warehouseIdFilter, setWarehouseIdFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [positionOptions, setPositionOptions] = useState<EmployedPositionLookupItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<EmployedStatusLookupItem[]>([]);
  const [nameLookup, setNameLookup] = useState<EmployedNameLookupItem[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<EmployedDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEmployedDto>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    position: "",
    status: "",
  });

  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedEmployees, setDeletedEmployees] = useState<EmployedDetail[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"form" | "result">("form");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);
  const [createDocuments, setCreateDocuments] = useState<File[]>([]);
  const [createUploadedDocuments, setCreateUploadedDocuments] = useState<any[]>([]);
  const [createFailedDocuments, setCreateFailedDocuments] = useState<any[]>([]);
  const [createWarningMessage, setCreateWarningMessage] = useState<string | null>(null);

  const [isRecreateOpen, setIsRecreateOpen] = useState(false);
  const [recreateStep, setRecreateStep] = useState<"warning" | "form" | "result">("warning");
  const [recreateSubmitting, setRecreateSubmitting] = useState(false);
  const [recreateResult, setRecreateResult] = useState<any>(null);

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertStoreId, setConvertStoreId] = useState<string>("");
  const [convertPassword, setConvertPassword] = useState<string>("");
  const [convertPermissions, setConvertPermissions] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);

  const [recreateAssignmentMode, setRecreateAssignmentMode] = useState<AssignmentMode>("STORE");
  const [recreateForm, setRecreateForm] = useState<RecreateEmployedDto>({
    firstName: "",
    lastName: "",
    document: "",
    phone: "",
    email: "",
    position: "",
    storeId: "",
    warehouseId: "",
    assignmentRole: "",
  });

  const [createAssignmentMode, setCreateAssignmentMode] = useState<AssignmentMode>("STORE");
  const [createForm, setCreateForm] = useState<CreateEmployedDto>({
    firstName: "",
    lastName: "",
    document: "",
    phone: "",
    email: "",
    position: "",
    storeId: "",
    warehouseId: "",
    assignmentRole: "",
  });

  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const dateRange = fromDate && toDate ? toUtcRange(fromDate, toDate) : null;
      const data = await employedService.getEmployedList({
        status: statusFilter === "all" ? undefined : statusFilter,
        firstName: firstNameFilter.trim() || undefined,
        lastName: lastNameFilter.trim() || undefined,
        position: positionFilter === "all" ? undefined : positionFilter,
        storeId: storeIdFilter === "all" ? undefined : storeIdFilter,
        warehouseId: warehouseIdFilter === "all" ? undefined : warehouseIdFilter,
        fromDate: dateRange?.fromDate,
        toDate: dateRange?.toDate,
      });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar empleados");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [
    firstNameFilter,
    lastNameFilter,
    positionFilter,
    statusFilter,
    storeIdFilter,
    warehouseIdFilter,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [positions, statuses, stores, warehouses, names] = await Promise.all([
          employedService.getPositionsLookup(),
          employedService.getStatusLookup(),
          storeService.getStoresLookup(),
          warehouseService.getWarehousesLookup(),
          employedService.getEmployedLookup(),
        ]);
        const safePositions = Array.isArray(positions)
          ? uniqueBy(positions, (item) => item?.toLowerCase())
          : [];
        const safeStatuses = Array.isArray(statuses)
          ? uniqueBy(statuses, (item) => item)
          : [];
        const safeStores = Array.isArray(stores)
          ? uniqueBy(stores, (item) => item.name?.trim().toLowerCase() ?? item.id)
          : [];
        const safeWarehouses = Array.isArray(warehouses)
          ? uniqueBy(warehouses, (item) => item.name?.trim().toLowerCase() ?? item.id)
          : [];
        const safeNames = Array.isArray(names)
          ? uniqueBy(
              names,
              (item) =>
                `${item.firstName?.trim().toLowerCase() ?? ""}|${item.lastName?.trim().toLowerCase() ?? ""}`
            )
          : [];
        setPositionOptions(safePositions);
        setStatusOptions(safeStatuses);
        setStoreOptions(safeStores);
        setWarehouseOptions(safeWarehouses);
        setNameLookup(safeNames);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "No se pudieron cargar los lookups");
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadEmployees();
    }, 400);

    return () => clearTimeout(timeout);
  }, [
    firstNameFilter,
    lastNameFilter,
    positionFilter,
    statusFilter,
    storeIdFilter,
    warehouseIdFilter,
    fromDate,
    toDate,
    loadEmployees,
  ]);

  const filteredFirstNameSuggestions = useMemo(() => {
    const base = uniqueBy(nameLookup, (item) => item.firstName?.trim().toLowerCase()).filter(
      (item) => Boolean(item.firstName)
    );
    const query = firstNameQuery.trim().toLowerCase();
    const source = query
      ? base.filter((item) => item.firstName!.toLowerCase().includes(query))
      : base;
    return source.slice(0, 8);
  }, [firstNameQuery, nameLookup]);

  const filteredLastNameSuggestions = useMemo(() => {
    const base = uniqueBy(nameLookup, (item) => item.lastName?.trim().toLowerCase()).filter(
      (item) => Boolean(item.lastName)
    );
    const query = lastNameQuery.trim().toLowerCase();
    const source = query
      ? base.filter((item) => item.lastName!.toLowerCase().includes(query))
      : base;
    return source.slice(0, 8);
  }, [lastNameQuery, nameLookup]);

  const clearFilters = () => {
    setFirstNameFilter("");
    setFirstNameQuery("");
    setShowFirstNameSuggestions(false);
    setLastNameFilter("");
    setLastNameQuery("");
    setShowLastNameSuggestions(false);
    setPositionFilter("all");
    setStatusFilter("all");
    setStoreIdFilter("all");
    setWarehouseIdFilter("all");
    setFromDate("");
    setToDate("");
  };

  const openDetail = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsDetailOpen(true);
    setIsEditing(false);

    try {
      setDetailLoading(true);
      const d = await employedService.getEmployedById(employeeId);
      setDetail(d);
      setEditForm({
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        position: d.position ?? "",
        status: d.status ?? "",
      });

      setRecreateForm({
        firstName: d.firstName ?? "",
        lastName: d.lastName ?? "",
        document: d.document ?? "",
        phone: d.phone ?? "",
        email: d.email ?? "",
        position: d.position ?? "",
        storeId: "",
        warehouseId: "",
        assignmentRole: "",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "No se pudo cargar el detalle");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const ensurePermissionsLoaded = async () => {
    if (availablePermissions.length > 0 || permissionsLoading) return;

    try {
      setPermissionsLoading(true);
      const permissions = await authService.getPermissions();
      setAvailablePermissions(Array.isArray(permissions) ? permissions : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "No se pudieron cargar los permisos");
      setAvailablePermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const ensureWarehousesLoaded = async () => {
    if (warehouseOptions.length > 0 || warehousesLoading) return;

    try {
      setWarehousesLoading(true);
      const warehouses = await warehouseService.getWarehousesSimple();
      const options = (warehouses || []).map((w: any) => ({ id: w.id, name: w.name }));
      setWarehouseOptions(options);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "No se pudieron cargar los almacenes");
      setWarehouseOptions([]);
    } finally {
      setWarehousesLoading(false);
    }
  };

  const openCreate = async () => {
    setIsCreateOpen(true);
    setCreateStep("form");
    setCreateResult(null);
    setCreateSubmitting(false);
    setCreateDocuments([]);
    setCreateUploadedDocuments([]);
    setCreateFailedDocuments([]);
    setCreateWarningMessage(null);
    setCreateAssignmentMode("STORE");
    setCreateForm({
      firstName: "",
      lastName: "",
      document: "",
      phone: "",
      email: "",
      position: "",
      storeId: "",
      warehouseId: "",
      assignmentRole: "",
    });
    await ensureStoresLoaded();
    await ensureWarehousesLoaded();
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateStep("form");
    setCreateSubmitting(false);
    setCreateResult(null);
    setCreateDocuments([]);
    setCreateUploadedDocuments([]);
    setCreateFailedDocuments([]);
    setCreateWarningMessage(null);
  };

  const submitCreate = async () => {
    const dto: CreateEmployedDto = {
      firstName: createForm.firstName?.trim(),
      lastName: createForm.lastName?.trim(),
      document: createForm.document?.trim(),
      phone: createForm.phone?.trim() || undefined,
      email: createForm.email?.trim() || undefined,
      position: createForm.position?.trim(),
      assignmentRole: createForm.assignmentRole?.trim(),
      storeId: undefined,
      warehouseId: undefined,
    };

    if (!dto.firstName || !dto.lastName || !dto.document || !dto.position || !dto.assignmentRole) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    if (createAssignmentMode === "STORE") {
      const storeId = createForm.storeId?.trim();
      if (storeId) dto.storeId = storeId;
    } else {
      const warehouseId = createForm.warehouseId?.trim();
      if (warehouseId) dto.warehouseId = warehouseId;
    }

    if (!dto.storeId && !dto.warehouseId) {
      toast.error("Debe asignar el empleado a una tienda o a un almacén");
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateFailedDocuments([]);
      setCreateWarningMessage(null);
      const res = await employedService.createEmployed(dto, createDocuments);
      const uploadedDocuments = Array.isArray(res?.documents) ? res.documents : [];
      const apiFailedDocuments = Array.isArray(res?.failedDocuments) ? res.failedDocuments : [];
      const apiWarningMessage = typeof res?.warning === "string" && res.warning.trim().length > 0
        ? res.warning.trim()
        : null;

      const inferredUploadIssue =
        createDocuments.length > 0 &&
        uploadedDocuments.length === 0 &&
        apiFailedDocuments.length === 0 &&
        !apiWarningMessage;

      const failedDocuments = inferredUploadIssue
        ? createDocuments.map((file) => file?.name || "Documento sin nombre")
        : apiFailedDocuments;

      const warningMessage = inferredUploadIssue
        ? "Empleado creado, pero no se pudo confirmar el registro de documentos adjuntos."
        : apiWarningMessage;

      setCreateResult(res?.employed ?? res);
      setCreateUploadedDocuments(uploadedDocuments);
      setCreateFailedDocuments(failedDocuments);
      setCreateWarningMessage(warningMessage);
      setCreateStep("result");

      if (warningMessage || failedDocuments.length > 0) {
        toast.warning(warningMessage || "Empleado creado, pero no se pudieron registrar algunos documentos");
      } else {
        toast.success("Empleado creado");
      }
      
      // Refresh all data including employees list and lookups
      await Promise.all([
        loadEmployees(),
        // Reload all lookup data
        employedService.getPositionsLookup().then(positions => {
          const safePositions = Array.isArray(positions)
            ? uniqueBy(positions, (item) => item?.toLowerCase())
            : [];
          setPositionOptions(safePositions);
        }),
        employedService.getStatusLookup().then(statuses => {
          const safeStatuses = Array.isArray(statuses)
            ? uniqueBy(statuses, (item) => item)
            : [];
          setStatusOptions(safeStatuses);
        }),
        employedService.getEmployedLookup().then(names => {
          const safeNames = Array.isArray(names)
            ? uniqueBy(
                names,
                (item) =>
                  `${item.firstName?.trim().toLowerCase() ?? ""}|${item.lastName?.trim().toLowerCase() ?? ""}`
              )
            : [];
          setNameLookup(safeNames);
        })
      ]);
    } catch (error: any) {
      if (error?.response?.status !== 413) {
        console.error(error);
      }
      toast.error(error?.response?.data?.message || error?.message || "Error al crear empleado");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const closeCreateResult = async () => {
    closeCreate();
    await loadEmployees();
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedEmployeeId(null);
    setDetail(null);
    setIsEditing(false);
    setEditSubmitting(false);
  };

  const openConvert = async () => {
    if (!detail) return;
    setIsConvertOpen(true);
    setConvertSubmitting(false);
    setConvertStoreId("");
    setConvertPassword("");
    setConvertPermissions([]);
    await ensureStoresLoaded();
    await ensurePermissionsLoaded();
  };

  const closeConvert = () => {
    setIsConvertOpen(false);
    setConvertSubmitting(false);
  };

  const formatPermissionLabel = (permission: string): string => {
    if (!permission) return "";
    if (permission === "VIEW_ORDERS") return "Ver ventas";
    if (permission === "MANAGE_ORDERS") return "Gestionar ventas";

    const tokens = permission
      .toLowerCase()
      .split(/[.:/_-]+/)
      .filter(Boolean);

    const dictionary: Record<string, string> = {
      users: "Usuarios",
      user: "Usuario",
      roles: "Roles",
      role: "Rol",
      permissions: "Permisos",
      permission: "Permiso",
      products: "Productos",
      product: "Producto",
      services: "Servicios",
      service: "Servicio",
      orders: "Órdenes",
      order: "Orden",
      sales: "Ventas",
      sale: "Venta",
      inventory: "Inventario",
      stores: "Tiendas",
      store: "Tienda",
      dashboard: "Dashboard",
      reports: "Reportes",
      report: "Reporte",
      clients: "Clientes",
      client: "Cliente",
      prices: "Precios",
      price: "Precio",
      cash: "Caja",
      caja: "Caja",
      read: "Ver",
      view: "Ver",
      list: "Listar",
      create: "Crear",
      add: "Agregar",
      update: "Editar",
      edit: "Editar",
      delete: "Eliminar",
      remove: "Eliminar",
      manage: "Gestionar",
      export: "Exportar",
      print: "Imprimir",
      approve: "Aprobar",
      close: "Cerrar",
    };

    const translated = tokens.map((token) => {
      const key = token.toLowerCase();
      if (dictionary[key]) return dictionary[key];
      return key.charAt(0).toUpperCase() + key.slice(1);
    });

    if (translated.length === 2) {
      return `${translated[0]} · ${translated[1]}`;
    }

    return translated.join(" · ");
  };

  const submitConvert = async () => {
    if (!detail) return;

    if (!convertPassword.trim()) {
      toast.error("La contraseña es obligatoria");
      return;
    }

    if (!convertStoreId.trim()) {
      toast.error("Seleccione una tienda");
      return;
    }

    try {
      setConvertSubmitting(true);
      await userService.createUserFromEmployed({
        employedId: detail.id,
        role: "USER",
        storeId: convertStoreId,
        password: convertPassword,
        permissions: convertPermissions,
      });
      toast.success("Usuario creado desde empleado");
      closeConvert();
      await loadEmployees();
      if (selectedEmployeeId) {
        const refreshed = await employedService.getEmployedById(selectedEmployeeId);
        setDetail(refreshed);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al crear usuario");
    } finally {
      setConvertSubmitting(false);
    }
  };

  const assignmentInfo = useMemo(() => {
    if (!detail) return { store: null as string | null, warehouse: null as string | null };

    const storeName =
      detail.assignment?.type === 'STORE'
        ? (detail.assignment?.store?.name ?? null)
        : (detail.storeAssignments?.[0]?.store?.name ?? null);

    const warehouseName =
      detail.assignment?.type === 'WAREHOUSE'
        ? (detail.assignment?.warehouse?.name ?? null)
        : (detail.warehouseAssignments?.[0]?.warehouse?.name ?? null);

    return { store: storeName, warehouse: warehouseName };
  }, [detail]);

  const handleSaveEdit = async () => {
    if (!selectedEmployeeId) return;

    try {
      setEditSubmitting(true);
      const updated = await employedService.updateEmployed(selectedEmployeeId, {
        firstName: editForm.firstName?.trim() || undefined,
        lastName: editForm.lastName?.trim() || undefined,
        phone: editForm.phone?.trim() || undefined,
        email: editForm.email?.trim() || undefined,
        position: editForm.position?.trim() || undefined,
        status: editForm.status?.trim() || undefined,
      });

      setDetail(updated);
      setIsEditing(false);
      toast.success("Empleado actualizado");
      await loadEmployees();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al actualizar empleado");
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDeleted = async () => {
    setIsDeletedOpen(true);
    try {
      setDeletedLoading(true);
      const data = await employedService.getDeletedEmployed();
      setDeletedEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al cargar empleados eliminados");
      setDeletedEmployees([]);
    } finally {
      setDeletedLoading(false);
    }
  };

  const closeDeleted = () => {
    setIsDeletedOpen(false);
    setDeletedEmployees([]);
    setDeletedLoading(false);
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedEmployees.size === 0) {
      toast.error("Seleccione al menos un empleado");
      return;
    }
    if (!bulkStatus) {
      toast.error("Seleccione un estado");
      return;
    }

    try {
      setBulkSubmitting(true);
      const result = await employedService.bulkUpdateStatus(
        Array.from(selectedEmployees),
        bulkStatus,
        `cambio_masivo_${bulkStatus.toLowerCase()}`
      );

      toast.success(
        `${result.updatedCount} de ${result.requestedCount} empleados actualizados a ${bulkStatus}`
      );
      setSelectedEmployees(new Set());
      setBulkStatus("");
      await loadEmployees();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al actualizar estado");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const ensureStoresLoaded = async () => {
    if (storeOptions.length > 0 || storesLoading) return;

    try {
      setStoresLoading(true);
      const stores = await storeService.getAllStores();
      const options = (stores || []).map((s: any) => ({ id: s.id, name: s.name }));
      setStoreOptions(options);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "No se pudieron cargar las tiendas");
      setStoreOptions([]);
    } finally {
      setStoresLoading(false);
    }
  };

  const openRecreate = async () => {
    if (!canRecreateEmployee) {
      toast.error('No tienes permisos para recrear empleados.');
      return;
    }
    setIsRecreateOpen(true);
    setRecreateStep("warning");
    setRecreateResult(null);
    await ensureStoresLoaded();
  };

  const closeRecreate = () => {
    setIsRecreateOpen(false);
    setRecreateStep("warning");
    setRecreateSubmitting(false);
    setRecreateResult(null);
  };

  const submitRecreate = async () => {
    if (!selectedEmployeeId) return;

    if (!canRecreateEmployee) {
      toast.error('No tienes permisos para recrear empleados.');
      return;
    }

    const dto: RecreateEmployedDto = {
      firstName: recreateForm.firstName?.trim(),
      lastName: recreateForm.lastName?.trim(),
      document: recreateForm.document?.trim(),
      phone: recreateForm.phone?.trim() || undefined,
      email: recreateForm.email?.trim() || undefined,
      position: recreateForm.position?.trim(),
      assignmentRole: recreateForm.assignmentRole?.trim(),
      storeId: undefined,
      warehouseId: undefined,
    };

    if (recreateAssignmentMode === "STORE") {
      const storeId = recreateForm.storeId?.trim();
      if (storeId) dto.storeId = storeId;
    } else {
      const warehouseId = recreateForm.warehouseId?.trim();
      if (warehouseId) dto.warehouseId = warehouseId;
    }

    if (!dto.firstName || !dto.lastName || !dto.document || !dto.position || !dto.assignmentRole) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    if (!dto.storeId && !dto.warehouseId) {
      toast.error("Debe asignar el empleado a una tienda o a un almacén");
      return;
    }

    try {
      setRecreateSubmitting(true);
      const res = await employedService.recreateEmployed(selectedEmployeeId, dto);
      setRecreateResult(res);
      setRecreateStep("result");
      toast.success("Empleado recreado");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || error?.message || "Error al recrear empleado");
    } finally {
      setRecreateSubmitting(false);
    }
  };

  const closeRecreateResult = async () => {
    closeRecreate();
    closeDetail();
    await loadEmployees();
  };

  const resolveAssigned = (e: EmployedListItem) => {
    const store = e.storeName ?? null;
    const warehouse = e.warehouseName ?? null;

    // 1) Si backend indica el tipo, usarlo para decidir en qué columna va assignmentName
    if (e.assignmentType === 'STORE') {
      return { store: e.assignmentName ?? store, warehouse: null };
    }
    if (e.assignmentType === 'WAREHOUSE') {
      return { store: null, warehouse: e.assignmentName ?? warehouse };
    }

    // 2) Si vienen nombres explícitos (más confiable)
    if (store) {
      return { store, warehouse: null };
    }
    if (warehouse) {
      return { store: null, warehouse };
    }

    // 3) Si solo viene assignmentName (informativo), lo mostramos como tienda por defecto
    // (si el backend no especifica el tipo, no hay forma segura de inferir)
    if (e.assignmentName) {
      return { store: e.assignmentName, warehouse: null };
    }

    return { store: null, warehouse: null };
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Empleados</CardTitle>
                <p className="text-sm text-muted-foreground">Lista de empleados del tenant</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">                
                <ProtectedButton
                  permissions="MANAGE_EMPLOYEES"
                  onClick={openCreate}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar empleado
                </ProtectedButton>
                <ProtectedButton
                  permissions="MANAGE_EMPLOYEES"
                  onClick={openDeleted}
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ver eliminados
                </ProtectedButton>
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    placeholder="Nombre..."
                    value={firstNameQuery}
                    onBlur={() => setTimeout(() => setShowFirstNameSuggestions(false), 150)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setFirstNameQuery(nextValue);
                      setShowFirstNameSuggestions(nextValue.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const trimmed = firstNameQuery.trim();
                      if (!trimmed) return;
                      setFirstNameFilter(trimmed);
                      setFirstNameQuery(trimmed);
                      setShowFirstNameSuggestions(false);
                    }}
                  />
                  {firstNameQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setFirstNameQuery("");
                        setFirstNameFilter("");
                        setShowFirstNameSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}
                  {showFirstNameSuggestions && firstNameQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredFirstNameSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                      ) : (
                        filteredFirstNameSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setFirstNameFilter(item.firstName);
                              setFirstNameQuery(item.firstName);
                              setShowFirstNameSuggestions(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            {item.firstName}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Apellido..."
                    value={lastNameQuery}
                    onBlur={() => setTimeout(() => setShowLastNameSuggestions(false), 150)}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setLastNameQuery(nextValue);
                      setShowLastNameSuggestions(nextValue.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const trimmed = lastNameQuery.trim();
                      if (!trimmed) return;
                      setLastNameFilter(trimmed);
                      setLastNameQuery(trimmed);
                      setShowLastNameSuggestions(false);
                    }}
                  />
                  {lastNameQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLastNameQuery("");
                        setLastNameFilter("");
                        setShowLastNameSuggestions(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  )}
                  {showLastNameSuggestions && lastNameQuery.trim().length > 0 && (
                    <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-md">
                      {filteredLastNameSuggestions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin coincidencias</div>
                      ) : (
                        filteredLastNameSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setLastNameFilter(item.lastName);
                              setLastNameQuery(item.lastName);
                              setShowLastNameSuggestions(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            {item.lastName}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Cargo</span>
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {positionOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Estado</span>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as EmployedStatus | "all")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {statusOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {statusLabel[item] ?? item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Tienda</span>
                    <Select value={storeIdFilter} onValueChange={setStoreIdFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tienda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {storeOptions.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Almacén</span>
                    <Select value={warehouseIdFilter} onValueChange={setWarehouseIdFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Almacén" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {warehouseOptions.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Desde</span>
                    <Input
                      type="date"
                      value={fromDate}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                    <Input
                      type="date"
                      value={toDate}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <ActiveFilters 
              hasActiveFilters={!!(firstNameFilter || lastNameFilter || positionFilter !== "all" || statusFilter !== "all" || storeIdFilter !== "all" || warehouseIdFilter !== "all" || fromDate || toDate)}
              onClearFilters={clearFilters}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {firstNameFilter ||
                lastNameFilter ||
                positionFilter !== "all" ||
                statusFilter !== "all" ||
                storeIdFilter !== "all" ||
                warehouseIdFilter !== "all" ||
                fromDate ||
                toDate
                  ? "No se encontraron empleados que coincidan con el filtro"
                  : "No hay empleados registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={employees.length > 0 && selectedEmployees.size === employees.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees(new Set(employees.map((emp) => emp.id)));
                          } else {
                            setSelectedEmployees(new Set());
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tienda asignada</TableHead>
                    <TableHead>Almacén asignado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => {
                    const assigned = resolveAssigned(e);

                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(e.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEmployees.has(e.id)}
                            onChange={(event) => {
                              const newSelected = new Set(selectedEmployees);
                              if (event.target.checked) {
                                newSelected.add(e.id);
                              } else {
                                newSelected.delete(e.id);
                              }
                              setSelectedEmployees(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{e.firstName}</TableCell>
                        <TableCell>{e.lastName}</TableCell>
                        <TableCell>{e.position}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                              ${
                                e.status === "ACTIVE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : e.status === "SUSPENDED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-200 text-slate-700"
                              }
                            `}
                          >
                            {statusLabel[e.status] ?? e.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{assigned.store ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{assigned.warehouse ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetail(e.id)}
                            >
                              <Search className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedEmployees.size > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-muted/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedEmployees.size} empleado{selectedEmployees.size !== 1 ? "s" : ""} seleccionado{selectedEmployees.size !== 1 ? "s" : ""}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleBulkStatusUpdate}
                    disabled={bulkSubmitting || !bulkStatus}
                    className="w-full sm:w-auto"
                  >
                    {bulkSubmitting ? "Actualizando..." : "Aplicar estado"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedEmployees(new Set());
                      setBulkStatus("");
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? setIsDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <div className="p-6 pb-2">
              <DialogHeader>
                <DialogTitle>Detalle de empleado</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {detailLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : !detail ? (
                <div className="text-center py-6 text-muted-foreground">Sin información</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombres</label>
                  <Input
                    value={isEditing ? (editForm.firstName ?? "") : detail.firstName}
                    onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Apellidos</label>
                  <Input
                    value={isEditing ? (editForm.lastName ?? "") : detail.lastName}
                    onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento</label>
                  <Input value={detail.documentNumber ?? detail.document} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  {isEditing ? (
                    <Select
                      value={editForm.status ?? ""}
                      onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={`${detail.status} (${statusLabel[detail.status]})`} disabled />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    value={isEditing ? (editForm.phone ?? "") : (detail.phone ?? "")}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={isEditing ? (editForm.email ?? "") : (detail.email ?? "")}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cargo</label>
                  <Input
                    value={isEditing ? (editForm.position ?? "") : detail.position}
                    onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Asignación</label>
                  <Input
                    value={
                      assignmentInfo.store
                        ? `TIENDA: ${assignmentInfo.store}`
                        : assignmentInfo.warehouse
                          ? `ALMACÉN: ${assignmentInfo.warehouse}`
                          : "-"
                    }
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol de asignación</label>
                  <Input
                    value={detail.assignment?.role ?? detail.storeAssignments?.[0]?.role ?? detail.warehouseAssignments?.[0]?.role ?? "-"}
                    disabled
                  />
                </div>

                {detail.storeAssignments && detail.storeAssignments.length > 0 && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Detalles de asignación a tienda</label>
                    <div className="rounded-md border p-3 space-y-1 text-sm">
                      {detail.storeAssignments.map((sa) => (
                        <div key={sa.id}>
                          <div><strong>Tienda:</strong> {sa.store.name}</div>
                          <div><strong>Dirección:</strong> {sa.store.address}</div>
                          <div><strong>Teléfono:</strong> {sa.store.phone}</div>
                          <div><strong>Rol:</strong> {sa.role}</div>
                          <div><strong>Asignado el:</strong> {new Date(sa.assignedAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.warehouseAssignments && detail.warehouseAssignments.length > 0 && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Detalles de asignación a almacén</label>
                    <div className="rounded-md border p-3 space-y-1 text-sm">
                      {detail.warehouseAssignments.map((wa) => (
                        <div key={wa.id}>
                          <div><strong>Almacén:</strong> {wa.warehouse.name}</div>
                          <div><strong>Dirección:</strong> {wa.warehouse.address}</div>
                          <div><strong>Teléfono:</strong> {wa.warehouse.phone}</div>
                          <div><strong>Rol:</strong> {wa.role}</div>
                          <div><strong>Asignado el:</strong> {new Date(wa.assignedAt).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuario que lo creó</label>
                  <Input 
                    value={detail.audit?.createdBy ? `${detail.audit.createdBy.name} (${detail.audit.createdBy.email})` : (detail.createdByUser ? `${detail.createdByUser.name} (${detail.createdByUser.email})` : "-")} 
                    disabled 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Acceso al sistema</label>
                  <Input value={detail.userId ? "Sí (tiene acceso)" : "No (solo empleado)"} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de creación</label>
                  <Input value={new Date(detail.audit?.createdAt ?? detail.createdAt).toLocaleString()} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Última actualización</label>
                  <Input value={new Date(detail.audit?.updatedAt ?? detail.updatedAt).toLocaleString()} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de eliminación</label>
                  {(() => {
                    const deletedAt = detail.audit?.deletedAt ?? detail.deletedAt;
                    return (
                      <Input
                        value={deletedAt ? new Date(deletedAt).toLocaleString() : "-"}
                        disabled
                      />
                    );
                  })()}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Documentos ({detail.documents?.length ?? detail.documentUrls?.length ?? 0})</label>
                  <div className="rounded-md border p-3 min-h-[60px]">
                    {Array.isArray(detail.documents) && detail.documents.length > 0 ? (
                      <div className="space-y-2">
                        {detail.documents.map((doc: any, idx: number) => (
                          <div key={doc.id || `${doc.originalName}-${idx}`} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{doc.originalName || `Documento ${idx + 1}`}</div>
                              <div className="text-xs text-muted-foreground">
                                {doc.mimeType || '—'}{typeof doc.size === 'number' ? ` · ${doc.size} bytes` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {doc?.links?.view && (
                                <a
                                  href={doc.links.view}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs"
                                >
                                  Ver
                                </a>
                              )}
                              {doc?.links?.download && (
                                <a
                                  href={doc.links.download}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs"
                                >
                                  Descargar
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : detail.documentUrls && detail.documentUrls.length > 0 ? (
                      <div className="space-y-1">
                        {detail.documentUrls.map((url, idx) => (
                          <div key={idx} className="text-xs break-all">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Documento {idx + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">No hay documentos</div>
                    )}
                  </div>
                </div>

                {((detail.history && detail.history.length > 0) || (detail.employedHistories && detail.employedHistories.length > 0)) && (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Historial laboral</label>
                    <div className="rounded-md border p-3 space-y-2">
                      {(detail.history ?? detail.employedHistories ?? []).map((hist: any) => (
                        <div key={hist.id} className="text-sm border-b pb-2 last:border-0">
                          <div><strong>Motivo:</strong> {hist.reason}</div>
                          <div><strong>Contratado el:</strong> {hist.hiredAt ? new Date(hist.hiredAt).toLocaleString() : "-"}</div>
                          <div><strong>Estado:</strong> {hist.endedAt ? new Date(hist.endedAt).toLocaleString() : "Activo"}</div>
                          <div><strong>Creado por:</strong> {hist.createdBy?.name || "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t bg-background px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <ProtectedButton
                  permissions={['RECREATE_EMPLOYEE', 'MANAGE_EMPLOYEES']}
                  requireAll
                  variant="destructive"
                  onClick={openRecreate}
                  disabled={detailLoading || editSubmitting}
                  className="sm:mr-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recrear empleado
                </ProtectedButton>

                <DialogFooter className="gap-2 sm:gap-2">
                  <ProtectedButton
                    permissions="MANAGE_EMPLOYEES"
                    variant="outline"
                    onClick={openConvert}
                    disabled={detailLoading || editSubmitting || !!detail?.userId}
                  >
                    {detail?.userId ? "Ya es usuario" : "Convertir a usuario"}
                  </ProtectedButton>
                  <ProtectedButton
                    permissions="MANAGE_EMPLOYEES"
                    variant="outline"
                    onClick={() => {
                      if (!detail) return;
                      setIsEditing((v) => !v);
                      setEditForm({
                        firstName: detail.firstName ?? "",
                        lastName: detail.lastName ?? "",
                        phone: detail.phone ?? "",
                        email: detail.email ?? "",
                        position: detail.position ?? "",
                        status: detail.status ?? "",
                      });
                    }}
                    disabled={detailLoading || editSubmitting}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {isEditing ? "Cancelar edición" : "Editar"}
                  </ProtectedButton>

                  {isEditing && (
                    <ProtectedButton 
                      permissions="MANAGE_EMPLOYEES"
                      onClick={handleSaveEdit} 
                      disabled={editSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </ProtectedButton>
                  )}
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isConvertOpen} onOpenChange={(open) => (open ? setIsConvertOpen(true) : closeConvert())}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convertir empleado a usuario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  value={convertPassword}
                  onChange={(e) => setConvertPassword(e.target.value)}
                  disabled={convertSubmitting}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Tienda asignada</label>
                <Select
                  value={convertStoreId}
                  onValueChange={setConvertStoreId}
                  disabled={convertSubmitting || storesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={storesLoading ? "Cargando..." : "Seleccione una tienda"} />
                  </SelectTrigger>
                  <SelectContent>
                    {storeOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <PermissionsSelector
              selectedPermissions={convertPermissions}
              availablePermissions={availablePermissions}
              isLoading={permissionsLoading}
              onPermissionChange={setConvertPermissions}
              title="Permisos"
              description="Selecciona los permisos para el usuario"
              columns={2}
              maxHeight="max-h-56"
              className="space-y-3"
            />

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={closeConvert} disabled={convertSubmitting}>
                Cancelar
              </Button>
              <Button onClick={submitConvert} disabled={convertSubmitting}>
                {convertSubmitting ? "Creando..." : "Crear usuario"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecreateOpen} onOpenChange={(open) => (open ? setIsRecreateOpen(true) : closeRecreate())}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recrear empleado</DialogTitle>
          </DialogHeader>

          {recreateStep === "warning" && (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-medium">Confirmación</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Esta acción eliminará el empleado actual y creará uno nuevo.
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeRecreate} disabled={recreateSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={() => setRecreateStep("form")} disabled={recreateSubmitting}>
                  Continuar
                </Button>
              </DialogFooter>
            </div>
          )}

          {recreateStep === "form" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombres</label>
                  <Input
                    value={recreateForm.firstName}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, firstName: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Apellidos</label>
                  <Input
                    value={recreateForm.lastName}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, lastName: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento</label>
                  <Input
                    value={recreateForm.document}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, document: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cargo</label>
                  <Input
                    value={recreateForm.position}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, position: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    value={recreateForm.phone ?? ""}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, phone: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={recreateForm.email ?? ""}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={recreateSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol de asignación</label>
                  <Input
                    value={recreateForm.assignmentRole}
                    onChange={(e) => setRecreateForm((p) => ({ ...p, assignmentRole: e.target.value }))}
                    disabled={recreateSubmitting}
                    placeholder="Ej: OPERARIO"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de asignación</label>
                  <Select
                    value={recreateAssignmentMode}
                    onValueChange={(v) => setRecreateAssignmentMode(v as AssignmentMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STORE">Tienda</SelectItem>
                      <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recreateAssignmentMode === "STORE" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Tienda asignada</label>
                    <Select
                      value={recreateForm.storeId || ""}
                      onValueChange={(v) =>
                        setRecreateForm((p) => ({ ...p, storeId: v, warehouseId: "" }))
                      }
                      disabled={recreateSubmitting || storesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={storesLoading ? "Cargando..." : "Seleccione una tienda"} />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Almacén asignado (ID)</label>
                    <Input
                      value={recreateForm.warehouseId ?? ""}
                      onChange={(e) =>
                        setRecreateForm((p) => ({ ...p, warehouseId: e.target.value, storeId: "" }))
                      }
                      disabled={recreateSubmitting}
                      placeholder="Ingrese warehouseId"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRecreateStep("warning")}
                  disabled={recreateSubmitting}
                >
                  Atrás
                </Button>
                <Button onClick={submitRecreate} disabled={recreateSubmitting}>
                  {recreateSubmitting ? "Recreando..." : "Recrear"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {recreateStep === "result" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white/70 p-2 text-emerald-600 shadow-sm dark:bg-emerald-900/50">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">Empleado recreado correctamente</p>
                    <p className="text-sm text-muted-foreground">Comparte estos datos con el responsable del área.</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nombre completo</dt>
                    <dd className="text-sm font-semibold">{[recreateResult?.firstName, recreateResult?.lastName].filter(Boolean).join(" ") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documento</dt>
                    <dd className="text-sm font-semibold">{recreateResult?.document || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cargo</dt>
                    <dd className="text-sm font-semibold">{recreateResult?.position || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rol asignado</dt>
                    <dd className="text-sm font-semibold">{recreateResult?.assignmentRole || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tienda</dt>
                    <dd className="text-sm font-semibold">{recreateResult?.storeAssignments?.[0]?.store?.name || recreateResult?.store?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Almacén</dt>
                    <dd className="text-sm font-semibold">{recreateResult?.warehouseAssignments?.[0]?.warehouse?.name || recreateResult?.warehouse?.name || "—"}</dd>
                  </div>
                </dl>
              </div>

              <details className="rounded-xl border bg-muted/40 p-4 text-sm">
                <summary className="cursor-pointer select-none font-medium">Ver respuesta completa (JSON)</summary>
                <pre className="mt-3 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(recreateResult, null, 2)}
                </pre>
              </details>

              <DialogFooter>
                <Button onClick={closeRecreateResult}>Cerrar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletedOpen} onOpenChange={(open) => (open ? setIsDeletedOpen(true) : closeDeleted())}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Empleados eliminados</DialogTitle>
          </DialogHeader>

          {deletedLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : deletedEmployees.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No hay empleados eliminados</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-auto pr-1">
              {deletedEmployees.map((e) => (
                <div key={e.id} className="rounded-md border p-4 space-y-2">
                  <div className="font-semibold">
                    {e.firstName} {e.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">Documento: {e.document}</div>
                  <div className="text-sm">Estado: {e.status}</div>
                  <div className="text-sm">Cargo: {e.position}</div>
                  <div className="text-sm">Teléfono: {e.phone ?? "-"}</div>
                  <div className="text-sm">Email: {e.email ?? "-"}</div>
                  <div className="text-sm">
                    Asignación: {e.storeAssignments?.[0]?.store?.name || e.warehouseAssignments?.[0]?.warehouse?.name || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDeleted}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={(open) => (open ? setIsCreateOpen(true) : closeCreate())}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar empleado</DialogTitle>
          </DialogHeader>

          {createStep === "form" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombres</label>
                  <Input
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Apellidos</label>
                  <Input
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento</label>
                  <Input
                    value={createForm.document}
                    onChange={(e) => setCreateForm((p) => ({ ...p, document: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Cargo</label>
                  <Input
                    value={createForm.position}
                    onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    value={createForm.phone ?? ""}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={createForm.email ?? ""}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol de asignación</label>
                  <Input
                    value={createForm.assignmentRole}
                    onChange={(e) => setCreateForm((p) => ({ ...p, assignmentRole: e.target.value }))}
                    disabled={createSubmitting}
                    placeholder="Ej: OPERADOR"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de asignación</label>
                  <Select
                    value={createAssignmentMode}
                    onValueChange={async (v) => {
                      const mode = v as AssignmentMode;
                      setCreateAssignmentMode(mode);
                      if (mode === "STORE") {
                        await ensureStoresLoaded();
                      } else {
                        await ensureWarehousesLoaded();
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STORE">Tienda</SelectItem>
                      <SelectItem value="WAREHOUSE">Almacén</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {createAssignmentMode === "STORE" ? (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Tienda asignada</label>
                    <Select
                      value={createForm.storeId || ""}
                      onValueChange={(v) =>
                        setCreateForm((p) => ({ ...p, storeId: v, warehouseId: "" }))
                      }
                      disabled={createSubmitting || storesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={storesLoading ? "Cargando..." : "Seleccione una tienda"} />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Almacén asignado</label>
                    <Select
                      value={createForm.warehouseId || ""}
                      onValueChange={(v) =>
                        setCreateForm((p) => ({ ...p, warehouseId: v, storeId: "" }))
                      }
                      disabled={createSubmitting || warehousesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={warehousesLoading ? "Cargando..." : "Seleccione un almacén"} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouseOptions.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Documentos</label>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setCreateDocuments(files);
                    }}
                    disabled={createSubmitting}
                  />
                  {createDocuments.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {createDocuments.length} archivo(s) seleccionado(s)
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeCreate} disabled={createSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={submitCreate} disabled={createSubmitting}>
                  {createSubmitting ? "Creando..." : "Crear"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {createStep === "result" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-200/60 bg-blue-50/80 p-5 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white/70 p-2 text-blue-600 shadow-sm dark:bg-blue-900/50">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">Empleado creado correctamente</p>
                    <p className="text-sm text-muted-foreground">Utiliza estos datos para completar el onboarding.</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nombre completo</dt>
                    <dd className="text-sm font-semibold">{[createResult?.firstName, createResult?.lastName].filter(Boolean).join(" ") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cargo</dt>
                    <dd className="text-sm font-semibold">{createResult?.position || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tienda / Almacén</dt>
                    <dd className="text-sm font-semibold">{createResult?.assignmentName || "—"}</dd>
                  </div>
                </dl>

                {(createWarningMessage || createFailedDocuments.length > 0) && (
                  <div className="mt-5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Empleado creado con advertencias</p>
                        <p className="text-sm">
                          {createWarningMessage || "Se creó el empleado, pero no se pudieron registrar algunos documentos."}
                        </p>
                        {createFailedDocuments.length > 0 && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide">Documentos no registrados</p>
                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                              {createFailedDocuments.map((doc: any, index: number) => {
                                const label = typeof doc === "string"
                                  ? doc
                                  : doc?.originalName || doc?.fileName || doc?.name || doc?.documentName || doc?.url || "Documento sin nombre";
                                return <li key={`${label}-${index}`}>{label}</li>;
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {createUploadedDocuments.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documentos subidos</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {createUploadedDocuments.map((doc: any, index: number) => (
                        <div key={doc.id || doc.url || `uploaded-${index}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{doc.originalName || doc.fileName || doc.name || doc.url || "Documento"}</span>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Ver
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {createResult?.createdAt && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Registrado el {new Date(createResult.createdAt).toLocaleString()}
                  </p>
                )}
              </div>              

              <DialogFooter>
                <Button onClick={closeCreateResult}>Cerrar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
