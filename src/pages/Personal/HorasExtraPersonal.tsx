import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Box,
    Button,
    CloseButton,
    Flex,
    Grid,
    GridItem,
    HStack,
    IconButton,
    Input,
    NativeSelect,
    Spinner,
    Table,
    Textarea,
    useDisclosure,
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { Tooltip } from '@/components/ui/tooltip';
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
import { LuCheck, LuPlus, LuSearch, LuTrash2, LuX } from 'react-icons/lu';

type DecisionAccion = 'rechazar' | 'anular';

interface DecisionState {
    accion: DecisionAccion;
    registro: RegistroHoraExtra;
}

export function HorasExtraPersonal() {
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const toast = useAppToast();
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
                        <Field.Root required>
                            <Field.Label>Empleado</Field.Label>
                            <HStack>
                                <Input
                                    value={selectedIntegranteLabel}
                                    placeholder="Seleccione un integrante activo"
                                    readOnly
                                />
                                <Tooltip content="Buscar integrante">
                                    <IconButton
                                        aria-label="Buscar integrante"
                                        colorPalette="blue"
                                        onClick={integrantePicker.onOpen}><LuSearch /></IconButton>
                                </Tooltip>
                                <Tooltip content="Limpiar selección">
                                    <IconButton
                                        aria-label="Limpiar integrante"
                                        variant="outline"
                                        disabled={!selectedIntegrante}
                                        onClick={() => setSelectedIntegrante(null)}><LuX /></IconButton>
                                </Tooltip>
                            </HStack>
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Fecha</Field.Label>
                            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Inicio</Field.Label>
                            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem>
                        <Field.Root required>
                            <Field.Label>Fin</Field.Label>
                            <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <Field.Root required>
                            <Field.Label>Motivo</Field.Label>
                            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <Field.Root>
                            <Field.Label>Observaciones</Field.Label>
                            <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
                        </Field.Root>
                    </GridItem>
                    <GridItem colSpan={[1, 4]}>
                        <HStack justify="space-between" align="center">
                            <Badge colorPalette={minutosEstimados ? 'teal' : 'gray'}>
                                {minutosEstimados ? formatMinutos(minutosEstimados) : '0 h 0 min'}
                            </Badge>
                            <Button colorPalette="blue" onClick={registrar} loading={saving}><LuPlus />Registrar
                                                            </Button>
                        </HStack>
                    </GridItem>
                </Grid>

                <Grid templateColumns={['1fr', '2fr repeat(3, 1fr) auto']} gap={3} alignItems="end">
                    <Field.Root>
                        <Field.Label>Buscar</Field.Label>
                        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => {
                            if (e.key === 'Enter') buscar(0);
                        }} />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Desde</Field.Label>
                        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Hasta</Field.Label>
                        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
                    </Field.Root>
                    <Field.Root>
                        <Field.Label>Estado</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={estado}
                                onChange={(e) => setEstado(e.target.value as EstadoRegistroHoraExtra | '')}>
                                <option value="">Todos</option>
                                {Object.values(EstadoRegistroHoraExtra).map((item) => (
                                    <option key={item} value={item}>{getEstadoRegistroHoraExtraText(item)}</option>
                                ))}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                    </Field.Root>
                    <Button colorPalette="teal" onClick={() => buscar(0)}><LuSearch />Buscar
                                            </Button>
                </Grid>

                {loading ? (
                    <Spinner />
                ) : (
                    <Box overflowX="auto">
                        <Table.Root variant="line" size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>Empleado</Table.ColumnHeader>
                                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                                    <Table.ColumnHeader>Horario</Table.ColumnHeader>
                                    <Table.ColumnHeader>Tiempo</Table.ColumnHeader>
                                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                    <Table.ColumnHeader>Registró</Table.ColumnHeader>
                                    <Table.ColumnHeader>Decisión</Table.ColumnHeader>
                                    <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                                    <Table.ColumnHeader>Acciones</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {registros.map((registro) => (
                                    <Table.Row key={registro.id}>
                                        <Table.Cell>{registro.integranteNombre || registro.integranteId}</Table.Cell>
                                        <Table.Cell>{registro.fecha}</Table.Cell>
                                        <Table.Cell>{formatHora(registro.horaInicio)} - {formatHora(registro.horaFin)}</Table.Cell>
                                        <Table.Cell>{formatMinutos(registro.minutos)}</Table.Cell>
                                        <Table.Cell>
                                            <Badge colorPalette={estadoColor(registro.estado)}>
                                                {getEstadoRegistroHoraExtraText(registro.estado)}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>{registro.registradoPorNombre || registro.registradoPorUsername}</Table.Cell>
                                        <Table.Cell>{decisionUser(registro)}</Table.Cell>
                                        <Table.Cell>{registro.motivo}</Table.Cell>
                                        <Table.Cell>
                                            <HStack gap={1}>
                                                <Tooltip content="Aprobar">
                                                    <IconButton
                                                        aria-label="Aprobar"
                                                        size="sm"
                                                        colorPalette="green"
                                                        disabled={registro.estado !== EstadoRegistroHoraExtra.REGISTRADA}
                                                        onClick={() => aprobar(registro)}><LuCheck /></IconButton>
                                                </Tooltip>
                                                <Tooltip content="Rechazar">
                                                    <IconButton
                                                        aria-label="Rechazar"
                                                        size="sm"
                                                        colorPalette="red"
                                                        disabled={registro.estado !== EstadoRegistroHoraExtra.REGISTRADA}
                                                        onClick={() => abrirDecision('rechazar', registro)}><LuX /></IconButton>
                                                </Tooltip>
                                                <Tooltip content="Anular">
                                                    <IconButton
                                                        aria-label="Anular"
                                                        size="sm"
                                                        colorPalette="gray"
                                                        disabled={registro.estado === EstadoRegistroHoraExtra.ANULADA}
                                                        onClick={() => abrirDecision('anular', registro)}><LuTrash2 /></IconButton>
                                                </Tooltip>
                                            </HStack>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
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
                isOpen={integrantePicker.open}
                onClose={integrantePicker.onClose}
                onSelectIntegrante={setSelectedIntegrante}
                initialSelectedId={selectedIntegrante?.id}
            />

            <Dialog.Root open={decisionModal.open} placement='center' onOpenChange={e => {
                if (!e.open) {
                    decisionModal.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>
                                    {decisionState?.accion === 'rechazar' ? 'Rechazar hora extra' : 'Anular hora extra'}
                                </Dialog.Title>
                            </Dialog.Header>
                            <Dialog.CloseTrigger asChild>
                                <CloseButton size="sm" position="absolute" top="2" right="2" />
                            </Dialog.CloseTrigger>
                            <Dialog.Body>
                                <Field.Root required>
                                    <Field.Label>Motivo</Field.Label>
                                    <Textarea value={decisionMotivo} onChange={(e) => setDecisionMotivo(e.target.value)} />
                                </Field.Root>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="ghost" mr={3} onClick={decisionModal.onClose}>
                                    Cancelar
                                </Button>
                                <Button colorPalette={decisionState?.accion === 'rechazar' ? 'red' : 'gray'} onClick={confirmarDecision}>
                                    Confirmar
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Box>
    );
}
