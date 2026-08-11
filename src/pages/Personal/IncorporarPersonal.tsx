import {useState} from 'react';
import {
    Steps,
    Button,
    Flex,
    Grid,
    GridItem,
    Input,
    NativeSelect,
    Box,
    Container,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios, { AxiosError } from 'axios';
import {
    DepartamentoIntegrante,
    EstadoCivil,
    EstadoIntegrante,
    getEstadoCivilText,
    IntegrantePersonalDetalle,
    IntegrantePersonalRequest,
} from './types';
import EndPointsURL from "../../api/EndPointsURL.tsx";

export function IncorporarPersonal() {
    // Basic personal information
    const [id, setId] = useState('');
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [celular, setCelular] = useState('');
    const [direccion, setDireccion] = useState('');
    const [email, setEmail] = useState('');
    const [nombreContactoEmergencia, setNombreContactoEmergencia] = useState('');
    const [celularContactoEmergencia, setCelularContactoEmergencia] = useState('');
    const [estadoCivil, setEstadoCivil] = useState<EstadoCivil | ''>('');
    const [numeroHijos, setNumeroHijos] = useState('');

    // Work information
    const [cargo, setCargo] = useState('');
    const [departamento, setDepartamento] = useState<DepartamentoIntegrante | ''>('');
    const [centroDeCosto, setCentroDeCosto] = useState('');
    const [centroDeProduccion, setCentroDeProduccion] = useState('');
    const [salario, setSalario] = useState('');
    const [fechaIngreso, setFechaIngreso] = useState('');
    const [numeroCuentaBancaria, setNumeroCuentaBancaria] = useState('');
    const [banco, setBanco] = useState('');

    const toast = useAppToast();

    /**
     * retorna true si todos los datos en el formulario son validos.
     * false en caso contrario
     */
    const datosValidos = () : boolean => {
        // Check required fields
        if (
            !id.trim() ||
            !nombres.trim() ||
            !apellidos.trim() ||
            !celular.trim() ||
            !direccion.trim() ||
            !fechaIngreso
        ) {
            toast({
                title: 'Campos obligatorios faltantes',
                description: 'Complete Cédula, Nombres, Apellidos, Celular, Dirección y Fecha de ingreso.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }

        if (numeroHijos.trim()) {
            const hijos = Number(numeroHijos);
            if (!Number.isInteger(hijos) || hijos < 0) {
                toast({
                    title: 'Número de hijos inválido',
                    description: 'El número de hijos debe ser un entero mayor o igual a cero.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
        }

        // Validate ID (cédula): only digits
        const idRegex = /^\d+$/;
        if (!idRegex.test(id.trim())) {
            toast({
                title: 'Cédula inválida',
                description: 'La cédula debe contener solo números.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }

        // Validate phone number
        const phoneRegex = /^\+?\d{7,}$/;
        if (!phoneRegex.test(celular.trim())) {
            toast({
                title: 'Celular inválido',
                description: 'El celular debe ser válido (mínimo 7 dígitos, opcionalmente con +).',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }

        if (celularContactoEmergencia.trim() && !phoneRegex.test(celularContactoEmergencia.trim())) {
            toast({
                title: 'Celular de emergencia inválido',
                description: 'El celular de emergencia debe ser válido (mínimo 7 dígitos, opcionalmente con +).',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }

        // Validate email if provided
        if (email.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                toast({
                    title: 'Correo electrónico inválido',
                    description: 'El correo electrónico no tiene un formato válido.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
        }

        // Validate salary if provided
        if (salario.trim()) {
            const salarioNum = Number(salario);
            if (isNaN(salarioNum) || salarioNum <= 0) {
                toast({
                    title: 'Salario inválido',
                    description: 'El salario debe ser un número positivo.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
        }

        return true;
    };

    /**
     * registra el ingreso de un integrante al personal de la planta
     */
    const registrarIngreso = async (): Promise<void> => {
        const endpoints = new EndPointsURL();

        // Construir el payload
        const nuevo: IntegrantePersonalRequest = {
            id: Number(id),
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            celular: celular.trim(),
            direccion: direccion.trim(),
            email: email.trim() || undefined,
            nombreContactoEmergencia: nombreContactoEmergencia.trim() || undefined,
            celularContactoEmergencia: celularContactoEmergencia.trim() || undefined,
            estadoCivil: estadoCivil || undefined,
            numeroHijos: numeroHijos ? Number(numeroHijos) : undefined,
            fechaIngreso,
            numeroCuentaBancaria: numeroCuentaBancaria.trim() || undefined,
            banco: banco.trim() || undefined,
            cargo: cargo.trim() || undefined,
            departamento: departamento || undefined,
            centroDeCosto: centroDeCosto.trim() || undefined,
            centroDeProduccion: centroDeProduccion.trim() || undefined,
            salario: salario ? Number(salario) : undefined,
            estado: EstadoIntegrante.ACTIVO,
            //
            // documentos: [],
            // idIntegrante en este caso null (sin jefe directo)
        };

        try {
            const url = `${endpoints.save_integrante_personal}?usuarioResponsable=sistema`;
            const response = await axios.post(url, nuevo, {
                headers: { 'Content-Type': 'application/json' }
            });

            const creado: IntegrantePersonalDetalle = response.data;
            toast({
                title: 'Registro exitoso',
                description: `Integrante ${creado.nombres} ${creado.apellidos} registrado con ID ${creado.id}.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
            // limpiar formulario
            handleClear();
        } catch (error) {
            const err = error as AxiosError;
            console.error(error);

            if (err.response && err.response.status === 400) {
                toast({
                    title: 'Datos inválidos',
                    description: 'Revisa los campos obligatorios y formatos.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'Error al registrar',
                    description: 'Ocurrió un problema al conectar con el servidor.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    }

    const handleRegistrar = () => {
        if (datosValidos()) {
            registrarIngreso();
        }
    }

    const handleClear = () => {
        // clear all fields
        setId('');
        setNombres('');
        setApellidos('');
        setCelular('');
        setDireccion('');
        setEmail('');
        setNombreContactoEmergencia('');
        setCelularContactoEmergencia('');
        setEstadoCivil('');
        setNumeroHijos('');
        setCargo('');
        setDepartamento('');
        setCentroDeCosto('');
        setCentroDeProduccion('');
        setSalario('');
        setFechaIngreso('');
        setNumeroCuentaBancaria('');
        setBanco('');
    }

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <Box mt={4}>
                <Flex direction={"column"} gap={6}>
                    {/* Personal Information Section */}
                    <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                        <GridItem colSpan={[1, 2]}>
                            <Field.Label fontSize="lg" fontWeight="bold">Información Personal</Field.Label>
                        </GridItem>

                        <GridItem>
                            <Field.Root required>
                                <Field.Label>Cédula</Field.Label>
                                <Input
                                    value={id}
                                    onValueChange={(e) => setId(e.target.value)}
                                    placeholder="Número de cédula"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root required>
                                <Field.Label>Nombres</Field.Label>
                                <Input
                                    value={nombres}
                                    onValueChange={(e) => setNombres(e.target.value)}
                                    placeholder="Nombres"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root required>
                                <Field.Label>Apellidos</Field.Label>
                                <Input
                                    value={apellidos}
                                    onValueChange={(e) => setApellidos(e.target.value)}
                                    placeholder="Apellidos"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root required>
                                <Field.Label>Celular</Field.Label>
                                <Input
                                    value={celular}
                                    onValueChange={(e) => setCelular(e.target.value)}
                                    placeholder="Número de celular"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem colSpan={[1, 2]}>
                            <Field.Root required>
                                <Field.Label>Dirección</Field.Label>
                                <Input
                                    value={direccion}
                                    onValueChange={(e) => setDireccion(e.target.value)}
                                    placeholder="Dirección de residencia"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Correo Electrónico</Field.Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onValueChange={(e) => setEmail(e.target.value)}
                                    placeholder="Correo electrónico (opcional)"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Contacto de emergencia</Field.Label>
                                <Input
                                    value={nombreContactoEmergencia}
                                    onValueChange={(e) => setNombreContactoEmergencia(e.target.value)}
                                    placeholder="Nombre del contacto"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Celular de emergencia</Field.Label>
                                <Input
                                    value={celularContactoEmergencia}
                                    onValueChange={(e) => setCelularContactoEmergencia(e.target.value)}
                                    placeholder="Celular del contacto"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Estado civil</Field.Label>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        placeholder="Seleccione estado civil"
                                        value={estadoCivil}
                                        onValueChange={(e) => setEstadoCivil(e.target.value as EstadoCivil | '')}>
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
                                    value={numeroHijos}
                                    onValueChange={(e) => setNumeroHijos(e.target.value)}
                                    placeholder="Sin informar"
                                />
                            </Field.Root>
                        </GridItem>
                    </Grid>

                    {/* Work Information Section */}
                    <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                        <GridItem colSpan={[1, 2]}>
                            <Field.Label fontSize="lg" fontWeight="bold">Información Laboral</Field.Label>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Cargo</Field.Label>
                                <Input
                                    value={cargo}
                                    onValueChange={(e) => setCargo(e.target.value)}
                                    placeholder="Cargo (opcional)"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Departamento</Field.Label>
                                <NativeSelect.Root>
                                    <NativeSelect.Field
                                        placeholder="Seleccione departamento"
                                        value={departamento}
                                        onValueChange={(e) => setDepartamento(e.target.value as DepartamentoIntegrante | '')}>
                                        <option value="PRODUCCION">Producción</option>
                                        <option value="ADMINISTRATIVO">Administrativo</option>
                                    </NativeSelect.Field>
                                    <NativeSelect.Indicator />
                                </NativeSelect.Root>
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root required>
                                <Field.Label>Fecha de ingreso</Field.Label>
                                <Input
                                    type="date"
                                    value={fechaIngreso}
                                    onValueChange={(e) => setFechaIngreso(e.target.value)}
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root hidden>
                                <Field.Label>Centro de Costo</Field.Label>
                                <Input
                                    value={centroDeCosto}
                                    onValueChange={(e) => setCentroDeCosto(e.target.value)}
                                    placeholder="Centro de costo (opcional)"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root hidden>
                                <Field.Label>Centro de Producción</Field.Label>
                                <Input
                                    value={centroDeProduccion}
                                    onValueChange={(e) => setCentroDeProduccion(e.target.value)}
                                    placeholder="Centro de producción (opcional)"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem hidden>
                            <Field.Root>
                                <Field.Label>Salario (COP)</Field.Label>
                                <Input
                                    type="number"
                                    value={salario}
                                    onValueChange={(e) => setSalario(e.target.value)}
                                    placeholder="Salario en pesos colombianos (opcional)"
                                />
                            </Field.Root>
                        </GridItem>

                    </Grid>

                    <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                        <GridItem colSpan={[1, 2]}>
                            <Field.Label fontSize="lg" fontWeight="bold">Información Bancaria</Field.Label>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Número de cuenta</Field.Label>
                                <Input
                                    value={numeroCuentaBancaria}
                                    onValueChange={(e) => setNumeroCuentaBancaria(e.target.value)}
                                    placeholder="Número de cuenta bancaria"
                                />
                            </Field.Root>
                        </GridItem>

                        <GridItem>
                            <Field.Root>
                                <Field.Label>Banco</Field.Label>
                                <Input
                                    value={banco}
                                    onValueChange={(e) => setBanco(e.target.value)}
                                    placeholder="Entidad bancaria"
                                />
                            </Field.Root>
                        </GridItem>
                    </Grid>

                    {/* Buttons Section */}
                    <Flex direction={"row"} gap={6} justifyContent="center" mt={4}>
                        <Button
                            variant={"solid"}
                            colorPalette={"blue"}
                            size="lg"
                            onClick={handleRegistrar}
                        >
                            Registrar Ingreso
                        </Button>
                        <Button
                            variant={"solid"}
                            colorPalette={"orange"}
                            size="lg"
                            onClick={handleClear}
                        >
                            Limpiar Formulario
                        </Button>
                    </Flex>
                </Flex>
            </Box>
        </Container>
    );
}
