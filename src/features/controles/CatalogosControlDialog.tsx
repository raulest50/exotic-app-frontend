import {
    Alert,
    Badge,
    Box,
    Button,
    CloseButton,
    Dialog,
    Field,
    Grid,
    HStack,
    Input,
    Portal,
    Table,
    Tabs,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuBookOpen } from "react-icons/lu";

import { useAppToast } from "../../components/ui/use-app-toast";
import {
    apiFailureDetail,
    createMagnitud,
    createUnidad,
    setMagnitudActive,
    setUnidadActive,
} from "./api";
import type { CatalogoMagnitud, CatalogoUnidad } from "./types";

interface CatalogosControlDialogProps {
    magnitudes: CatalogoMagnitud[];
    unidades: CatalogoUnidad[];
    canManage: boolean;
    onRefresh: () => Promise<void>;
}

const initialMagnitude = { codigo: "", nombre: "", simbolo: "", dimension: "" };
const initialUnit = { codigo: "", nombre: "", simbolo: "", dimension: "" };

export default function CatalogosControlDialog({
    magnitudes,
    unidades,
    canManage,
    onRefresh,
}: CatalogosControlDialogProps) {
    const toast = useAppToast();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [magnitude, setMagnitude] = useState(initialMagnitude);
    const [unit, setUnit] = useState(initialUnit);

    const run = async (operation: () => Promise<unknown>, title: string) => {
        setSaving(true);
        try {
            await operation();
            await onRefresh();
            toast({ title, status: "success" });
        } catch (error) {
            toast({
                title: "No fue posible actualizar el catálogo",
                description: apiFailureDetail(error, "Error de catálogo.").message,
                status: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    const saveMagnitude = async () => {
        if (!magnitude.codigo.trim() || !magnitude.nombre.trim() || !magnitude.simbolo.trim() || !magnitude.dimension.trim()) return;
        await run(() => createMagnitud({
            codigo: magnitude.codigo.trim().toUpperCase(),
            nombre: magnitude.nombre.trim(),
            simbolo: magnitude.simbolo.trim(),
            dimension: magnitude.dimension.trim(),
        }), "Magnitud creada");
        setMagnitude(initialMagnitude);
    };

    const saveUnit = async () => {
        if (!unit.codigo.trim() || !unit.nombre.trim() || !unit.simbolo.trim() || !unit.dimension.trim()) return;
        await run(() => createUnidad({
            codigo: unit.codigo.trim().toUpperCase(),
            nombre: unit.nombre.trim(),
            simbolo: unit.simbolo.trim(),
            dimension: unit.dimension.trim(),
        }), "Unidad creada");
        setUnit(initialUnit);
    };

    return (
        <Dialog.Root open={open} onOpenChange={({ open: next }) => setOpen(next)} size="xl" scrollBehavior="inside">
            <Dialog.Trigger asChild>
                <Button variant="outline"><LuBookOpen />Magnitudes físicas y unidades</Button>
            </Dialog.Trigger>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content maxW="5xl">
                        <Dialog.Header>
                            <Dialog.Title>Magnitudes físicas y unidades</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.CloseTrigger asChild><CloseButton aria-label="Cerrar catálogos" size="sm" /></Dialog.CloseTrigger>
                        <Dialog.Body>
                            <Text color="fg.muted" mb={4}>
                                Este catálogo estandariza qué se mide y en qué unidad. Los objetivos, límites y muestras se definen en cada plan.
                            </Text>
                            {!canManage && (
                                <Alert.Root status="info" mb={4}>
                                    <Alert.Indicator />Los catálogos están disponibles en modo de consulta.
                                </Alert.Root>
                            )}
                            <Tabs.Root defaultValue="magnitudes" lazyMount>
                                <Tabs.List>
                                    <Tabs.Trigger value="magnitudes">Magnitudes</Tabs.Trigger>
                                    <Tabs.Trigger value="unidades">Unidades</Tabs.Trigger>
                                </Tabs.List>
                                <Tabs.Content value="magnitudes">
                                    <VStack align="stretch" gap={4}>
                                        {canManage && (
                                            <Grid templateColumns={{ base: "1fr", md: "1fr 2fr 1fr 1fr auto" }} gap={3} alignItems="end">
                                                <Field.Root required><Field.Label>Código</Field.Label><Input value={magnitude.codigo} onChange={(event) => setMagnitude((current) => ({ ...current, codigo: event.target.value }))} maxLength={40} /></Field.Root>
                                                <Field.Root required><Field.Label>Nombre</Field.Label><Input value={magnitude.nombre} onChange={(event) => setMagnitude((current) => ({ ...current, nombre: event.target.value }))} maxLength={120} /></Field.Root>
                                                <Field.Root required><Field.Label>Símbolo</Field.Label><Input value={magnitude.simbolo} onChange={(event) => setMagnitude((current) => ({ ...current, simbolo: event.target.value }))} maxLength={30} /></Field.Root>
                                                <Field.Root required><Field.Label>Dimensión</Field.Label><Input value={magnitude.dimension} onChange={(event) => setMagnitude((current) => ({ ...current, dimension: event.target.value }))} placeholder="Masa, acidez…" maxLength={80} /></Field.Root>
                                                <Button colorPalette="teal" loading={saving} onClick={() => void saveMagnitude()}>Crear</Button>
                                            </Grid>
                                        )}
                                        <Box overflowX="auto">
                                            <Table.Root size="sm">
                                                <Table.Header><Table.Row><Table.ColumnHeader>Código</Table.ColumnHeader><Table.ColumnHeader>Nombre</Table.ColumnHeader><Table.ColumnHeader>Símbolo</Table.ColumnHeader><Table.ColumnHeader>Dimensión</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header>
                                                <Table.Body>{magnitudes.map((item) => <Table.Row key={item.id}><Table.Cell>{item.codigo}</Table.Cell><Table.Cell>{item.nombre}</Table.Cell><Table.Cell>{item.simbolo ?? "—"}</Table.Cell><Table.Cell>{item.dimension}</Table.Cell><Table.Cell><Badge colorPalette={item.activo ? "green" : "gray"}>{item.activo ? "ACTIVA" : "INACTIVA"}</Badge>{item.usado && <Badge ml={1} colorPalette="blue">EN USO</Badge>}</Table.Cell><Table.Cell textAlign="end">{canManage && <Button size="xs" variant="outline" loading={saving} onClick={() => void run(() => setMagnitudActive(item.id, !item.activo), `Magnitud ${item.activo ? "desactivada" : "activada"}`)}>{item.activo ? "Desactivar" : "Activar"}</Button>}</Table.Cell></Table.Row>)}</Table.Body>
                                            </Table.Root>
                                        </Box>
                                    </VStack>
                                </Tabs.Content>
                                <Tabs.Content value="unidades">
                                    <VStack align="stretch" gap={4}>
                                        {canManage && (
                                            <Grid templateColumns={{ base: "1fr", md: "1fr 2fr 1fr 1fr auto" }} gap={3} alignItems="end">
                                                <Field.Root required><Field.Label>Código</Field.Label><Input value={unit.codigo} onChange={(event) => setUnit((current) => ({ ...current, codigo: event.target.value }))} maxLength={40} /></Field.Root>
                                                <Field.Root required><Field.Label>Nombre</Field.Label><Input value={unit.nombre} onChange={(event) => setUnit((current) => ({ ...current, nombre: event.target.value }))} maxLength={120} /></Field.Root>
                                                <Field.Root required><Field.Label>Símbolo</Field.Label><Input value={unit.simbolo} onChange={(event) => setUnit((current) => ({ ...current, simbolo: event.target.value }))} maxLength={30} /></Field.Root>
                                                <Field.Root required><Field.Label>Dimensión</Field.Label><Input value={unit.dimension} onChange={(event) => setUnit((current) => ({ ...current, dimension: event.target.value }))} maxLength={80} /></Field.Root>
                                                <Button colorPalette="teal" loading={saving} onClick={() => void saveUnit()}>Crear</Button>
                                            </Grid>
                                        )}
                                        <Box overflowX="auto">
                                            <Table.Root size="sm">
                                                <Table.Header><Table.Row><Table.ColumnHeader>Código</Table.ColumnHeader><Table.ColumnHeader>Nombre</Table.ColumnHeader><Table.ColumnHeader>Símbolo</Table.ColumnHeader><Table.ColumnHeader>Dimensión</Table.ColumnHeader><Table.ColumnHeader>Estado</Table.ColumnHeader><Table.ColumnHeader /></Table.Row></Table.Header>
                                                <Table.Body>{unidades.map((item) => <Table.Row key={item.id}><Table.Cell>{item.codigo}</Table.Cell><Table.Cell>{item.nombre}</Table.Cell><Table.Cell>{item.simbolo}</Table.Cell><Table.Cell>{item.dimension}</Table.Cell><Table.Cell><Badge colorPalette={item.activo ? "green" : "gray"}>{item.activo ? "ACTIVA" : "INACTIVA"}</Badge>{item.usado && <Badge ml={1} colorPalette="blue">EN USO</Badge>}</Table.Cell><Table.Cell textAlign="end">{canManage && <Button size="xs" variant="outline" loading={saving} onClick={() => void run(() => setUnidadActive(item.id, !item.activo), `Unidad ${item.activo ? "desactivada" : "activada"}`)}>{item.activo ? "Desactivar" : "Activar"}</Button>}</Table.Cell></Table.Row>)}</Table.Body>
                                            </Table.Root>
                                        </Box>
                                    </VStack>
                                </Tabs.Content>
                            </Tabs.Root>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <HStack><Text fontSize="sm" color="fg.muted">Los elementos usados se desactivan; no se eliminan.</Text><Button onClick={() => setOpen(false)}>Cerrar</Button></HStack>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    );
}
