import { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Flex,
    SimpleGrid,
    Box,
    Text,
    IconButton,
    VStack,
    Heading,
    useToast,
    Card,
    CardBody
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { ActivoFijo, IncorporacionActivoDto, OrdenCompraActivo, ItemOrdenCompraActivo, TIPO_INCORPORACION, GrupoActivos, TipoActivo } from '../../types.tsx';
import { ActivoGroup } from './ActivoGroup/ActivoGroup.tsx';

type Props = {
    setActiveStep: (step: number) => void;
    setIncorporacionActivoHeader: (incorporacionActivoHeader: IncorporacionActivoDto) => void;
    incorporacionActivoDto: IncorporacionActivoDto;
    ordenCompraActivo: OrdenCompraActivo;
};

export function ActivosFijosStep1Form({
    setActiveStep, 
    setIncorporacionActivoHeader, 
    incorporacionActivoDto, 
    ordenCompraActivo 
}: Props) {
    const [grupos, setGrupos] = useState<GrupoActivos[]>([]);
    const toast = useToast();

    // Inicializar grupos basados en el tipo de incorporación
    useEffect(() => {
        if (incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC && 
            ordenCompraActivo.itemsOrdenCompra?.length > 0) {
            // Crear un grupo por cada ítem de la orden de compra
            const gruposIniciales = ordenCompraActivo.itemsOrdenCompra.map(item => ({
                id: `grupo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                itemOrdenCompra: item,
                activos: []
            }));
            setGrupos(gruposIniciales);
        } else {
            // Para incorporaciones SIN_OC o AF_EXISTENTE, comenzar con lista vacía
            setGrupos([]);
        }
    }, [incorporacionActivoDto.tipoIncorporacion, ordenCompraActivo.itemsOrdenCompra]);

    // Función para agregar un nuevo grupo (solo para SIN_OC o AF_EXISTENTE)
    const agregarGrupo = () => {
        // Crear un ítem de orden de compra vacío para el nuevo grupo
        const nuevoItem: ItemOrdenCompraActivo = {
            nombre: "Nuevo Grupo",
            cantidad: 1,
            precioUnitario: 0,
            ivaPercentage: 0,
            ivaValue: 0,
            subTotal: 0
        };

        const nuevoGrupo: GrupoActivos = {
            id: `grupo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            itemOrdenCompra: nuevoItem,
            activos: []
        };

        setGrupos([...grupos, nuevoGrupo]);
    };

    // Función para eliminar un grupo
    const eliminarGrupo = (id: string) => {
        setGrupos(grupos.filter(grupo => grupo.id !== id));
    };

    // Función para actualizar los activos de un grupo
    const actualizarActivosGrupo = (id: string, activos: ActivoFijo[]) => {
        setGrupos(grupos.map(grupo => 
            grupo.id === id ? { ...grupo, activos } : grupo
        ));
    };

    // Función para validar si todos los grupos tienen datos completos
    const validarGrupos = (): boolean => {
        // Verificar que haya al menos un grupo
        if (grupos.length === 0) {
            return false;
        }

        // Verificar que haya al menos un grupo con activos
        const hayActivos = grupos.some(grupo => grupo.activos.length > 0);
        if (!hayActivos) {
            return false;
        }

        // Verificar que todos los activos tengan los datos requeridos
        for (const grupo of grupos) {
            for (const activo of grupo.activos) {
                // Verificar campos obligatorios
                if (!activo.id || !activo.nombre) {
                    return false;
                }

                // Verificar campos específicos según el tipo de activo
                if (activo.tipo === TipoActivo.PRODUCCION) {
                    // Solo validar los campos que son relevantes para la incorporación
                    if (activo.capacidad === undefined || 
                        activo.capacidad <= 0 || 
                        activo.unidadCapacidad === undefined) {
                        return false;
                    }
                    // No verificar campos relacionados con RecursoProduccion
                    // ya que esa relación se establecerá en el backend
                }

                // Verificar que tenga precio
                if (activo.precio === undefined || activo.precio <= 0) {
                    return false;
                }
            }
        }

        return true;
    };

    // Calcular si el formulario es válido usando useMemo para evitar recálculos innecesarios
    const esFormularioValido = useMemo(() => validarGrupos(), [grupos]);

    // Función para manejar el botón "Siguiente"
    const handleSiguiente = () => {
        if (!esFormularioValido) {
            toast({
                title: "Datos incompletos",
                description: "Todos los grupos deben tener al menos un activo con todos los datos requeridos.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Actualizar el DTO con los grupos de activos siguiendo el patrón pipeline
        setIncorporacionActivoHeader({
            ...incorporacionActivoDto,
            gruposActivos: grupos
        });

        // Avanzar al siguiente paso
        setActiveStep(2);
    };

    return (
        <Flex direction="column" gap={10} w="full">
            <Box>
                <Flex justifyContent="space-between" alignItems="center" mb={4}>
                    <Heading size="md">Grupos de Activos Fijos</Heading>
                    {(incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.SIN_OC || 
                      incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.AF_EXISTENTE) && (
                        <Button 
                            leftIcon={<AddIcon />} 
                            colorScheme="blue" 
                            onClick={agregarGrupo}
                        >
                            Agregar Grupo
                        </Button>
                    )}
                </Flex>

                {grupos.length === 0 && (
                    <Card>
                        <CardBody>
                            <Text textAlign="center" color="gray.500">
                                {incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.CON_OC 
                                    ? "No hay ítems en la orden de compra." 
                                    : "No hay grupos de activos. Haga clic en 'Agregar Grupo' para crear uno."}
                            </Text>
                        </CardBody>
                    </Card>
                )}

                <VStack spacing={4} align="stretch">
                    {grupos.map((grupo) => (
                        <Box key={grupo.id} position="relative">
                            {(incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.SIN_OC || 
                              incorporacionActivoDto.tipoIncorporacion === TIPO_INCORPORACION.AF_EXISTENTE) && (
                                <IconButton
                                    aria-label="Eliminar grupo"
                                    icon={<DeleteIcon />}
                                    colorScheme="red"
                                    size="sm"
                                    position="absolute"
                                    top="10px"
                                    right="10px"
                                    zIndex="1"
                                    onClick={() => eliminarGrupo(grupo.id)}
                                />
                            )}
                            <ActivoGroup
                                itemOrdenCompraActivo={grupo.itemOrdenCompra}
                                setActivoFijoGroup={(activos) => actualizarActivosGrupo(grupo.id, activos)}
                                tipoIncorporacion={incorporacionActivoDto.tipoIncorporacion || ''}
                            />
                        </Box>
                    ))}
                </VStack>
            </Box>

            <Button
                variant="solid"
                colorScheme="teal"
                onClick={handleSiguiente}
                isDisabled={!esFormularioValido}
            >
                Siguiente
            </Button>
        </Flex>
    );
}
