// src/pages/ProduccionPage/CrearOrdenesTab.tsx

import { useState, useEffect } from 'react';
import {
    Textarea,
    Button,
    VStack,
    useToast,
    FormControl,
    FormLabel,
    FormErrorMessage,
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
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    ModalFooter,
    Spinner,
    Icon,
} from '@chakra-ui/react';
import { SearchIcon, LockIcon, UnlockIcon, CheckIcon } from '@chakra-ui/icons';
import { FaQuestionCircle } from 'react-icons/fa';
import axios from 'axios';
import {ProductoWithInsumos, Vendedor} from "../types.tsx";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import TerminadoSemiterminadoPicker from "../components/TerminadoSemiterminadoPicker.tsx";
import TerSemiTerCard from "./TerSemiTerCard.tsx";
import VendedorPicker from "../../../components/Pickers/VendedorPicker/VendedorPicker.tsx";
import { getCurrentUser, User, getAccessLevel } from "../../../api/UserApi.tsx";
import { useAuth } from '../../../context/AuthContext';

const endPoints = new EndPointsURL();

export default function CrearOrdenesTab() {
    const toast = useToast();
    const { user } = useAuth();

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
    const [originalLote, setOriginalLote] = useState('');

    // Estado para la cantidad a producir
    const [cantidadProducir, setCantidadProducir] = useState(1);

    // Estado para el usuario actual (aprobador)
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Estados para control de edición de lote (nivel 3)
    const [produccionAccessLevel, setProduccionAccessLevel] = useState<number | null>(null);
    const [isLoteEditable, setIsLoteEditable] = useState<boolean>(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
    const [isCheckingLote, setIsCheckingLote] = useState<boolean>(false);
    const [loteValidationStatus, setLoteValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'checking'>('idle');
    const [loteValidationMessage, setLoteValidationMessage] = useState<string>('');

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

        // Si el lote está en modo editable, verificar que se haya validado
        if (isLoteEditable && loteValidationStatus !== 'valid') {
            toast({
                title: 'Validación requerida',
                description: 'Debes verificar la disponibilidad del lote antes de crear la orden.',
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
            setOriginalLote('');
            setCantidadProducir(1);
            setNumeroPedidoComercial('');
            setAreaOperativa('');
            setDepartamentoOperativo('');
            setSelectedVendedor(null);
            setVendedorResponsableId(1); // Reset to default value
            setIsLoteEditable(false);
            setLoteValidationStatus('idle');
            setLoteValidationMessage('');
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

    const handlePickerConfirm = async (producto: ProductoWithInsumos, _canProduceFlag: boolean) => {
        setSelectedProducto(producto);
        const loteSize = producto.producto.tipo_producto === 'T'
            ? (producto.producto.categoria?.loteSize ?? 0)
            : 0;
        const newCantidad = loteSize > 0 ? loteSize : 1;
        setCantidadProducir(newCantidad);
        if (producto.producto.tipo_producto === 'T' && loteSize <= 0) {
            toast({
                title: 'Tamaño de lote no configurado',
                description: 'La categoría de este producto no tiene tamaño de lote. Se usará 1 unidad. Configure el tamaño en "Config. Lotes por Categoría" si aplica.',
                status: 'info',
                duration: 5000,
                isClosable: true,
            });
        }
        const canProduceWithQuantity = producto.insumos.every(
            insumo => insumo.stockActual >= (insumo.cantidadRequerida * newCantidad)
        );
        setCanProduce(canProduceWithQuantity);
        setIsPickerOpen(false);

        // Generar número de lote para producto terminado con prefijoLote
        const esTerminado = producto.producto.tipo_producto === 'T';
        const prefijo = producto.producto.prefijoLote?.trim();
        if (esTerminado && prefijo) {
            try {
                const url = `${endPoints.next_lote_produccion}?productoId=${encodeURIComponent(producto.producto.productoId)}`;
                const response = await axios.get(url);
                const lote = response.data?.lote;
                if (lote) {
                    setLoteBatchNumber(lote);
                    setOriginalLote(lote); // Guardar el lote generado automáticamente
                    setIsLoteEditable(false); // Reset lock state
                    setLoteValidationStatus('idle'); // Reset validation
                    setLoteValidationMessage(''); // Reset message
                } else {
                    setLoteBatchNumber('');
                    setOriginalLote('');
                }
            } catch (error) {
                console.error('Error al obtener siguiente lote:', error);
                setLoteBatchNumber('');
                toast({
                    title: 'Lote no generado',
                    description: axios.isAxiosError(error) && error.response?.data?.error
                        ? error.response.data.error
                        : 'No se pudo generar el número de lote. Puede ingresarlo manualmente si aplica.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } else {
            setLoteBatchNumber('');
            setOriginalLote('');
        }
    };

    const handlePickerClose = () => {
        setIsPickerOpen(false);
    };

    const handleToggleLoteEdit = () => {
        if (!(user === 'master' || (produccionAccessLevel !== null && produccionAccessLevel >= 3))) {
            return;
        }

        if (!isLoteEditable) {
            // Desbloquear: guardar el lote actual y permitir edición
            setOriginalLote(loteBatchNumber);
            setIsLoteEditable(true);
        } else {
            // Bloquear: restaurar el lote original y resetear validación
            setLoteBatchNumber(originalLote);
            setIsLoteEditable(false);
            setLoteValidationStatus('idle');
            setLoteValidationMessage('');
        }
    };

    const handleCheckLoteDisponible = async () => {
        if (!loteBatchNumber.trim()) {
            toast({
                title: 'Lote vacío',
                description: 'Ingresa un número de lote para verificar.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Validación básica de formato
        if (!loteBatchNumber.includes('-')) {
            toast({
                title: 'Formato inválido',
                description: 'El número de lote debe seguir el formato PREFIJO-NNNNNNN-YY.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsCheckingLote(true);
        setLoteValidationStatus('checking');

        try {
            const url = `${endPoints.check_lote_disponible}?batchNumber=${encodeURIComponent(loteBatchNumber.trim())}`;
            const response = await axios.get(url);
            const disponible = response.data?.disponible;

            if (disponible) {
                setLoteValidationStatus('valid');
                setLoteValidationMessage('');
                toast({
                    title: 'Lote disponible',
                    description: 'El número de lote está disponible para usar.',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                setLoteValidationStatus('invalid');
                setLoteValidationMessage('El número de lote ya está en uso');
                toast({
                    title: 'Lote no disponible',
                    description: 'Este número de lote ya está registrado en el sistema.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (error) {
            console.error('Error checking lote availability:', error);
            setLoteValidationStatus('invalid');
            setLoteValidationMessage('Error al verificar disponibilidad');
            toast({
                title: 'Error',
                description: 'No se pudo verificar la disponibilidad del lote. Intenta nuevamente.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsCheckingLote(false);
        }
    };

    const handleOpenInfoModal = () => {
        setIsInfoModalOpen(true);
    };

    const handleCloseInfoModal = () => {
        setIsInfoModalOpen(false);
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

    // Efecto para obtener el nivel de acceso de producción
    useEffect(() => {
        const fetchAccessLevel = async () => {
            try {
                const level = await getAccessLevel('PRODUCCION');
                setProduccionAccessLevel(level);
            } catch (error) {
                console.error('Error fetching access level:', error);
                setProduccionAccessLevel(null);
            }
        };
        fetchAccessLevel();
    }, []);

    // Efecto para actualizar canProduce cuando cambia la cantidad a producir
    useEffect(() => {
        if (selectedProducto) {
            const canProduceWithQuantity = selectedProducto.insumos.every(
                insumo => insumo.stockActual >= (insumo.cantidadRequerida * cantidadProducir)
            );
            setCanProduce(canProduceWithQuantity);
        }
    }, [cantidadProducir, selectedProducto]);

    const isLoteSizeFixed =
        selectedProducto?.producto.tipo_producto === 'T' &&
        (selectedProducto?.producto.categoria?.loteSize ?? 0) > 0;

    return (
        <VStack align="stretch">
            <TerSemiTerCard
                productoSeleccionado={selectedProducto}
                canProduce={canProduce}
                onSearchClick={handleSeleccionarProducto}
                cantidadAProducir={cantidadProducir}
            />

            <HStack spacing={4} mt="4">
                <FormControl>
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
                <FormControl isInvalid={loteValidationStatus === 'invalid'}>
                    <FormLabel>Lote</FormLabel>
                    <InputGroup>
                        <Input
                            placeholder={
                                selectedProducto?.producto.tipo_producto === 'T' && selectedProducto?.producto.prefijoLote
                                    ? 'Se genera al seleccionar el producto'
                                    : 'No aplica (solo terminados con prefijo de lote)'
                            }
                            value={loteBatchNumber}
                            isReadOnly={!isLoteEditable || !(user === 'master' || (produccionAccessLevel !== null && produccionAccessLevel >= 3))}
                            bg={isLoteEditable && (user === 'master' || (produccionAccessLevel !== null && produccionAccessLevel >= 3)) ? "white" : "gray.50"}
                            onChange={(e) => {
                                setLoteBatchNumber(e.target.value);
                                // Resetear validación cuando el usuario escribe
                                if (loteValidationStatus !== 'idle') {
                                    setLoteValidationStatus('idle');
                                    setLoteValidationMessage('');
                                }
                            }}
                        />
                        <InputRightElement width="auto">
                            <HStack spacing={1}>
                                {(user === 'master' || (produccionAccessLevel !== null && produccionAccessLevel >= 3)) && (
                                    <>
                                        <IconButton
                                            aria-label={isLoteEditable ? "Bloquear edición de lote" : "Desbloquear edición de lote"}
                                            icon={isLoteEditable ? <UnlockIcon /> : <LockIcon />}
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleToggleLoteEdit}
                                        />
                                        {isLoteEditable && (
                                            <IconButton
                                                aria-label="Verificar disponibilidad del lote"
                                                icon={isCheckingLote ? <Spinner size="sm" /> : <CheckIcon />}
                                                size="sm"
                                                variant="ghost"
                                                colorScheme={loteValidationStatus === 'valid' ? 'green' : loteValidationStatus === 'invalid' ? 'red' : 'gray'}
                                                onClick={handleCheckLoteDisponible}
                                                isDisabled={!loteBatchNumber.trim() || isCheckingLote}
                                            />
                                        )}
                                        <IconButton
                                            aria-label="Información sobre edición de lote"
                                            icon={<Icon as={FaQuestionCircle} boxSize={5} />}
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleOpenInfoModal}
                                        />
                                    </>
                                )}
                            </HStack>
                        </InputRightElement>
                    </InputGroup>
                    {loteValidationStatus === 'invalid' && (
                        <FormErrorMessage>{loteValidationMessage || 'El número de lote ya está en uso'}</FormErrorMessage>
                    )}
                    {loteValidationStatus === 'valid' && (
                        <Text fontSize="sm" color="green.500">El número de lote está disponible</Text>
                    )}
                </FormControl>

                <FormControl>
                    <FormLabel>Cantidad a producir</FormLabel>
                    {isLoteSizeFixed ? (
                        <Input value={cantidadProducir} isReadOnly bg="gray.50" />
                    ) : (
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
                isDisabled={
                    !selectedProducto ||
                    cantidadProducir < 1 ||
                    (isLoteEditable && loteValidationStatus !== 'valid')
                }
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
            <Modal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edición Manual de Números de Lote</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack align="stretch" spacing={4}>
                            <Text>
                                <strong>Acceso Restringido:</strong> Esta funcionalidad está disponible exclusivamente para usuarios con nivel de acceso 3 o superior al módulo de Producción.
                            </Text>
                            <Text>
                                <strong>Patrón de Generación Automática:</strong> El sistema genera automáticamente los números de lote siguiendo el formato <strong>PREFIJO-NNNNNNN-YY</strong>, donde:
                            </Text>
                            <Box pl={4}>
                                <Text>• <strong>PREFIJO:</strong> Identificador único del producto (ej: "STD")</Text>
                                <Text>• <strong>NNNNNNN:</strong> Número secuencial de 7 dígitos que se incrementa automáticamente</Text>
                                <Text>• <strong>YY:</strong> Año de 2 dígitos (ej: "26" para 2026)</Text>
                            </Box>
                            <Text>
                                <strong>Ejemplo:</strong> Si el último lote generado fue <strong>STD-0000009-26</strong>, el siguiente será <strong>STD-0000010-26</strong>.
                            </Text>
                            <Text>
                                <strong>Uso de la Edición Manual:</strong> Esta funcionalidad permite a usuarios autorizados adelantar el número secuencial del lote. Por ejemplo, si los lotes van consecutivamente en <strong>STD-0000009-26</strong>, puedes cambiarlo manualmente a <strong>STD-0000015-26</strong> para que los siguientes lotes continúen desde el 16, 17, etc.
                            </Text>
                            <Text>
                                <strong>Validación de Disponibilidad:</strong> Cuando desbloquees el campo y modifiques el número de lote, utiliza el botón de verificación (✓) para comprobar que el número ingresado no esté ya en uso. El sistema validará que el lote sea único antes de permitir crear la orden.
                            </Text>
                            <Text>
                                <strong>Importante:</strong> Utiliza esta función con precaución, ya que modifica la secuencia normal de numeración. Asegúrate de que el número ingresado sea mayor al último lote registrado para evitar duplicados y siempre verifica la disponibilidad antes de crear la orden.
                            </Text>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button colorScheme="blue" onClick={handleCloseInfoModal}>
                            Entendido
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    );
}
