"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, X, Users, Trash2, Edit2, Save, RotateCcw, Plus } from "lucide-react";

import { employedService } from "@/services/employed.service";
import { storeService } from "@/services/store.service";
import type {
  EmployedDetail,
  EmployedListItem,
  EmployedStatus,
  CreateEmployedDto,
  RecreateEmployedDto,
  UpdateEmployedDto,
} from "@/types/employed.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type AssignmentMode = "STORE" | "WAREHOUSE";

type StoreOption = { id: string; name: string };

const statusLabel: Record<EmployedStatus, string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  SUSPENDED: "SUSPENDIDO",
};

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();

export default function EmpleadosPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployedListItem[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployedStatus | "all">("all");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<EmployedDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEmployedDto>({
    firstName: "",
    phone: "",
    email: "",
    position: "",
  });

  const [isDeletedOpen, setIsDeletedOpen] = useState(false);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [deletedEmployees, setDeletedEmployees] = useState<EmployedDetail[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"form" | "result">("form");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState<any>(null);

  const [isRecreateOpen, setIsRecreateOpen] = useState(false);
  const [recreateStep, setRecreateStep] = useState<"warning" | "form" | "result">("warning");
  const [recreateSubmitting, setRecreateSubmitting] = useState(false);
  const [recreateResult, setRecreateResult] = useState<any>(null);

  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);

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

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await employedService.getEmployedList();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar empleados");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = normalize(searchTerm);

    return employees
      .filter((e) => {
        if (statusFilter === "all") return true;
        return e.status === statusFilter;
      })
      .filter((e) => {
        if (!q) return true;
        return (
          normalize(e.firstName).includes(q) ||
          normalize(e.lastName).includes(q) ||
          normalize(e.position).includes(q) ||
          normalize(e.status).includes(q) ||
          normalize(e.assignmentName).includes(q) ||
          normalize(e.storeName).includes(q) ||
          normalize(e.warehouseName).includes(q)
        );
      });
  }, [employees, searchTerm, statusFilter]);

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
        phone: d.phone ?? "",
        email: d.email ?? "",
        position: d.position ?? "",
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

  const openCreate = async () => {
    setIsCreateOpen(true);
    setCreateStep("form");
    setCreateResult(null);
    setCreateSubmitting(false);
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
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setCreateStep("form");
    setCreateSubmitting(false);
    setCreateResult(null);
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
      const res = await employedService.createEmployed(dto);
      setCreateResult(res);
      setCreateStep("result");
      toast.success("Empleado creado");
    } catch (error: any) {
      console.error(error);
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

  const assignmentInfo = useMemo(() => {
    if (!detail) return { store: null as string | null, warehouse: null as string | null };

    const storeName = detail.storeAssignments?.[0]?.store?.name ||
      detail.storeAssignments?.[0]?.storeName ||
      null;

    const warehouseName = detail.warehouseAssignments?.[0]?.warehouse?.name ||
      detail.warehouseAssignments?.[0]?.warehouseName ||
      null;

    return { store: storeName, warehouse: warehouseName };
  }, [detail]);

  const handleSaveEdit = async () => {
    if (!selectedEmployeeId) return;

    try {
      setEditSubmitting(true);
      const updated = await employedService.updateEmployed(selectedEmployeeId, {
        firstName: editForm.firstName?.trim() || undefined,
        phone: editForm.phone?.trim() || undefined,
        email: editForm.email?.trim() || undefined,
        position: editForm.position?.trim() || undefined,
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
                <Button
                  onClick={openCreate}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 transition-colors"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar empleado
                </Button>
                <Button
                  onClick={openDeleted}
                  className="w-full sm:w-auto"
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ver eliminados
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="w-full flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar por nombre, apellido, cargo, estado o asignación..."
                    className="pl-9 pr-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-[220px]">
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all"
                  ? "No se encontraron empleados que coincidan con el filtro"
                  : "No hay empleados registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tienda asignada</TableHead>
                    <TableHead>Almacén asignado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => {
                    const assigned = resolveAssigned(e);

                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(e.id)}
                      >
                        <TableCell className="font-medium">{e.firstName}</TableCell>
                        <TableCell>{e.lastName}</TableCell>
                        <TableCell>{e.position}</TableCell>
                        <TableCell>{e.status}</TableCell>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? setIsDetailOpen(true) : closeDetail())}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Detalle de empleado</DialogTitle>
          </DialogHeader>

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
                  <Input value={detail.lastName} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento</label>
                  <Input value={detail.document} disabled />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input value={`${detail.status} (${statusLabel[detail.status]})`} disabled />
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
              </div>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!detail) return;
                    setIsEditing((v) => !v);
                    setEditForm({
                      firstName: detail.firstName ?? "",
                      phone: detail.phone ?? "",
                      email: detail.email ?? "",
                      position: detail.position ?? "",
                    });
                  }}
                  disabled={detailLoading || editSubmitting}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {isEditing ? "Cancelar edición" : "Editar"}
                </Button>

                {isEditing && (
                  <Button onClick={handleSaveEdit} disabled={editSubmitting}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                )}

                <Button
                  variant="destructive"
                  onClick={openRecreate}
                  disabled={detailLoading || editSubmitting}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Recrear empleado
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRecreateOpen} onOpenChange={(open) => (open ? setIsRecreateOpen(true) : closeRecreate())}>
        <DialogContent className="sm:max-w-[720px]">
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
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-medium">Respuesta</p>
                <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(recreateResult, null, 2)}
                </pre>
              </div>

              <DialogFooter>
                <Button onClick={closeRecreateResult}>Cerrar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletedOpen} onOpenChange={(open) => (open ? setIsDeletedOpen(true) : closeDeleted())}>
        <DialogContent className="sm:max-w-[900px]">
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
        <DialogContent className="sm:max-w-[720px]">
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
                    onValueChange={(v) => setCreateAssignmentMode(v as AssignmentMode)}
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
                    <label className="text-sm font-medium">Almacén asignado (ID)</label>
                    <Input
                      value={createForm.warehouseId ?? ""}
                      onChange={(e) =>
                        setCreateForm((p) => ({ ...p, warehouseId: e.target.value, storeId: "" }))
                      }
                      disabled={createSubmitting}
                      placeholder="Ingrese warehouseId"
                    />
                  </div>
                )}
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
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="font-medium">Respuesta</p>
                <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                  {JSON.stringify(createResult, null, 2)}
                </pre>
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
