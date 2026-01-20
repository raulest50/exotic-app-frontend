import { useState } from 'react';
import {
    Button,
    Flex,
    Heading,
    Text,
    VStack,
    Box,
    Divider,
    SimpleGrid,
    Badge,
    useToast,
    Card,
    CardHeader,
    CardBody,
} from '@chakra-ui/react';
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL";
import {
    ActivoFijo,
    IncorporacionActivoDto,
    ItemOrdenCompraActivo,
    OrdenCompraActivo,
    TIPO_INCORPORACION
} from '../../types.tsx';

type Props = {
    setActiveStep: (step: number) => void;
    incorporacionActivoDto: IncorporacionActivoDto;
    ordenCompraActivo: OrdenCompraActivo;
};

export function ActivosFijosStep3ReviewSubmit({
    setActiveStep,
    incorporacionActivoDto,
    ordenCompraActivo
}: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    // Elimina propiedades no soportadas por el backend
    const sanitizeItem = (
        item: ItemOrdenCompraActivo & { precioUnitarioFinal?: number }
    ): ItemOrdenCompraActivo => {
        const { precioUnitarioFinal, ...clean } = item;
        return clean;
    };

    /**
     * QUICKFIX TEMPORAL: Transforma un ActivoFijo para que sea compatible con el backend
     * 
     * Ajusta los nombres de campos y elimina campos no reconocidos por el backend:
     * - Renombra 'tipo' a 'tipoActivo'
     * - Renombra 'unidadCapacidad' a 'unidadesCapacidad'
     * - Elimina 'precio' y 'divisa' que no existen en el backend
     * 
     * Solución a largo plazo: Alinear los modelos del frontend y backend
     * para usar los mismos nombres de campos.
     */
    const sanitizeActivo = (activo: ActivoFijo): any => {
        if (!activo) return activo;

        // Desestructurar para extraer campos que necesitan ser renombrados o eliminados
        const { 
            tipo, 
            precio, 
            divisa, 
            unidadCapacidad,
            ...rest 
        } = activo;

        // Crear un nuevo objeto con los campos correctamente nombrados para el backend
        return {
            ...rest,
            tipoActivo: tipo, // Renombrar 'tipo' a 'tipoActivo'
            ...(unidadCapacidad ? { unidadesCapacidad: unidadCapacidad } : {}) // Renombrar si existe
        };
    };

    // Función para finalizar la incorporación
    const handleFinalizarIncorporacion = async () => {
        setIsSubmitting(true);
        const endpoints = new EndPointsURL();

        try {
            const formData = new FormData();

            const { documentoSoporte, gruposActivos = [], ...rest } = incorporacionActivoDto;
            const gruposSinId = gruposActivos.map(({ id: _id, itemOrdenCompra, activos, ...g }) => ({
                ...g,
                itemOrdenCompra: sanitizeItem(itemOrdenCompra),
                // Aplicar sanitizeActivo a cada activo en el grupo
                activos: activos.map(sanitizeActivo)
            }));
            const dto = { ...rest, gruposActivos: gruposSinId };
            formData.append(
                "incorporacionDto",
                new Blob([JSON.stringify(dto)], { type: "application/json" })
            );

            if (
                incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC &&
                ordenCompraActivo
            ) {
                const { itemsOrdenCompra = [], ...ordenRest } = ordenCompraActivo;
                const itemsLimpios = itemsOrdenCompra.map(sanitizeItem);
                const ordenLimpia = { ...ordenRest, itemsOrdenCompra: itemsLimpios };
                formData.append(
                    "ordenCompraActivo",
                    new Blob([JSON.stringify(ordenLimpia)], { type: "application/json" })
                );
            }

            if (documentoSoporte) {
                formData.append("documentoSoporte", documentoSoporte);
            }

            const response = await axios.post(endpoints.incorporar_activos_fijos, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            toast({
                title: "Incorporación exitosa",
                description: `ID de incorporación: ${response.data.incorporacionId}`,
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            setActiveStep(0);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error al incorporar",
                description: "No se pudo completar la incorporación de activos.",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Flex direction="column" gap={6} w="full">
            <VStack spacing={4} align="stretch" bg="blue.50" p={6} borderRadius="md">
                <Heading size="md" textAlign="center">
                    Validar y Finalizar Incorporación
                </Heading>

                <Text textAlign="center">
                    Revise la información de la incorporación antes de finalizar.
                </Text>

                <Divider />

                <Card>
                    <CardHeader bg="teal.100">
                        <Heading size="sm">Información General</Heading>
                    </CardHeader>
                    <CardBody>
                        <SimpleGrid columns={2} spacing={4}>
                            <Box>
                                <Text fontWeight="bold">Tipo de Incorporación:</Text>
                                <Badge colorScheme={
                                    incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC 
                                        ? "green" 
                                        : incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.SIN_OC 
                                            ? "blue" 
                                            : "purple"
                                }>
                                    {incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC 
                                        ? "Con Orden de Compra" 
                                        : incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.SIN_OC 
                                            ? "Sin Orden de Compra" 
                                            : "Activo Existente"}
                                </Badge>
                            </Box>
                            <Box>
                                <Text fontWeight="bold">Documento Soporte:</Text>
                                <Text>{incorporacionActivoDto.documentoSoporte?.name || "No disponible"}</Text>
                            </Box>
                        </SimpleGrid>
                    </CardBody>
                </Card>

                {incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC && ordenCompraActivo && (
                    <Card>
                        <CardHeader bg="teal.100">
                            <Heading size="sm">Información de Orden de Compra</Heading>
                        </CardHeader>
                        <CardBody>
                            <SimpleGrid columns={2} spacing={4}>
                                <Box>
                                    <Text fontWeight="bold">ID Orden:</Text>
                                    <Text>{ordenCompraActivo.ordenCompraActivoId || "No disponible"}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Proveedor:</Text>
                                    <Text>{ordenCompraActivo.proveedor?.nombre || "No disponible"}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Total:</Text>
                                    <Text>{ordenCompraActivo.totalPagar?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || "No disponible"}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Fecha Emisión:</Text>
                                    <Text>{ordenCompraActivo.fechaEmision ? new Date(ordenCompraActivo.fechaEmision).toLocaleDateString() : "No disponible"}</Text>
                                </Box>
                            </SimpleGrid>
                        </CardBody>
                    </Card>
                )}

                <Divider />

                <Flex justifyContent="space-between">
                    <Button 
                        colorScheme="gray" 
                        onClick={() => setActiveStep(2)}
                    >
                        Volver
                    </Button>
                    <Button 
                        colorScheme="teal" 
                        isLoading={isSubmitting}
                        onClick={handleFinalizarIncorporacion}
                    >
                        Finalizar Incorporación
                    </Button>
                </Flex>
            </VStack>
        </Flex>
    );
}
