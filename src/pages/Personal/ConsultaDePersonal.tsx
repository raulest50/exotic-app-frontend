import { useMemo, useState } from 'react';
import {
    Steps,
    Button,
    Container,
    Flex,
    Grid,
    GridItem,
    Input,
    NativeSelect,
    Spinner,
    useDisclosure,
    useToast,
    Field,
    Dialog,
    Portal,
} from '@chakra-ui/react';
import axios, { AxiosError } from 'axios';
import EndPointsURL from '../../api/EndPointsURL';
import MyPagination from '../../components/MyPagination';
import ListaIntegrantes from './ListaIntegrantes';
import {
    DepartamentoIntegrante,
    EstadoCivil,
    EstadoIntegrante,
    getEstadoCivilText,
    IntegrantePersonalDetalle,
    IntegrantePersonalRequest,
    IntegrantePersonalResumen,
    PageResponse,
} from './types';

interface DetalleForm {
    id: string;
    nombres: string;
    apellidos: string;
    celular: string;
    direccion: string;
    email: string;
    nombreContactoEmergencia: string;
    celularContactoEmergencia: string;
    estadoCivil: EstadoCivil | '';
    numeroHijos: string;
    fechaIngreso: string;
    numeroCuentaBancaria: string;
    banco: string;
    cargo: string;
    departamento: DepartamentoIntegrante | '';
    centroDeCosto: string;
    centroDeProduccion: string;
    salario: string;
    estado: EstadoIntegrante | '';
    fechaRegistro: string;
}

const emptyDetalleForm: DetalleForm = {
    id: '',
    nombres: '',
    apellidos: '',
    celular: '',
    direccion: '',
    email: '',
    nombreContactoEmergencia: '',
    celularContactoEmergencia: '',
    estadoCivil: '',
    numeroHijos: '',
    fechaIngreso: '',
    numeroCuentaBancaria: '',
    banco: '',
    cargo: '',
    departamento: '',
    centroDeCosto: '',
    centroDeProduccion: '',
    salario: '',
    estado: '',
    fechaRegistro: '',
};

