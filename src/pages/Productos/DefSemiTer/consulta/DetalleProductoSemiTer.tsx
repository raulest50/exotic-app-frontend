/**
 * Componente: DetalleProducto
 * 
 * Ubicación en la navegación:
 * 1. Productos > Basic > Consulta > Ver Detalle (botón en tabla)
 * 2. Productos > Definir Terminado/Semiterminado > Consulta > Ver Detalle (botón en tabla)
 * 
 * Descripción:
 * Componente que muestra la información detallada de un producto seleccionado.
 * Se abre al hacer clic en "Ver Detalle" en la tabla de resultados de InformeProductosTab.
 * Permite edición de ciertos campos si el usuario tiene nivel de acceso adecuado.
 */

import {
    Flex, Box, Heading, Text, Button, VStack, HStack, 
    Grid, GridItem, Card, CardHeader, CardBody, 
    FormControl, Select, Input, Textarea, IconButton,
    useToast, useDisclosure,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { CasePack, Insumo, Material, Producto } from "../../types.tsx";
import { ArrowBackIcon, EditIcon, CheckIcon, QuestionIcon, WarningIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import { useAuth } from '../../../../context/AuthContext.tsx';
import {IVA_VALUES} from "../../types.tsx";

import {Authority} from "../../../../api/global_types.tsx";
import DeleteProductoDialog from './DeleteProductoDialog.tsx';
import InsumoListCard from './InsumoListCard.tsx';
import CardPackagingInfo from './CardPackagingInfo.tsx';

type ProductoDetalle = (Producto | Material) & { insumos?: Insumo[]; casePack?: CasePack };

type Props = {
    producto: Producto;
    setEstado: (estado: number) => void;
    setProductoSeleccionado?: (producto: Producto) => void;
    refreshSearch?: () => void;
};
export default function DetalleProductoSemiTer({producto, setEstado, setProductoSeleccionado, refreshSearch}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [productoData, setProductoData] = useState<ProductoDetalle>({...producto});
    const [productosAccessLevel, setProductosAccessLevel] = useState<number>(0);
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [isLoadingDetalle, setIsLoadingDetalle] = useState<boolean>(false);
    const [prefijoVerificado, setPrefijoVerificado] = useState<boolean>(false);
    const [verificandoPrefijo, setVerificandoPrefijo] = useState<boolean>(false);
    const toast = useToast();
    const endPoints = new EndPointsURL();
    const { user } = useAuth();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const { isOpen: isForceDeleteOpen, onOpen: onForceDeleteOpen, onClose: onForceDeleteClose } = useDisclosure();
    const { isOpen: isHelpPrefijoOpen, onOpen: onHelpPrefijoOpen, onClose: onHelpPrefijoClose } = useDisclosure();

    const handleDeleteProduct = async () => {
        try {
            const url = endPoints.update_producto.replace('{productoId}', producto.productoId);
            await axios.delete(url);
            toast({
                title: 'Producto eliminado',
                description: 'El material se eliminó correctamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setEstado(0);
            if (typeof refreshSearch === 'function') {
                refreshSearch();
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                toast({
                    title: 'No se puede eliminar el material',
                    description: error.response.data?.error ||
                        'No se puede eliminar el material porque está referenciado en ítems de órdenes de compra y/o transacciones de almacén',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'Error',
                    description: 'Ocurrió un error al eliminar el material.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };

    const handleForceDeleteProduct = async (): Promise<boolean> => {
        try {
            const url = endPoints.force_delete_semiter.replace('{productoId}', producto.productoId);
            const response = await axios.delete(url);
            const data = response.data || {};
            const successMessage = data.message || data.reason || 'El producto se eliminó correctamente.';
            const movimientos = data.deletedMovimientos ?? 0;
            const ordenesProduccion = data.deletedOrdenesProduccion ?? 0;
            const insumos = data.deletedInsumos ?? 0;

            toast({
                title: 'Producto eliminado',
                description: `${successMessage} Movimientos eliminados: ${movimientos}. Órdenes de producción eliminadas: ${ordenesProduccion}. Insumos eliminados: ${insumos}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            setEstado(0);
            if (typeof refreshSearch === 'function') {
                refreshSearch();
            }
            return true;
        } catch (error: unknown) {
            if (axios.isAxiosError(error) && error.response) {
                const { status, data } = error.response;
                const description = data?.message || data?.reason || 'Ocurrió un error al eliminar el producto.';
                let title = 'Error al eliminar el producto';
                let statusToast: 'error' | 'warning' = 'error';

                if (status === 404) {
                    title = 'Producto no encontrado';
                    statusToast = 'warning';
                } else if (status === 409) {
                    title = 'No se puede eliminar el producto';
                    statusToast = 'warning';
                } else if (status === 500) {
                    title = 'Error interno del servidor';
                }

                toast({
                    title,
                    description,
                    status: statusToast,
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'Error al eliminar el producto',
                    description: 'Ocurrió un error inesperado al eliminar el producto.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
            return false;
        }
    };

    // Obtener el nivel de acceso del usuario para el módulo PRODUCTOS
    useEffect(() => {
        const fetchUserAccessLevel = async () => {
            try {
                const response = await axios.get(endPoints.whoami);
                const authorities = response.data.authorities;

                const productosAuthority = authorities.find(
                    (auth:Authority) => auth.authority === "ACCESO_PRODUCTOS"
                );

                if (productosAuthority) {
                    setProductosAccessLevel(parseInt(productosAuthority.nivel));
                }
            } catch (error) {
                console.error("Error al obtener el nivel de acceso:", error);
            }
        };

        fetchUserAccessLevel();
    }, []);

    const handleBack = () => {
        setEstado(0);
        // Si existe una función para refrescar la búsqueda, llamarla
        if (typeof refreshSearch === 'function') {
            refreshSearch();
        }
    };

    // Manejar cambios en los campos editables
    const handleInputChange = (
        field: keyof ProductoDetalle,
        value: string | number | undefined) =>
    {
        setProductoData({
            ...productoData,
            [field]: value
        });
        if (field === 'prefijoLote') {
            setPrefijoVerificado(false);
        }
    };

    // Cargar detalles cuando faltan los insumos en productos semiterminados o terminados
    useEffect(() => {
        const isSemiOTerminado = producto.tipo_producto === 'S' || producto.tipo_producto === 'T';
        const hasInsumos = Array.isArray(productoData.insumos) && productoData.insumos.length > 0;

        if (!isSemiOTerminado || hasInsumos) {
            return;
        }

        let isMounted = true;
        const fetchDetalleProducto = async () => {
            setIsLoadingDetalle(true);
            try {
                const url = endPoints.update_producto.replace('{productoId}', producto.productoId);
                const response = await axios.get(url);
                if (isMounted) {
                    setProductoData(response.data);
                }
            } catch (error) {
                if (!isMounted) return;

                const description = axios.isAxiosError(error)
                    ? error.response?.data?.message || 'No se pudo obtener el detalle del producto.'
                    : 'No se pudo obtener el detalle del producto.';

                toast({
                    title: 'Error al cargar detalle',
                    description,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                if (isMounted) {
                    setIsLoadingDetalle(false);
                }
            }
        };

        fetchDetalleProducto();

        return () => {
            isMounted = false;
        };
    }, [endPoints.update_producto, producto.productoId, producto.tipo_producto, productoData.insumos, toast]);

    // Validar datos antes de guardar
    const validateData = (showToast: boolean = true): boolean => {
        // Validar nombre
        const nombreValue = productoData.nombre;
        if (!nombreValue || 
            (typeof nombreValue === 'string' && nombreValue.trim() === '')) {
            if (showToast) {
                toast({
                    title: "Validación fallida",
                    description: "El nombre del producto es requerido.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return false;
        }

        // Validar cantidad por unidad
        const cantidadUnidadValue = productoData.cantidadUnidad;
        if (!cantidadUnidadValue || 
            (typeof cantidadUnidadValue === 'string' && cantidadUnidadValue.trim() === '') ||
            (typeof cantidadUnidadValue === 'number' && cantidadUnidadValue <= 0)) {
            if (showToast) {
                toast({
                    title: "Validación fallida",
                    description: "La cantidad por unidad es requerida.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return false;
        }

        // Validar IVA (debe ser un número entre 0 y 100)
        const iva = productoData.ivaPercentual !== undefined ? productoData.ivaPercentual : 0;
        if (isNaN(iva) || iva < 0 || iva > 100) {
            if (showToast) {
                toast({
                    title: "Validación fallida",
                    description: "El IVA debe ser un número entre 0 y 100.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return false;
        }

        // Validar prefijo de lote para productos terminados
        if (producto.tipo_producto === 'T') {
            const prefijoValue = (productoData as Producto).prefijoLote;
            if (prefijoValue == null || (typeof prefijoValue === 'string' && prefijoValue.trim() === '')) {
                if (showToast) {
                    toast({
                        title: "Validación fallida",
                        description: "El prefijo de lote es requerido para productos terminados.",
                        status: "warning",
                        duration: 3000,
                        isClosable: true,
                    });
                }
                return false;
            }
        }

        return true;
    };

    // Función para verificar si hay cambios en los datos
    const checkForChanges = () => {
        // Verificar cambios en campos simples
        if (productoData.nombre !== producto.nombre ||
            productoData.cantidadUnidad !== producto.cantidadUnidad ||
            productoData.observaciones !== producto.observaciones ||
            productoData.ivaPercentual !== producto.ivaPercentual) {
            return true;
        }

        // Si es un material, verificar cambios en tipoMaterial
        if (producto.tipo_producto === 'M' && 
            'tipoMaterial' in productoData && 
            'tipoMaterial' in producto && 
            (productoData as Material).tipoMaterial !== (producto as Material).tipoMaterial) {
            return true;
        }

        // Si es terminado, verificar cambios en prefijoLote
        if (producto.tipo_producto === 'T' && 
            (productoData as Producto).prefijoLote !== (producto as Producto).prefijoLote) {
            return true;
        }

        return false;
    };

    // Verificar que el prefijo de lote sea único (endpoint con productoId para excluir el actual)
    const handleVerificarPrefijo = async () => {
        const valor = ((productoData as Producto).prefijoLote ?? '').trim();
        if (!valor) {
            toast({
                title: "Validación",
                description: "Ingrese un prefijo de lote antes de verificar.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setVerificandoPrefijo(true);
        try {
            const params = new URLSearchParams({ prefijoLote: valor, productoId: productoData.productoId });
            const url = `${endPoints.validador_prefijo_lote}?${params.toString()}`;
            const response = await axios.get(url);
            const valido = response.data?.valido === true;
            setPrefijoVerificado(valido);
            if (valido) {
                toast({
                    title: "Prefijo válido",
                    description: "El prefijo de lote está disponible.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "Prefijo no disponible",
                    description: response.data?.mensaje ?? "El prefijo ya está asignado a otro producto terminado.",
                    status: "warning",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } catch (error) {
            setPrefijoVerificado(false);
            toast({
                title: "Error",
                description: axios.isAxiosError(error) && error.response?.data?.mensaje
                    ? error.response.data.mensaje
                    : "No se pudo verificar el prefijo de lote.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setVerificandoPrefijo(false);
        }
    };

    // Validar el formulario y verificar cambios cuando cambian los datos
    useEffect(() => {
        if (editMode) {
            const isValid = validateData(false);
            setIsFormValid(isValid);

            const hasDataChanges = checkForChanges();
            setHasChanges(hasDataChanges);
        }
    }, [productoData, editMode]);

    // Guardar cambios
    const handleSaveChanges = async () => {
        if (!validateData()) {
            return;
        }

        try {
            // Llamada al endpoint de actualización
            const url = endPoints.update_producto.replace('{productoId}', productoData.productoId);
            const response = await axios.put(url, productoData);

            // Mostrar mensaje de éxito
            toast({
                title: 'Producto actualizado',
                description: 'Los datos del producto han sido actualizados exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Salir del modo edición
            setEditMode(false);

            // Actualizar el producto en la vista local con los datos completos del servidor
            setProductoData(response.data);

            // Actualizar también el producto seleccionado para mantener la consistencia
            // cuando se regrese a la vista de lista
            if (typeof setProductoSeleccionado === 'function') {
                setProductoSeleccionado(response.data);
            }
        } catch (error) {
            console.error('Error al actualizar el producto:', error);
            toast({
                title: 'Error al actualizar',
                description: 'No se pudo actualizar la información del producto.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Verificar si el usuario tiene permisos para editar
    const canEdit = user === 'master' || productosAccessLevel >= 3;

    // Determinar si es un material (tipo_producto === 'M')
    const isMaterial = producto.tipo_producto === 'M';
    const isSemiOTerminado = producto.tipo_producto === 'S' || producto.tipo_producto === 'T';
    const isTerminado = producto.tipo_producto === 'T';
    const canUseWizard = canEdit && isSemiOTerminado && !editMode;

    const prefijoUnchanged = ((productoData as Producto).prefijoLote ?? '').trim() === ((producto as Producto).prefijoLote ?? '').trim();
    const canSavePrefijo = prefijoUnchanged || prefijoVerificado;

    const isGuardarDisabled = !isFormValid || !hasChanges || (isTerminado && !canSavePrefijo);
    const guardarDisabledReason: string | null = isGuardarDisabled
        ? !hasChanges
            ? 'No hay cambios en los datos.'
            : isTerminado && !canSavePrefijo
                ? 'Verifique el prefijo de lote con el botón (✓) para habilitar Guardar.'
                : !isFormValid
                    ? `Revise los campos requeridos o los valores (nombre, cantidad por unidad, IVA${isTerminado ? ', prefijo de lote' : ''}).`
                    : null
        : null;

    // Mapear tipo de producto a texto legible
    const getTipoProductoText = (tipo: string): string => {
        switch (tipo) {
            case 'M': return 'Material';
            case 'S': return 'Semiterminado';
            case 'T': return 'Terminado';
            default: return 'Desconocido';
        }
    };

    // Mapear tipo de material a texto legible (solo para materiales)
    const getTipoMaterialText = (tipo?: number): string => {
        if (tipo === 1) return 'Materia Prima';
        if (tipo === 2) return 'Material de Empaque';
        return 'No especificado';
    };

    const handleOpenWizard = () => {
        if (typeof setProductoSeleccionado === 'function') {
            setProductoSeleccionado({ ...productoData });
        }
        setEstado(2);
    };

    const renderActionButtons = () => {
        if (editMode) {
            return (
                <VStack align="stretch" spacing={2}>
                    <HStack>
                        {isMaterial && (
                            <Button colorScheme="red" onClick={onDeleteOpen}>
                                Eliminar
                            </Button>
                        )}
                        <Button
                            colorScheme="red"
                            variant="outline"
                            onClick={() => {
                                setEditMode(false);
                                setProductoData({...producto});
                                setPrefijoVerificado(false);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="green"
                            onClick={handleSaveChanges}
                            isDisabled={isGuardarDisabled}
                        >
                            Guardar
                        </Button>
                    </HStack>
                    {guardarDisabledReason && (
                        <Flex align="center" gap={2} fontSize="sm" color="orange.600">
                            <WarningIcon boxSize={4} flexShrink={0} />
                            <Text>{guardarDisabledReason}</Text>
                        </Flex>
                    )}
                </VStack>
            );
        }

        return (
            <HStack>
                {canUseWizard && (
                    <Button colorScheme="teal" onClick={handleOpenWizard}>
                        Modificar Insumos y Proceso de Produccion
                    </Button>
                )}
                {canEdit && (
                    <Button
                        leftIcon={<EditIcon />}
                        colorScheme="green"
                        onClick={() => setEditMode(true)}
                    >
                        Editar
                    </Button>
                )}
            </HStack>
        );
    };

    return (
        <Box p={5} bg="white" borderRadius="md" boxShadow="base">
            <Flex justifyContent="space-between" alignItems="center" mb={5}>
                <Button
                    leftIcon={<ArrowBackIcon />}
                    colorScheme="blue"
                    variant="outline"
                    onClick={handleBack}
                >
                    Regresar
                </Button>
                <Heading size="lg">Detalle del Producto</Heading>
                {renderActionButtons()}
            </Flex>

            <Card mb={5} variant="outline" boxShadow="md">
                <CardHeader bg="blue.50">
                    <Heading size="md">{producto.nombre}</Heading>
                    <Text color="gray.600">ID: {producto.productoId}</Text>
                </CardHeader>
                <CardBody>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                        <GridItem>
                            <VStack align="start" spacing={3}>
                                <Box>
                                    <Text fontWeight="bold">Nombre:</Text>
                                    {editMode ? (
                                        <FormControl mt={2}>
                                            <Input
                                                value={productoData.nombre}
                                                onChange={(e) => handleInputChange('nombre', e.target.value)}
                                            />
                                        </FormControl>
                                    ) : (
                                        <Text>{producto.nombre}</Text>
                                    )}
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Tipo de Producto:</Text>
                                    <Text>{getTipoProductoText(producto.tipo_producto)}</Text>
                                </Box>
                                {isMaterial && (
                                    <Box>
                                        <Text fontWeight="bold">Tipo de Material:</Text>
                                        {editMode ? (
                                            <FormControl mt={2}>
                                                <Select
                                                    value={(productoData as Material).tipoMaterial}
                                                    onChange={(e) => handleInputChange('tipoMaterial', Number(e.target.value))}
                                                >
                                                    <option value={1}>Materia Prima</option>
                                                    <option value={2}>Material de Empaque</option>
                                                </Select>
                                            </FormControl>
                                        ) : (
                                            <Text>{getTipoMaterialText((producto as Material).tipoMaterial)}</Text>
                                        )}
                                    </Box>
                                )}
                                {isTerminado && (
                                    <Box>
                                        <Text fontWeight="bold">Prefijo de lote:</Text>
                                        {editMode ? (
                                            <FormControl mt={2}>
                                                <HStack align="center" spacing={2}>
                                                    <Input
                                                        value={(productoData as Producto).prefijoLote ?? ''}
                                                        onChange={(e) => handleInputChange('prefijoLote', e.target.value)}
                                                        placeholder="Ej: TRK, SLA"
                                                        flex="1"
                                                    />
                                                    <IconButton
                                                        aria-label="Verificar prefijo único"
                                                        icon={<CheckIcon />}
                                                        size="sm"
                                                        colorScheme={prefijoVerificado ? "green" : "gray"}
                                                        onClick={handleVerificarPrefijo}
                                                        isLoading={verificandoPrefijo}
                                                        isDisabled={!(productoData as Producto).prefijoLote?.trim()}
                                                    />
                                                    <IconButton
                                                        aria-label="Ayuda prefijo de lote"
                                                        icon={<QuestionIcon />}
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={onHelpPrefijoOpen}
                                                    />
                                                </HStack>
                                                {prefijoVerificado && (
                                                    <Text color="green.600" fontSize="sm" mt={1}>
                                                        Prefijo verificado y disponible.
                                                    </Text>
                                                )}
                                            </FormControl>
                                        ) : (
                                            <Text>{(productoData as Producto).prefijoLote ?? '—'}</Text>
                                        )}
                                    </Box>
                                )}
                                <Box>
                                    <Text fontWeight="bold">Costo:</Text>
                                    <Text>{producto.costo}</Text>
                                </Box>
                            </VStack>
                        </GridItem>
                        <GridItem>
                            <VStack align="start" spacing={3}>
                                <Box>
                                    <Text fontWeight="bold">Unidad de Medida:</Text>
                                    <Text>{producto.tipoUnidades}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Cantidad por Unidad:</Text>
                                    {editMode ? (
                                        <FormControl mt={2}>
                                            <Input
                                                value={productoData.cantidadUnidad}
                                                onChange={(e) => handleInputChange('cantidadUnidad', e.target.value)}
                                            />
                                        </FormControl>
                                    ) : (
                                        <Text>{producto.cantidadUnidad}</Text>
                                    )}
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">IVA (%):</Text>
                                    {editMode ? (
                                        <FormControl mt={2}>
                                            <Select
                                                value={productoData.ivaPercentual}
                                                onChange={(e) =>
                                                    handleInputChange('ivaPercentual', Number(e.target.value))
                                                }
                                            >
                                                <option value={IVA_VALUES.iva_0}> No Tiene </option>
                                                <option value={IVA_VALUES.iva_5} > 5 %</option>
                                                <option value={IVA_VALUES.iva_19} > 19 %</option>
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <Text>{producto.ivaPercentual || 0}%</Text>
                                    )}
                                </Box>
                                {producto.fechaCreacion && (
                                    <Box>
                                        <Text fontWeight="bold">Fecha de Creación:</Text>
                                        <Text>{producto.fechaCreacion}</Text>
                                    </Box>
                                )}
                            </VStack>
                        </GridItem>
                    </Grid>
                </CardBody>
            </Card>

            {isSemiOTerminado && (
                <Card mb={5} variant="outline" boxShadow="md">
                    <CardHeader bg="blue.50">
                        <Heading size="md">Insumos</Heading>
                        <Text color="gray.600">
                            Las cantidades corresponden a una unidad del {producto.tipo_producto === 'S' ? 'semiterminado' : 'terminado'} ({producto.tipoUnidades}).
                        </Text>
                        {Array.isArray(productoData.insumos) && productoData.insumos.some((insumo) => {
                            const nestedInsumos = (insumo as unknown as { insumos?: Insumo[] }).insumos ?? (insumo.producto as ProductoDetalle | undefined)?.insumos;
                            return Array.isArray(nestedInsumos) && nestedInsumos.length > 0;
                        }) && (
                            <Text color="gray.600" fontSize="sm" mt={1}>
                                Usa la opción "Ver insumos" para explorar cantidades anidadas.
                            </Text>
                        )}
                    </CardHeader>
                    <CardBody>
                        {isLoadingDetalle ? (
                            <Text color="gray.600">Cargando insumos...</Text>
                        ) : (
                            <InsumoListCard insumos={productoData.insumos ?? []} titulo="Insumos" />
                        )}
                    </CardBody>
                </Card>
            )}

            {isTerminado && (
                <CardPackagingInfo casePack={productoData.casePack} />
            )}

            <Card variant="outline" boxShadow="md">
                <CardHeader bg="blue.50">
                    <Heading size="md">Observaciones</Heading>
                </CardHeader>
                <CardBody>
                    {editMode ? (
                        <FormControl>
                            <Textarea
                                value={productoData.observaciones || ''}
                                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                                placeholder="Ingrese observaciones sobre el producto"
                                rows={4}
                            />
                        </FormControl>
                    ) : (
                        <Text>{producto.observaciones || 'Sin observaciones'}</Text>
                    )}
                </CardBody>
            </Card>
            {!editMode && !isMaterial && (
                <Flex justifyContent="flex-end" mt={4}>
                    <Button colorScheme="red" onClick={onForceDeleteOpen}>
                        Eliminar producto
                    </Button>
                </Flex>
            )}
            <DeleteProductoDialog
                isOpen={isDeleteOpen}
                onClose={onDeleteClose}
                onConfirm={handleDeleteProduct}
            />
            <DeleteProductoDialog
                isOpen={isForceDeleteOpen}
                onClose={onForceDeleteClose}
                onConfirm={handleForceDeleteProduct}
            />
            <Modal isOpen={isHelpPrefijoOpen} onClose={onHelpPrefijoClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Prefijo de lote</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={4}>
                        <Text mb={2}>
                            El prefijo de lote identifica de forma única a cada producto terminado y se usa para generar
                            los números de lote al crear órdenes de producción (por ejemplo: TRK-0000001-26).
                        </Text>
                        <Text mb={2}>
                            <strong>Modo automático:</strong> El prefijo se calcula a partir del nombre del producto,
                            tomando la primera letra de cada palabra en mayúscula. Ejemplo: &quot;Tratamiento Rizo Kids&quot; → TRK,
                            &quot;Shampoo Liso Adulto&quot; → SLA.
                        </Text>
                        <Text mb={2}>
                            <strong>Modo editar:</strong> Puede definir un prefijo propio si lo desea. El prefijo debe ser
                            único entre todos los productos terminados.
                        </Text>
                        <Text mb={2}>
                            Use el botón con el símbolo de verificación (✓) para comprobar que el prefijo no esté ya
                            asignado a otro producto.
                        </Text>
                        <Text mb={2}>
                            <strong>Al editar:</strong> Si modifica el prefijo de lote, debe verificar de nuevo con el botón (✓).
                            El botón Guardar solo se habilita después de verificar el prefijo cuando hubo cambios en él.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
}
