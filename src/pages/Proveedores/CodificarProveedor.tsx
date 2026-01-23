import React, { useState, useRef, useEffect } from 'react';
import {
    Container,
    FormControl,
    FormLabel,
    Input,
    Button,
    Textarea,
    useToast,
    Select,
    Box,
    Grid,
    GridItem,
    Icon,
    VStack,
    Checkbox,
    CheckboxGroup,
} from "@chakra-ui/react";
import axios, { AxiosError } from 'axios';
import EndPointsURL from "../../api/EndPointsURL.tsx";
import { Proveedor, Contacto } from './types';
import { departamentosColombia } from "../../data/colombiaData.tsx";

import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";

const endPoints = new EndPointsURL();

const TIPOS_ID = {cc:0, nit:1};

function CodificarProveedor() {
    // Basic proveedor fields
    const [id, setId] = useState('');
    const [tipoIdentificacion, setTipoIdentificacion] = useState(TIPOS_ID.nit);
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [regimenTributario, setRegimenTributario] = useState(0);
    const [ciudad, setCiudad] = useState('');
    const [departamento, setDepartamento] = useState('');
    const [ciudadesDisponibles, setCiudadesDisponibles] = useState<{nombre: string, codigo: string}[]>([]);
    const [otraCiudad, setOtraCiudad] = useState('');
    const [mostrarInputOtraCiudad, setMostrarInputOtraCiudad] = useState(false);
    const [url, setUrl] = useState('');
    const [observacion, setObservacion] = useState('');
    // New state for condición de pago (e.g., "credito" or "contado")
    const [condicionPago, setCondicionPago] = useState('0');

    // Categories state (as integer array); default no category selected.
    const [categorias, setCategorias] = useState<number[]>([]);

    // Contactos state: one contact by default
    const [contactos, setContactos] = useState<Contacto[]>([
        { fullName: '', cargo: '', cel: '', email: '' }
    ]);

    // File state for optional uploads
    const [rutFile, setRutFile] = useState<File | null>(null);
    const [camaraFile, setCamaraFile] = useState<File | null>(null);

    // Refs for hidden file inputs
    const rutInputRef = useRef<HTMLInputElement>(null);
    const camaraInputRef = useRef<HTMLInputElement>(null);

    const toast = useToast();

    // Validation function: returns true only if all data is valid.
    const datosProveedorValidos = (): boolean => {
        // Check basic required fields
        if (
            !id.trim() ||
            !nombre.trim() ||
            !direccion.trim() ||
            !departamento.trim() ||
            (mostrarInputOtraCiudad ? !otraCiudad.trim() : !ciudad.trim())
        ) {
            toast({
                title: 'Campos obligatorios faltantes',
                description:
                    'Complete NIT, Nombre, Dirección, Ciudad y Departamento.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
        // Validate NIT: only digits with an optional single dash.
        const nitRegex = /^\d+(-\d+)?$/;
        if (!nitRegex.test(id.trim())) {
            toast({
                title: 'NIT inválido',
                description:
                    'El NIT debe contener solo números y, opcionalmente, un guion.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
        // Ensure at least one category is selected.
        if (categorias.length === 0) {
            toast({
                title: 'Categoría requerida',
                description: 'Seleccione al menos una categoría.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
        // Ensure a condición de pago is selected.
        if (!condicionPago.trim()) {
            toast({
                title: 'Condición de pago requerida',
                description: 'Seleccione una condición de pago.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
        // Validate contactos: must have at least one and all fields filled
        if (contactos.length === 0) {
            toast({
                title: 'Contacto requerido',
                description: 'Agregue al menos un contacto.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return false;
        }
        const phoneRegex = /^\+?\d{7,}$/; // simple phone validation: optional + and at least 7 digits
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const contacto of contactos) {
            if (
                !contacto.fullName.trim() ||
                !contacto.cargo.trim() ||
                !contacto.cel.trim() ||
                !contacto.email.trim()
            ) {
                toast({
                    title: 'Campos de contacto vacíos',
                    description: 'Complete todos los campos de cada contacto.',
                    status: 'warning',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
            if (!phoneRegex.test(contacto.cel.trim())) {
                toast({
                    title: 'Teléfono inválido',
                    description:
                        'El teléfono del contacto debe ser válido (mínimo 7 dígitos, opcionalmente con +).',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
            if (!emailRegex.test(contacto.email.trim())) {
                toast({
                    title: 'Correo electrónico inválido',
                    description: 'El correo electrónico del contacto no tiene un formato válido.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
                return false;
            }
        }
        return true;
    };

    // Function to handle department selection change
    const handleDepartamentoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deptoSeleccionado = e.target.value;
        setDepartamento(deptoSeleccionado);

        // Clear the selected city
        setCiudad('');
        setOtraCiudad('');
        setMostrarInputOtraCiudad(false);

        // Update the list of available cities
        const depto = departamentosColombia.find(d => d.nombre === deptoSeleccionado);
        if (depto) {
            setCiudadesDisponibles(depto.ciudades);
        } else {
            setCiudadesDisponibles([]);
        }
    };

    // Function to handle city selection change
    const handleCiudadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const ciudadSeleccionada = e.target.value;

        if (ciudadSeleccionada === "otro") {
            setMostrarInputOtraCiudad(true);
            setCiudad('');
        } else {
            setMostrarInputOtraCiudad(false);
            setCiudad(ciudadSeleccionada);
        }
    };

    // Function to handle "Other city" input change
    const handleOtraCiudadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOtraCiudad(e.target.value);
        setCiudad(e.target.value); // Update the main city value as well
    };

    // Handle changes in a contacto field
    const handleContactoChange = (
        index: number,
        field: keyof Contacto,
        value: string
    ) => {
        const updatedContactos = [...contactos];
        updatedContactos[index][field] = value;
        setContactos(updatedContactos);
    };

    // Add a new empty contacto (limit to 3)
    const addContacto = () => {
        if (contactos.length < 3) {
            setContactos([...contactos, { fullName: '', cargo: '', cel: '', email: '' }]);
        } else {
            toast({
                title: 'Límite alcanzado',
                description: 'No se pueden agregar más de 3 contactos.',
                status: 'info',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    // Handle file selection for RUT
    const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                toast({
                    title: "Tipo de archivo no permitido",
                    description: "Solo se permiten archivos PDF para el RUT.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                e.target.value = "";
                return;
            }
            setRutFile(file);
        }
    };

    // Handle file selection for Cámara y Comercio
    const handleCamaraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                toast({
                    title: "Tipo de archivo no permitido",
                    description: "Solo se permiten archivos PDF para Cámara y Comercio.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                e.target.value = "";
                return;
            }
            setCamaraFile(file);
        }
    };

    // Submit handler using axios and async/await
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!datosProveedorValidos()) {
            return;
        }

        // Build the Proveedor object (without file objects)
        const nuevoProveedor: Proveedor = {
            id,
            tipoIdentificacion,
            nombre,
            direccion,
            regimenTributario,
            ciudad,
            departamento,
            contactos,
            url,
            observacion,
            categorias,
            condicionPago,
            // Files will be sent via FormData
        };

        // Create FormData and append the JSON data as a Blob
        const formData = new FormData();
        formData.append(
            "proveedor",
            new Blob([JSON.stringify(nuevoProveedor)], { type: "application/json" })
        );
        if (rutFile) {
            formData.append("rutFile", rutFile);
        }
        if (camaraFile) {
            formData.append("camaraFile", camaraFile);
        }

        try {
            const response = await axios.post(endPoints.save_proveedores, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
//             console.log('Proveedor registrado exitosamente:', response.data);

            toast({
                title: 'Proveedor registrado',
                description: `El proveedor con NIT ${response.data.id} ha sido registrado exitosamente.`,
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Reset the form fields
            setId('');
            setNombre('');
            setDireccion('');
            setRegimenTributario(0);
            setCiudad('');
            setDepartamento('');
            setCiudadesDisponibles([]);
            setOtraCiudad('');
            setMostrarInputOtraCiudad(false);
            setUrl('');
            setObservacion('');
            setCategorias([]);
            setCondicionPago('');
            setContactos([{ fullName: '', cargo: '', cel: '', email: '' }]);
            setRutFile(null);
            setCamaraFile(null);
        } catch (error) {
            const err = error as AxiosError;
            console.error('Error al registrar el proveedor:', error);
            if (err.response && err.response.status === 409) {
                toast({
                    title: 'Error al registrar',
                    description: 'Ya existe un proveedor con el NIT proporcionado.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: 'Error al conectar con el servidor',
                    description: 'Por favor, intente nuevamente más tarde.',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    };


    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <Box as="form" onSubmit={handleSubmit} mt={4}>
                {/* Basic Data Grid with additional fields and categories */}
                <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} p="1em" boxShadow="base">
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Identificacion</FormLabel>
                            <Input
                                value={id}
                                onChange={(e) => setId(e.target.value)}
                                placeholder="Nit o identificación del proveedor"
                            />
                        </FormControl>
                    </GridItem>
                    <FormControl>
                        <FormLabel>Tipo Identificacion</FormLabel>
                        <Select
                            value={tipoIdentificacion}
                            onChange={(e) => setTipoIdentificacion(Number(e.target.value))}
                        >
                            <option value={TIPOS_ID.cc}>Cedula de ciudadania</option>
                            <option value={TIPOS_ID.nit}>Nit</option>
                        </Select>
                    </FormControl>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Nombre</FormLabel>
                            <Input
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Nombre del proveedor"
                            />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <FormControl isRequired>
                            <FormLabel>Dirección</FormLabel>
                            <Input
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                placeholder="Dirección del proveedor"
                            />
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Departamento</FormLabel>
                            <Select
                                placeholder="Seleccione un departamento"
                                value={departamento}
                                onChange={handleDepartamentoChange}
                            >
                                {departamentosColombia.map((depto) => (
                                    <option key={depto.codigo} value={depto.nombre}>
                                        {depto.nombre}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Ciudad</FormLabel>
                            <Select
                                placeholder="Seleccione una ciudad"
                                value={ciudad}
                                onChange={handleCiudadChange}
                                isDisabled={!departamento} // Disable if no department is selected
                            >
                                {ciudadesDisponibles.map((ciudad) => (
                                    <option key={ciudad.codigo} value={ciudad.nombre}>
                                        {ciudad.nombre}
                                    </option>
                                ))}
                                <option value="otro">Otro</option>
                            </Select>

                            {/* Additional input for "Other city" */}
                            {mostrarInputOtraCiudad && (
                                <Input
                                    mt={2}
                                    value={otraCiudad}
                                    onChange={handleOtraCiudadChange}
                                    placeholder="Ingrese el nombre de la ciudad"
                                />
                            )}
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl>
                            <FormLabel>URL</FormLabel>
                            <Input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Página web (opcional)"
                            />
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <FormControl >
                            <FormLabel>Categorías</FormLabel>
                            <CheckboxGroup
                                colorScheme="green"
                                value={categorias.map(String)}
                                onChange={
                                    (vals: string[]) => {
                                        setCategorias(vals.map(Number));
                                        // only for debuging:
                                        //console.log('Selected categories (as strings):', vals);
                                        //const numericValues = vals.map(Number);
                                        //console.log('Converted to numbers:', numericValues);
                                        //setCategorias(numericValues);
                                    }
                                }
                            >
                                <VStack align="start">
                                    <Checkbox value="0">Servicios Operativos</Checkbox>
                                    <Checkbox value="1">Materias Primas</Checkbox>
                                    <Checkbox value="2">Materiales de empaque</Checkbox>
                                    <Checkbox value="3">Servicios administrativos</Checkbox>
                                    <Checkbox value="4">Equipos y otros servicios</Checkbox>
                                </VStack>
                            </CheckboxGroup>
                        </FormControl>
                    </GridItem>
                </Grid>

                {/* Contactos Grid */}
                <Box mt={6}>
                    <FormLabel>Contactos</FormLabel>
                    <Grid templateColumns={['1fr', 'repeat(3, 1fr)']} gap={4}>
                        {contactos.map((contacto, index) => (
                            <GridItem key={index} borderWidth="1px" borderRadius="md" p={4}>
                                <FormControl>
                                    <FormLabel>Nombre Completo</FormLabel>
                                    <Input
                                        value={contacto.fullName}
                                        onChange={(e) =>
                                            handleContactoChange(index, 'fullName', e.target.value)
                                        }
                                        placeholder="Nombre Completo"
                                    />
                                </FormControl>
                                <FormControl mt={2}>
                                    <FormLabel>Cargo</FormLabel>
                                    <Input
                                        value={contacto.cargo}
                                        onChange={(e) =>
                                            handleContactoChange(index, 'cargo', e.target.value)
                                        }
                                        placeholder="Cargo"
                                    />
                                </FormControl>
                                <FormControl mt={2}>
                                    <FormLabel>Celular</FormLabel>
                                    <Input
                                        value={contacto.cel}
                                        onChange={(e) =>
                                            handleContactoChange(index, 'cel', e.target.value)
                                        }
                                        placeholder="Celular"
                                    />
                                </FormControl>
                                <FormControl mt={2}>
                                    <FormLabel>Correo Electrónico</FormLabel>
                                    <Input
                                        value={contacto.email}
                                        onChange={(e) =>
                                            handleContactoChange(index, 'email', e.target.value)
                                        }
                                        placeholder="Correo Electrónico"
                                    />
                                </FormControl>
                                <Button
                                    mt={"1em"}
                                    variant={"ghost"}
                                    colorScheme="red"
                                    isDisabled={ !(
                                        !contacto.fullName.trim() &&
                                        !contacto.cel.trim() &&
                                        !contacto.cargo.trim() &&
                                        !contacto.email.trim()
                                    )}
                                    onClick={ () => {
                                        // Remove the contact at the current index
                                        const updatedContactos = contactos.filter((_, i) => i !== index);
                                        setContactos(updatedContactos);
                                    }}
                                > Remover </Button>
                            </GridItem>
                        ))}
                    </Grid>
                    <Button mt={4} onClick={addContacto} disabled={contactos.length >= 3}>
                        Agregar Contacto
                    </Button>
                </Box>

                {/* Remaining Proveedor Data Grid */}
                <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} mt={6} p="1em" boxShadow="base">
                    <GridItem>
                        <FormControl>
                            <FormLabel>Regimen Tributario</FormLabel>
                            <Select
                                value={regimenTributario}
                                onChange={(e) => setRegimenTributario(Number(e.target.value))}
                            >
                                <option value={0}>Regimen Comun</option>
                                <option value={1}>Regimen Simplificado</option>
                                <option value={2}>Regimen Especial</option>
                            </Select>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isRequired>
                            <FormLabel>Condición de Pago</FormLabel>
                            <Select
                                placeholder="Seleccione..."
                                value={condicionPago}
                                onChange={(e) => setCondicionPago(e.target.value)}
                            >
                                <option value="credito">Crédito</option>
                                <option value="contado">Contado</option>
                            </Select>
                        </FormControl>
                    </GridItem>
                    <GridItem colSpan={[1, 2]}>
                        <FormControl>
                            <FormLabel>Observaciones</FormLabel>
                            <Textarea
                                value={observacion}
                                onChange={(e) => setObservacion(e.target.value)}
                                placeholder="Notas adicionales"
                            />
                        </FormControl>
                    </GridItem>
                </Grid>

                {/* New Grid for File Uploads */}
                <Grid templateColumns={['1fr', 'repeat(2, 1fr)']} gap={4} mt={6} p="1em" boxShadow="base">
                    <GridItem>
                        <FormControl>
                            <VStack spacing={4} align="stretch" alignItems="center">
                                <FormLabel>RUT</FormLabel>
                                <Icon
                                    as={rutFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                    boxSize="4em"
                                    color={rutFile ? "green" : "orange.500"}
                                />
                                <Button onClick={() => rutInputRef.current?.click()}>Examinar</Button>
                                <Input
                                    type="file"
                                    ref={rutInputRef}
                                    style={{ display: 'none' }}
                                    accept="application/pdf"
                                    onChange={handleRutChange}
                                />
                            </VStack>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl>
                            <VStack spacing={4} align="stretch" alignItems="center">
                                <FormLabel>Cámara y Comercio</FormLabel>
                                <Icon
                                    as={camaraFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                    boxSize="4em"
                                    color={camaraFile ? "green" : "orange.500"}
                                />
                                <Button onClick={() => camaraInputRef.current?.click()}>Examinar</Button>
                                <Input
                                    type="file"
                                    ref={camaraInputRef}
                                    style={{ display: 'none' }}
                                    accept="application/pdf"
                                    onChange={handleCamaraChange}
                                />
                            </VStack>
                        </FormControl>
                    </GridItem>
                </Grid>

                <Button type="submit" colorScheme="blue" mt={6}>
                    Registrar Proveedor
                </Button>
            </Box>
        </Container>
    );
}

export default CodificarProveedor;