export function ConsultaDePersonal() {
    const [lista, setLista] = useState<IntegrantePersonalResumen[]>([]);
    const [searchText, setSearchText] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [savingDetalle, setSavingDetalle] = useState(false);
    const [detalle, setDetalle] = useState<IntegrantePersonalDetalle | null>(null);
    const [detalleForm, setDetalleForm] = useState<DetalleForm>(emptyDetalleForm);

    const endPoints = useMemo(() => new EndPointsURL(), []);
    const detalleModal = useDisclosure();
    const toast = useToast();

    const onBuscar = async (page = 0) => {
        setLoading(true);
        try {
            const response = await axios.get<PageResponse<IntegrantePersonalResumen>>(
                endPoints.search_integrantes_personal,
                {
                    params: {
                        q: searchText,
                        page,
                        size: 10,
                    },
                }
            );
            setLista(response.data.content);
            setTotalPages(response.data.totalPages);
            setCurrentPage(response.data.number);
        } catch (error) {
            mostrarError(error, 'No fue posible consultar el personal.');
        } finally {
            setLoading(false);
        }
    };

    const abrirDetalle = async (id: number) => {
        setLoadingDetalle(true);
        try {
            const url = endPoints.integrante_personal_by_id.replace('{id}', String(id));
            const response = await axios.get<IntegrantePersonalDetalle>(url);
            setDetalle(response.data);
            setDetalleForm(toDetalleForm(response.data));
            detalleModal.onOpen();
        } catch (error) {
            mostrarError(error, 'No fue posible cargar el detalle del integrante.');
        } finally {
            setLoadingDetalle(false);
        }
    };

    const guardarDetalle = async () => {
        if (!detalle || !validarDetalle()) return;
        setSavingDetalle(true);
        try {
            const url = endPoints.update_integrante_personal.replace('{id}', String(detalle.id));
            const response = await axios.put<IntegrantePersonalDetalle>(
                `${url}?usuarioResponsable=sistema`,
                buildPayload(detalleForm),
                { headers: { 'Content-Type': 'application/json' } }
            );
            setDetalle(response.data);
            setDetalleForm(toDetalleForm(response.data));
            toast({
                title: 'Integrante actualizado',
                status: 'success',
                duration: 3500,
                isClosable: true,
            });
            onBuscar(currentPage);
        } catch (error) {
            mostrarError(error, 'No fue posible actualizar el integrante.');
        } finally {
            setSavingDetalle(false);
        }
    };

    const handlePageChange = (page: number) => {
        onBuscar(page);
    };

    const updateForm = <K extends keyof DetalleForm>(key: K, value: DetalleForm[K]) => {
        setDetalleForm((prev) => ({ ...prev, [key]: value }));
    };

    const validarDetalle = () => {
        if (
            !detalleForm.nombres.trim() ||
            !detalleForm.apellidos.trim() ||
            !detalleForm.celular.trim() ||
            !detalleForm.direccion.trim() ||
            !detalleForm.fechaIngreso
        ) {
            toast({
                title: 'Campos obligatorios faltantes',
                description: 'Complete Nombres, Apellidos, Celular, Dirección y Fecha de ingreso.',
                status: 'warning',
                duration: 4500,
                isClosable: true,
            });
            return false;
        }

        const phoneRegex = /^\+?\d{7,}$/;
        if (!phoneRegex.test(detalleForm.celular.trim())) {
            toast({
                title: 'Celular inválido',
                status: 'error',
                duration: 4500,
                isClosable: true,
            });
            return false;
        }
        if (detalleForm.celularContactoEmergencia.trim()
            && !phoneRegex.test(detalleForm.celularContactoEmergencia.trim())) {
            toast({
                title: 'Celular de emergencia inválido',
                status: 'error',
                duration: 4500,
                isClosable: true,
            });
            return false;
        }
        if (detalleForm.numeroHijos.trim()) {
            const hijos = Number(detalleForm.numeroHijos);
            if (!Number.isInteger(hijos) || hijos < 0) {
                toast({
                    title: 'Número de hijos inválido',
                    status: 'error',
                    duration: 4500,
                    isClosable: true,
                });
                return false;
            }
        }
        if (detalleForm.salario.trim()) {
            const salario = Number(detalleForm.salario);
            if (Number.isNaN(salario) || salario < 0) {
                toast({
                    title: 'Salario inválido',
                    status: 'error',
                    duration: 4500,
                    isClosable: true,
                });
                return false;
            }
        }
        if (detalleForm.email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(detalleForm.email.trim())) {
                toast({
                    title: 'Correo electrónico inválido',
                    status: 'error',
                    duration: 4500,
                    isClosable: true,
                });
                return false;
            }
        }
        return true;
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

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            <Flex direction="column" p="1em" gap="2">
                <Flex direction="row" gap={2} align="center">
                    <Input
                        placeholder="Buscar por cédula, nombre o apellido"
                        value={searchText}
                        onValueChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onBuscar();
                        }}
                    />
                    <Button variant="solid" colorPalette="teal" onClick={() => onBuscar()}>
                        Buscar
                    </Button>
                </Flex>

                {loading || loadingDetalle ? (
                    <Spinner mt={4} />
                ) : (
                    <>
                        <ListaIntegrantes integrantes={lista} onVerDetalle={abrirDetalle} />
                        <MyPagination
                            page={currentPage}
                            totalPages={totalPages}
                            loading={loading}
                            handlePageChange={handlePageChange}
                        />
                    </>
                )}
            </Flex>

            <Dialog.Root open={detalleModal.open} size='xl' scrollBehavior="inside" onOpenChange={e => {
                if (!e.open) {
                    detalleModal.onClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>Detalle de integrante</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body>
                                <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4}>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Cédula</Field.Label>
                                            <Input value={detalleForm.id} readOnly />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Fecha de registro</Field.Label>
                                            <Input value={formatDateTime(detalleForm.fechaRegistro)} readOnly />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root required>
                                            <Field.Label>Nombres</Field.Label>
                                            <Input value={detalleForm.nombres} onValueChange={(e) => updateForm('nombres', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root required>
                                            <Field.Label>Apellidos</Field.Label>
                                            <Input value={detalleForm.apellidos} onValueChange={(e) => updateForm('apellidos', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root required>
                                            <Field.Label>Celular</Field.Label>
                                            <Input value={detalleForm.celular} onValueChange={(e) => updateForm('celular', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Correo electrónico</Field.Label>
                                            <Input value={detalleForm.email} onValueChange={(e) => updateForm('email', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem colSpan={[1, 2]}>
                                        <Field.Root required>
                                            <Field.Label>Dirección</Field.Label>
                                            <Input value={detalleForm.direccion} onValueChange={(e) => updateForm('direccion', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Contacto de emergencia</Field.Label>
                                            <Input
                                                value={detalleForm.nombreContactoEmergencia}
                                                onValueChange={(e) => updateForm('nombreContactoEmergencia', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Celular de emergencia</Field.Label>
                                            <Input
                                                value={detalleForm.celularContactoEmergencia}
                                                onValueChange={(e) => updateForm('celularContactoEmergencia', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Estado civil</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    placeholder="Seleccione estado civil"
                                                    value={detalleForm.estadoCivil}
                                                    onValueChange={(e) => updateForm('estadoCivil', e.target.value as EstadoCivil | '')}>
                                                    {Object.values(EstadoCivil).map((item) => (
                                                        <option key={item} value={item}>{getEstadoCivilText(item)}</option>
                                                    ))}
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Número de hijos</Field.Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={detalleForm.numeroHijos}
                                                onValueChange={(e) => updateForm('numeroHijos', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root required>
                                            <Field.Label>Fecha de ingreso</Field.Label>
                                            <Input
                                                type="date"
                                                value={detalleForm.fechaIngreso}
                                                onValueChange={(e) => updateForm('fechaIngreso', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Estado</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    value={detalleForm.estado}
                                                    onValueChange={(e) => updateForm('estado', e.target.value as EstadoIntegrante | '')}>
                                                    <option value={EstadoIntegrante.ACTIVO}>Activo</option>
                                                    <option value={EstadoIntegrante.INACTIVO}>Inactivo</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Cargo</Field.Label>
                                            <Input value={detalleForm.cargo} onValueChange={(e) => updateForm('cargo', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Departamento</Field.Label>
                                            <NativeSelect.Root>
                                                <NativeSelect.Field
                                                    placeholder="Seleccione departamento"
                                                    value={detalleForm.departamento}
                                                    onValueChange={(e) => updateForm('departamento', e.target.value as DepartamentoIntegrante | '')}>
                                                    <option value="PRODUCCION">Producción</option>
                                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                                </NativeSelect.Field>
                                                <NativeSelect.Indicator />
                                            </NativeSelect.Root>
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Salario (COP)</Field.Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={detalleForm.salario}
                                                onValueChange={(e) => updateForm('salario', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Número de cuenta</Field.Label>
                                            <Input
                                                value={detalleForm.numeroCuentaBancaria}
                                                onValueChange={(e) => updateForm('numeroCuentaBancaria', e.target.value)}
                                            />
                                        </Field.Root>
                                    </GridItem>
                                    <GridItem>
                                        <Field.Root>
                                            <Field.Label>Banco</Field.Label>
                                            <Input value={detalleForm.banco} onValueChange={(e) => updateForm('banco', e.target.value)} />
                                        </Field.Root>
                                    </GridItem>
                                </Grid>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Button variant="ghost" mr={3} onClick={detalleModal.onClose}>
                                    Cerrar
                                </Button>
                                <Button colorPalette="blue" onClick={guardarDetalle} loading={savingDetalle}>
                                    Guardar cambios
                                </Button>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Container>
    );
}

function toDetalleForm(detalle: IntegrantePersonalDetalle): DetalleForm {
    return {
        id: String(detalle.id),
        nombres: detalle.nombres ?? '',
        apellidos: detalle.apellidos ?? '',
        celular: detalle.celular ?? '',
        direccion: detalle.direccion ?? '',
        email: detalle.email ?? '',
        nombreContactoEmergencia: detalle.nombreContactoEmergencia ?? '',
        celularContactoEmergencia: detalle.celularContactoEmergencia ?? '',
        estadoCivil: detalle.estadoCivil ?? '',
        numeroHijos: detalle.numeroHijos != null ? String(detalle.numeroHijos) : '',
        fechaIngreso: detalle.fechaIngreso ?? '',
        numeroCuentaBancaria: detalle.numeroCuentaBancaria ?? '',
        banco: detalle.banco ?? '',
        cargo: detalle.cargo ?? '',
        departamento: detalle.departamento ?? '',
        centroDeCosto: detalle.centroDeCosto ?? '',
        centroDeProduccion: detalle.centroDeProduccion ?? '',
        salario: detalle.salario != null ? String(detalle.salario) : '',
        estado: detalle.estado ?? '',
        fechaRegistro: detalle.fechaRegistro ?? '',
    };
}

function buildPayload(form: DetalleForm): IntegrantePersonalRequest {
    return {
        id: Number(form.id),
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        celular: form.celular.trim(),
        direccion: form.direccion.trim(),
        email: form.email.trim() || undefined,
        nombreContactoEmergencia: form.nombreContactoEmergencia.trim() || undefined,
        celularContactoEmergencia: form.celularContactoEmergencia.trim() || undefined,
        estadoCivil: form.estadoCivil || undefined,
        numeroHijos: form.numeroHijos ? Number(form.numeroHijos) : undefined,
        fechaIngreso: form.fechaIngreso,
        numeroCuentaBancaria: form.numeroCuentaBancaria.trim() || undefined,
        banco: form.banco.trim() || undefined,
        cargo: form.cargo.trim() || undefined,
        departamento: form.departamento || undefined,
        centroDeCosto: form.centroDeCosto.trim() || undefined,
        centroDeProduccion: form.centroDeProduccion.trim() || undefined,
        salario: form.salario ? Number(form.salario) : undefined,
        estado: form.estado || undefined,
    };
}

function formatDateTime(value: string) {
    return value ? value.replace('T', ' ').slice(0, 16) : '';
}
