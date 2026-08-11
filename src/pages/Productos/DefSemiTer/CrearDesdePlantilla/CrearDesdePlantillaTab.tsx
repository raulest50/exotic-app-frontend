import {
    Steps,
    Alert,
    Box,
    Button,
    Flex,
    GridItem,
    HStack,
    Heading,
    IconButton,
    Input,
    NativeSelect,
    SimpleGrid,
    Spinner,
    Stat,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    VStack,
    Field,
    List,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import CustomDecimalInput from "../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";
import ProcessDesigner from "../../DefProcesses/CreadorProcesos/ProcessDesigner.tsx";
import {
    applyTemplateToProducto,
    getProcessNodeSummaries,
    toProductoManufacturingPayload,
} from "../../manufacturingMapper.ts";
import { normalizeProductId, validateProductId, type ProductIdValidationError } from "../../productIdUtils.ts";
import {
    CasePack,
    Categoria,
    CategoriaManufacturingTemplateDTO,
    Insumo,
    Producto,
    ProductoSemiter,
    ProcesoDiseñado,
    ProcesoProduccionCompleto,
    TIPOS_PRODUCTOS,
    UNIDADES,
} from "../../types.tsx";
import SemioterBriefCard from "../../components/SemioterBriefCard.tsx";
import BandejaBusqueda from "../CodificarSemioTermiTab/StepTwo/BandejaBusqueda.tsx";
import BandejaSeleccion from "../CodificarSemioTermiTab/StepTwo/BandejaSeleccion.tsx";
import PackagingTerminadoDefiner from "../consulta/ModSemioTerMFversions/StepThree/PackagingTerminadoDefiner.tsx";
import { LuCheck } from 'react-icons/lu';

const endPoints = new EndPointsURL();

type WizardStep = 0 | 1 | 2 | 3;

const emptyProceso = (): ProcesoProduccionCompleto => ({
    rendimientoTeorico: 0,
    nodes: [],
    edges: [],
});

function calcularPrefijoDesdeNombre(nombre: string): string {
    if (!nombre.trim()) return "";
    return nombre
        .trim()
        .split(/\s+/)
        .map((palabra) => (palabra[0] ?? "").toUpperCase())
        .join("");
}

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error
            ?? error.response?.data?.message
            ?? error.response?.data?.mensaje
            ?? error.message
            ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

function totalCostFromInsumos(insumos: Insumo[]): number {
    return insumos.reduce(
        (sum, insumo) => sum + (insumo.subtotal ?? insumo.producto.costo * insumo.cantidadRequerida),
        0
    );
}

export default function CrearDesdePlantillaTab() {
    const toast = useAppToast();
    const procesoRef = useRef<ProcesoProduccionCompleto>(emptyProceso());

    const [activeStep, setActiveStep] = useState<WizardStep>(0);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [templatesExistentes, setTemplatesExistentes] = useState<Record<number, boolean>>({});
    const [loadingCategorias, setLoadingCategorias] = useState(true);
    const [loadingTemplateId, setLoadingTemplateId] = useState<number | null>(null);
    const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
    const [template, setTemplate] = useState<CategoriaManufacturingTemplateDTO | null>(null);

    const [productoId, setProductoId] = useState("");
    const [nombre, setNombre] = useState("");
    const [tipoUnidades, setTipoUnidades] = useState(UNIDADES.L);
    const [cantidadUnidad, setCantidadUnidad] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [prefijoLote, setPrefijoLote] = useState("");
    const [modoPrefijoLote, setModoPrefijoLote] = useState<"automatico" | "editar">("automatico");
    const [prefijoVerificado, setPrefijoVerificado] = useState(false);
    const [verificandoPrefijo, setVerificandoPrefijo] = useState(false);

    const [productoPlantilla, setProductoPlantilla] = useState<ProductoSemiter | null>(null);
    const [designerProduct, setDesignerProduct] = useState<ProductoSemiter | null>(null);
    const [selectedInsumos, setSelectedInsumos] = useState<Insumo[]>([]);
    const [casePack, setCasePack] = useState<CasePack | undefined>();
    const [rendimientoTeorico, setRendimientoTeorico] = useState(0);
    const [isProcessValid, setIsProcessValid] = useState(false);
    const [isPackagingDefinerOpen, setIsPackagingDefinerOpen] = useState(false);
    const [productoFinal, setProductoFinal] = useState<ProductoSemiter | null>(null);
    const [saving, setSaving] = useState(false);

    const totalCost = useMemo(() => totalCostFromInsumos(selectedInsumos), [selectedInsumos]);

    const categoriasConPlantilla = useMemo(
        () => categorias.filter((categoria) => templatesExistentes[categoria.categoriaId]),
        [categorias, templatesExistentes]
    );

    useEffect(() => {
        const fetchCategorias = async () => {
            setLoadingCategorias(true);
            try {
                const response = await axios.get<Categoria[]>(endPoints.get_categorias);
                const nextCategorias = response.data ?? [];
                setCategorias(nextCategorias);

                if (nextCategorias.length > 0) {
                    const params = new URLSearchParams({
                        categoriaIds: nextCategorias.map((categoria) => String(categoria.categoriaId)).join(","),
                    });
                    const templatesResponse = await axios.get<Record<number, boolean>>(
                        `${endPoints.check_categoria_manufacturing_templates_exist_batch}?${params.toString()}`
                    );
                    setTemplatesExistentes(templatesResponse.data ?? {});
                } else {
                    setTemplatesExistentes({});
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: getAxiosErrorMessage(error, "No se pudieron cargar las categorias."),
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                setLoadingCategorias(false);
            }
        };

        fetchCategorias();
    }, [toast]);

    useEffect(() => {
        if (modoPrefijoLote === "automatico") {
            setPrefijoLote(calcularPrefijoDesdeNombre(nombre));
            setPrefijoVerificado(false);
        }
    }, [modoPrefijoLote, nombre]);

    const resetProductFields = () => {
        setProductoId("");
        setNombre("");
        setTipoUnidades(UNIDADES.L);
        setCantidadUnidad("");
        setObservaciones("");
        setPrefijoLote("");
        setModoPrefijoLote("automatico");
        setPrefijoVerificado(false);
    };

    const resetManufacturingState = () => {
        const nextProceso = emptyProceso();
        procesoRef.current = nextProceso;
        setProductoPlantilla(null);
        setDesignerProduct(null);
        setSelectedInsumos([]);
        setCasePack(undefined);
        setRendimientoTeorico(0);
        setIsProcessValid(false);
        setProductoFinal(null);
    };

    const handleSelectCategoria = async (categoria: Categoria) => {
        setLoadingTemplateId(categoria.categoriaId);
        try {
            const url = endPoints.get_categoria_manufacturing_template.replace(
                "{categoriaId}",
                String(categoria.categoriaId)
            );
            const response = await axios.get<CategoriaManufacturingTemplateDTO>(url);
            if (response.status === 204 || !response.data) {
                toast({
                    title: "Sin plantilla",
                    description: "Esta categoria aun no tiene plantilla de manufactura.",
                    status: "warning",
                    duration: 4000,
                    isClosable: true,
                });
                return;
            }

            setSelectedCategoria(categoria);
            setTemplate(response.data);
            resetProductFields();
            resetManufacturingState();
            setActiveStep(1);
        } catch (error) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo cargar la plantilla seleccionada."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoadingTemplateId(null);
        }
    };

    const handleVerificarPrefijo = async () => {
        const valor = prefijoLote.trim();
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
            const response = await axios.get(`${endPoints.validador_prefijo_lote}?${params.toString()}`);
            const valido = response.data?.valido === true;
            setPrefijoVerificado(valido);
            toast({
                title: valido ? "Prefijo valido" : "Prefijo no disponible",
                description: valido
                    ? "El prefijo de lote esta disponible."
                    : response.data?.mensaje ?? "El prefijo ya esta asignado a otro producto terminado.",
                status: valido ? "success" : "warning",
                duration: 3500,
                isClosable: true,
            });
        } catch (error) {
            setPrefijoVerificado(false);
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo verificar el prefijo de lote."),
                status: "error",
                duration: 4000,
                isClosable: true,
            });
        } finally {
            setVerificandoPrefijo(false);
        }
    };

    const validarDatosProducto = (): boolean => {
        const productIdError = validateProductId(productoId);
        if (productIdError) {
            const descriptionByError: Record<ProductIdValidationError, string> = {
                required: "El campo Codigo Id es requerido.",
                alphanumeric: "El Codigo Id solo puede contener letras y numeros.",
                uppercase: "El Codigo Id debe usar letras mayusculas.",
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

        if (!nombre.trim()) {
            toast({
                title: "Validacion",
                description: "El campo Nombre es requerido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (!cantidadUnidad.trim() || Number.isNaN(Number(cantidadUnidad))) {
            toast({
                title: "Validacion",
                description: "El contenido por envase debe ser un numero valido.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (!selectedCategoria || !template) {
            toast({
                title: "Validacion",
                description: "Seleccione una categoria con plantilla antes de continuar.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        if (!prefijoLote.trim() || !prefijoVerificado) {
            toast({
                title: "Validacion",
                description: "Debe verificar un prefijo de lote unico antes de continuar.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return false;
        }

        return true;
    };

    const handleProductNext = () => {
        if (!validarDatosProducto() || !selectedCategoria || !template) return;

        const baseProducto: ProductoSemiter = {
            productoId: normalizeProductId(productoId),
            nombre: nombre.trim(),
            observaciones: observaciones.trim(),
            tipoUnidades,
            cantidadUnidad,
            tipo_producto: TIPOS_PRODUCTOS.terminado,
            categoria: selectedCategoria,
            inventareable: true,
            prefijoLote: prefijoLote.trim(),
        };

        const seededProducto = applyTemplateToProducto(template, baseProducto);
        const nextProceso = {
            ...(seededProducto.procesoProduccionCompleto ?? emptyProceso()),
            rendimientoTeorico: template.rendimientoTeorico ?? seededProducto.procesoProduccionCompleto?.rendimientoTeorico ?? 0,
        };
        const nextProducto = {
            ...seededProducto,
            procesoProduccionCompleto: nextProceso,
        };

        procesoRef.current = nextProceso;
        setProductoPlantilla(nextProducto);
        setDesignerProduct(nextProducto);
        setSelectedInsumos(nextProducto.insumos ?? []);
        setCasePack(nextProducto.casePack);
        setRendimientoTeorico(nextProceso.rendimientoTeorico ?? 0);
        setIsProcessValid(false);
        setProductoFinal(null);
        setActiveStep(2);
    };

    const replaceSelectedInsumos = (nextInsumos: Insumo[]) => {
        const nextCosto = totalCostFromInsumos(nextInsumos);
        setSelectedInsumos(nextInsumos);
        setDesignerProduct((prev) => prev
            ? {
                  ...prev,
                  costo: String(nextCosto),
                  insumos: nextInsumos,
                  procesoProduccionCompleto: procesoRef.current,
              }
            : prev
        );
    };

    const handleAddInsumo = (producto: Producto) => {
        const exists = selectedInsumos.some((insumo) => insumo.producto.productoId === producto.productoId);
        if (exists) {
            toast({
                title: "Insumo ya agregado",
                description: "El insumo ya esta en la lista de seleccion.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        replaceSelectedInsumos([
            ...selectedInsumos,
            {
                producto,
                cantidadRequerida: 0,
                subtotal: 0,
            },
        ]);
    };

    const handleUpdateCantidad = (productoIdInsumo: string, newCantidad: number) => {
        replaceSelectedInsumos(
            selectedInsumos.map((insumo) =>
                insumo.producto.productoId === productoIdInsumo
                    ? {
                          ...insumo,
                          cantidadRequerida: newCantidad,
                          subtotal: newCantidad * insumo.producto.costo,
                      }
                    : insumo
            )
        );
    };

    const handleRemoveInsumo = (productoIdInsumo: string) => {
        replaceSelectedInsumos(
            selectedInsumos.filter((insumo) => insumo.producto.productoId !== productoIdInsumo)
        );
    };

    const handleProcessChange = useCallback((nuevoProceso: ProcesoDiseñado) => {
        procesoRef.current = {
            ...procesoRef.current,
            ...nuevoProceso,
        };
    }, []);

    const canContinueManufacturing = selectedInsumos.length > 0
        && selectedInsumos.every((insumo) => insumo.cantidadRequerida > 0)
        && rendimientoTeorico > 0
        && isProcessValid
        && Boolean(casePack);

    const buildFinalProduct = (): ProductoSemiter | null => {
        const base = productoPlantilla ?? designerProduct;
        if (!base) return null;
        return {
            ...base,
            costo: String(totalCost),
            insumos: selectedInsumos,
            casePack,
            procesoProduccionCompleto: {
                ...procesoRef.current,
                rendimientoTeorico,
            },
        };
    };

    const handleManufacturingNext = () => {
        if (!canContinueManufacturing) {
            toast({
                title: "Manufactura incompleta",
                description: "Revise insumos, cantidades, packaging, rendimiento y conexiones del proceso.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        const nextProductoFinal = buildFinalProduct();
        if (!nextProductoFinal) return;
        setProductoFinal(nextProductoFinal);
        setActiveStep(3);
    };

    const handleGuardar = async () => {
        const producto = productoFinal ?? buildFinalProduct();
        if (!producto) return;

        setSaving(true);
        try {
            const payload = toProductoManufacturingPayload(producto);
            await axios.post(endPoints.create_producto_manufacturing, payload);
            toast({
                title: "Producto guardado",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
            setSelectedCategoria(null);
            setTemplate(null);
            resetProductFields();
            resetManufacturingState();
            setActiveStep(0);
        } catch (error) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo guardar el producto."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const renderStepHeader = () => (
        <HStack gap={3} wrap="wrap">
            {[
                "Categoria",
                "Datos del terminado",
                "Manufactura",
                "Confirmacion",
            ].map((label, index) => (
                <Box
                    key={label}
                    px={4}
                    py={2}
                    borderWidth="1px"
                    borderColor={activeStep === index ? "teal.500" : "gray.200"}
                    bg={activeStep === index ? "teal.50" : "app.surfaceSubtle"}
                    borderRadius="md"
                    fontWeight={activeStep === index ? "bold" : "normal"}
                >
                    {index + 1}. {label}
                </Box>
            ))}
        </HStack>
    );

    const renderCategoriaStep = () => (
        <VStack align="stretch" gap={4}>
            <Heading size="md">Seleccionar categoria con plantilla</Heading>
            {loadingCategorias && (
                <Flex align="center" gap={3}>
                    <Spinner size="md" />
                    <Text>Cargando categorias...</Text>
                </Flex>
            )}

            {!loadingCategorias && categoriasConPlantilla.length === 0 && (
                <Alert.Root status="info">
                    <Alert.Indicator />
                    No hay categorias con plantilla de manufactura definida.
                </Alert.Root>
            )}

            {!loadingCategorias && categorias.length > 0 && (
                <Table.Root variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader>Accion</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {categorias.map((categoria) => {
                            const hasTemplate = templatesExistentes[categoria.categoriaId];
                            return (
                                <Table.Row key={categoria.categoriaId}>
                                    <Table.Cell>{categoria.categoriaId}</Table.Cell>
                                    <Table.Cell>{categoria.categoriaNombre}</Table.Cell>
                                    <Table.Cell>{hasTemplate ? "Con plantilla" : "Sin plantilla"}</Table.Cell>
                                    <Table.Cell>
                                        <Button
                                            size="sm"
                                            colorPalette="teal"
                                            disabled={!hasTemplate}
                                            loading={loadingTemplateId === categoria.categoriaId}
                                            onClick={() => handleSelectCategoria(categoria)}
                                        >
                                            Seleccionar
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>
            )}
        </VStack>
    );

    const renderDatosProductoStep = () => (
        <Flex direction="column" gap={4} align="center">
            <Heading size="md" alignSelf="flex-start">
                Datos propios del terminado
            </Heading>
            {selectedCategoria && (
                <Text alignSelf="flex-start" color="app.textMuted">
                    Categoria: {selectedCategoria.categoriaNombre}
                </Text>
            )}
            <SimpleGrid w="full" columns={3} gap="2em">
                <GridItem colSpan={1}>
                    <Field.Root required>
                        <Field.Label>Codigo Id</Field.Label>
                        <Input
                            value={productoId}
                            onValueChange={(e) => setProductoId(normalizeProductId(e.target.value))}
                            variant="filled"
                        />
                    </Field.Root>
                </GridItem>
                <GridItem colSpan={2}>
                    <Field.Root required>
                        <Field.Label>Nombre</Field.Label>
                        <Input value={nombre} onValueChange={(e) => setNombre(e.target.value)} variant="filled" />
                    </Field.Root>
                </GridItem>
                <GridItem colSpan={1}>
                    <HStack align="flex-end" gap={4}>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={tipoUnidades}
                                onValueChange={(e) => setTipoUnidades(e.target.value)}>
                                <option value={UNIDADES.KG}>{UNIDADES.KG}</option>
                                <option value={UNIDADES.L}>{UNIDADES.L}</option>
                                <option value={UNIDADES.U}>{UNIDADES.U}</option>
                                <option value={UNIDADES.G}>{UNIDADES.G}</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Field.Root required>
                            <Field.Label>Contenido por envase</Field.Label>
                            <Input
                                value={cantidadUnidad}
                                onValueChange={(e) => setCantidadUnidad(e.target.value)}
                                variant="filled"
                            />
                        </Field.Root>
                    </HStack>
                </GridItem>
                <GridItem colSpan={1}>
                    <Field.Root>
                        <Field.Label>Tipo de producto</Field.Label>
                        <Input value="Terminado" variant="filled" readOnly />
                    </Field.Root>
                </GridItem>
                <GridItem colSpan={1}>
                    <Field.Root>
                        <Field.Label>Categoria</Field.Label>
                        <Input value={selectedCategoria?.categoriaNombre ?? ""} variant="filled" readOnly />
                    </Field.Root>
                </GridItem>
                <GridItem colSpan={3}>
                    <Field.Root required>
                        <Field.Label>Prefijo de lote</Field.Label>
                        <HStack>
                            <Input
                                value={prefijoLote}
                                onValueChange={(e) => {
                                    setPrefijoLote(e.target.value);
                                    setPrefijoVerificado(false);
                                }}
                                variant="filled"
                                maxLength={20}
                                readOnly={modoPrefijoLote === "automatico"}
                            />
                            <Button
                                size="sm"
                                colorPalette="teal"
                                variant={modoPrefijoLote === "automatico" ? "solid" : "outline"}
                                onClick={() =>
                                    setModoPrefijoLote((prev) => prev === "automatico" ? "editar" : "automatico")
                                }
                            >
                                {modoPrefijoLote === "automatico" ? "Automatico" : "Editar"}
                            </Button>
                            <IconButton
                                aria-label="Verificar prefijo unico"
                                size="sm"
                                colorPalette={prefijoVerificado ? "green" : "gray"}
                                onClick={handleVerificarPrefijo}
                                loading={verificandoPrefijo}
                                disabled={!prefijoLote.trim()}><LuCheck /></IconButton>
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
                <Button colorPalette="yellow" onClick={() => setActiveStep(0)}>
                    Atras
                </Button>
                <Button colorPalette="teal" onClick={handleProductNext} disabled={!prefijoVerificado}>
                    Siguiente
                </Button>
            </HStack>
        </Flex>
    );

    const renderManufacturingStep = () => {
        if (!designerProduct) {
            return (
                <Flex align="center" justify="center" minH="240px">
                    <Spinner />
                </Flex>
            );
        }

        return (
            <Flex direction="column" gap={4} align="center" w="full">
                <SemioterBriefCard semioter={designerProduct} />
                <HStack gap={8} w="full" align="flex-start">
                    <BandejaBusqueda onAddInsumo={handleAddInsumo} />
                    <VStack w="full">
                        <Stat.Root backgroundColor="app.surfaceSubtle" p="1em" boxShadow="md" w="full">
                            <Stat.Label>Total Costo</Stat.Label>
                            <Stat.ValueText>{totalCost} ( $ COP)</Stat.ValueText>
                            <Stat.HelpText>Costo total sumando los insumos</Stat.HelpText>
                        </Stat.Root>
                        <BandejaSeleccion
                            selectedInsumos={selectedInsumos}
                            onUpdateCantidad={handleUpdateCantidad}
                            onRemoveInsumo={handleRemoveInsumo}
                        />
                    </VStack>
                </HStack>

                <HStack gap={4} alignItems="flex-start" w="full">
                    <Field.Root w="sm">
                        <Field.Label>Rendimiento Teorico</Field.Label>
                        <CustomDecimalInput
                            value={rendimientoTeorico}
                            onChange={setRendimientoTeorico}
                            min={0}
                            placeholder="0.0000"
                        />
                    </Field.Root>
                    <Box>
                        <Field.Label>Packaging</Field.Label>
                        <Button colorPalette={casePack ? "green" : "blue"} onClick={() => setIsPackagingDefinerOpen(true)}>
                            {casePack ? "Packaging definido" : "Definir packaging"}
                        </Button>
                    </Box>
                </HStack>

                <ProcessDesigner
                    semioter2={designerProduct}
                    onProcessChange={handleProcessChange}
                    onValidityChange={setIsProcessValid}
                />

                <HStack>
                    <Button colorPalette="yellow" onClick={() => setActiveStep(1)}>
                        Atras
                    </Button>
                    <Button colorPalette="teal" onClick={handleManufacturingNext} disabled={!canContinueManufacturing}>
                        Siguiente
                    </Button>
                </HStack>

                <PackagingTerminadoDefiner
                    isOpen={isPackagingDefinerOpen}
                    onClose={() => setIsPackagingDefinerOpen(false)}
                    onSave={(nuevoCasePack) => setCasePack(nuevoCasePack)}
                    initialCasePack={casePack ? { ...casePack, insumosEmpaque: casePack.insumosEmpaque ?? [] } : undefined}
                />
            </Flex>
        );
    };

    const renderConfirmacionStep = () => {
        const producto = productoFinal ?? buildFinalProduct();
        if (!producto) {
            return (
                <Flex align="center" justify="center" minH="240px">
                    <Spinner />
                </Flex>
            );
        }
        const procesos = getProcessNodeSummaries(producto.procesoProduccionCompleto);

        return (
            <Flex direction="column" align="center" gap={4} w="full">
                <Heading size="md">Resumen del Producto</Heading>
                <Box w="full" bg="app.surfaceSubtle" p={4} borderRadius="md" maxH="340px" overflowY="auto">
                    <VStack align="start" gap={4} w="full">
                        <VStack align="start" w="full" gap={1}>
                            <Text><b>Codigo:</b> {producto.productoId}</Text>
                            <Text><b>Nombre:</b> {producto.nombre}</Text>
                            <Text><b>Categoria:</b> {producto.categoria?.categoriaNombre}</Text>
                            <Text><b>Unidades:</b> {producto.tipoUnidades}</Text>
                            <Text><b>Contenido por envase:</b> {producto.cantidadUnidad}</Text>
                            <Text><b>Costo:</b> {producto.costo}</Text>
                            <Text><b>Prefijo lote:</b> {producto.prefijoLote}</Text>
                            <Text><b>Packaging:</b> {producto.casePack ? "Definido" : "No definido"}</Text>
                        </VStack>

                        <Box w="full">
                            <Heading size="sm" mb={2}>Insumos</Heading>
                            <Table.Root size="sm" variant="simple">
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {(producto.insumos ?? []).map((insumo) => (
                                        <Table.Row key={insumo.producto.productoId}>
                                            <Table.Cell>{insumo.producto.nombre}</Table.Cell>
                                            <Table.Cell textAlign='end'>{insumo.cantidadRequerida}</Table.Cell>
                                            <Table.Cell textAlign='end'>{insumo.subtotal}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>

                        <Box w="full">
                            <Heading size="sm" mb={2}>Procesos de produccion</Heading>
                            <List.Root as='ol'>
                                {procesos.map((nombreProceso, index) => (
                                    <List.Item key={`${nombreProceso}-${index}`}>{nombreProceso}</List.Item>
                                ))}
                            </List.Root>
                            <Text mt={2}>
                                <b>Rendimiento teorico:</b> {producto.procesoProduccionCompleto?.rendimientoTeorico}
                            </Text>
                        </Box>
                    </VStack>
                </Box>
                <HStack>
                    <Button colorPalette="yellow" onClick={() => setActiveStep(2)} disabled={saving}>
                        Atras
                    </Button>
                    <Button colorPalette="teal" onClick={handleGuardar} loading={saving}>
                        Guardar
                    </Button>
                </HStack>
            </Flex>
        );
    };

    return (
        <Flex direction="column" gap={5} p={4} w="full">
            {renderStepHeader()}
            {activeStep === 0 && renderCategoriaStep()}
            {activeStep === 1 && renderDatosProductoStep()}
            {activeStep === 2 && renderManufacturingStep()}
            {activeStep === 3 && renderConfirmacionStep()}
        </Flex>
    );
}
