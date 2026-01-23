import {useState} from 'react';
import {
    Button, 
    Flex, 
    FormControl, 
    FormLabel, 
    Grid, 
    GridItem, 
    Input, 
    Select,
    useToast,
    Box,
    Container
} from '@chakra-ui/react';
import axios, { AxiosError } from 'axios';
import { EstadoIntegrante, IntegrantePersonal } from './types';
import EndPointsURL from "../../api/EndPointsURL.tsx";

export function IncorporarPersonal() {
    // Basic personal information
    const [id, setId] = useState('');
    const [nombres, setNombres] = useState('');
    const [apellidos, setApellidos] = useState('');
    const [celular, setCelular] = useState('');
    const [direccion, setDireccion] = useState('');
    const [email, setEmail] = useState('');

    // Work information
    const [cargo, setCargo] = useState('');
    const [departamento, setDepartamento] = useState<'PRODUCCION' | 'ADMINISTRATIVO' | ''>('');
    const [centroDeCosto, setCentroDeCosto] = useState('');
    const [centroDeProduccion, setCentroDeProduccion] = useState('');
    const [salario, setSalario] = useState('');

    const toast = useToast();

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
            !direccion.trim()
        ) {
            toast({
                title: 'Campos obligatorios faltantes',
                description: 'Complete Cédula, Nombres, Apellidos, Celular y Dirección.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
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
        const nuevo: IntegrantePersonal = {
            id: Number(id),
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            celular: celular.trim(),
            direccion: direccion.trim(),
            email: email.trim() || undefined,
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

            const creado: IntegrantePersonal = response.data;
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
        setCargo('');
        setDepartamento('');
        setCentroDeCosto('');
        setCentroDeProduccion('');
        setSalario('');
    }

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <Box mt={4}>
                <Flex direction={"column"} gap={6}>
                    {/* Personal Information Section */}
                    <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                        <GridItem colSpan={[1, 2]}>
                            <FormLabel fontSize="lg" fontWeight="bold">Información Personal</FormLabel>
                        </GridItem>

                        <GridItem>
                            <FormControl isRequired>
                                <FormLabel>Cédula</FormLabel>
                                <Input
                                    value={id}
                                    onChange={(e) => setId(e.target.value)}
                                    placeholder="Número de cédula"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl isRequired>
                                <FormLabel>Nombres</FormLabel>
                                <Input
                                    value={nombres}
                                    onChange={(e) => setNombres(e.target.value)}
                                    placeholder="Nombres"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl isRequired>
                                <FormLabel>Apellidos</FormLabel>
                                <Input
                                    value={apellidos}
                                    onChange={(e) => setApellidos(e.target.value)}
                                    placeholder="Apellidos"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl isRequired>
                                <FormLabel>Celular</FormLabel>
                                <Input
                                    value={celular}
                                    onChange={(e) => setCelular(e.target.value)}
                                    placeholder="Número de celular"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem colSpan={[1, 2]}>
                            <FormControl isRequired>
                                <FormLabel>Dirección</FormLabel>
                                <Input
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                    placeholder="Dirección de residencia"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl>
                                <FormLabel>Correo Electrónico</FormLabel>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Correo electrónico (opcional)"
                                />
                            </FormControl>
                        </GridItem>
                    </Grid>

                    {/* Work Information Section */}
                    <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                        <GridItem colSpan={[1, 2]}>
                            <FormLabel fontSize="lg" fontWeight="bold">Información Laboral</FormLabel>
                        </GridItem>

                        <GridItem>
                            <FormControl>
                                <FormLabel>Cargo</FormLabel>
                                <Input
                                    value={cargo}
                                    onChange={(e) => setCargo(e.target.value)}
                                    placeholder="Cargo (opcional)"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl>
                                <FormLabel>Departamento</FormLabel>
                                <Select
                                    placeholder="Seleccione departamento"
                                    value={departamento}
                                    onChange={(e) => setDepartamento(e.target.value as 'PRODUCCION' | 'ADMINISTRATIVO' | '')}
                                >
                                    <option value="PRODUCCION">Producción</option>
                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                </Select>
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl hidden>
                                <FormLabel>Centro de Costo</FormLabel>
                                <Input
                                    value={centroDeCosto}
                                    onChange={(e) => setCentroDeCosto(e.target.value)}
                                    placeholder="Centro de costo (opcional)"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem>
                            <FormControl hidden>
                                <FormLabel>Centro de Producción</FormLabel>
                                <Input
                                    value={centroDeProduccion}
                                    onChange={(e) => setCentroDeProduccion(e.target.value)}
                                    placeholder="Centro de producción (opcional)"
                                />
                            </FormControl>
                        </GridItem>

                        <GridItem hidden>
                            <FormControl>
                                <FormLabel>Salario (COP)</FormLabel>
                                <Input
                                    type="number"
                                    value={salario}
                                    onChange={(e) => setSalario(e.target.value)}
                                    placeholder="Salario en pesos colombianos (opcional)"
                                />
                            </FormControl>
                        </GridItem>

                    </Grid>

                    {/* Buttons Section */}
                    <Flex direction={"row"} gap={6} justifyContent="center" mt={4}>
                        <Button
                            variant={"solid"}
                            colorScheme={"blue"}
                            size="lg"
                            onClick={handleRegistrar}
                        >
                            Registrar Ingreso
                        </Button>
                        <Button
                            variant={"solid"}
                            colorScheme={"orange"}
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
