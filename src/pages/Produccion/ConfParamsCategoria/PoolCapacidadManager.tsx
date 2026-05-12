import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    FormControl,
    FormLabel,
    Input,
    SimpleGrid,
    Spinner,
    Table,
    TableContainer,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
} from "@chakra-ui/react";
import EndPointsURL from "../../../api/EndPointsURL";
import type { PoolCapacidad } from "../types";

interface PoolCapacidadManagerProps {
    pools: PoolCapacidad[];
    isLoading: boolean;
    onChanged: () => Promise<void>;
}

interface PoolDraft {
    nombre: string;
    capacidadDiaria: number;
    descripcion: string;
    activo: boolean;
}

function buildDraft(pool?: PoolCapacidad): PoolDraft {
    return {
        nombre: pool?.nombre ?? "",
        capacidadDiaria: pool?.capacidadDiaria ?? 0,
        descripcion: pool?.descripcion ?? "",
        activo: pool?.activo ?? true,
    };
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.response?.data?.message ?? error.message ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function PoolCapacidadManager({
    pools,
    isLoading,
    onChanged,
}: PoolCapacidadManagerProps) {
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const [createDraft, setCreateDraft] = useState<PoolDraft>(buildDraft());
    const [editingDrafts, setEditingDrafts] = useState<Record<number, PoolDraft>>({});
    const [savingCreate, setSavingCreate] = useState(false);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const next: Record<number, PoolDraft> = {};
        pools.forEach((pool) => {
            next[pool.id] = buildDraft(pool);
        });
        setEditingDrafts(next);
    }, [pools]);

    const handleCreateChange = <K extends keyof PoolDraft>(key: K, value: PoolDraft[K]) => {
        setCreateDraft((prev) => ({ ...prev, [key]: value }));
    };

    const handleEditChange = <K extends keyof PoolDraft>(poolId: number, key: K, value: PoolDraft[K]) => {
        setEditingDrafts((prev) => ({
            ...prev,
            [poolId]: {
                ...(prev[poolId] ?? buildDraft()),
                [key]: value,
            },
        }));
    };

    const handleCreate = async () => {
        if (!createDraft.nombre.trim()) {
            toast({
                title: "Nombre requerido",
                description: "Debes ingresar un nombre para el pool.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setSavingCreate(true);
        try {
            await axios.post(endPoints.create_pool_capacidad, {
                nombre: createDraft.nombre.trim(),
                capacidadDiaria: createDraft.capacidadDiaria,
                descripcion: createDraft.descripcion.trim() || null,
                activo: createDraft.activo,
            });
            setCreateDraft(buildDraft());
            await onChanged();
            toast({
                title: "Pool creado",
                description: "El pool de capacidad se creo correctamente.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error al crear pool",
                description: getErrorMessage(error, "No se pudo crear el pool."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingCreate(false);
        }
    };

    const handleSave = async (pool: PoolCapacidad) => {
        const draft = editingDrafts[pool.id] ?? buildDraft(pool);
        if (!draft.nombre.trim()) {
            toast({
                title: "Nombre requerido",
                description: "El nombre del pool no puede quedar vacio.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setSavingId(pool.id);
        try {
            const url = endPoints.update_pool_capacidad.replace("{id}", String(pool.id));
            await axios.put(url, {
                nombre: draft.nombre.trim(),
                capacidadDiaria: draft.capacidadDiaria,
                descripcion: draft.descripcion.trim() || null,
                activo: draft.activo,
            });
            await onChanged();
            toast({
                title: "Pool actualizado",
                description: `El pool "${draft.nombre.trim()}" se actualizo correctamente.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error al actualizar pool",
                description: getErrorMessage(error, "No se pudo actualizar el pool."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSavingId(null);
        }
    };

    const handleDelete = async (pool: PoolCapacidad) => {
        if (!window.confirm(`Eliminar el pool "${pool.nombre}"?`)) {
            return;
        }

        setDeletingId(pool.id);
        try {
            const url = endPoints.delete_pool_capacidad.replace("{id}", String(pool.id));
            await axios.delete(url);
            await onChanged();
            toast({
                title: "Pool eliminado",
                description: `El pool "${pool.nombre}" fue eliminado.`,
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "No se pudo eliminar el pool",
                description: getErrorMessage(error, "Error al eliminar el pool."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Box p={4} borderWidth="1px" borderRadius="lg" mb={4} bg="white">
            <Text fontWeight="bold" mb={4}>Pools de capacidad</Text>

            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} mb={4} bg="gray.50">
                <Text fontWeight="semibold" mb={3}>Crear pool</Text>
                <SimpleGrid columns={[1, 1, 2, 4]} gap={3}>
                    <FormControl>
                        <FormLabel>Nombre</FormLabel>
                        <Input
                            value={createDraft.nombre}
                            onChange={(e) => handleCreateChange("nombre", e.target.value)}
                            placeholder="Nombre del pool"
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Capacidad diaria</FormLabel>
                        <Input
                            type="number"
                            min={0}
                            value={createDraft.capacidadDiaria}
                            onChange={(e) => handleCreateChange("capacidadDiaria", Number(e.target.value || 0))}
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Descripcion</FormLabel>
                        <Input
                            value={createDraft.descripcion}
                            onChange={(e) => handleCreateChange("descripcion", e.target.value)}
                            placeholder="Opcional"
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Activo</FormLabel>
                        <Flex align="center" h="40px">
                            <Checkbox
                                isChecked={createDraft.activo}
                                onChange={(e) => handleCreateChange("activo", e.target.checked)}
                            >
                                Habilitado
                            </Checkbox>
                        </Flex>
                    </FormControl>
                </SimpleGrid>
                <Button mt={4} colorScheme="blue" onClick={handleCreate} isLoading={savingCreate}>
                    Crear pool
                </Button>
            </Box>

            {isLoading ? (
                <Flex justify="center" py={6}>
                    <Spinner />
                </Flex>
            ) : pools.length === 0 ? (
                <Text color="gray.500">No hay pools de capacidad registrados.</Text>
            ) : (
                <TableContainer>
                    <Table size="sm" variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Nombre</Th>
                                <Th>Capacidad diaria</Th>
                                <Th>Descripcion</Th>
                                <Th>Estado</Th>
                                <Th>Acciones</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {pools.map((pool) => {
                                const draft = editingDrafts[pool.id] ?? buildDraft(pool);
                                const hasChanges =
                                    draft.nombre !== pool.nombre
                                    || draft.capacidadDiaria !== pool.capacidadDiaria
                                    || draft.descripcion !== (pool.descripcion ?? "")
                                    || draft.activo !== pool.activo;

                                return (
                                    <Tr key={pool.id}>
                                        <Td>
                                            <Input
                                                size="sm"
                                                value={draft.nombre}
                                                onChange={(e) => handleEditChange(pool.id, "nombre", e.target.value)}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                type="number"
                                                min={0}
                                                value={draft.capacidadDiaria}
                                                onChange={(e) => handleEditChange(pool.id, "capacidadDiaria", Number(e.target.value || 0))}
                                            />
                                        </Td>
                                        <Td>
                                            <Input
                                                size="sm"
                                                value={draft.descripcion}
                                                onChange={(e) => handleEditChange(pool.id, "descripcion", e.target.value)}
                                            />
                                        </Td>
                                        <Td>
                                            <Flex align="center" gap={2}>
                                                <Checkbox
                                                    isChecked={draft.activo}
                                                    onChange={(e) => handleEditChange(pool.id, "activo", e.target.checked)}
                                                >
                                                    Activo
                                                </Checkbox>
                                                <Badge colorScheme={draft.activo ? "green" : "gray"}>
                                                    {draft.activo ? "Activo" : "Inactivo"}
                                                </Badge>
                                            </Flex>
                                        </Td>
                                        <Td>
                                            <Flex gap={2}>
                                                <Button
                                                    size="sm"
                                                    colorScheme="green"
                                                    onClick={() => handleSave(pool)}
                                                    isDisabled={!hasChanges}
                                                    isLoading={savingId === pool.id}
                                                >
                                                    Guardar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="outline"
                                                    onClick={() => handleDelete(pool)}
                                                    isLoading={deletingId === pool.id}
                                                >
                                                    Eliminar
                                                </Button>
                                            </Flex>
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}
