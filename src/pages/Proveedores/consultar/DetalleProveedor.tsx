import {
    Flex, Box, Heading, Text, Button, VStack, HStack, 
    Grid, GridItem, Card, CardHeader, CardBody, 
    FormControl, FormLabel, Select, Input, Icon,
    useToast
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { Proveedor, Contacto } from "../types.tsx";
import { ArrowBackIcon, EditIcon } from '@chakra-ui/icons';
import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";
import axios from 'axios';
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { useAuth } from '../../../context/AuthContext';
import {Authority} from "../../../api/global_types.tsx";

type Props = {
    proveedor: Proveedor;
    setEstado: (estado: number) => void;
    setProveedorSeleccionado?: (proveedor: Proveedor) => void;
    refreshSearch?: () => void;
};

/**
 * Componente que muestra la información detallada de un proveedor dado.
 * Permite edición de ciertos campos si el usuario tiene nivel de acceso 3.
 */
export function DetalleProveedor({proveedor, setEstado, setProveedorSeleccionado, refreshSearch}: Props) {
    const [editMode, setEditMode] = useState(false);
    const [proveedorData, setProveedorData] = useState<Proveedor>({...proveedor});
    const [proveedoresAccessLevel, setProveedoresAccessLevel] = useState<number>(0);
    const [rutFile, setRutFile] = useState<File | null>(null);
    const [camaraFile, setCamaraFile] = useState<File | null>(null);
    const [isFormValid, setIsFormValid] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const rutInputRef = useRef<HTMLInputElement>(null);
    const camaraInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();
    const endPoints = new EndPointsURL();
    const { user } = useAuth();

    // Obtener el nivel de acceso del usuario para el módulo PROVEEDORES
    useEffect(() => {
        const fetchUserAccessLevel = async () => {
            try {
                const response = await axios.get(endPoints.whoami);
                const authorities = response.data.authorities;

                const proveedoresAuthority = authorities.find(
                    (auth:Authority) => auth.authority === "ACCESO_PROVEEDORES"
                );

                if (proveedoresAuthority) {
                    setProveedoresAccessLevel(parseInt(proveedoresAuthority.nivel));
                }
            } catch (error) {
                console.error("Error al obtener el nivel de acceso:", error);
            }
        };

        fetchUserAccessLevel();
    }, []);

    // Inicializar un contacto vacío si el proveedor no tiene contactos
    useEffect(() => {
        // Si el proveedor no tiene contactos o contactos es undefined, inicializar con un contacto vacío
        if (!proveedor.contactos || proveedor.contactos.length === 0) {
            setProveedorData({
                ...proveedor,
                contactos: [{ fullName: '', cargo: '', cel: '', email: '' }]
            });
        }
    }, [proveedor]);

    const handleBack = () => {
        setEstado(0);
        // Si existe una función para refrescar la búsqueda, llamarla
        if (typeof refreshSearch === 'function') {
            refreshSearch();
        }
    };

    // Manejar cambios en los campos editables
    const handleInputChange = (field: keyof Proveedor, value: any) => {
        setProveedorData({
            ...proveedorData,
            [field]: value
        });
    };

    // Manejar cambios en los contactos
    const handleContactChange = (index: number, field: keyof Contacto, value: string) => {
        const updatedContactos = [...proveedorData.contactos];
        updatedContactos[index] = {
            ...updatedContactos[index],
            [field]: value
        };

        setProveedorData({
            ...proveedorData,
            contactos: updatedContactos
        });
    };

    // Agregar un nuevo contacto (hasta un máximo de 3)
    const addContacto = () => {
        if (proveedorData.contactos.length < 3) {
            const updatedContactos = [...proveedorData.contactos];
            updatedContactos.push({ fullName: '', cargo: '', cel: '', email: '' });

            setProveedorData({
                ...proveedorData,
                contactos: updatedContactos
            });
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

    // Eliminar un contacto (siempre debe quedar al menos uno)
    const removeContacto = (index: number) => {
        if (proveedorData.contactos.length <= 1) {
            toast({
                title: 'No se puede eliminar',
                description: 'Debe haber al menos un contacto.',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const updatedContactos = proveedorData.contactos.filter((_, i) => i !== index);

        setProveedorData({
            ...proveedorData,
            contactos: updatedContactos
        });
    };

    // Manejar selección de archivo RUT
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

    // Manejar selección de archivo Cámara y Comercio
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

    // Validar datos antes de guardar
    const validateData = (showToast: boolean = true): boolean => {
        // Validar régimen tributario
        if (proveedorData.regimenTributario < 0 || proveedorData.regimenTributario > 3) {
            if (showToast) {
                toast({
                    title: "Validación fallida",
                    description: "El régimen tributario seleccionado no es válido.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return false;
        }

        // Validar condición de pago
        if (!proveedorData.condicionPago || proveedorData.condicionPago.trim() === '') {
            if (showToast) {
                toast({
                    title: "Validación fallida",
                    description: "La condición de pago es requerida.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
            return false;
        }

        // Validar contactos
        const phoneRegex = /^\+?\d{7,}$/;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (const contacto of proveedorData.contactos) {
            if (
                !contacto.fullName?.trim() ||
                !contacto.cargo?.trim() ||
                !contacto.cel?.trim() ||
                !contacto.email?.trim()
            ) {
                if (showToast) {
                    toast({
                        title: 'Campos de contacto vacíos',
                        description: 'Complete todos los campos de cada contacto.',
                        status: 'warning',
                        duration: 5000,
                        isClosable: true,
                    });
                }
                return false;
            }

            if (!contacto.cel?.trim() || !phoneRegex.test(contacto.cel.trim())) {
                if (showToast) {
                    toast({
                        title: 'Teléfono inválido',
                        description: 'El teléfono del contacto debe ser válido (mínimo 7 dígitos, opcionalmente con +).',
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                }
                return false;
            }

            if (!contacto.email?.trim() || !emailRegex.test(contacto.email.trim())) {
                if (showToast) {
                    toast({
                        title: 'Correo electrónico inválido',
                        description: 'El correo electrónico del contacto no tiene un formato válido.',
                        status: 'error',
                        duration: 5000,
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
        if (proveedorData.regimenTributario !== proveedor.regimenTributario ||
            proveedorData.condicionPago !== proveedor.condicionPago) {
            return true;
        }

        // Verificar cambios en contactos
        if (proveedorData.contactos.length !== (proveedor.contactos?.length || 0)) {
            return true;
        }

        for (let i = 0; i < proveedorData.contactos.length; i++) {
            const currentContact = proveedorData.contactos[i];
            const originalContact = proveedor.contactos?.[i] || { fullName: '', cargo: '', cel: '', email: '' };

            if (currentContact.fullName !== originalContact.fullName ||
                currentContact.cargo !== originalContact.cargo ||
                currentContact.cel !== originalContact.cel ||
                currentContact.email !== originalContact.email) {
                return true;
            }
        }

        // Verificar si se han seleccionado archivos
        if (rutFile || camaraFile) {
            return true;
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
    }, [proveedorData, editMode, rutFile, camaraFile]);

    // Guardar cambios
    const handleSaveChanges = async () => {
        if (!validateData()) {
            return;
        }

        try {
            // Crear FormData para enviar archivos
            const formData = new FormData();
            formData.append(
                "proveedor",
                new Blob([JSON.stringify(proveedorData)], { type: "application/json" })
            );

            if (rutFile) {
                formData.append("rutFile", rutFile);
            }

            if (camaraFile) {
                formData.append("camaraFile", camaraFile);
            }

            // Llamada al endpoint de actualización
            const url = endPoints.update_proveedores.replace('{id}', proveedorData.id);
            const response = await axios.put(url, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // Mostrar mensaje de éxito
            toast({
                title: 'Proveedor actualizado',
                description: 'Los datos del proveedor han sido actualizados exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            // Salir del modo edición
            setEditMode(false);

            // Actualizar el proveedor en la vista local con los datos completos del servidor
            setProveedorData(response.data);

            // Actualizar también el proveedor seleccionado para mantener la consistencia
            // cuando se regrese a la vista de lista
            if (typeof setProveedorSeleccionado === 'function') {
                setProveedorSeleccionado(response.data);
            }
        } catch (error) {
            console.error('Error al actualizar el proveedor:', error);
            toast({
                title: 'Error al actualizar',
                description: 'No se pudo actualizar la información del proveedor.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Map category IDs to names
    const categoryNames = [
        'Servicios Operativos',
        'Materias Primas',
        'Materiales de empaque',
        'Servicios administrativos',
        'Equipos y otros servicios'
    ];

    const getCategoriesText = (categories: number[]): string => {
        return categories.map(catId => categoryNames[catId]).join(', ');
    };

    // Map regime type to text
    const getRegimenText = (regimen: number): string => {
        const regimenes = [
            'Régimen Simplificado',
            'Régimen Común',
            'Gran Contribuyente',
            'Régimen Especial'
        ];
        return regimenes[regimen] || 'Desconocido';
    };

    // Verificar si el usuario tiene permisos para editar
    const canEdit = user === 'master' || proveedoresAccessLevel >= 3;

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
                <Heading size="lg">Detalle del Proveedor</Heading>
                {canEdit && !editMode && (
                    <Button 
                        leftIcon={<EditIcon />} 
                        colorScheme="green" 
                        onClick={() => setEditMode(true)}
                    >
                        Editar
                    </Button>
                )}
                {editMode && (
                    <HStack>
                        <Button 
                            colorScheme="red" 
                            variant="outline"
                            onClick={() => {
                                setEditMode(false);
                                setProveedorData({...proveedor});
                                setRutFile(null);
                                setCamaraFile(null);
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
                    <Heading size="md">{proveedor.nombre}</Heading>
                    <Text color="gray.600">ID: {proveedor.id}</Text>
                </CardHeader>
                <CardBody>
                    <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                        <GridItem>
                            <VStack align="start" spacing={3}>
                                <Box>
                                    <Text fontWeight="bold">Dirección:</Text>
                                    <Text>{proveedor.direccion || 'No especificada'}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Ubicación:</Text>
                                    <Text>{proveedor.ciudad || 'No especificada'}{proveedor.departamento ? `, ${proveedor.departamento}` : ''}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Régimen Tributario:</Text>
                                    {editMode ? (
                                        <FormControl mt={2}>
                                            <Select
                                                value={proveedorData.regimenTributario}
                                                onChange={(e) => handleInputChange('regimenTributario', Number(e.target.value))}
                                            >
                                                <option value={0}>Régimen Simplificado</option>
                                                <option value={1}>Régimen Común</option>
                                                <option value={2}>Gran Contribuyente</option>
                                                <option value={3}>Régimen Especial</option>
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <Text>{getRegimenText(proveedor.regimenTributario)}</Text>
                                    )}
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Condición de Pago:</Text>
                                    {editMode ? (
                                        <FormControl mt={2}>
                                            <Select
                                                value={proveedorData.condicionPago}
                                                onChange={(e) => handleInputChange('condicionPago', e.target.value)}
                                            >
                                                <option value="credito">Crédito</option>
                                                <option value="contado">Contado</option>
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        <Text>{proveedor.condicionPago}</Text>
                                    )}
                                </Box>
                            </VStack>
                        </GridItem>
                        <GridItem>
                            <VStack align="start" spacing={3}>
                                <Box>
                                    <Text fontWeight="bold">Categorías:</Text>
                                    <Text>{getCategoriesText(proveedor.categorias)}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">URL:</Text>
                                    <Text>{proveedor.url || 'No especificada'}</Text>
                                </Box>
                                <Box>
                                    <Text fontWeight="bold">Observaciones:</Text>
                                    <Text>{proveedor.observacion || 'Sin observaciones'}</Text>
                                </Box>
                            </VStack>
                        </GridItem>
                    </Grid>
                </CardBody>
            </Card>

            {/* Sección de archivos (RUT y Cámara de Comercio) */}
            {editMode && (
                <Card mb={5} variant="outline" boxShadow="md">
                    <CardHeader bg="blue.50">
                        <Heading size="md">Documentos</Heading>
                    </CardHeader>
                    <CardBody>
                        <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                            <GridItem>
                                <VStack spacing={4} align="stretch" alignItems="center">
                                    <FormLabel>RUT</FormLabel>
                                    <Icon
                                        as={rutFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                        boxSize="4em"
                                        color={rutFile ? "green" : "orange.500"}
                                    />
                                    <Button onClick={() => rutInputRef.current?.click()}>Seleccionar archivo</Button>
                                    <Input
                                        type="file"
                                        ref={rutInputRef}
                                        style={{ display: 'none' }}
                                        accept="application/pdf"
                                        onChange={handleRutChange}
                                    />
                                    {rutFile && <Text>{rutFile.name}</Text>}
                                </VStack>
                            </GridItem>
                            <GridItem>
                                <VStack spacing={4} align="stretch" alignItems="center">
                                    <FormLabel>Cámara y Comercio</FormLabel>
                                    <Icon
                                        as={camaraFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                        boxSize="4em"
                                        color={camaraFile ? "green" : "orange.500"}
                                    />
                                    <Button onClick={() => camaraInputRef.current?.click()}>Seleccionar archivo</Button>
                                    <Input
                                        type="file"
                                        ref={camaraInputRef}
                                        style={{ display: 'none' }}
                                        accept="application/pdf"
                                        onChange={handleCamaraChange}
                                    />
                                    {camaraFile && <Text>{camaraFile.name}</Text>}
                                </VStack>
                            </GridItem>
                        </Grid>
                    </CardBody>
                </Card>
            )}

            {/* Sección de contactos */}
            <Card variant="outline" boxShadow="md">
                <CardHeader bg="blue.50">
                    <Heading size="md">Contactos</Heading>
                </CardHeader>
                <CardBody>
                    <VStack spacing={4} align="stretch">
                        {(editMode ? proveedorData.contactos : proveedor.contactos).map((contacto, index) => (
                            <Box key={index} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
                                {editMode ? (
                                    <>
                                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                            <GridItem>
                                                <FormControl>
                                                    <FormLabel>Nombre Completo</FormLabel>
                                                    <Input
                                                        value={contacto.fullName}
                                                        onChange={(e) => handleContactChange(index, 'fullName', e.target.value)}
                                                    />
                                                </FormControl>
                                                <FormControl mt={2}>
                                                    <FormLabel>Cargo</FormLabel>
                                                    <Input
                                                        value={contacto.cargo}
                                                        onChange={(e) => handleContactChange(index, 'cargo', e.target.value)}
                                                    />
                                                </FormControl>
                                            </GridItem>
                                            <GridItem>
                                                <FormControl>
                                                    <FormLabel>Celular</FormLabel>
                                                    <Input
                                                        value={contacto.cel}
                                                        onChange={(e) => handleContactChange(index, 'cel', e.target.value)}
                                                    />
                                                </FormControl>
                                                <FormControl mt={2}>
                                                    <FormLabel>Correo Electrónico</FormLabel>
                                                    <Input
                                                        value={contacto.email}
                                                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                                                    />
                                                </FormControl>
                                            </GridItem>
                                        </Grid>
                                        <Button
                                            mt={3}
                                            colorScheme="red"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeContacto(index)}
                                            isDisabled={proveedorData.contactos.length <= 1}
                                        >
                                            Eliminar Contacto
                                        </Button>
                                    </>
                                ) : (
                                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                        <GridItem>
                                            <Text fontWeight="bold">{contacto.fullName}</Text>
                                            <Text color="gray.600">{contacto.cargo}</Text>
                                        </GridItem>
                                        <GridItem>
                                            <HStack>
                                                <Text fontWeight="bold">Cel:</Text>
                                                <Text>{contacto.cel}</Text>
                                            </HStack>
                                            <HStack>
                                                <Text fontWeight="bold">Correo Electrónico:</Text>
                                                <Text>{contacto.email}</Text>
                                            </HStack>
                                        </GridItem>
                                    </Grid>
                                )}
                            </Box>
                        ))}
                        {editMode && (
                            <Button 
                                colorScheme="blue" 
                                onClick={addContacto}
                                isDisabled={proveedorData.contactos.length >= 3}
                            >
                                Agregar Contacto
                            </Button>
                        )}
                    </VStack>
                </CardBody>
            </Card>
        </Box>
    );
}
