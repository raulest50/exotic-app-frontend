// RecibirMercancia/IngresoOCMStep1VerifyQuantities.tsx
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Text,
    useToast,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    HStack,
} from "@chakra-ui/react";
import { useEffect, useState, useMemo } from "react";
import { OrdenCompra, ItemOrdenCompra, IngresoOCM_DTA, TipoEntidadCausante, Movimiento, TransaccionAlmacen, ConsolidadoOCMResponse } from "../types";
import { CardIngresoMaterial } from "./componentes/CardIngresoMaterial";
import { ListaTransaccionesAlmacen } from "./StepTwoComponent_IngOCM/ListaTransaccionesAlmacen";
import { ListaMaterialesIngresoDesgloce } from "./StepTwoComponent_IngOCM/ListaMaterialesIngresoDesgloce";
import { CerrarOrdenDialog } from "./StepTwoComponent_IngOCM/CerrarOrdenDialog";
import { useDisclosure } from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL";

interface StepOneComponentProps {
    setActiveStep: (step: number) => void;
    orden: OrdenCompra | null;
    setIngresoOCM_DTA: (ingresoOCM_DTA: IngresoOCM_DTA) => void;
}

export default function IngresoOCMStep1VerifyQuantities({
    setActiveStep,
    orden,
    setIngresoOCM_DTA,
}: StepOneComponentProps) {
    const toast = useToast();
    const endpoints = useMemo(() => new EndPointsURL(), []);
    const { isOpen: isDialogOpen, onOpen: onDialogOpen, onClose: onDialogClose } = useDisclosure();

    // Token management
    const [token, setToken] = useState<string>("");
    const [inputToken, setInputToken] = useState<string>("");

    // Movimientos por cada item
    const [movimientosPorItem, setMovimientosPorItem] = useState<{[key: number]: Movimiento[]}>({});

    // Materiales excluidos de la recepción
    const [materialesExcluidos, setMaterialesExcluidos] = useState<{[key: number]: boolean}>({});

    // Estado para transacciones (entregas parciales)
    const [transacciones, setTransacciones] = useState<TransaccionAlmacen[]>([]);
    const [loadingTransacciones, setLoadingTransacciones] = useState(false);

    // Cantidades ya recibidas por productoId (de recepciones previas)
    const [recibidoPorProducto, setRecibidoPorProducto] = useState<Map<string, number>>(new Map());

    const MAX_RECEPCIONES = 2;
    const limiteRecepcionesAlcanzado = transacciones.length >= MAX_RECEPCIONES;

    // Consultar transacciones y consolidado cuando cambia la orden
    useEffect(() => {
        if (!orden?.ordenCompraId) {
            setTransacciones([]);
            setRecibidoPorProducto(new Map());
            return;
        }

        const fetchTransacciones = async () => {
            setLoadingTransacciones(true);
            try {
                const response = await axios.get<TransaccionAlmacen[]>(
                    endpoints.consulta_transacciones_ocm,
                    {
                        withCredentials: true,
                        params: {
                            page: 0,
                            size: 100,
                            ordenCompraId: orden.ordenCompraId,
                        },
                    }
                );
                setTransacciones(response.data || []);
            } catch (error: any) {
                console.error('Error fetching transacciones:', error);
                if (error.response?.status !== 405) {
                    toast({
                        title: 'Error al cargar transacciones',
                        description: 'No se pudieron cargar las transacciones de almacén.',
                        status: 'warning',
                        duration: 3000,
                        isClosable: true,
                    });
                }
                setTransacciones([]);
            } finally {
                setLoadingTransacciones(false);
            }
        };

        const fetchConsolidado = async () => {
            try {
                const url = endpoints.consolidado_materiales_ocm.replace(
                    '{ordenCompraId}', orden.ordenCompraId!.toString()
                );
                const response = await axios.get<ConsolidadoOCMResponse>(url, {
                    withCredentials: true,
                });
                const map = new Map<string, number>();
                (response.data.materiales ?? []).forEach((mat) => {
                    map.set(mat.productoId, mat.cantidadTotal);
                });
                setRecibidoPorProducto(map);
            } catch {
                setRecibidoPorProducto(new Map());
            }
        };

        fetchTransacciones();
        fetchConsolidado();
    }, [orden?.ordenCompraId, endpoints, toast]);

    // Initialize token whenever `orden` changes
    useEffect(() => {
        // generate a new 4-digit token
        const newTok = Math.floor(1000 + Math.random() * 9000).toString();
        setToken(newTok);
        setInputToken("");

        // Inicializar movimientos vacíos y materiales no excluidos
        if (orden?.itemsOrdenCompra) {
            const initialMovimientos: {[key: number]: Movimiento[]} = {};
            const initialExcluidos: {[key: number]: boolean} = {};
            orden.itemsOrdenCompra.forEach((item, index) => {
                initialMovimientos[index] = [];
                initialExcluidos[index] = false;
            });
            setMovimientosPorItem(initialMovimientos);
            setMaterialesExcluidos(initialExcluidos);
        }
    }, [orden]);

    // Actualizar los movimientos para un item específico
    const handleMovimientosChange = (index: number, movimientos: Movimiento[]) => {
        setMovimientosPorItem(prev => ({
            ...prev,
            [index]: movimientos
        }));
    };

    // Manejar cambio de exclusión de material
    const handleExcludedChange = (index: number, excluded: boolean) => {
        setMaterialesExcluidos(prev => ({
            ...prev,
            [index]: excluded
        }));
        // Si se excluye, limpiar movimientos
        if (excluded) {
            setMovimientosPorItem(prev => ({
                ...prev,
                [index]: []
            }));
        }
    };

    // Check that all movimientos are valid (permitir recepciones parciales)
    const movimientosValidos = () => {
        if (!orden || limiteRecepcionesAlcanzado) return false;

        let tieneAlMenosUnoValido = false;

        for (let index = 0; index < orden.itemsOrdenCompra.length; index++) {
            const estaExcluido = materialesExcluidos[index] || false;
            
            if (estaExcluido) continue;

            const movimientos = movimientosPorItem[index] || [];
            
            if (movimientos.length === 0) {
                return false;
            }

            const item = orden.itemsOrdenCompra[index];
            const yaRecibido = recibidoPorProducto.get(item.material.productoId) ?? 0;
            const maxPermitido = item.cantidad - yaRecibido;
            const totalCantidad = movimientos.reduce((sum, mov) => sum + mov.cantidad, 0);
            if (totalCantidad <= 0 || totalCantidad > maxPermitido + 0.01) {
                return false;
            }

            tieneAlMenosUnoValido = true;
        }

        return tieneAlMenosUnoValido;
    };

    const onClickContinuar = () => {
        if (!movimientosValidos()) {
            toast({
                title: "Datos incompletos",
                description: "Debe recibir al menos un material con lotes válidos. Los materiales excluidos no se recibirán en esta transacción.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (inputToken !== token) {
            toast({
                title: "Token incorrecto",
                description: "El token ingresado no coincide.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        // Inicializar el objeto ingresoOCM_DTA con la orden seleccionada
        if (orden) {
            // Obtener todos los movimientos en un solo array (solo de materiales no excluidos)
            const todosLosMovimientos = Object.entries(movimientosPorItem)
                .filter(([index]) => !materialesExcluidos[parseInt(index)])
                .flatMap(([, movimientos]) => movimientos);

            const ingresoOCM_DTA: IngresoOCM_DTA = {
                transaccionAlmacen: {
                    movimientosTransaccion: todosLosMovimientos,
                    urlDocSoporte: "",
                    tipoEntidadCausante: TipoEntidadCausante.OCM,
                    idEntidadCausante: orden.ordenCompraId?.toString() || "",
                    observaciones: ""
                },
                ordenCompraMateriales: orden,
                userId: undefined,
                observaciones: "",
                file: new File([], "placeholder") // Se reemplazará en SemiterminadosStep1DefineInputs
            };

            setIngresoOCM_DTA(ingresoOCM_DTA);
        }

        setActiveStep(2);
    };

    if (!orden) {
        return <Text>No se ha seleccionado ninguna orden.</Text>;
    }

    const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "");

    return (
        <Box p="1em" bg="blue.50">
            <Flex direction="column" gap={4} align="center">
                <Heading fontFamily="Comfortaa Variable">
                    Verificar Cantidades y Lotes
                </Heading>

                {/* Proveedor & fechas */}
                <Flex direction="column" align="center" gap={2}>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Proveedor:</strong> {orden.proveedor.nombre}
                    </Text>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Fecha Emisión:</strong> {formatDate(orden.fechaEmision)}
                    </Text>
                    <Text fontFamily="Comfortaa Variable">
                        <strong>Fecha Vencimiento:</strong>{" "}
                        {formatDate(orden.fechaVencimiento)}
                    </Text>
                </Flex>

                {limiteRecepcionesAlcanzado && (
                    <Alert
                        status="error"
                        variant="left-accent"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        borderRadius="md"
                        boxShadow="lg"
                        p={6}
                        w="full"
                    >
                        <AlertIcon boxSize="40px" mr={0} mb={2} />
                        <AlertTitle mt={2} mb={2} fontSize="lg" fontWeight="bold">
                            Limite de recepciones alcanzado
                        </AlertTitle>
                        <AlertDescription fontSize="md">
                            Esta orden de compra ya tiene {transacciones.length} recepciones registradas.
                            No se permiten mas de {MAX_RECEPCIONES} recepciones parciales por orden de compra.
                            Puede cerrar la orden si ya se recibieron todos los materiales necesarios.
                        </AlertDescription>
                    </Alert>
                )}

                {!limiteRecepcionesAlcanzado && (
                    <Text fontFamily="Comfortaa Variable" textAlign="center">
                        Para cada material, ingrese la información de los lotes recibidos o márquelo como excluido si no será recibido en esta transacción. 
                        Puede agregar hasta 3 lotes por material. La suma de las cantidades no debe exceder la cantidad restante por recibir.
                    </Text>
                )}

                {/* Resumen de recepción */}
                {(() => {
                    const materialesRecibidos = orden.itemsOrdenCompra.filter((_, idx) => 
                        !materialesExcluidos[idx] && (movimientosPorItem[idx]?.length || 0) > 0
                    ).length;
                    const materialesExcluidosCount = Object.values(materialesExcluidos).filter(Boolean).length;
                    
                    if (materialesExcluidosCount > 0 || materialesRecibidos < orden.itemsOrdenCompra.length) {
                        return (
                            <Box p={3} bg="yellow.50" borderRadius="md" borderWidth="1px" borderColor="yellow.200">
                                <Text fontFamily="Comfortaa Variable" fontSize="sm">
                                    <strong>Recepción Parcial:</strong> {materialesRecibidos} de {orden.itemsOrdenCompra.length} materiales serán recibidos.
                                    {materialesExcluidosCount > 0 && ` ${materialesExcluidosCount} material(es) excluido(s).`}
                                </Text>
                            </Box>
                        );
                    }
                    return null;
                })()}

                {/* Tabla de materiales */}
                <Box w="full" bg="white" borderRadius="md" boxShadow="sm" overflowX="auto">
                    <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                            <Tr>
                                <Th>Material</Th>
                                <Th>ID</Th>
                                <Th>Cantidad Ordenada</Th>
                                <Th>Cantidad Ingresada</Th>
                                <Th>Estado</Th>
                                <Th textAlign="center">Acciones</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {orden.itemsOrdenCompra.map((item, idx) => (
                                <CardIngresoMaterial 
                                    key={idx} 
                                    item={item} 
                                    onMovimientosChange={(movimientos) => handleMovimientosChange(idx, movimientos)}
                                    onExcludedChange={(excluded) => handleExcludedChange(idx, excluded)}
                                    isExcluded={materialesExcluidos[idx] || false}
                                    cantidadYaRecibida={recibidoPorProducto.get(item.material.productoId) ?? 0}
                                />
                            ))}
                        </Tbody>
                    </Table>
                </Box>

                {/* Lista de transacciones de almacén */}
                <ListaTransaccionesAlmacen ordenCompraId={orden.ordenCompraId} />

                {/* Consolidado de materiales recibidos */}
                <ListaMaterialesIngresoDesgloce ordenCompraId={orden.ordenCompraId} />

                {/* Token Input */}
                <FormControl w="40%" isRequired>
                    <FormLabel>Token de verificación</FormLabel>
                    <Input
                        placeholder="Ingrese el token"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                    />
                </FormControl>

                {/* Display the token as text */}
                <Text fontFamily="Comfortaa Variable">
                    Token: <strong>{token}</strong>
                </Text>

                {/* Continuar y Cerrar Orden */}
                <Flex w="40%">
                    <HStack spacing={4} w="full">
                        {!limiteRecepcionesAlcanzado && (
                            <Button
                                colorScheme="teal"
                                flex="1"
                                isDisabled={!movimientosValidos()}
                                onClick={onClickContinuar}
                            >
                                Continuar
                            </Button>
                        )}
                        {transacciones.length > 0 && (
                            <Button
                                colorScheme="red"
                                variant="outline"
                                onClick={onDialogOpen}
                                isDisabled={loadingTransacciones}
                            >
                                Cerrar Orden
                            </Button>
                        )}
                    </HStack>
                </Flex>
            </Flex>

            {/* Modal para cerrar orden */}
            <CerrarOrdenDialog
                isOpen={isDialogOpen}
                onClose={onDialogClose}
                orden={orden}
                setActiveStep={setActiveStep}
            />
        </Box>
    );
}
