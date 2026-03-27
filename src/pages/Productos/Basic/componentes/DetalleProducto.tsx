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
    FormControl, FormHelperText, Select, Input, Textarea,
    useToast, useDisclosure,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import {Material, Producto} from "../../types.tsx";
import { ArrowBackIcon, EditIcon } from '@chakra-ui/icons';
import axios from 'axios';
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import {IVA_VALUES} from "../../types.tsx";

import DeleteProductoDialog from '../../DefSemiTer/consulta/DeleteProductoDialog.tsx';
import { Modulo } from '../../../Usuarios/GestionUsuarios/types.tsx';
import { useModuleAccessLevel } from '../../../../auth/usePermissions';

function isValidPuntoReorden(pr: number | undefined): boolean {
    if (pr === undefined) return false;
    return Number.isFinite(pr) && (pr === -1 || pr >= 0);
}

type Props = {
    producto: Producto;
    setEstado: (estado: number) => void;
    setProductoSeleccionado?: (producto: Producto) => void;
    refreshSearch?: () => void;
};
export default function DetalleProducto({producto, setEstado, setProductoSeleccionado, refreshSearch}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [productoData, setProductoData] = useState<Producto | Material>({...producto});
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [materialPuntoReordenInput, setMaterialPuntoReordenInput] = useState(() =>
        producto.tipo_producto === 'M' ? String((producto as Material).puntoReorden ?? 0) : ''
    );
    const toast = useToast();
    const endPoints = new EndPointsURL();
    const { nivel: productosAccessLevel } = useModuleAccessLevel(Modulo.PRODUCTOS);
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

    useEffect(() => {
        setProductoData({ ...producto });
        setEditMode(false);
        if (producto.tipo_producto === 'M') {
            setMaterialPuntoReordenInput(String((producto as Material).puntoReorden ?? 0));
        } else {
            setMaterialPuntoReordenInput('');
        }
    }, [producto.productoId]);

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

    const handleBack = () => {
        setEstado(0);
        // Si existe una función para refrescar la búsqueda, llamarla
        if (typeof refreshSearch === 'function') {
            refreshSearch();
        }
    };

    // Manejar cambios en los campos editables
    const handleInputChange = (
        field: keyof Producto | keyof Material,
        value: string | number | undefined) =>
    {
        setProductoData({
            ...productoData,
            [field]: value
        });
    };

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

        if (producto.tipo_producto === 'M') {
            const pr = Number(materialPuntoReordenInput.trim());
            if (materialPuntoReordenInput.trim() === '' || !isValidPuntoReorden(pr)) {
                if (showToast) {
                    toast({
                        title: "Validación fallida",
                        description:
                            "Punto de reorden: -1 (sin alertas), 0 (sin umbral definido) o un número mayor o igual a 0.",
                        status: "warning",
                        duration: 4000,
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

        if (producto.tipo_producto === 'M') {
            const orig = (producto as Material).puntoReorden ?? 0;
            const t = materialPuntoReordenInput.trim();
            if (t === '') return true;
            const pr = Number(t);
            if (!isValidPuntoReorden(pr)) return true;
            if (pr !== orig) return true;
        }

        return false;
    };

    // Validar el formulario y verificar cambios cuando cambian los datos
    useEffect(() => {
        if (editMode) {
            const isValid = validateData(false);
            setIsFormValid(isValid);

            const hasDataChanges = checkForChanges();
            setHasChanges(hasDataChanges);
        }
    }, [productoData, editMode, materialPuntoReordenInput, producto]);

    // Guardar cambios
    const handleSaveChanges = async () => {
        if (!validateData()) {
            return;
        }

        try {
            const url = endPoints.update_producto.replace('{productoId}', productoData.productoId);
            const puntoReorden = Number(materialPuntoReordenInput.trim());
            const payload =
                productoData.tipo_producto === 'M'
                    ? { ...productoData, tipo_producto: 'M', puntoReorden }
                    : productoData;
            const response = await axios.put(url, payload);

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
            if (response.data?.tipo_producto === 'M') {
                setMaterialPuntoReordenInput(
                    String((response.data as Material).puntoReorden ?? 0)
                );
            }

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
    const canEdit = productosAccessLevel >= 3;

    // Determinar si es un material (tipo_producto === 'M')
    const isMaterial = producto.tipo_producto === 'M';

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
                {canEdit && !editMode && (
                    <Button 
                        leftIcon={<EditIcon />} 
                        colorScheme="green" 
                        onClick={() => {
                            if (producto.tipo_producto === 'M') {
                                setMaterialPuntoReordenInput(
                                    String((producto as Material).puntoReorden ?? 0)
                                );
                            }
                            setEditMode(true);
                        }}
                    >
                        Editar
                    </Button>
                )}
                {editMode && (
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
                                if (producto.tipo_producto === 'M') {
                                    setMaterialPuntoReordenInput(
                                        String((producto as Material).puntoReorden ?? 0)
                                    );
                                }
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            colorScheme="green"
                            onClick={handleSaveChanges}
                            isDisabled={!isFormValid || !hasChanges}
                        >
                            Guardar
                        </Button>
                    </HStack>
                )}
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
                                {isMaterial && (
                                    <Box>
                                        <Text fontWeight="bold">Punto de reorden:</Text>
                                        {editMode ? (
                                            <FormControl mt={2}>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={materialPuntoReordenInput}
                                                    onChange={(e) =>
                                                        setMaterialPuntoReordenInput(e.target.value)
                                                    }
                                                />
                                                <FormHelperText fontSize="xs">
                                                    -1 sin alertas; 0 sin umbral definido; mayor a 0 alerta si
                                                    stock es menor o igual.
                                                </FormHelperText>
                                            </FormControl>
                                        ) : (
                                            <Text>
                                                {(producto as Material).puntoReorden !== undefined
                                                    ? String((producto as Material).puntoReorden)
                                                    : '—'}
                                            </Text>
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
            <DeleteProductoDialog
                isOpen={isDeleteOpen}
                onClose={onDeleteClose}
                onConfirm={handleDeleteProduct}
            />
        </Box>
    );
}
