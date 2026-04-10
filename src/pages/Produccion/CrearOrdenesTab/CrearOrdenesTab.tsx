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
import type { User } from "../../../api/UserApi.tsx";
import { useAuth } from '../../../context/AuthContext';
import { Modulo } from '../../Usuarios/GestionUsuarios/types.tsx';
import { useTabPermission } from '../../../auth/usePermissions';
import { selectNumericInputContentsOnFocus } from '../../../utils/selectNumericInputContentsOnFocus';

type LoteValidationStatus = 'idle' | 'valid' | 'invalid' | 'checking';

const endPoints = new EndPointsURL();

function generateConsecutiveLotes(firstLote: string, n: number): string[] {
    const parts = firstLote.split('-');
    if (parts.length !== 3) return Array(n).fill(firstLote);
    const prefix = parts[0];
    const seq = parseInt(parts[1], 10);
    const year = parts[2];
    if (isNaN(seq)) return Array(n).fill(firstLote);
    return Array.from({ length: n }, (_, i) =>
        `${prefix}-${String(seq + i).padStart(7, '0')}-${year}`
    );
}

export default function CrearOrdenesTab() {
    const toast = useToast();
    const { meProfile } = useAuth();
    const { nivel: crearOdpAccessLevel } = useTabPermission(Modulo.PRODUCCION, "CREAR_ODP_MANUALMENTE");

    const [selectedProducto, setSelectedProducto] = useState<ProductoWithInsumos | null>(null);
    const [canProduce, setCanProduce] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [observaciones, setObservaciones] = useState('');
    const [vendedorResponsableId, setVendedorResponsableId] = useState<number | null>(null);
    const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
    const [isVendedorPickerOpen, setIsVendedorPickerOpen] = useState(false);
    const [numeroPedidoComercial, setNumeroPedidoComercial] = useState('');
    const [areaOperativa, setAreaOperativa] = useState('Producción');
    const [departamentoOperativo, setDepartamentoOperativo] = useState('Dirección de Operaciones');

    const [fechaLanzamiento, setFechaLanzamiento] = useState('');
    const [fechaFinalPlanificada, setFechaFinalPlanificada] = useState('');

    // cantidadProducir is always read-only (driven by loteSize of the product's category)
    const [cantidadProducir, setCantidadProducir] = useState(1);

    // Number of production orders to create simultaneously
    const [cantidadLotes, setCantidadLotes] = useState(1);

    // Array states: one entry per lote
    const [loteBatchNumbers, setLoteBatchNumbers] = useState<string[]>([]);
    const [originalLotes, setOriginalLotes] = useState<string[]>([]);
    const [loteValidations, setLoteValidations] = useState<LoteValidationStatus[]>([]);
    const [isLotesEditable, setIsLotesEditable] = useState<boolean[]>([]);
    const [isCheckingLotes, setIsCheckingLotes] = useState<boolean[]>([]);

    const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);

    const canEditLote = crearOdpAccessLevel >= 3;
    const currentUser: User | null = meProfile;

    // ── helpers ──────────────────────────────────────────────────────────────

    const resetLoteArrays = (n: number, lotes: string[]) => {
        setLoteBatchNumbers(lotes);
        setOriginalLotes([...lotes]);
        setIsLotesEditable(Array(n).fill(false));
        setLoteValidations(Array(n).fill('idle') as LoteValidationStatus[]);
        setIsCheckingLotes(Array(n).fill(false));
    };

    // ── handlers ─────────────────────────────────────────────────────────────

    const handleSeleccionarProducto = () => setIsPickerOpen(true);

    const handleCantidadLotesChange = (valueString: string) => {
        const newCantidad = Math.max(1, parseInt(valueString, 10) || 1);
        setCantidadLotes(newCantidad);
        if (originalLotes.length === 0) return;
        const baseLote = originalLotes[0];
        if (!baseLote) return;
        const generated = generateConsecutiveLotes(baseLote, newCantidad);
        resetLoteArrays(newCantidad, generated);
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

        const loteSize = selectedProducto?.producto.categoria?.loteSize ?? 0;
        if (loteSize <= 0) {
            toast({
                title: 'Categoría sin tamaño de lote',
                description: 'La categoría de este producto no tiene tamaño de lote configurado. No se puede crear la orden.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        const hasUnvalidatedEditable = isLotesEditable.some(
            (editable, i) => editable && loteValidations[i] !== 'valid'
        );
        if (hasUnvalidatedEditable) {
            toast({
                title: 'Validación requerida',
                description: 'Debes verificar la disponibilidad de todos los lotes desbloqueados antes de crear las órdenes.',
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

        try {
            if (cantidadLotes === 1) {
                const payload = {
                    productoId: selectedProducto.producto.productoId,
                    cantidadProducir: cantidadProducir,
                    observaciones: toNullableString(observaciones),
                    fechaLanzamiento: toNullableDate(fechaLanzamiento),
                    fechaFinalPlanificada: toNullableDate(fechaFinalPlanificada),
                    numeroPedidoComercial: toNullableString(numeroPedidoComercial),
                    areaOperativa: toNullableString(areaOperativa),
                    departamentoOperativo: toNullableString(departamentoOperativo),
                    loteBatchNumber: toNullableString(loteBatchNumbers[0] ?? ''),
                    vendedorResponsableId: vendedorResponsableId,
                };
                await axios.post(endPoints.save_produccion, payload);
            } else {
                const payload = {
                    productoId: selectedProducto.producto.productoId,
                    cantidadProducir: cantidadProducir,
                    observaciones: toNullableString(observaciones),
                    fechaLanzamiento: toNullableDate(fechaLanzamiento),
                    fechaFinalPlanificada: toNullableDate(fechaFinalPlanificada),
                    numeroPedidoComercial: toNullableString(numeroPedidoComercial),
                    areaOperativa: toNullableString(areaOperativa),
                    departamentoOperativo: toNullableString(departamentoOperativo),
                    loteBatchNumbers: loteBatchNumbers
                        .map(l => toNullableString(l) ?? '')
                        .filter(Boolean),
                    vendedorResponsableId: vendedorResponsableId,
                };
                await axios.post(endPoints.save_produccion_multiple, payload);
            }

            toast({
                title: cantidadLotes === 1
                    ? 'Orden de Producción creada'
                    : `${cantidadLotes} Órdenes de Producción creadas`,
                description: cantidadLotes === 1
                    ? 'La orden se ha creado correctamente.'
                    : `Se han creado ${cantidadLotes} órdenes de producción correctamente.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Reset all form state
            setSelectedProducto(null);
            setCanProduce(false);
            setObservaciones('');
            setFechaLanzamiento('');
            setFechaFinalPlanificada('');
            setCantidadProducir(1);
            setCantidadLotes(1);
            setNumeroPedidoComercial('');
            setAreaOperativa('');
            setDepartamentoOperativo('');
            setSelectedVendedor(null);
            setVendedorResponsableId(null);
            resetLoteArrays(0, []);
        } catch (error) {
            console.error('Error creating orden(es) de producción:', error);
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
                description: 'La categoría de este producto no tiene tamaño de lote. Configure el tamaño en "Config. Lotes por Categoría".',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
        }

        const canProduceWithQuantity = producto.insumos.every(
            insumo => insumo.stockActual >= (insumo.cantidadRequerida * newCantidad)
        );
        setCanProduce(canProduceWithQuantity);
        setIsPickerOpen(false);

        // Reset cantidad lotes to 1 when changing product
        setCantidadLotes(1);

        const esTerminado = producto.producto.tipo_producto === 'T';
        const prefijo = producto.producto.prefijoLote?.trim();
        if (esTerminado && prefijo) {
            try {
                const url = `${endPoints.next_lote_produccion}?productoId=${encodeURIComponent(producto.producto.productoId)}`;
                const response = await axios.get(url);
                const firstLote = response.data?.lote;
                if (firstLote) {
                    resetLoteArrays(1, [firstLote]);
                } else {
                    resetLoteArrays(0, []);
                }
            } catch (error) {
                console.error('Error al obtener siguiente lote:', error);
                resetLoteArrays(0, []);
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
            resetLoteArrays(0, []);
        }
    };

    const handlePickerClose = () => setIsPickerOpen(false);

    const handleToggleLoteEdit = (index: number) => {
        if (!canEditLote) return;
        const newEditable = [...isLotesEditable];
        if (!newEditable[index]) {
            // Unlock: save the current value as original
            const newOriginals = [...originalLotes];
            newOriginals[index] = loteBatchNumbers[index];
            setOriginalLotes(newOriginals);
            newEditable[index] = true;
        } else {
            // Lock: restore the original value and reset validation
            setLoteBatchNumbers(prev => {
                const updated = [...prev];
                updated[index] = originalLotes[index];
                return updated;
            });
            newEditable[index] = false;
            setLoteValidations(prev => {
                const updated = [...prev];
                updated[index] = 'idle';
                return updated;
            });
        }
        setIsLotesEditable(newEditable);
    };

    const handleCheckLoteDisponible = async (index: number) => {
        const lote = loteBatchNumbers[index];
        if (!lote?.trim()) {
            toast({
                title: 'Lote vacío',
                description: 'Ingresa un número de lote para verificar.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        if (!lote.includes('-')) {
            toast({
                title: 'Formato inválido',
                description: 'El número de lote debe seguir el formato PREFIJO-NNNNNNN-YY.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsCheckingLotes(prev => {
            const updated = [...prev];
            updated[index] = true;
            return updated;
        });
        setLoteValidations(prev => {
            const updated = [...prev];
            updated[index] = 'checking';
            return updated;
        });

        try {
            const url = `${endPoints.check_lote_disponible}?batchNumber=${encodeURIComponent(lote.trim())}`;
            const response = await axios.get(url);
            const disponible = response.data?.disponible;

            setLoteValidations(prev => {
                const updated = [...prev];
                updated[index] = disponible ? 'valid' : 'invalid';
                return updated;
            });

            toast({
                title: disponible ? 'Lote disponible' : 'Lote no disponible',
                description: disponible
                    ? 'El número de lote está disponible para usar.'
                    : 'Este número de lote ya está registrado en el sistema.',
                status: disponible ? 'success' : 'error',
                duration: disponible ? 3000 : 5000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error checking lote availability:', error);
            setLoteValidations(prev => {
                const updated = [...prev];
                updated[index] = 'invalid';
                return updated;
            });
            toast({
                title: 'Error',
                description: 'No se pudo verificar la disponibilidad del lote. Intenta nuevamente.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsCheckingLotes(prev => {
                const updated = [...prev];
                updated[index] = false;
                return updated;
            });
        }
    };

    const handleOpenInfoModal = () => setIsInfoModalOpen(true);
    const handleCloseInfoModal = () => setIsInfoModalOpen(false);

    const handleOpenVendedorPicker = () => setIsVendedorPickerOpen(true);
    const handleVendedorPickerClose = () => setIsVendedorPickerOpen(false);

    const handleSelectVendedor = (vendedor: Vendedor) => {
        setSelectedVendedor(vendedor);
        setVendedorResponsableId(vendedor.cedula);
    };

    // ── effects ───────────────────────────────────────────────────────────────

    useEffect(() => {
        if (selectedProducto) {
            const canProduceWithQuantity = selectedProducto.insumos.every(
                insumo => insumo.stockActual >= (insumo.cantidadRequerida * cantidadProducir)
            );
            setCanProduce(canProduceWithQuantity);
        }
    }, [cantidadProducir, selectedProducto]);

    // ── derived values ────────────────────────────────────────────────────────

    const noLoteSize = !selectedProducto ||
        ((selectedProducto?.producto.categoria?.loteSize ?? 0) <= 0);

    const anyLoteEditableButNotValid = isLotesEditable.some(
        (editable, i) => editable && loteValidations[i] !== 'valid'
    );

    const hasLotes = loteBatchNumbers.length > 0;

    // ── render ────────────────────────────────────────────────────────────────

    return (
        <VStack align="stretch">
            <TerSemiTerCard
                productoSeleccionado={selectedProducto}
                canProduce={canProduce}
                onSearchClick={handleSeleccionarProducto}
                cantidadAProducir={cantidadProducir}
            />

            <Box display="none">
                <HStack spacing={4} mt="4">
                    <FormControl>
                        <FormLabel>Asesor</FormLabel>
                        <InputGroup>
                            <Input
                                value={selectedVendedor
                                    ? `${selectedVendedor.cedula} - ${selectedVendedor.nombres} ${selectedVendedor.apellidos}`
                                    : ''}
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
            </Box>

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

            {/* Cantidad a producir (always read-only) + Cantidad de lotes */}
            <HStack spacing={4} mt="4">
                <FormControl>
                    <FormLabel>Cantidad a producir</FormLabel>
                    <Input value={cantidadProducir} isReadOnly bg="gray.50" />
                </FormControl>

                <FormControl>
                    <FormLabel>Cantidad de lotes</FormLabel>
                    <NumberInput
                        min={1}
                        precision={0}
                        value={cantidadLotes}
                        onChange={handleCantidadLotesChange}
                        isDisabled={!selectedProducto || noLoteSize}
                    >
                        <NumberInputField onFocus={selectNumericInputContentsOnFocus} />
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </FormControl>
            </HStack>

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

            {/* Usuario Aprobador (no editable) */}
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

            {/* Dynamic lote fields section */}
            {hasLotes && (
                <Box mt="4" p={4} bg="gray.50" borderRadius="md" borderWidth="1px">
                    <HStack justify="space-between" mb={3}>
                        <Heading size="sm">
                            Lotes de Producción ({cantidadLotes})
                        </Heading>
                        {canEditLote && (
                            <IconButton
                                aria-label="Información sobre edición de lote"
                                icon={<Icon as={FaQuestionCircle} boxSize={5} />}
                                size="sm"
                                variant="ghost"
                                onClick={handleOpenInfoModal}
                            />
                        )}
                    </HStack>

                    <Box
                        maxH={cantidadLotes > 5 ? '320px' : undefined}
                        overflowY={cantidadLotes > 5 ? 'auto' : undefined}
                        pr={cantidadLotes > 5 ? 2 : 0}
                    >
                        <VStack spacing={3}>
                            {loteBatchNumbers.map((lote, i) => (
                                <FormControl
                                    key={i}
                                    isInvalid={loteValidations[i] === 'invalid'}
                                    w="100%"
                                >
                                    <FormLabel fontSize="sm">Lote {i + 1}</FormLabel>
                                    <InputGroup>
                                        <Input
                                            placeholder="Número de lote"
                                            value={lote}
                                            isReadOnly={!isLotesEditable[i] || !canEditLote}
                                            bg={isLotesEditable[i] && canEditLote ? 'white' : 'gray.100'}
                                            onChange={(e) => {
                                                setLoteBatchNumbers(prev => {
                                                    const updated = [...prev];
                                                    updated[i] = e.target.value;
                                                    return updated;
                                                });
                                                if (loteValidations[i] !== 'idle') {
                                                    setLoteValidations(prev => {
                                                        const updated = [...prev];
                                                        updated[i] = 'idle';
                                                        return updated;
                                                    });
                                                }
                                            }}
                                        />
                                        <InputRightElement width="auto">
                                            <HStack spacing={1}>
                                                {canEditLote && (
                                                    <>
                                                        <IconButton
                                                            aria-label={isLotesEditable[i]
                                                                ? 'Bloquear edición de lote'
                                                                : 'Desbloquear edición de lote'}
                                                            icon={isLotesEditable[i]
                                                                ? <UnlockIcon />
                                                                : <LockIcon />}
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleToggleLoteEdit(i)}
                                                        />
                                                        {isLotesEditable[i] && (
                                                            <IconButton
                                                                aria-label="Verificar disponibilidad del lote"
                                                                icon={isCheckingLotes[i]
                                                                    ? <Spinner size="sm" />
                                                                    : <CheckIcon />}
                                                                size="sm"
                                                                variant="ghost"
                                                                colorScheme={
                                                                    loteValidations[i] === 'valid' ? 'green' :
                                                                    loteValidations[i] === 'invalid' ? 'red' : 'gray'
                                                                }
                                                                onClick={() => handleCheckLoteDisponible(i)}
                                                                isDisabled={!lote.trim() || isCheckingLotes[i]}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </HStack>
                                        </InputRightElement>
                                    </InputGroup>
                                    {loteValidations[i] === 'invalid' && (
                                        <FormErrorMessage>El número de lote ya está en uso</FormErrorMessage>
                                    )}
                                    {loteValidations[i] === 'valid' && (
                                        <Text fontSize="sm" color="green.500">
                                            El número de lote está disponible
                                        </Text>
                                    )}
                                </FormControl>
                            ))}
                        </VStack>
                    </Box>
                </Box>
            )}

            <Button
                onClick={handleCrearOrden}
                isDisabled={
                    !selectedProducto ||
                    cantidadProducir < 1 ||
                    noLoteSize ||
                    anyLoteEditableButNotValid
                }
                mt="4"
                colorScheme="blue"
            >
                {cantidadLotes === 1
                    ? 'Crear Orden de Producción'
                    : `Crear ${cantidadLotes} Órdenes de Producción`}
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
                                <strong>Acceso Restringido:</strong> Esta funcionalidad está disponible exclusivamente para usuarios con nivel de acceso 3 o superior al tab Crear ODP Manualmente.
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
