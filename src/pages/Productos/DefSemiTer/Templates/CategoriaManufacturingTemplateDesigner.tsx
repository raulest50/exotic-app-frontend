import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    Spinner,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
    VStack,
    useToast,
} from "@chakra-ui/react";
import axios from "axios";
import EndPointsURL from "../../../../api/EndPointsURL.tsx";
import CustomDecimalInput from "../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";
import ProcessDesigner from "../../DefProcesses/CreadorProcesos/ProcessDesigner.tsx";
import BandejaBusqueda from "../CodificarSemioTermiTab/StepTwo/BandejaBusqueda.tsx";
import BandejaSeleccion from "../CodificarSemioTermiTab/StepTwo/BandejaSeleccion.tsx";
import PackagingTerminadoDefiner from "../consulta/ModSemioTerMFversions/StepThree/PackagingTerminadoDefiner.tsx";
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
} from "../../types.tsx";
import {
    productoSemiterToTemplatePayload,
    templateToProductoSemiter,
} from "../../manufacturingMapper.ts";

interface Props {
    categoria: Categoria;
    onBack: () => void;
    onSaved?: () => void;
}

const endpoints = new EndPointsURL();

const emptyProceso = (): ProcesoProduccionCompleto => ({
    rendimientoTeorico: 0,
    nodes: [],
    edges: [],
});

const buildEmptyTemplateProduct = (categoria: Categoria): ProductoSemiter => ({
    productoId: `TEMPLATE-${categoria.categoriaId}`,
    nombre: `Plantilla ${categoria.categoriaNombre}`,
    observaciones: "",
    costo: "0",
    insumos: [],
    tipoUnidades: "U",
    cantidadUnidad: "1",
    tipo_producto: TIPOS_PRODUCTOS.terminado,
    procesoProduccionCompleto: emptyProceso(),
    inventareable: true,
    categoria,
});

function getAxiosErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message
            ?? error.response?.data?.error
            ?? error.message
            ?? fallback;
    }
    return error instanceof Error ? error.message : fallback;
}

