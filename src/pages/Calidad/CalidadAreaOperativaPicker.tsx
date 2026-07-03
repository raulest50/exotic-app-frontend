import { CloseIcon, SearchIcon } from "@chakra-ui/icons";
import {
    Badge,
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    HStack,
    IconButton,
    Input,
    InputGroup,
    InputLeftElement,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
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
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { extractApiError, searchAreasOperativas } from "./calidadApi";
import type { AreaOperativaOption } from "./types";

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
    const { isOpen, onOpen, onClose } = useDisclosure();
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
        <FormControl>
            <FormLabel>{label}</FormLabel>
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" align="center" spacing={4}>
                    <Box minW={0}>
                        {value ? (
                            <VStack align="start" spacing={1}>
                                <HStack spacing={2} flexWrap="wrap">
                                    <Text fontWeight="semibold">{value.nombre}</Text>
                                    <Badge variant="subtle">ID {value.areaId}</Badge>
                                </HStack>
                                {value.descripcion && (
                                    <Text fontSize="sm" color="gray.600" noOfLines={2}>
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
                    <HStack spacing={2}>
                        {value && (
                            <IconButton
                                aria-label="Limpiar area operativa"
                                icon={<CloseIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={() => onChange(null)}
                                isDisabled={isDisabled}
                            />
                        )}
                        <Button onClick={onOpen} isDisabled={isDisabled}>
                            {value ? "Cambiar" : "Seleccionar"}
                        </Button>
                    </HStack>
                </HStack>
            </Box>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}

            <Modal isOpen={isOpen} onClose={onClose} size="3xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Seleccionar area operativa</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack align="stretch" spacing={4}>
                            <HStack>
                                <InputGroup>
                                    <InputLeftElement pointerEvents="none">
                                        <SearchIcon color="gray.400" />
                                    </InputLeftElement>
                                    <Input
                                        value={searchText}
                                        onChange={(event) => setSearchText(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") buscarAreas();
                                        }}
                                        placeholder="Buscar por nombre"
                                    />
                                </InputGroup>
                                <Button onClick={() => buscarAreas()} isLoading={loading}>
                                    Buscar
                                </Button>
                            </HStack>

                            <Box overflowX="auto">
                                <Table size="sm">
                                    <Thead>
                                        <Tr>
                                            <Th>ID</Th>
                                            <Th>Nombre</Th>
                                            <Th>Descripcion</Th>
                                            <Th>Responsable</Th>
                                            <Th />
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {currentAreas.map((area) => (
                                            <Tr
                                                key={area.areaId}
                                                bg={value?.areaId === area.areaId ? "teal.50" : undefined}
                                            >
                                                <Td>{area.areaId}</Td>
                                                <Td fontWeight="semibold">{area.nombre}</Td>
                                                <Td maxW="280px">
                                                    <Text noOfLines={2}>{area.descripcion || "-"}</Text>
                                                </Td>
                                                <Td>{responsableLabel(area)}</Td>
                                                <Td textAlign="right">
                                                    <Button size="xs" colorScheme="teal" onClick={() => seleccionarArea(area)}>
                                                        Seleccionar
                                                    </Button>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                                {!loading && areas.length === 0 && (
                                    <Text textAlign="center" color="gray.500" py={6}>
                                        No hay areas para mostrar.
                                    </Text>
                                )}
                            </Box>

                            {areas.length > PAGE_SIZE && (
                                <HStack justify="center">
                                    <Button size="sm" onClick={() => setPage((current) => current - 1)} isDisabled={page === 1}>
                                        Anterior
                                    </Button>
                                    <Text fontSize="sm">Pagina {page} de {totalPages}</Text>
                                    <Button size="sm" onClick={() => setPage((current) => current + 1)} isDisabled={page === totalPages}>
                                        Siguiente
                                    </Button>
                                </HStack>
                            )}
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cerrar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </FormControl>
    );
}
