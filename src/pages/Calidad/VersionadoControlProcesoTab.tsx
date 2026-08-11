import {
    Steps,
    Badge,
    Box,
    Button,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useState } from "react";
import {
    extractApiError,
    guardarBorradorPlantilla,
    listPlantillas,
    publicarPlantilla,
    retirarPlantilla,
} from "./calidadApi";
import CalidadAreaOperativaPicker from "./CalidadAreaOperativaPicker";
import type {
    AreaOperativaOption,
    CaracteristicaRequest,
    CaracteristicaResponse,
    PlantillaResponse,
    TipoCaracteristicaControlProceso,
} from "./types";
import { LuPlus, LuTrash2 } from 'react-icons/lu';

type DraftCaracteristica = {
    key: string;
    nombre: string;
    tipo: TipoCaracteristicaControlProceso;
    unidad: string;
    cantidadMuestras: string;
    unidadesPorMuestra: string;
    limiteInferior: string;
    limiteSuperior: string;
};

function newDraftRow(): DraftCaracteristica {
    return {
        key: `${Date.now()}-${Math.random()}`,
        nombre: "",
        tipo: "NUMERICA",
        unidad: "",
        cantidadMuestras: "3",
        unidadesPorMuestra: "5",
        limiteInferior: "",
        limiteSuperior: "",
    };
}

function fromCaracteristica(caracteristica: CaracteristicaResponse): DraftCaracteristica {
    return {
        key: `${caracteristica.id}-${Math.random()}`,
        nombre: caracteristica.nombre,
        tipo: caracteristica.tipo,
        unidad: caracteristica.unidad ?? "",
        cantidadMuestras: String(caracteristica.cantidadMuestras),
        unidadesPorMuestra: String(caracteristica.unidadesPorMuestra),
        limiteInferior: caracteristica.limiteInferior == null ? "" : String(caracteristica.limiteInferior),
        limiteSuperior: caracteristica.limiteSuperior == null ? "" : String(caracteristica.limiteSuperior),
    };
}

