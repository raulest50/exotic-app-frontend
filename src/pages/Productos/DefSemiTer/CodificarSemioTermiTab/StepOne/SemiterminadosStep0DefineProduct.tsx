// IngresoOCMStep1VerifyQuantities.tsx
import {
    Button,
    Flex, FormControl, FormLabel, GridItem, HStack, Input, Select, SimpleGrid, Textarea, useToast,
    Spinner, Text, IconButton, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
} from "@chakra-ui/react";
import { QuestionIcon, CheckIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import { ProductoSemiter, UNIDADES, TIPOS_PRODUCTOS, Categoria } from "../../../types.tsx";
import { normalizeProductId, validateProductId } from "../../../productIdUtils.ts";

/** Calcula el prefijo de lote a partir del nombre: primera letra de cada palabra en mayuscula. */
function calcularPrefijoDesdeNombre(nombre: string): string {
    if (!nombre || !nombre.trim()) return "";
    return nombre
        .trim()
        .split(/\s+/)
        .map((palabra) => (palabra[0] ?? "").toUpperCase())
        .join("");
}


interface props {
    setActiveStep: (step: number) => void;
    setSemioter: (semioter: ProductoSemiter) => void;
    refreshCategorias?: number;
}

export default function SemiterminadosStep0DefineProduct({setActiveStep, setSemioter, refreshCategorias = 0}: props) {
    // Local copy of the order's items to track verification state.

    const [productoId, setProductoId] = useState<string>("");
    const [nombre, setNombre] = useState<string>("");
    const [tipoUnidades, setTipoUnidades] = useState<string>(UNIDADES.L);
    const [cantidadUnidad, setCantidadUnidad] = useState<string>("");
    const [observaciones, setObservaciones] = useState<string>("");
    const [tipo_producto, setTipo_producto] = useState<string>(TIPOS_PRODUCTOS.terminado);

    // Prefijo de lote (solo para terminados)
    const [prefijoLote, setPrefijoLote] = useState<string>("");
    const [modoPrefijoLote, setModoPrefijoLote] = useState<"automatico" | "editar">("automatico");
    const [prefijoVerificado, setPrefijoVerificado] = useState<boolean>(false);
    const [verificandoPrefijo, setVerificandoPrefijo] = useState<boolean>(false);

    // Estados para manejar categorias
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<Categoria[]>([]);
    const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(null);
    const [loadingCategorias, setLoadingCategorias] = useState<boolean>(false);
    const [errorCategorias, setErrorCategorias] = useState<string | null>(null);

    const endPoints = new EndPointsURL();
    const toast = useToast();
    const { isOpen: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

    // Funcion para cargar las categorias
    const fetchCategorias = async () => {
        if (tipo_producto === TIPOS_PRODUCTOS.terminado) {
            try {
                setLoadingCategorias(true);
                setErrorCategorias(null);
                const response = await axios.get(endPoints.get_categorias);
                setCategoriasDisponibles(response.data);

                // Si no hay categorias, mostrar un mensaje
                if (response.data.length === 0) {
                    toast({
                        title: "Advertencia",
                        description: "No hay categorias disponibles. Por favor, cree una categoria primero.",
                        status: "warning",
                        duration: 5000,
                        isClosable: true,
                    });
                }
            } catch (error) {
                console.error('Error fetching categorias:', error);

                // Manejo mejorado de excepciones
                let errorMessage = 'Error al cargar las categorias';

                // Extraer el mensaje de error especifico del backend
                if (axios.isAxiosError(error) && error.response) {
                    if (error.response.data && error.response.data.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.response.data && typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                    }
                }

                setErrorCategorias(errorMessage);
                toast({
                    title: "Error",
                    description: errorMessage,
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setLoadingCategorias(false);
            }
        }
    };

    // Cargar categorias cuando el componente se monta, cuando cambia el tipo de producto,
    // o cuando se actualiza refreshCategorias
    useEffect(() => {
        fetchCategorias();
    }, [tipo_producto, refreshCategorias]);

    // Limpiar la seleccion de categoria cuando se cambia a producto semiterminado
    useEffect(() => {
        if (tipo_producto !== TIPOS_PRODUCTOS.terminado) {
            setSelectedCategoriaId(null);
            setPrefijoLote("");
            setPrefijoVerificado(false);
            setModoPrefijoLote("automatico");
        } else {
            setModoPrefijoLote("automatico");
            setPrefijoLote(calcularPrefijoDesdeNombre(nombre));
            setPrefijoVerificado(false);
        }
    }, [tipo_producto]);

    // Actualizar prefijo en tiempo real cuando el nombre cambia (modo automatico, solo terminados)
    useEffect(() => {
        if (tipo_producto === TIPOS_PRODUCTOS.terminado && modoPrefijoLote === "automatico") {
            setPrefijoLote(calcularPrefijoDesdeNombre(nombre));
            setPrefijoVerificado(false);
        }
    }, [nombre, modoPrefijoLote, tipo_producto]);

    const onClickBorrarCampos = () => {
        setProductoId("");
        setNombre("");
        setCantidadUnidad("");
        setObservaciones("");
        setSelectedCategoriaId(null);
        setPrefijoLote("");
        setPrefijoVerificado(false);
        setModoPrefijoLote("automatico");
    };

    const handleToggleModoPrefijo = () => {
        if (modoPrefijoLote === "automatico") {
            setModoPrefijoLote("editar");
        } else {
            setModoPrefijoLote("automatico");
            setPrefijoLote(calcularPrefijoDesdeNombre(nombre));
            setPrefijoVerificado(false);
        }
    };

    const handleVerificarPrefijo = async () => {
        const valor = (prefijoLote ?? "").trim();
        if (!valor) {
            toast({
                title: "Validacion",
                description: "Ingrese un prefijo de lote antes de verificar.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setVerificandoPrefijo(true);
        try {
            const params = new URLSearchParams({ prefijoLote: valor });
            const url = `${endPoints.validador_prefijo_lote}?${params.toString()}`;
            const response = await axios.get(url);
            const valido = response.data?.valido === true;
            setPrefijoVerificado(valido);
            if (valido) {
                toast({
                    title: "Prefijo valido",
                    description: "El prefijo de lote esta disponible.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            } else {
                toast({
                    title: "Prefijo no disponible",
                    description: response.data?.mensaje ?? "El prefijo ya esta asignado a otro producto terminado.",
                    status: "warning",
                    duration: 4000,
                    isClosable: true,
                });
            }
        } catch (error) {
            setPrefijoVerificado(false);
            toast({
                title: "Error",
                description: axios.isAxiosError(error) && error.response?.data?.mensaje
                    ? error.response.data.mensaje
                    : "No se pudo verificar el prefijo de lote.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setVerificandoPrefijo(false);
        }
    };

    const ValidarDatos = (): boolean => {
        const productIdError = validateProductId(productoId);
        if (productIdError) {
            const descriptionByError: Record<typeof productIdError, string> = {
                required: "El campo 'Codigo Id' es requerido.",
                alphanumeric: "El 'Codigo Id' solo puede contener letras y numeros, sin espacios ni caracteres especiales.",
                uppercase: "El 'Codigo Id' debe usar letras mayusculas.",
            };
            toast({
                title: "Validacion",
                description: descriptionByError[productIdError],
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        // Check if nombre is empty
        if (!nombre || nombre.trim() === "") {
            toast({
                title: "Validacion",
                description: "El campo 'Nombre' es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        // Check if cantidadUnidad is empty
        if (!cantidadUnidad || cantidadUnidad.trim() === "") {
            toast({
                title: "Validacion",
                description: "El campo 'Contenido por envase' es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        // Check if cantidadUnidad is a valid number
        if (isNaN(Number(cantidadUnidad))) {
            toast({
                title: "Validacion",
                description: "El 'Contenido por envase' debe ser un numero valido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        /* Comentado para hacer el campo observaciones opcional
        // Check if observaciones is empty
        if (!observaciones || observaciones.trim() === "") {
            toast({
                title: "Validacion",
                description: "El campo 'Observaciones' es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }
        */

        // Validar que se haya seleccionado una categoria para productos terminados
        if (tipo_producto === TIPOS_PRODUCTOS.terminado && !selectedCategoriaId) {
            toast({
                title: "Validacion",
                description: "Debe seleccionar una categoria para productos terminados.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        // Validar prefijo de lote para productos terminados
        if (tipo_producto === TIPOS_PRODUCTOS.terminado) {
            if (!prefijoLote || !prefijoLote.trim()) {
                toast({
                    title: "Validacion",
                    description: "El prefijo de lote es requerido para productos terminados.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }
            if (!prefijoVerificado) {
                toast({
                    title: "Validacion",
                    description: "Debe verificar que el prefijo de lote sea unico antes de continuar.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
                return false;
            }
        }

        return true;
    };

    const onClickSiguiente = () => {
        if(ValidarDatos()){
            // Encontrar la categoria seleccionada
            const selectedCategoria = categoriasDisponibles.find(f => f.categoriaId === selectedCategoriaId);
            const normalizedProductoId = normalizeProductId(productoId);

            const semioter: ProductoSemiter = {
                productoId: normalizedProductoId,
                nombre: nombre!,
                observaciones: observaciones || "",
                tipoUnidades: tipoUnidades,
                cantidadUnidad: cantidadUnidad!,
                tipo_producto: tipo_producto,
                categoria: tipo_producto === TIPOS_PRODUCTOS.terminado ? selectedCategoria : undefined,
                inventareable: tipo_producto === TIPOS_PRODUCTOS.terminado,
                prefijoLote: tipo_producto === TIPOS_PRODUCTOS.terminado ? (prefijoLote?.trim() || undefined) : undefined,
            };
            setSemioter(semioter);
            setActiveStep(1);
        }
    };

    return (
        <Flex direction="column" gap={4} align="center">
            <SimpleGrid w="full" h="full" columns={3} gap="2em">

                <GridItem colSpan={1}>
                    <FormControl isRequired={true}>
                        <FormLabel>Codigo Id</FormLabel>
                        <Input
                            value={productoId}
                            onChange={(e) => setProductoId(normalizeProductId(e.target.value))}
                            variant="filled"
                        />
                    </FormControl>
                </GridItem>

                <GridItem colSpan={2}>
                    <FormControl isRequired={true}>
                        <FormLabel>Nombre</FormLabel>
                        <Input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            variant="filled"
                        />
                    </FormControl>
                </GridItem>

                <GridItem colSpan={1}>
                    <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                        <Select
                            flex="1"
                            value={tipoUnidades}
                            onChange={(e) => setTipoUnidades(e.target.value)}
                        >
                            <option value={UNIDADES.KG}>{UNIDADES.KG}</option>
                            <option value={UNIDADES.L}>{UNIDADES.L}</option>
                            <option value={UNIDADES.U}>{UNIDADES.U}</option>
                            <option value={UNIDADES.G}>{UNIDADES.G}</option>
                        </Select>
                        <FormControl flex="4" isRequired>
                            <FormLabel>Contenido por envase</FormLabel>
                            <Input
                                value={cantidadUnidad}
                                onChange={(e) => setCantidadUnidad(e.target.value)}
                                variant="filled"
                            />
                        </FormControl>
                    </Flex>
                </GridItem>

                <GridItem colSpan={1}>
                    <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                        <FormControl>
                            <FormLabel> Seleccionar Tipo de Producto</FormLabel>
                            <Select
                                flex="1"
                                value={tipo_producto}
                                onChange={(e) => setTipo_producto(e.target.value)}
                            >
                                <option value={TIPOS_PRODUCTOS.semiTerminado}>Semiterminado</option>
                                <option value={TIPOS_PRODUCTOS.terminado}>Terminado</option>
                            </Select>
                        </FormControl>
                    </Flex>
                </GridItem>

                <GridItem colSpan={1} display={tipo_producto === TIPOS_PRODUCTOS.terminado ? "flex" : "none"}>
                    <FormControl isRequired={tipo_producto === TIPOS_PRODUCTOS.terminado}>
                        <FormLabel>Categoria</FormLabel>
                        <Select
                            value={selectedCategoriaId || ""}
                            onChange={(e) => setSelectedCategoriaId(Number(e.target.value))}
                            isDisabled={loadingCategorias || categoriasDisponibles.length === 0}
                            placeholder="Seleccione una categoria"
                        >
                            {categoriasDisponibles.map((categoria) => (
                                <option key={categoria.categoriaId} value={categoria.categoriaId}>
                                    {categoria.categoriaNombre}
                                </option>
                            ))}
                        </Select>
                        {loadingCategorias && <Spinner size="sm" ml={2} />}
                        {errorCategorias && (
                            <Text color="red.500" fontSize="sm" mt={1}>
                                {errorCategorias}
                            </Text>
                        )}
                        {!loadingCategorias && !errorCategorias && categoriasDisponibles.length === 0 && (
                            <Text color="orange.500" fontSize="sm" mt={1}>
                                No hay categorias disponibles. Por favor, cree una categoria primero.
                            </Text>
                        )}
                    </FormControl>
                </GridItem>

                <GridItem colSpan={3} display={tipo_producto === TIPOS_PRODUCTOS.terminado ? "flex" : "none"}>
                    <FormControl isRequired={tipo_producto === TIPOS_PRODUCTOS.terminado}>
                        <FormLabel>Prefijo de lote</FormLabel>
                        <HStack align="center" spacing={2}>
                            <Input
                                value={prefijoLote}
                                onChange={(e) => {
                                    setPrefijoLote(e.target.value);
                                    setPrefijoVerificado(false);
                                }}
                                variant="filled"
                                placeholder="Ej: TRK, SLA"
                                maxLength={20}
                                isReadOnly={modoPrefijoLote === "automatico"}
                                flex="1"
                            />
                            <Button
                                size="sm"
                                variant={modoPrefijoLote === "automatico" ? "solid" : "outline"}
                                colorScheme="teal"
                                onClick={handleToggleModoPrefijo}
                            >
                                {modoPrefijoLote === "automatico" ? "Automatico" : "Editar"}
                            </Button>
                            <IconButton
                                aria-label="Verificar prefijo unico"
                                icon={<CheckIcon />}
                                size="sm"
                                colorScheme={prefijoVerificado ? "green" : "gray"}
                                onClick={handleVerificarPrefijo}
                                isLoading={verificandoPrefijo}
                                isDisabled={!prefijoLote?.trim()}
                            />
                            <IconButton
                                aria-label="Ayuda prefijo de lote"
                                icon={<QuestionIcon />}
                                size="sm"
                                variant="outline"
                                onClick={onHelpOpen}
                            />
                        </HStack>
                        {prefijoVerificado && (
                            <Text color="green.600" fontSize="sm" mt={1}>
                                Prefijo verificado y disponible.
                            </Text>
                        )}
                    </FormControl>
                </GridItem>

                <GridItem colSpan={3}>
                    <FormControl>
                        <FormLabel>Observaciones</FormLabel>
                        <Textarea
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            variant="filled"
                        />
                    </FormControl>
                </GridItem>


            </SimpleGrid>
            <HStack>
                <Button
                    variant={"solid"}
                    colorScheme={"red"}
                    onClick={onClickBorrarCampos}
                >
                    Borrar Campos
                </Button>

                <Button
                    variant={"solid"}
                    colorScheme={"teal"}
                    onClick={onClickSiguiente}
                    isDisabled={
                        tipo_producto === TIPOS_PRODUCTOS.terminado &&
                        (categoriasDisponibles.length === 0 || !selectedCategoriaId || !prefijoVerificado)
                    }
                >
                    Siguiente
                </Button>
            </HStack>

            <Modal isOpen={isHelpOpen} onClose={onHelpClose} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Prefijo de lote</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={4}>
                        <Text mb={2}>
                            El prefijo de lote identifica de forma unica a cada producto terminado y se usa para generar
                            los numeros de lote al crear ordenes de produccion (por ejemplo: TRK-0000001-26).
                        </Text>
                        <Text mb={2}>
                            <strong>Modo automatico:</strong> El prefijo se calcula a partir del nombre del producto,
                            tomando la primera letra de cada palabra en mayuscula. Ejemplo: &quot;Tratamiento Rizo Kids&quot; -&gt; TRK,
                            &quot;Shampoo Liso Adulto&quot; -&gt; SLA.
                        </Text>
                        <Text mb={2}>
                            <strong>Modo editar:</strong> Puede definir un prefijo propio si lo desea. El prefijo debe ser
                            unico entre todos los productos terminados.
                        </Text>
                        <Text mb={2}>
                            Use el boton con el simbolo de verificacion para comprobar que el prefijo no este ya
                            asignado a otro producto. El boton &quot;Siguiente&quot; solo se habilita despues de verificar el prefijo.
                        </Text>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Flex>
    );
}
