// IngresoOCMStep1VerifyQuantities.tsx
import {
    Steps,
    Button,
    Flex,
    GridItem,
    HStack,
    Input,
    NativeSelect,
    SimpleGrid,
    Textarea,
    Spinner,
    Text,
    IconButton,
    useDisclosure,
    Field,
    Dialog,
    Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import { useState, useEffect } from "react";
import axios from 'axios';
import EndPointsURL from '../../../../../api/EndPointsURL.tsx';
import { ProductoSemiter, UNIDADES, TIPOS_PRODUCTOS, Categoria } from "../../../types.tsx";
import { normalizeProductId, validateProductId } from "../../../productIdUtils.ts";
import { LuCheck, LuHelpCircle } from 'react-icons/lu';

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
    const toast = useAppToast();
    const { open: isHelpOpen, onOpen: onHelpOpen, onClose: onHelpClose } = useDisclosure();

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
                    <Field.Root required={true}>
                        <Field.Label>Codigo Id</Field.Label>
                        <Input
                            value={productoId}
                            onValueChange={(e) => setProductoId(normalizeProductId(e.target.value))}
                            variant="filled"
                        />
                    </Field.Root>
                </GridItem>

                <GridItem colSpan={2}>
                    <Field.Root required={true}>
                        <Field.Label>Nombre</Field.Label>
                        <Input
                            value={nombre}
                            onValueChange={(e) => setNombre(e.target.value)}
                            variant="filled"
                        />
                    </Field.Root>
                </GridItem>

                <GridItem colSpan={1}>
                    <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                flex="1"
                                value={tipoUnidades}
                                onValueChange={(e) => setTipoUnidades(e.target.value)}>
                                <option value={UNIDADES.KG}>{UNIDADES.KG}</option>
                                <option value={UNIDADES.L}>{UNIDADES.L}</option>
                                <option value={UNIDADES.U}>{UNIDADES.U}</option>
                                <option value={UNIDADES.G}>{UNIDADES.G}</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Field.Root flex="4" required>
                            <Field.Label>Contenido por envase</Field.Label>
                            <Input
                                value={cantidadUnidad}
                                onValueChange={(e) => setCantidadUnidad(e.target.value)}
                                variant="filled"
                            />
                        </Field.Root>
                    </Flex>
                </GridItem>

                <GridItem colSpan={1}>
                    <Flex w="full" direction="row" align="flex-end" justify="space-around" gap={4}>
                        <Field.Root>
                            <Field.Label> Seleccionar Tipo de Producto</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    flex="1"
                                    value={tipo_producto}
                                    onValueChange={(e) => setTipo_producto(e.target.value)}>
                                    <option value={TIPOS_PRODUCTOS.semiTerminado}>Semiterminado</option>
                                    <option value={TIPOS_PRODUCTOS.terminado}>Terminado</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>
                    </Flex>
                </GridItem>

                <GridItem colSpan={1} display={tipo_producto === TIPOS_PRODUCTOS.terminado ? "flex" : "none"}>
                    <Field.Root required={tipo_producto === TIPOS_PRODUCTOS.terminado}>
                        <Field.Label>Categoria</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={selectedCategoriaId || ""}
                                onValueChange={(e) => setSelectedCategoriaId(Number(e.target.value))}
                                disabled={loadingCategorias || categoriasDisponibles.length === 0}
                                placeholder="Seleccione una categoria">
                                {categoriasDisponibles.map((categoria) => (
                                    <option key={categoria.categoriaId} value={categoria.categoriaId}>
                                        {categoria.categoriaNombre}
                                    </option>
                                ))}
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
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
                    </Field.Root>
                </GridItem>

                <GridItem colSpan={3} display={tipo_producto === TIPOS_PRODUCTOS.terminado ? "flex" : "none"}>
                    <Field.Root required={tipo_producto === TIPOS_PRODUCTOS.terminado}>
                        <Field.Label>Prefijo de lote</Field.Label>
                        <HStack align="center" gap={2}>
                            <Input
                                value={prefijoLote}
                                onValueChange={(e) => {
                                    setPrefijoLote(e.target.value);
                                    setPrefijoVerificado(false);
                                }}
                                variant="filled"
                                placeholder="Ej: TRK, SLA"
                                maxLength={20}
                                readOnly={modoPrefijoLote === "automatico"}
                                flex="1"
                            />
                            <Button
                                size="sm"
                                variant={modoPrefijoLote === "automatico" ? "solid" : "outline"}
                                colorPalette="teal"
                                onClick={handleToggleModoPrefijo}
                            >
                                {modoPrefijoLote === "automatico" ? "Automatico" : "Editar"}
                            </Button>
                            <IconButton
                                aria-label="Verificar prefijo unico"
                                size="sm"
                                colorPalette={prefijoVerificado ? "green" : "gray"}
                                onClick={handleVerificarPrefijo}
                                loading={verificandoPrefijo}
                                disabled={!prefijoLote?.trim()}><LuCheck /></IconButton>
                            <IconButton
                                aria-label="Ayuda prefijo de lote"
                                size="sm"
                                variant="outline"
                                onClick={onHelpOpen}><LuHelpCircle /></IconButton>
                        </HStack>
                        {prefijoVerificado && (
                            <Text color="green.600" fontSize="sm" mt={1}>
                                Prefijo verificado y disponible.
                            </Text>
                        )}
                    </Field.Root>
                </GridItem>

                <GridItem colSpan={3}>
                    <Field.Root>
                        <Field.Label>Observaciones</Field.Label>
                        <Textarea
                            value={observaciones}
                            onValueChange={(e) => setObservaciones(e.target.value)}
                            variant="filled"
                        />
                    </Field.Root>
                </GridItem>


            </SimpleGrid>
            <HStack>
                <Button
                    variant={"solid"}
                    colorPalette={"red"}
                    onClick={onClickBorrarCampos}
                >
                    Borrar Campos
                </Button>

                <Button
                    variant={"solid"}
                    colorPalette={"teal"}
                    onClick={onClickSiguiente}
                    disabled={
                        tipo_producto === TIPOS_PRODUCTOS.terminado &&
                        (categoriasDisponibles.length === 0 || !selectedCategoriaId || !prefijoVerificado)
                    }
                >
                    Siguiente
                </Button>
            </HStack>

            <Dialog.Root open={isHelpOpen} size='md' onOpenChange={e => {
                if (!e.open) {
                    onHelpClose();
                }
            }}>
                <Portal>

                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>Prefijo de lote</Dialog.Header>
                            <Dialog.CloseTrigger />
                            <Dialog.Body pb={4}>
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
                            </Dialog.Body>
                        </Dialog.Content>
                    </Dialog.Positioner>

                </Portal>
            </Dialog.Root>
        </Flex>
    );
}