function parsePositiveInt(value: string, label: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${label} debe ser un entero mayor que cero.`);
    }
    return parsed;
}

function parseOptionalNumber(value: string, label: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`${label} debe ser un numero valido.`);
    }
    return parsed;
}

function estadoColor(estado: PlantillaResponse["estado"]) {
    if (estado === "VIGENTE") return "green";
    if (estado === "BORRADOR") return "yellow";
    return "gray";
}

export default function VersionadoControlProcesoTab() {
    const toast = useAppToast();
    const [selectedArea, setSelectedArea] = useState<AreaOperativaOption | null>(null);
    const [plantillas, setPlantillas] = useState<PlantillaResponse[]>([]);
    const [rows, setRows] = useState<DraftCaracteristica[]>([newDraftRow()]);
    const [loadingPlantillas, setLoadingPlantillas] = useState(false);
    const [saving, setSaving] = useState(false);

    const cargarPlantillas = async (area: AreaOperativaOption) => {
        setLoadingPlantillas(true);
        try {
            const data = await listPlantillas({ areaId: area.areaId });
            setPlantillas(data);
            const draft = data.find((item) => item.estado === "BORRADOR");
            setRows(draft ? draft.caracteristicas.map(fromCaracteristica) : [newDraftRow()]);
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible cargar plantillas."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoadingPlantillas(false);
        }
    };

    const handleAreaChange = (area: AreaOperativaOption | null) => {
        setSelectedArea(area);
        if (area) {
            cargarPlantillas(area);
        } else {
            setPlantillas([]);
            setRows([newDraftRow()]);
        }
    };

    const updateRow = (key: string, patch: Partial<DraftCaracteristica>) => {
        setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    };

    const buildPayload = (): CaracteristicaRequest[] => {
        return rows.map((row, index) => {
            const nombre = row.nombre.trim();
            if (!nombre) throw new Error("Todas las caracteristicas deben tener nombre.");
            const cantidadMuestras = parsePositiveInt(row.cantidadMuestras, "Cantidad de muestras");
            const unidadesPorMuestra = parsePositiveInt(row.unidadesPorMuestra, "Unidades por muestra");
            const limiteInferior = row.tipo === "NUMERICA" ? parseOptionalNumber(row.limiteInferior, "Limite inferior") : null;
            const limiteSuperior = row.tipo === "NUMERICA" ? parseOptionalNumber(row.limiteSuperior, "Limite superior") : null;
            if (limiteInferior != null && limiteSuperior != null && limiteInferior > limiteSuperior) {
                throw new Error("El limite inferior no puede ser mayor que el limite superior.");
            }
            return {
                nombre,
                tipo: row.tipo,
                unidad: row.tipo === "NUMERICA" ? row.unidad.trim() || null : null,
                orden: index + 1,
                cantidadMuestras,
                unidadesPorMuestra,
                limiteInferior,
                limiteSuperior,
            };
        });
    };

    const guardarBorrador = async () => {
        if (!selectedArea) return;
        setSaving(true);
        try {
            const saved = await guardarBorradorPlantilla({
                areaOperativaId: selectedArea.areaId,
                caracteristicas: buildPayload(),
            });
            setRows(saved.caracteristicas.map(fromCaracteristica));
            await cargarPlantillas(selectedArea);
            toast({
                title: "Borrador guardado",
                status: "success",
                duration: 2500,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible guardar el borrador."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const publicar = async (plantilla: PlantillaResponse) => {
        if (!selectedArea) return;
        try {
            await publicarPlantilla(plantilla.id);
            await cargarPlantillas(selectedArea);
            toast({ title: "Plantilla publicada", status: "success", duration: 2500, isClosable: true });
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible publicar la plantilla."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const retirar = async (plantilla: PlantillaResponse) => {
        if (!selectedArea) return;
        try {
            await retirarPlantilla(plantilla.id);
            await cargarPlantillas(selectedArea);
            toast({ title: "Plantilla retirada", status: "success", duration: 2500, isClosable: true });
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible retirar la plantilla."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    return (
        <VStack align="stretch" gap={5}>
            <CalidadAreaOperativaPicker
                value={selectedArea}
                onChange={handleAreaChange}
                helperText="La plantilla vigente se define por area operativa."
            />

            {selectedArea && (
                <>
                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <HStack justify="space-between" mb={3}>
                            <Text fontWeight="semibold">Versiones de {selectedArea.nombre}</Text>
                            <Button size="sm" onClick={() => cargarPlantillas(selectedArea)} loading={loadingPlantillas}>Actualizar</Button>
                        </HStack>
                        {plantillas.length === 0 ? (
                            <Text color="gray.500">No hay versiones registradas.</Text>
                        ) : (
                            <Table.Root size="sm">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Version</Table.ColumnHeader>
                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                        <Table.ColumnHeader>Caracteristicas</Table.ColumnHeader>
                                        <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {plantillas.map((plantilla) => (
                                        <Table.Row key={plantilla.id}>
                                            <Table.Cell>{plantilla.version}</Table.Cell>
                                            <Table.Cell><Badge colorPalette={estadoColor(plantilla.estado)}>{plantilla.estado}</Badge></Table.Cell>
                                            <Table.Cell>{plantilla.caracteristicas.length}</Table.Cell>
                                            <Table.Cell>
                                                <HStack gap={2}>
                                                    <Button size="xs" onClick={() => setRows(plantilla.caracteristicas.map(fromCaracteristica))}>
                                                        Cargar
                                                    </Button>
                                                    {plantilla.estado === "BORRADOR" && (
                                                        <Button size="xs" colorPalette="teal" onClick={() => publicar(plantilla)}>
                                                            Publicar
                                                        </Button>
                                                    )}
                                                    {plantilla.estado !== "RETIRADA" && (
                                                        <Button size="xs" variant="outline" onClick={() => retirar(plantilla)}>
                                                            Retirar
                                                        </Button>
                                                    )}
                                                </HStack>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        )}
                    </Box>

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <HStack justify="space-between" mb={3}>
                            <Text fontWeight="semibold">Caracteristicas del borrador</Text>
                            <Button
                                size="sm"
                                onClick={() => setRows((current) => [...current, newDraftRow()])}><LuPlus />Agregar
                                                            </Button>
                        </HStack>
                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                                    <Table.ColumnHeader>Muestras</Table.ColumnHeader>
                                    <Table.ColumnHeader>Unidades/muestra</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lim. inf.</Table.ColumnHeader>
                                    <Table.ColumnHeader>Lim. sup.</Table.ColumnHeader>
                                    <Table.ColumnHeader />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {rows.map((row) => (
                                    <Table.Row key={row.key}>
                                        <Table.Cell>
                                            <Input size="sm" value={row.nombre} onValueChange={(event) => updateRow(row.key, { nombre: event.target.value })} />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    size="sm"
                                                    value={row.tipo}
                                                    onValueChange={(event) => updateRow(row.key, { tipo: event.target.value as TipoCaracteristicaControlProceso })}>
                                                    <option value="NUMERICA">Numerica</option>
                                                    <option value="BOOLEANA">Cumple/No cumple</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input
                                                size="sm"
                                                value={row.unidad}
                                                disabled={row.tipo === "BOOLEANA"}
                                                onValueChange={(event) => updateRow(row.key, { unidad: event.target.value })}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input
                                                size="sm"
                                                type="number"
                                                min={1}
                                                value={row.cantidadMuestras}
                                                onValueChange={(event) => updateRow(row.key, { cantidadMuestras: event.target.value })}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input
                                                size="sm"
                                                type="number"
                                                min={1}
                                                value={row.unidadesPorMuestra}
                                                onValueChange={(event) => updateRow(row.key, { unidadesPorMuestra: event.target.value })}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input
                                                size="sm"
                                                type="number"
                                                value={row.limiteInferior}
                                                disabled={row.tipo === "BOOLEANA"}
                                                onValueChange={(event) => updateRow(row.key, { limiteInferior: event.target.value })}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Input
                                                size="sm"
                                                type="number"
                                                value={row.limiteSuperior}
                                                disabled={row.tipo === "BOOLEANA"}
                                                onValueChange={(event) => updateRow(row.key, { limiteSuperior: event.target.value })}
                                            />
                                        </Table.Cell>
                                        <Table.Cell>
                                            <IconButton
                                                aria-label="Eliminar caracteristica"
                                                size="sm"
                                                variant="ghost"
                                                disabled={rows.length === 1}
                                                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><LuTrash2 /></IconButton>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                        <HStack justify="flex-end" mt={4}>
                            <Button colorPalette="teal" onClick={guardarBorrador} loading={saving}>
                                Guardar borrador
                            </Button>
                        </HStack>
                    </Box>
                </>
            )}
        </VStack>
    );
}