export default function CategoriaManufacturingTemplateDesigner({ categoria, onBack, onSaved }: Props) {
    const toast = useToast();
    const procesoRef = useRef<ProcesoProduccionCompleto>(emptyProceso());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasExistingTemplate, setHasExistingTemplate] = useState(false);
    const [selectedInsumos, setSelectedInsumos] = useState<Insumo[]>([]);
    const [casePack, setCasePack] = useState<CasePack | undefined>();
    const [rendimientoTeorico, setRendimientoTeorico] = useState(0);
    const [isProcessValid, setIsProcessValid] = useState(false);
    const [isPackagingDefinerOpen, setIsPackagingDefinerOpen] = useState(false);
    const [designerProduct, setDesignerProduct] = useState<ProductoSemiter>(() => buildEmptyTemplateProduct(categoria));

    const totalCost = useMemo(
        () => selectedInsumos.reduce((sum, insumo) => sum + (insumo.subtotal ?? insumo.producto.costo * insumo.cantidadRequerida), 0),
        [selectedInsumos]
    );

    useEffect(() => {
        let isMounted = true;

        const fetchTemplate = async () => {
            setLoading(true);
            try {
                const url = endpoints.get_categoria_manufacturing_template.replace("{categoriaId}", String(categoria.categoriaId));
                const response = await axios.get<CategoriaManufacturingTemplateDTO>(url);
                if (!isMounted) return;

                if (response.status === 204 || !response.data) {
                    const emptyProduct = buildEmptyTemplateProduct(categoria);
                    const nextProceso = emptyProceso();
                    setHasExistingTemplate(false);
                    setSelectedInsumos([]);
                    setCasePack(undefined);
                    setRendimientoTeorico(0);
                    procesoRef.current = nextProceso;
                    setDesignerProduct(emptyProduct);
                    return;
                }

                const templateProduct = templateToProductoSemiter(response.data, categoria);
                const nextProceso = response.data.procesoProduccionCompleto ?? emptyProceso();
                setHasExistingTemplate(true);
                setSelectedInsumos(templateProduct.insumos ?? []);
                setCasePack(templateProduct.casePack);
                setRendimientoTeorico(response.data.rendimientoTeorico ?? nextProceso.rendimientoTeorico ?? 0);
                procesoRef.current = nextProceso;
                setDesignerProduct({
                    ...templateProduct,
                    procesoProduccionCompleto: {
                        ...nextProceso,
                        rendimientoTeorico: response.data.rendimientoTeorico ?? nextProceso.rendimientoTeorico ?? 0,
                    },
                });
            } catch (error) {
                if (!isMounted) return;
                toast({
                    title: "Error",
                    description: getAxiosErrorMessage(error, "No se pudo cargar la plantilla de manufactura."),
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchTemplate();
        return () => {
            isMounted = false;
        };
    }, [categoria, toast]);

    useEffect(() => {
        setDesignerProduct((prev) => ({
            ...prev,
            costo: String(totalCost),
            insumos: selectedInsumos,
            procesoProduccionCompleto: procesoRef.current,
        }));
    }, [selectedInsumos, totalCost]);

    const handleAddInsumo = (producto: Producto) => {
        const exists = selectedInsumos.some((insumo) => insumo.producto.productoId === producto.productoId);
        if (exists) {
            toast({
                title: "Insumo ya agregado",
                description: "El insumo ya esta en la plantilla.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        setSelectedInsumos((prev) => [
            ...prev,
            {
                producto,
                cantidadRequerida: 0,
                subtotal: 0,
            },
        ]);
    };

    const handleUpdateCantidad = (productoId: string, newCantidad: number) => {
        setSelectedInsumos((prev) =>
            prev.map((insumo) =>
                insumo.producto.productoId === productoId
                    ? {
                        ...insumo,
                        cantidadRequerida: newCantidad,
                        subtotal: newCantidad * insumo.producto.costo,
                    }
                    : insumo
            )
        );
    };

    const handleRemoveInsumo = (productoId: string) => {
        setSelectedInsumos((prev) => prev.filter((insumo) => insumo.producto.productoId !== productoId));
    };

    const canSave = selectedInsumos.length > 0
        && selectedInsumos.every((insumo) => insumo.cantidadRequerida > 0)
        && rendimientoTeorico > 0
        && isProcessValid;

    const handleProcessChange = useCallback((nuevoProceso: ProcesoDiseñado) => {
        procesoRef.current = {
            ...procesoRef.current,
            ...nuevoProceso,
        };
    }, []);

    const buildProductForSave = (): ProductoSemiter => ({
        ...designerProduct,
        costo: String(totalCost),
        insumos: selectedInsumos,
        casePack,
        procesoProduccionCompleto: {
            ...procesoRef.current,
            rendimientoTeorico,
        },
    });

    const handleSave = async () => {
        if (!canSave) {
            toast({
                title: "Plantilla incompleta",
                description: "Revise insumos, cantidades, rendimiento teorico y conexiones del proceso.",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setSaving(true);
        try {
            const payload = productoSemiterToTemplatePayload(categoria, buildProductForSave());
            const url = endpoints.save_categoria_manufacturing_template.replace("{categoriaId}", String(categoria.categoriaId));
            await axios.put(url, payload);
            setHasExistingTemplate(true);
            onSaved?.();
            toast({
                title: "Plantilla guardada",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo guardar la plantilla."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!hasExistingTemplate || !window.confirm("Eliminar la plantilla de manufactura de esta categoria?")) {
            return;
        }
        setSaving(true);
        try {
            const url = endpoints.delete_categoria_manufacturing_template.replace("{categoriaId}", String(categoria.categoriaId));
            await axios.delete(url);
            setHasExistingTemplate(false);
            setSelectedInsumos([]);
            setCasePack(undefined);
            setRendimientoTeorico(0);
            const nextProceso = emptyProceso();
            procesoRef.current = nextProceso;
            setDesignerProduct(buildEmptyTemplateProduct(categoria));
            onSaved?.();
            toast({
                title: "Plantilla eliminada",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: getAxiosErrorMessage(error, "No se pudo eliminar la plantilla."),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Flex align="center" justify="center" minH="320px" direction="column" gap={3}>
                <Spinner size="lg" />
                <Text>Cargando plantilla...</Text>
            </Flex>
        );
    }

    return (
        <Flex direction="column" gap={5} p={4}>
            <Flex justify="space-between" align="center" gap={4}>
                <Button onClick={onBack} variant="outline">
                    Volver
                </Button>
                <Box>
                    <Heading size="md">
                        {hasExistingTemplate ? "Editar plantilla" : "Crear plantilla"}
                    </Heading>
                    <Text color="app.textMuted">Categoria: {categoria.categoriaNombre}</Text>
                </Box>
                <HStack>
                    {hasExistingTemplate && (
                        <Button colorScheme="red" variant="outline" onClick={handleDelete} isDisabled={saving}>
                            Eliminar
                        </Button>
                    )}
                    <Button colorScheme="teal" onClick={handleSave} isDisabled={!canSave} isLoading={saving}>
                        Guardar plantilla
                    </Button>
                </HStack>
            </Flex>

            <HStack gap={8} align="flex-start">
                <BandejaBusqueda onAddInsumo={handleAddInsumo} />
                <VStack w="full">
                    <Stat backgroundColor="app.surfaceSubtle" p="1em" boxShadow="md" w="full">
                        <StatLabel>Total Costo</StatLabel>
                        <StatNumber>{totalCost} ( $ COP)</StatNumber>
                        <StatHelpText>Costo base sumando los insumos de plantilla</StatHelpText>
                    </Stat>
                    <BandejaSeleccion
                        selectedInsumos={selectedInsumos}
                        onUpdateCantidad={handleUpdateCantidad}
                        onRemoveInsumo={handleRemoveInsumo}
                    />
                </VStack>
            </HStack>

            <HStack spacing={4} alignItems="flex-start">
                <FormControl w="sm">
                    <FormLabel>Rendimiento Teorico</FormLabel>
                    <CustomDecimalInput
                        value={rendimientoTeorico}
                        onChange={setRendimientoTeorico}
                        min={0}
                        placeholder="0.0000"
                    />
                </FormControl>
                <Box>
                    <FormLabel>Packaging base</FormLabel>
                    <Button colorScheme={casePack ? "green" : "blue"} onClick={() => setIsPackagingDefinerOpen(true)}>
                        {casePack ? "Packaging definido" : "Definir packaging"}
                    </Button>
                </Box>
            </HStack>

            <ProcessDesigner
                semioter2={designerProduct}
                onProcessChange={handleProcessChange}
                onValidityChange={setIsProcessValid}
            />

            <PackagingTerminadoDefiner
                isOpen={isPackagingDefinerOpen}
                onClose={() => setIsPackagingDefinerOpen(false)}
                onSave={(nuevoCasePack) => setCasePack(nuevoCasePack)}
                initialCasePack={casePack ? { ...casePack, insumosEmpaque: casePack.insumosEmpaque ?? [] } : undefined}
            />
        </Flex>
    );
}
