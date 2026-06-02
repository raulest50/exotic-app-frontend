import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Grid,
    GridItem,
    HStack,
    IconButton,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Spinner,
    Table,
    Tbody,
    Td,
    Textarea,
    Th,
    Thead,
    Tooltip,
    Tr,
    useDisclosure,
    useToast,
} from '@chakra-ui/react';
import { AddIcon, CheckIcon, CloseIcon, DeleteIcon, SearchIcon } from '@chakra-ui/icons';
import axios, { AxiosError } from 'axios';
import EndPointsURL from '../../api/EndPointsURL';
import MyPagination from '../../components/MyPagination';
import IntegrantePersonalPicker from '../../components/Pickers/IntegrantePersonalPicker/IntegrantePersonalPicker';
import {
    EstadoRegistroHoraExtra,
    getEstadoRegistroHoraExtraText,
    IntegrantePersonal,
    PageResponse,
    RegistroHoraExtra,
    RegistroHoraExtraRequest,
} from './types';

type DecisionAccion = 'rechazar' | 'anular';

interface DecisionState {
    accion: DecisionAccion;
    registro: RegistroHoraExtra;
}

export function HorasExtraPersonal() {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const decisionModal = useDisclosure();
    const integrantePicker = useDisclosure();

    const [selectedIntegrante, setSelectedIntegrante] = useState<IntegrantePersonal | null>(null);
    const [fecha, setFecha] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    const [motivo, setMotivo] = useState('');
    const [observaciones, setObservaciones] = useState('');

    const [q, setQ] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [estado, setEstado] = useState<EstadoRegistroHoraExtra | ''>('');
    const [registros, setRegistros] = useState<RegistroHoraExtra[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const [decisionState, setDecisionState] = useState<DecisionState | null>(null);
    const [decisionMotivo, setDecisionMotivo] = useState('');

    useEffect(() => {
        buscar(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const minutosEstimados = useMemo(() => {
        if (!horaInicio || !horaFin || horaFin <= horaInicio) return null;
        const [inicioH, inicioM] = horaInicio.split(':').map(Number);
        const [finH, finM] = horaFin.split(':').map(Number);
        return (finH * 60 + finM) - (inicioH * 60 + inicioM);
    }, [horaInicio, horaFin]);

    const validarRegistro = () => {
        if (!selectedIntegrante) {
            toast({
                title: 'Integrante requerido',
                description: 'Seleccione un integrante activo para registrar la hora extra.',
                status: 'warning',
                duration: 4000,
                isClosable: true,
            });
            return false;
        }

        if (!fecha || !horaInicio || !horaFin || !motivo.trim()) {
            toast({
                title: 'Campos obligatorios faltantes',
                description: 'Complete fecha, horas y motivo.',
                status: 'warning',
                duration: 4000,
                isClosable: true,
            });
            return false;
        }

        if (horaFin <= horaInicio) {
            toast({
                title: 'Rango horario inválido',
                description: 'La hora de fin debe ser posterior a la hora de inicio.',
                status: 'error',
                duration: 4000,
                isClosable: true,
            });
            return false;
        }

        return true;
    };

    const registrar = async () => {
        if (!validarRegistro() || !selectedIntegrante) return;
        setSaving(true);
        try {
            const payload: RegistroHoraExtraRequest = {
                fecha,
                horaInicio,
                horaFin,
                motivo: motivo.trim(),
                observaciones: observaciones.trim() || undefined,
            };
            const url = endpoints.personal_horas_extra_registrar.replace('{integranteId}', String(selectedIntegrante.id));
            await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' } });
            toast({
                title: 'Hora extra registrada',
                status: 'success',
                duration: 3500,
                isClosable: true,
            });
            limpiarFormulario();
            buscar(0);
        } catch (error) {
            mostrarError(error, 'No fue posible registrar la hora extra.');
        } finally {
            setSaving(false);
        }
    };

    const buscar = async (page = 0) => {
        setLoading(true);
        try {
            const response = await axios.get<PageResponse<RegistroHoraExtra>>(endpoints.personal_horas_extra_search, {
                params: {
                    q: q.trim() || undefined,
                    desde: desde || undefined,
                    hasta: hasta || undefined,
                    estado: estado || undefined,
                    page,
                    size: 10,
                },
            });
            setRegistros(response.data.content);
            setCurrentPage(response.data.number);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            mostrarError(error, 'No fue posible consultar las horas extra.');
        } finally {
            setLoading(false);
        }
    };

    const aprobar = async (registro: RegistroHoraExtra) => {
        try {
            const url = endpoints.personal_hora_extra_aprobar.replace('{id}', String(registro.id));
            await axios.put(url);
            toast({
                title: 'Hora extra aprobada',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            buscar(currentPage);
        } catch (error) {
            mostrarError(error, 'No fue posible aprobar el registro.');
        }
    };

    const abrirDecision = (accion: DecisionAccion, registro: RegistroHoraExtra) => {
        setDecisionState({ accion, registro });
        setDecisionMotivo('');
        decisionModal.onOpen();
    };

    const confirmarDecision = async () => {
        if (!decisionState) return;
        if (!decisionMotivo.trim()) {
            toast({
                title: 'Motivo requerido',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        try {
            const endpoint = decisionState.accion === 'rechazar'
                ? endpoints.personal_hora_extra_rechazar
                : endpoints.personal_hora_extra_anular;
            const url = endpoint.replace('{id}', String(decisionState.registro.id));
            await axios.put(url, { motivo: decisionMotivo.trim() });
            toast({
                title: decisionState.accion === 'rechazar' ? 'Hora extra rechazada' : 'Hora extra anulada',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            decisionModal.onClose();
            buscar(currentPage);
        } catch (error) {
            mostrarError(error, 'No fue posible actualizar el registro.');
        }
    };

    const limpiarFormulario = () => {
        setSelectedIntegrante(null);
        setFecha('');
        setHoraInicio('');
        setHoraFin('');
        setMotivo('');
        setObservaciones('');
    };

    const mostrarError = (error: unknown, fallback: string) => {
        const err = error as AxiosError<{ message?: string; detail?: string; error?: string }>;
        const data = err.response?.data;
        toast({
            title: 'Error',
            description: data?.message || data?.detail || data?.error || fallback,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    };

    const estadoColor = (value: EstadoRegistroHoraExtra) => {
        if (value === EstadoRegistroHoraExtra.APROBADA) return 'green';
        if (value === EstadoRegistroHoraExtra.RECHAZADA) return 'red';
        if (value === EstadoRegistroHoraExtra.ANULADA) return 'gray';
        return 'blue';
    };

    const formatMinutos = (minutos: number) => {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas} h ${mins} min`;
    };

    const formatHora = (value: string) => value ? value.slice(0, 5) : '';

    const decisionUser = (registro: RegistroHoraExtra) => (
        registro.aprobadoPorNombre || registro.aprobadoPorUsername || '-'
    );

    const selectedIntegranteLabel = selectedIntegrante
        ? `${selectedIntegrante.id} - ${selectedIntegrante.nombres} ${selectedIntegrante.apellidos}`
        : '';

    return (
        <Box w="full" p="1em">
            <Flex direction="column" gap={6}>
                <Grid templateColumns={['1fr', '2fr repeat(3, 1fr)']} gap={4} p="1em" boxShadow="base">
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Empleado</FormLabel>
                            <HStack>
                                <Input
                                    value={selectedIntegranteLabel}
                                    placeholder="Seleccione un integrante activo"
                                    isReadOnly
                                />
                                <Tooltip label="Buscar integrante">
                                    <IconButton
                                        aria-label="Buscar integrante"
                                        icon={<SearchIcon />}
                                        colorScheme="blue"
                                        onClick={integrantePicker.onOpen}
                                    />
                                </Tooltip>
                                <Tooltip label="Limpiar selección">
                                    <IconButton
                                        aria-label="Limpiar integrante"
                                        icon={<CloseIcon />}
                                        variant="outline"
                                        isDisabled={!selectedIntegrante}
                                        onClick={() => setSelectedIntegrante(null)}
                                    />
                                </Tooltip>
                            </HStack>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Fecha</FormLabel>
                            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Inicio</FormLabel>
                            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Fin</FormLabel>
                            <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <FormControl isRequired>
                            <FormLabel>Motivo</FormLabel>
                            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <FormControl>
                            <FormLabel>Observaciones</FormLabel>
                            <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 4]}>
                        <HStack justify="space-between" align="center">
                            <Badge colorScheme={minutosEstimados ? 'teal' : 'gray'}>
                                {minutosEstimados ? formatMinutos(minutosEstimados) : '0 h 0 min'}
                            </Badge>
                            <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={registrar} isLoading={saving}>
                                Registrar
                            </Button>
                        </HStack>
                    </GridItem>
                </Grid>

                <Grid templateColumns={['1fr', '2fr repeat(3, 1fr) auto']} gap={3} alignItems="end">
                    <FormControl>
                        <FormLabel>Buscar</FormLabel>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => {
                            if (e.key === 'Enter') buscar(0);
                        }} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Desde</FormLabel>
                        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Hasta</FormLabel>
                        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Estado</FormLabel>
                        <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoRegistroHoraExtra | '')}>
                            <option value="">Todos</option>
                            {Object.values(EstadoRegistroHoraExtra).map((item) => (
                                <option key={item} value={item}>{getEstadoRegistroHoraExtraText(item)}</option>
                            ))}
                        </Select>
                    </FormControl>
                    <Button leftIcon={<SearchIcon />} colorScheme="teal" onClick={() => buscar(0)}>
                        Buscar
                    </Button>
                </Grid>

                {loading ? (
                    <Spinner />
                ) : (
                    <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    <Th>Empleado</Th>
                                    <Th>Fecha</Th>
                                    <Th>Horario</Th>
                                    <Th>Tiempo</Th>
                                    <Th>Estado</Th>
                                    <Th>Registró</Th>
                                    <Th>Decisión</Th>
                                    <Th>Motivo</Th>
                                    <Th>Acciones</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {registros.map((registro) => (
                                    <Tr key={registro.id}>
                                        <Td>{registro.integranteNombre || registro.integranteId}</Td>
                                        <Td>{registro.fecha}</Td>
                                        <Td>{formatHora(registro.horaInicio)} - {formatHora(registro.horaFin)}</Td>
                                        <Td>{formatMinutos(registro.minutos)}</Td>
                                        <Td>
                                            <Badge colorScheme={estadoColor(registro.estado)}>
                                                {getEstadoRegistroHoraExtraText(registro.estado)}
                                            </Badge>
                                        </Td>
                                        <Td>{registro.registradoPorNombre || registro.registradoPorUsername}</Td>
                                        <Td>{decisionUser(registro)}</Td>
                                        <Td>{registro.motivo}</Td>
                                        <Td>
                                            <HStack spacing={1}>
                                                <Tooltip label="Aprobar">
                                                    <IconButton
                                                        aria-label="Aprobar"
                                                        icon={<CheckIcon />}
                                                        size="sm"
                                                        colorScheme="green"
                                                        isDisabled={registro.estado !== EstadoRegistroHoraExtra.REGISTRADA}
                                                        onClick={() => aprobar(registro)}
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Rechazar">
                                                    <IconButton
                                                        aria-label="Rechazar"
                                                        icon={<CloseIcon />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        isDisabled={registro.estado !== EstadoRegistroHoraExtra.REGISTRADA}
                                                        onClick={() => abrirDecision('rechazar', registro)}
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Anular">
                                                    <IconButton
                                                        aria-label="Anular"
                                                        icon={<DeleteIcon />}
                                                        size="sm"
                                                        colorScheme="gray"
                                                        isDisabled={registro.estado === EstadoRegistroHoraExtra.ANULADA}
                                                        onClick={() => abrirDecision('anular', registro)}
                                                    />
                                                </Tooltip>
                                            </HStack>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                        <MyPagination
                            page={currentPage}
                            totalPages={totalPages}
                            loading={loading}
                            handlePageChange={buscar}
                        />
                    </Box>
                )}
            </Flex>

            <IntegrantePersonalPicker
                isOpen={integrantePicker.isOpen}
                onClose={integrantePicker.onClose}
                onSelectIntegrante={setSelectedIntegrante}
                initialSelectedId={selectedIntegrante?.id}
            />

            <Modal isOpen={decisionModal.isOpen} onClose={decisionModal.onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        {decisionState?.accion === 'rechazar' ? 'Rechazar hora extra' : 'Anular hora extra'}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl isRequired>
                            <FormLabel>Motivo</FormLabel>
                            <Textarea value={decisionMotivo} onChange={(e) => setDecisionMotivo(e.target.value)} />
                        </FormControl>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={decisionModal.onClose}>
                            Cancelar
                        </Button>
                        <Button colorScheme={decisionState?.accion === 'rechazar' ? 'red' : 'gray'} onClick={confirmarDecision}>
                            Confirmar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}
