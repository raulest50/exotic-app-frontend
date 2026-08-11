import {
    Steps,
    Badge,
    Box,
    Button,
    HStack,
    IconButton,
    Input,
    InputGroup,
    InputLeftElement,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    VStack,
    useDisclosure,
    useToast,
    Field,
    Icon,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { extractApiError, searchAreasOperativas } from "./calidadApi";
import type { AreaOperativaOption } from "./types";
import { LuSearch, LuX } from 'react-icons/lu';

interface CalidadAreaOperativaPickerProps {
    value: AreaOperativaOption | null;
    onChange: (area: AreaOperativaOption | null) => void;
    label?: string;
    helperText?: string;
    isDisabled?: boolean;
}

const PAGE_SIZE = 8;

function responsableLabel(area: AreaOperativaOption) {
    return area.responsableArea?.nombreCompleto
        || area.responsableArea?.username
        || "Sin responsable";
}

export default function CalidadAreaOperativaPicker({
    value,
    onChange,
    label = "Area operativa",
    helperText,
    isDisabled = false,
}: CalidadAreaOperativaPickerProps) {
    const toast = useToast();
    const { open, onOpen, onClose } = useDisclosure();
    const [searchText, setSearchText] = useState("");
    const [areas, setAreas] = useState<AreaOperativaOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(areas.length / PAGE_SIZE));
    const currentAreas = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return areas.slice(start, start + PAGE_SIZE);
    }, [areas, page]);

    const buscarAreas = async (nombre = searchText) => {
        setLoading(true);
        try {
            const data = await searchAreasOperativas(nombre);
            setAreas(data);
            setPage(1);
        } catch (error) {
            toast({
                title: "Error",
                description: extractApiError(error, "No fue posible buscar areas operativas."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setSearchText("");
            buscarAreas("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const seleccionarArea = (area: AreaOperativaOption) => {
        onChange(area);
        onClose();
    };

    return (
        <Field.Root>
            <Field.Label>{label}</Field.Label>
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" align="center" gap={4}>
                    <Box minW={0}>
                        {value ? (
                            <VStack align="start" gap={1}>
                                <HStack gap={2} flexWrap="wrap">
                                    <Text fontWeight="semibold">{value.nombre}</Text>
                                    <Badge variant="subtle">ID {value.areaId}</Badge>
                                </HStack>
                                {value.descripcion && (
                                    <Text fontSize="sm" color="gray.600" lineClamp={2}>
                                        {value.descripcion}
                                    </Text>
                                )}
                                <Text fontSize="sm" color="gray.600">
                                    {responsableLabel(value)}
                                </Text>
                            </VStack>
                        ) : (
                            <Text color="gray.500">No hay area seleccionada.</Text>
                        )}
                    </Box>
                    <HStack gap={2}>
                        {value && (
                            <IconButton
                                aria-label="Limpiar area operativa"
                                size="sm"
                                variant="ghost"
                                onClick={() => onChange(null)}
                                disabled={isDisabled}><LuX /></IconButton>
                        )}
                        <Button onClick={onOpen} disabled={isDisabled}>
                            {value ? "Cambiar" : "Seleccionar"}
                        </Button>
                    </HStack>
                </HStack>
            </Box>
            {helperText && <Field.HelperText>{helperText}</Field.HelperText>}

            <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
                if (!e.open) {
                    onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>Seleccionar area operativa</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body>
                                <VStack align="stretch" gap={4}>
                                    <HStack>
                                        <InputGroup>
                                            <InputLeftElement pointerEvents="none">
                                                <Icon as={LuSearch} color="gray.400" />
                                            </InputLeftElement>
                                            <Input
                                                value={searchText}
                                                onValueChange={(event) => setSearchText(event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") buscarAreas();
                                                }}
                                                placeholder="Buscar por nombre"
                                            />
                                        </InputGroup>
                                        <Button onClick={() => buscarAreas()} loading={loading}>
                                            Buscar
                                        </Button>
                                    </HStack>

                                    <Box overflowX="auto">
                                        <Table.Root size="sm">
                                            <Table.Header>
                                                <Table.Row>
                                                    <Table.ColumnHeader>ID</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Descripcion</Table.ColumnHeader>
                                                    <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                                                    <Table.ColumnHeader />
                                                </Table.Row>
                                            </Table.Header>
                                            <Table.Body>
                                                {currentAreas.map((area) => (
                                                    <Table.Row
                                                        key={area.areaId}
                                                        bg={value?.areaId === area.areaId ? "teal.50" : undefined}
                                                    >
                                                        <Table.Cell>{area.areaId}</Table.Cell>
                                                        <Table.Cell fontWeight="semibold">{area.nombre}</Table.Cell>
                                                        <Table.Cell maxW="280px">
                                                            <Text lineClamp={2}>{area.descripcion || "-"}</Text>
                                                        </Table.Cell>
                                                        <Table.Cell>{responsableLabel(area)}</Table.Cell>
                                                        <Table.Cell textAlign="right">
                                                            <Button size="xs" colorPalette="teal" onClick={() => seleccionarArea(area)}>
                                                                Seleccionar
                                                            </Button>
                                                        </Table.Cell>
                                                    </Table.Row>
                                                ))}
                                            </Table.Body>
                                        </Table.Root>
                                        {!loading && areas.length === 0 && (
                                            <Text textAlign="center" color="gray.500" py={6}>
                                                No hay areas para mostrar.
                                            </Text>
                                        )}
                                    </Box>

                                    {areas.length > PAGE_SIZE && (
                                        <HStack justify="center">
                                            <Button size="sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>
                                                Anterior
                                            </Button>
                                            <Text fontSize="sm">Pagina {page} de {totalPages}</Text>
                                            <Button size="sm" onClick={() => setPage((current) => current + 1)} disabled={page === totalPages}>
                                                Siguiente
                                            </Button>
                                        </HStack>
                                    )}
                                </VStack>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="outline" onClick={onClose}>
                                    Cerrar
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Field.Root>
    );
}
