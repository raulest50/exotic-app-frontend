// src/pages/ProduccionPage/CrearOrdenes.tsx

import { useState, useEffect } from 'react';
import {
    Textarea,
    Button,
    VStack,
    useToast,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    HStack,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    InputGroup,
    InputRightElement,
    IconButton,
    Box,
    Text,
    Heading,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import axios from 'axios';
import {ProductoWithInsumos, Vendedor} from "./types";
import EndPointsURL from "../../api/EndPointsURL";
import TerminadoSemiterminadoPicker from "./components/TerminadoSemiterminadoPicker";
import TerSemiTerCard from "./components/TerSemiTerCard";
import VendedorPicker from "../../components/Pickers/VendedorPicker/VendedorPicker";
import { getCurrentUser, User } from "../../api/UserApi";

const endPoints = new EndPointsURL();

export default function CrearOrdenes() {
    const toast = useToast();

    const [selectedProducto, setSelectedProducto] = useState<ProductoWithInsumos | null>(null);
    const [canProduce, setCanProduce] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [observaciones, setObservaciones] = useState('');
    const [vendedorResponsableId, setVendedorResponsableId] = useState(1);
    const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
    const [isVendedorPickerOpen, setIsVendedorPickerOpen] = useState(false);
    const [numeroPedidoComercial, setNumeroPedidoComercial] = useState('');
    const [areaOperativa, setAreaOperativa] = useState('Producción');
    const [departamentoOperativo, setDepartamentoOperativo] = useState('Dirección de Operaciones');

    // Nuevos estados para las fechas y el lote
    const [fechaLanzamiento, setFechaLanzamiento] = useState('');
    const [fechaFinalPlanificada, setFechaFinalPlanificada] = useState('');
    const [loteBatchNumber, setLoteBatchNumber] = useState('');

    // Estado para la cantidad a producir
    const [cantidadProducir, setCantidadProducir] = useState(1);

    // Estado para el usuario actual (aprobador)
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const handleSeleccionarProducto = () => {
        setIsPickerOpen(true);
    };

    const handleCrearOrden = async () => {
        if (!selectedProducto || cantidadProducir < 1) {
            toast({
                title: 'Datos incompletos',
                description: 'Selecciona un producto y especifica al menos una cantidad a producir para crear la orden.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        const unitsPerCase = selectedProducto.producto.casePack?.unitsPerCase;
        const shouldValidateCasePack =
            selectedProducto.producto.tipo_producto === 'T' &&
            typeof unitsPerCase === 'number' &&
            unitsPerCase > 0;
        const isMultipleValid = !shouldValidateCasePack || (cantidadProducir % unitsPerCase === 0);

        if (!isMultipleValid) {
            toast({
                title: 'Cantidad inválida',
                description: `La cantidad a producir debe ser múltiplo de ${unitsPerCase}.`,
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        if (!canProduce) {
            toast({
                title: 'Stock insuficiente',
                description: 'La orden se creará aunque el stock actual no cubra los insumos requeridos.',
                status: 'info',
                duration: 5000,
                isClosable: true,
            });
        }

        const toNullableString = (value: string) => {
            const trimmedValue = value.trim();
            return trimmedValue === '' ? null : trimmedValue;
        };

        const toNullableDate = (value: string) => {
            const trimmedValue = value.trim();
            return trimmedValue === '' ? null : `${trimmedValue}T00:00:00`;
        };

        const payload = {
            productoId: selectedProducto.producto.productoId,
            cantidadProducir: cantidadProducir,
            observaciones: toNullableString(observaciones),
            fechaLanzamiento: toNullableDate(fechaLanzamiento),
            fechaFinalPlanificada: toNullableDate(fechaFinalPlanificada),
            numeroPedidoComercial: toNullableString(numeroPedidoComercial),
            areaOperativa: toNullableString(areaOperativa),
            departamentoOperativo: toNullableString(departamentoOperativo),
            loteBatchNumber: toNullableString(loteBatchNumber),
            vendedorResponsableId: vendedorResponsableId,
        };

        try {
            await axios.post(endPoints.save_produccion, payload);
            toast({
                title: 'Orden de Producción creada',
                description: 'La orden se ha creado correctamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            setSelectedProducto(null);
            setCanProduce(false);
            setObservaciones('');
            setFechaLanzamiento('');
            setFechaFinalPlanificada('');
            setLoteBatchNumber('');
            setCantidadProducir(1);
            setNumeroPedidoComercial('');
            setAreaOperativa('');
            setDepartamentoOperativo('');
            setSelectedVendedor(null);
            setVendedorResponsableId(1); // Reset to default value
        } catch (error) {
            console.error('Error creating orden de producción:', error);
            toast({
                title: 'Error',
                description: 'No se pudo crear la orden de producción.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handlePickerConfirm = (producto: ProductoWithInsumos, canProduceFlag: boolean) => {
        setSelectedProducto(producto);
        // Verificar si hay suficiente stock considerando la cantidad a producir
        const canProduceWithQuantity = producto.insumos.every(
            insumo => insumo.stockActual >= (insumo.cantidadRequerida * cantidadProducir)
        );
        setCanProduce(canProduceWithQuantity);
        setIsPickerOpen(false);
    };

    const handlePickerClose = () => {
        setIsPickerOpen(false);
    };

    // Handlers for VendedorPicker
    const handleOpenVendedorPicker = () => {
        setIsVendedorPickerOpen(true);
    };

    const handleVendedorPickerClose = () => {
        setIsVendedorPickerOpen(false);
    };

    const handleSelectVendedor = (vendedor: Vendedor) => {
        setSelectedVendedor(vendedor);
        setVendedorResponsableId(vendedor.cedula);
    };

    // Efecto para obtener el usuario actual al cargar el componente
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error('Error fetching current user:', error);
                toast({
                    title: 'Error',
                    description: 'No se pudo obtener la información del usuario actual.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        };

        fetchCurrentUser();
    }, [toast]);

    // Efecto para actualizar canProduce cuando cambia la cantidad a producir
    useEffect(() => {
        if (selectedProducto) {
            const canProduceWithQuantity = selectedProducto.insumos.every(
                insumo => insumo.stockActual >= (insumo.cantidadRequerida * cantidadProducir)
            );
            setCanProduce(canProduceWithQuantity);
        }
    }, [cantidadProducir, selectedProducto]);

    const unitsPerCase = selectedProducto?.producto.casePack?.unitsPerCase;
    const shouldValidateCasePack =
        selectedProducto?.producto.tipo_producto === 'T' &&
        typeof unitsPerCase === 'number' &&
        unitsPerCase > 0;
    const isMultipleValid = !shouldValidateCasePack || (cantidadProducir % unitsPerCase === 0);

    return (
        <VStack align="stretch">
            <TerSemiTerCard
                productoSeleccionado={selectedProducto}
                canProduce={canProduce}
                onSearchClick={handleSeleccionarProducto}
                cantidadAProducir={cantidadProducir}
            />

            <HStack spacing={4} mt="4">
                <FormControl isInvalid={shouldValidateCasePack && !isMultipleValid}>
                    <FormLabel>Asesor</FormLabel>
                    <InputGroup>
                        <Input
                            value={selectedVendedor ? `${selectedVendedor.cedula} - ${selectedVendedor.nombres} ${selectedVendedor.apellidos}` : ''}
                            placeholder="Seleccione un vendedor"
                            isReadOnly
                        />
                        <InputRightElement>
                            <IconButton
                                aria-label="Buscar vendedor"
                                icon={<SearchIcon />}
                                size="sm"
                                onClick={handleOpenVendedorPicker}
                            />
                        </InputRightElement>
                    </InputGroup>
                </FormControl>

                <FormControl>
                    <FormLabel>Número de pedido comercial</FormLabel>
                    <Input
                        placeholder="Ingrese el número de pedido comercial"
                        value={numeroPedidoComercial}
                        onChange={(e) => setNumeroPedidoComercial(e.target.value)}
                    />
                </FormControl>
            </HStack>

            {/* Nuevos campos para fechas */}
            <HStack spacing={4} mt="4">
                <FormControl>
                    <FormLabel>Fecha de lanzamiento</FormLabel>
                    <Input
                        type="date"
                        value={fechaLanzamiento}
                        onChange={(e) => setFechaLanzamiento(e.target.value)}
                    />
                </FormControl>

                <FormControl>
                    <FormLabel>Fecha final planificada</FormLabel>
                    <Input
                        type="date"
                        value={fechaFinalPlanificada}
                        onChange={(e) => setFechaFinalPlanificada(e.target.value)}
                    />
                </FormControl>
            </HStack>

            {/* Campos para lote y cantidad a producir */}
            <HStack spacing={4} mt="4">
                <FormControl>
                    <FormLabel>Lote</FormLabel>
                    <Input
                        placeholder="Ingrese el número de lote"
                        value={loteBatchNumber}
                        onChange={(e) => setLoteBatchNumber(e.target.value)}
                    />
                </FormControl>

                <FormControl>
                    <FormLabel>Cantidad a producir</FormLabel>
                    <NumberInput
                        min={1}
                        value={cantidadProducir}
                        onChange={(valueString) => setCantidadProducir(Number(valueString))}
                    >
                        <NumberInputField />
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                    {shouldValidateCasePack && !isMultipleValid && (
                        <FormErrorMessage>
                            Debe ser múltiplo de {unitsPerCase} unidades por caja.
                        </FormErrorMessage>
                    )}
                </FormControl>
            </HStack>

            {/* Campos para área y departamento */}
            <HStack spacing={4} mt="4">
                <FormControl>
                    <FormLabel>Área</FormLabel>
                    <Input
                        placeholder="Ingrese el área"
                        value={areaOperativa}
                        onChange={(e) => setAreaOperativa(e.target.value)}
                    />
                </FormControl>

                <FormControl>
                    <FormLabel>Departamento</FormLabel>
                    <Input
                        placeholder="Ingrese el departamento"
                        value={departamentoOperativo}
                        onChange={(e) => setDepartamentoOperativo(e.target.value)}
                    />
                </FormControl>
            </HStack>

            {/* Usuario Aprobador (No editable) */}
            <Box bg="white" p={4} borderRadius="md" boxShadow="sm" mt="4">
                <Heading size="md" mb={2}>
                    Usuario Aprobador
                </Heading>
                <VStack align="start" spacing={2}>
                    <Text fontSize="md">
                        <strong>Usuario:</strong> {currentUser?.username || 'Cargando...'}
                    </Text>
                    <Text fontSize="md">
                        <strong>Nombre:</strong> {currentUser?.nombreCompleto || 'N/A'}
                    </Text>
                    {currentUser?.email && (
                        <Text fontSize="md">
                            <strong>Correo Electrónico:</strong> {currentUser.email}
                        </Text>
                    )}
                </VStack>
            </Box>

            <Textarea
                placeholder="Observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                mt="4"
            />
            <Button
                onClick={handleCrearOrden}
                isDisabled={!selectedProducto || cantidadProducir < 1}
                mt="4"
                colorScheme="blue"
            >
                Crear Orden de Producción
            </Button>
            <TerminadoSemiterminadoPicker
                isOpen={isPickerOpen}
                onClose={handlePickerClose}
                onConfirm={handlePickerConfirm}
            />
            <VendedorPicker
                isOpen={isVendedorPickerOpen}
                onClose={handleVendedorPickerClose}
                onSelectVendedor={handleSelectVendedor}
            />
        </VStack>
    );
}
