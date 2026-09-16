import {
    Badge,
    Box,
    Button,
    CloseButton,
    Drawer,
    Flex,
    HStack,
    Portal,
    SimpleGrid,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import EndPointsURL from "../../api/EndPointsURL";
import {
    formatDateTime,
    getEstadoDispensacionMaterialesColor,
    getEstadoDispensacionMaterialesLabel,
    getPoliticaDispensacionInicioColor,
    getPoliticaDispensacionInicioLabel,
} from "../Produccion/components/SeguimientoBoardUI";
import type {
    OrdenFabricacionOperacionDTO,
    OrdenFabricacionOperativaDTO,
    PoeViewerTarget,
} from "./areaOperativaPanel.types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    detail: OrdenFabricacionOperativaDTO | null;
    loading: boolean;
    currentAreaId?: number | null;
    onOpenPoe: (target: PoeViewerTarget) => void;
}

const endpoints = new EndPointsURL();

function estadoColor(estado: number): string {
    if (estado === 2) return "green";
    if (estado === 4) return "blue";
    if (estado === 1) return "yellow";
    if (estado === 0) return "orange";
    return "gray";
}

export default function AreaOperativaFabricacionDetailDrawer({
    isOpen,
    onClose,
    detail,
    loading,
    currentAreaId,
    onOpenPoe,
}: Props) {
    const openPoe = (operacion: OrdenFabricacionOperacionDTO) => {
        if (!detail || !operacion.poeDocumentoVersionId || operacion.poeVersion == null) return;
        onOpenPoe({
            url: endpoints.area_operativa_panel_poe_fabricacion
                .replace("{ordenFabricacionId}", String(detail.ordenFabricacionId))
                .replace("{operacionId}", String(operacion.id)),
            procesoNombre: operacion.procesoNombre,
            areaNombre: operacion.areaOperativaNombre,
            version: operacion.poeVersion,
        });
    };

    return (
        <Drawer.Root open={isOpen} placement="end" size="xl" onOpenChange={(event) => {
            if (!event.open) onClose();
        }}>
            <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                    <Drawer.Content maxW={{ base: "100vw", md: "40rem" }}>
                        <Drawer.CloseTrigger asChild>
                            <CloseButton aria-label="Cerrar" size="sm" />
                        </Drawer.CloseTrigger>
                        <Drawer.Header>
                            <Drawer.Title>Detalle operativo de fabricación</Drawer.Title>
                        </Drawer.Header>
                        <Drawer.Body>
                            {loading ? (
                                <Flex justify="center" py={12}><Spinner /></Flex>
                            ) : null}
                            {!loading && detail ? (
                                <VStack align="stretch" gap={5}>
                                    <Box>
                                        <HStack gap={2} flexWrap="wrap">
                                            <Badge colorPalette="purple">OF-{detail.ordenFabricacionId}</Badge>
                                            <Badge colorPalette="gray" variant="outline">{detail.lote}</Badge>
                                            <Badge colorPalette="blue">{detail.estado}</Badge>
                                        </HStack>
                                        <Text mt={2} fontWeight="bold">{detail.semiTerminadoNombre}</Text>
                                        <Text color="app.textMuted">
                                            {detail.semiTerminadoId} · {detail.cantidadPlanificada.toLocaleString("es-CO")} {detail.unidadMedida}
                                        </Text>
                                    </Box>

                                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                                        <Box borderWidth="1px" borderRadius="md" p={3}>
                                            <Text fontSize="sm" color="app.textSubtle">Expediente</Text>
                                            <Text>{detail.batchRecordCodigo}</Text>
                                        </Box>
                                        <Box borderWidth="1px" borderRadius="md" p={3}>
                                            <Text fontSize="sm" color="app.textSubtle">Versión de manufactura</Text>
                                            <Text>v{detail.manufacturingVersionNumber}</Text>
                                        </Box>
                                        <Box borderWidth="1px" borderRadius="md" p={3}>
                                            <Text fontSize="sm" color="app.textSubtle">Lanzamiento</Text>
                                            <Text>{formatDateTime(detail.fechaLanzamiento || detail.liberadaEn)}</Text>
                                        </Box>
                                        <Box borderWidth="1px" borderRadius="md" p={3}>
                                            <Text fontSize="sm" color="app.textSubtle">Fin planificado</Text>
                                            <Text>{formatDateTime(detail.fechaFinalPlanificada)}</Text>
                                        </Box>
                                    </SimpleGrid>

                                    <HStack gap={2} flexWrap="wrap">
                                        <Badge colorPalette={getEstadoDispensacionMaterialesColor(detail.estadoDispensacionMateriales)}>
                                            {getEstadoDispensacionMaterialesLabel(detail.estadoDispensacionMateriales)}
                                        </Badge>
                                        <Badge colorPalette={getPoliticaDispensacionInicioColor(detail.politicaDispensacionInicio)}>
                                            {getPoliticaDispensacionInicioLabel(detail.politicaDispensacionInicio)}
                                        </Badge>
                                    </HStack>

                                    <Box>
                                        <Text fontWeight="semibold" mb={3}>Operaciones congeladas</Text>
                                        <VStack align="stretch" gap={3}>
                                            {detail.operaciones.map((operacion, index) => (
                                                <Box
                                                    key={operacion.id}
                                                    borderWidth="1px"
                                                    borderColor={operacion.areaOperativaId === currentAreaId ? "teal.400" : undefined}
                                                    borderRadius="md"
                                                    p={3}
                                                >
                                                    <HStack justify="space-between" align="start" gap={3}>
                                                        <Box>
                                                            <Text fontWeight="bold">{index + 1}. {operacion.procesoNombre}</Text>
                                                            <Text fontSize="sm" color="app.textMuted">{operacion.areaOperativaNombre}</Text>
                                                        </Box>
                                                        <Badge colorPalette={estadoColor(operacion.estado)}>{operacion.estadoDescripcion}</Badge>
                                                    </HStack>
                                                    <Text mt={2} fontSize="sm">
                                                        Último cambio: {formatDateTime(operacion.fechaEstadoActual)}
                                                    </Text>
                                                    {operacion.usuarioReporta ? (
                                                        <Text fontSize="sm">Reportado por: {operacion.usuarioReporta}</Text>
                                                    ) : null}
                                                    {operacion.observaciones ? (
                                                        <Text mt={1} fontSize="sm" whiteSpace="pre-wrap">{operacion.observaciones}</Text>
                                                    ) : null}
                                                    {operacion.poeDocumentoVersionId
                                                        && operacion.areaOperativaId === currentAreaId ? (
                                                        <Button
                                                            mt={3}
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openPoe(operacion)}
                                                        >
                                                            Ver POE v{operacion.poeVersion}
                                                        </Button>
                                                    ) : null}
                                                </Box>
                                            ))}
                                        </VStack>
                                    </Box>

                                    <Box borderWidth="1px" borderRadius="md" p={3} bg="app.surfaceSubtle">
                                        <Text fontWeight="semibold">Observaciones</Text>
                                        <Text mt={1} whiteSpace="pre-wrap">{detail.observaciones?.trim() || "Sin observaciones."}</Text>
                                    </Box>
                                </VStack>
                            ) : null}
                        </Drawer.Body>
                    </Drawer.Content>
                </Drawer.Positioner>
            </Portal>
        </Drawer.Root>
    );
}
