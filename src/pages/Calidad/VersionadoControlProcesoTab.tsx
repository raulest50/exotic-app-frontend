import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Button,
    HStack,
    IconButton,
    Input,
    Select,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
} from "@chakra-ui/react";
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
    const toast = useToast();
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
        <VStack align="stretch" spacing={5}>
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
                            <Button size="sm" onClick={() => cargarPlantillas(selectedArea)} isLoading={loadingPlantillas}>Actualizar</Button>
                        </HStack>
                        {plantillas.length === 0 ? (
                            <Text color="gray.500">No hay versiones registradas.</Text>
                        ) : (
                            <Table size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Version</Th>
                                        <Th>Estado</Th>
                                        <Th>Caracteristicas</Th>
                                        <Th>Acciones</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {plantillas.map((plantilla) => (
                                        <Tr key={plantilla.id}>
                                            <Td>{plantilla.version}</Td>
                                            <Td><Badge colorScheme={estadoColor(plantilla.estado)}>{plantilla.estado}</Badge></Td>
                                            <Td>{plantilla.caracteristicas.length}</Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <Button size="xs" onClick={() => setRows(plantilla.caracteristicas.map(fromCaracteristica))}>
                                                        Cargar
                                                    </Button>
                                                    {plantilla.estado === "BORRADOR" && (
                                                        <Button size="xs" colorScheme="teal" onClick={() => publicar(plantilla)}>
                                                            Publicar
                                                        </Button>
                                                    )}
                                                    {plantilla.estado !== "RETIRADA" && (
                                                        <Button size="xs" variant="outline" onClick={() => retirar(plantilla)}>
                                                            Retirar
                                                        </Button>
                                                    )}
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        )}
                    </Box>

                    <Box borderWidth="1px" borderRadius="md" p={4}>
                        <HStack justify="space-between" mb={3}>
                            <Text fontWeight="semibold">Caracteristicas del borrador</Text>
                            <Button leftIcon={<AddIcon />} size="sm" onClick={() => setRows((current) => [...current, newDraftRow()])}>
                                Agregar
                            </Button>
                        </HStack>
                        <Table size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Nombre</Th>
                                    <Th>Tipo</Th>
                                    <Th>Unidad</Th>
                                    <Th>Muestras</Th>
                                    <Th>Unidades/muestra</Th>
                                    <Th>Lim. inf.</Th>
                                    <Th>Lim. sup.</Th>
                                    <Th />
                                </Tr>
                            </Thead>
                            <Tbody>
                                {rows.map((row) => (
                                    <Tr key={row.key}>
                                        <Td>
                                            <Input size="sm" value={row.nombre} onChange={(event) => updateRow(row.key, { nombre: event.target.value })} />
                                        </Td>
                                        <Td>
                                            <Select
                                                size="sm"
                                                value={row.tipo}
                                                onChange={(event) => updateRow(row.key, { tipo: event.target.value as TipoCaracteristicaControlProceso })}
                                            >
                                                <option value="NUMERICA">Numerica</option>
                                                <option value="BOOLEANA">Cumple/No cumple</option>
                                            </Select>
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                value={row.unidad}
                                                isDisabled={row.tipo === "BOOLEANA"}
                                                onChange={(event) => updateRow(row.key, { unidad: event.target.value })}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                type="number"
                                                min={1}
                                                value={row.cantidadMuestras}
                                                onChange={(event) => updateRow(row.key, { cantidadMuestras: event.target.value })}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                type="number"
                                                min={1}
                                                value={row.unidadesPorMuestra}
                                                onChange={(event) => updateRow(row.key, { unidadesPorMuestra: event.target.value })}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                type="number"
                                                value={row.limiteInferior}
                                                isDisabled={row.tipo === "BOOLEANA"}
                                                onChange={(event) => updateRow(row.key, { limiteInferior: event.target.value })}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                type="number"
                                                value={row.limiteSuperior}
                                                isDisabled={row.tipo === "BOOLEANA"}
                                                onChange={(event) => updateRow(row.key, { limiteSuperior: event.target.value })}
                                            />
                                        </Td>
                                        <Td>
                                            <IconButton
                                                aria-label="Eliminar caracteristica"
                                                icon={<DeleteIcon />}
                                                size="sm"
                                                variant="ghost"
                                                isDisabled={rows.length === 1}
                                                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                                            />
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                        <HStack justify="flex-end" mt={4}>
                            <Button colorScheme="teal" onClick={guardarBorrador} isLoading={saving}>
                                Guardar borrador
                            </Button>
                        </HStack>
                    </Box>
                </>
            )}
        </VStack>
    );
}
