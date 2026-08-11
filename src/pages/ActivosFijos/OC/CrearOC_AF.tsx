// CrearOrdenCompraActivos.tsx
import {
    Steps,
    Container,
    Flex,
    Input,
    NativeSelect,
    Button,
    HStack,
    Icon,
    VStack,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import ProveedorCard from "../../Compras/components/ProveedorCard.tsx";
import { useState, useRef } from "react";
import { FaFileCircleQuestion, FaFileCircleCheck } from "react-icons/fa6";
import {ItemOrdenCompraActivo, OrdenCompraActivo} from "../types.tsx"
import {Proveedor} from "../../Compras/types.tsx"
import ProveedorPicker from "../../Compras/components/ProveedorPicker.tsx";
import MyDatePicker from "../../../components/MyDatePicker.tsx";
import { addDays, format, parse } from "date-fns";
import ListaItemsOCA from "./ListaItemsOCA.tsx";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";

// Importar el componente SelectCurrencyTrm
import { SelectCurrencyTrm } from "../../../components/SelectCurrencyTRM/SelectCurrencyTRM";

export default function CrearOC_AF() {
    const endpoints = new EndPointsURL();
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
    const [isProveedorPickerOpen, setIsProveedorPickerOpen] = useState(false);

    // State for Activos
    const [listaItemsActivos, setListaItemsActivos] = useState<ItemOrdenCompraActivo[]>([]);

    const [plazoPago, setPlazoPago] = useState(30);
    const [condicionPago, setCondicionPago] = useState("0");
    const [tiempoEntrega, setTiempoEntrega] = useState("15");
    const [fechaVencimiento, setFechaVencimiento] = useState(
        format(addDays(new Date(), 30), "yyyy-MM-dd")
    );

    // Replace cotizacionUrl with cotizacionFile
    const [cotizacionFile, setCotizacionFile] = useState<File | null>(null);
    // Ref for hidden file input
    const cotizacionInputRef = useRef<HTMLInputElement>(null);

    // Estados para el manejo de moneda y TRM
    const [isUSD, setIsUSD] = useState<boolean>(false);
    const currencyIsUSDTuple: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = [isUSD, setIsUSD];
    const [currentUsd2Cop, setCurrentUsd2Cop] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    const toast = useAppToast();

    // Handle file selection for cotización
    const handleCotizacionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                toast({
                    title: "Tipo de archivo no permitido",
                    description: "Solo se permiten archivos PDF para la cotización.",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                e.target.value = "";
                return;
            }
            setCotizacionFile(file);
        }
    };

    // Función para validar si la orden de compra es válida
    const isValidOCAF = (): boolean => {
        // Validar que haya un proveedor seleccionado
        if (!selectedProveedor) {
            return false;
        }

        // Validar que la lista de items no esté vacía
        if (listaItemsActivos.length === 0) {
            return false;
        }

        // Validar que todos los items tengan datos válidos
        for (const item of listaItemsActivos) {
            if (!item.nombre || item.nombre.trim() === '') {
                return false;
            }
            if (item.cantidad <= 0) {
                return false;
            }
            if (item.precioUnitario <= 0) {
                return false;
            }
        }

        // Validar otros campos requeridos
        if (!tiempoEntrega || tiempoEntrega.trim() === '') {
            return false;
        }

        if (condicionPago === "0" && (!plazoPago || plazoPago <= 0)) {
            return false;
        }

        return true;
    };

    // Función para actualizar el valor de TRM
    const handleTrmUpdate = (value: number) => {
        setCurrentUsd2Cop(value);
    };

    const crearOCFA = async () => {
        if (!isValidOCAF()) {
            toast({
                title: "Error de validación",
                description: "Por favor complete todos los campos requeridos",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            // Activar estado de carga
            setIsLoading(true);

            // Crear objeto de orden de compra
            const ordenCompra: OrdenCompraActivo = {
                fechaEmision: new Date(),
                fechaVencimiento: parse(fechaVencimiento, "yyyy-MM-dd", new Date()),
                proveedor: selectedProveedor!,
                subTotal: listaItemsActivos.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0),
                iva: listaItemsActivos.reduce((sum, item) => sum + item.ivaValue * item.cantidad, 0),
                totalPagar: listaItemsActivos.reduce((sum, item) => sum + item.subTotal, 0),
                condicionPago: condicionPago,
                tiempoEntrega: tiempoEntrega,
                plazoPago: plazoPago,
                cotizacionUrl: "", // This will be set by the backend
                estado: 0, // pendiente liberación
                divisa: isUSD ? 'USD' : 'COP',
                trm: currentUsd2Cop,
                itemsOrdenCompra: listaItemsActivos.map(item => ({
                    ...item,
                    itemOrdenId: undefined
                }))
            };

            // Create FormData and append the JSON data as a Blob
            const formData = new FormData();
            formData.append(
                "ordenCompraActivo",
                new Blob([JSON.stringify(ordenCompra)], { type: "application/json" })
            );

            // Append the cotizacion file if it exists
            if (cotizacionFile) {
                formData.append("cotizacionFile", cotizacionFile);
            }

            // Enviar al backend con Content-Type: multipart/form-data
            const response = await axios.post(endpoints.save_orden_compra_activo, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.status === 201) {
                toast({
                    title: "Orden de compra creada",
                    description: `Orden de compra #${response.data.ordenCompraActivoId} creada exitosamente`,
                    status: "success",
                    duration: 5000,
                    isClosable: true,
                });
                clearAll();
            }
        } catch (error) {
            console.error("Error al crear orden de compra:", error);
            toast({
                title: "Error",
                description: "Ocurrió un error al crear la orden de compra",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            // Desactivar estado de carga independientemente del resultado
            setIsLoading(false);
        }
    };

    const clearAll = () => {
        setSelectedProveedor(null);
        setListaItemsActivos([]);
        setPlazoPago(30);
        setCondicionPago("0");
        setTiempoEntrega("15");
        setFechaVencimiento(format(addDays(new Date(), 30), "yyyy-MM-dd"));
        setIsProveedorPickerOpen(false);
        setIsUSD(false);
        setCurrentUsd2Cop(0);
        setCotizacionFile(null); // Reset cotizacionFile instead of cotizacionUrl

        // Reset the file input value if it exists
        if (cotizacionInputRef.current) {
            cotizacionInputRef.current.value = "";
        }
    }

    return (
        <Container minW={['auto','container.lg','container.xl']} w="full" h="full">
            <Flex direction="column" p={0} m={0} w="full" h="full" gap={10}>

                <Flex direction={"row"} gap={2} w={"full"} h={"full"} p={"1em"} >
                    <Flex flex={2} w={"full"}>
                        <ProveedorCard
                            selectedProveedor={selectedProveedor}
                            onSearchClick={() => setIsProveedorPickerOpen(true)}
                        />
                    </Flex>
                    <Flex flex={1} w={"full"} direction={"column"} gap={4}>
                        {/* Componente de selección de moneda y TRM */}
                        <Field.Root>
                            <Field.Label>Moneda y TRM</Field.Label>
                            <SelectCurrencyTrm
                                currencyIsUSD={currencyIsUSDTuple}
                                useCurrentUsd2Cop={handleTrmUpdate}
                            />
                        </Field.Root>

                        {/* File upload component moved here */}
                        <Field.Root>
                            <Field.Label>Archivo de Cotización (PDF) (Opcional)</Field.Label>
                            <VStack gap={4} align="stretch" alignItems="center">
                                <Icon
                                    as={cotizacionFile ? FaFileCircleCheck : FaFileCircleQuestion}
                                    boxSize="4em"
                                    color={cotizacionFile ? "green" : "orange.500"}
                                />
                                <Button 
                                    onClick={() => {
                                        // Usar setTimeout para asegurar que el click se ejecute después del renderizado
                                        setTimeout(() => {
                                            if (cotizacionInputRef.current) {
                                                cotizacionInputRef.current.click();
                                            }
                                        }, 0);
                                    }}
                                >
                                    {cotizacionFile ? "Cambiar archivo" : "Seleccionar archivo"}
                                </Button>
                                {cotizacionFile && (
                                    <HStack>
                                        <Button 
                                            size="sm" 
                                            colorPalette="red" 
                                            onClick={() => {
                                                setCotizacionFile(null);
                                                if (cotizacionInputRef.current) {
                                                    cotizacionInputRef.current.value = "";
                                                }
                                            }}
                                        >
                                            Eliminar
                                        </Button>
                                        <Field.Label mb={0}>{cotizacionFile.name}</Field.Label>
                                    </HStack>
                                )}
                            </VStack>
                            {/* Mover el input fuera del VStack */}
                            <Input
                                type="file"
                                ref={cotizacionInputRef}
                                style={{ display: 'none' }}
                                accept="application/pdf"
                                onValueChange={handleCotizacionChange}
                            />
                        </Field.Root>
                    </Flex>
                </Flex>

                <Flex direction={"column"} mt={"1em"} w="full" h="full" gap={"2"} p={"1em"}>
                    <Flex direction={"row"} gap={"2"} >
                        <Field.Root>
                            <Field.Label> Condicion de Pago</Field.Label>
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={condicionPago}
                                    onValueChange={(e) => {
                                        setCondicionPago(e.target.value)
                                        if (e.target.value == "1") setPlazoPago(0);
                                    }
                                    }
                                    ml={4}
                                    width="200px">
                                    <option value="0">Credito</option>
                                    <option value="1">Contado</option>
                                    <option value="2">Mixto</option>
                                </NativeSelect.Field>
                                <NativeSelect.Indicator />
                            </NativeSelect.Root>
                        </Field.Root>

                        <Field.Root required={condicionPago == "0"} disabled={condicionPago == "1"}>
                            <Field.Label>Plazo de pago (dias)</Field.Label>
                            <Input
                                value={plazoPago}
                                onValueChange={ (e) => {setPlazoPago(Number(e.target.value))} }
                            />
                        </Field.Root>

                        <Field.Root required>
                            <Field.Label>Tiempo de entrega (dias)</Field.Label>
                            <Input
                                value={tiempoEntrega}
                                onValueChange={ (e) => {setTiempoEntrega(e.target.value)} }
                            />
                        </Field.Root>

                        <MyDatePicker
                            date = {fechaVencimiento}
                            setDate = {setFechaVencimiento}
                            defaultDate = {format(new Date(), "yyyy-MM-dd")}
                            label = {"Fecha de Vencimiento Orden"}
                        />
                    </Flex>

                </Flex>

                {/* pass down Activos list + setter */}
                <ListaItemsOCA
                    items={listaItemsActivos}
                    setItems={setListaItemsActivos}
                />

                <HStack gap={20}>
                    <Button
                        colorPalette={"red"}
                        variant={"solid"}
                        onClick={clearAll}
                    >
                        Limpiar Campos
                    </Button>

                    <Button
                        colorPalette={"teal"}
                        variant={"solid"}
                        onClick={crearOCFA}
                        disabled={!isValidOCAF()}
                        loading={isLoading}
                        loadingText="Creando orden..."
                    >
                        Crear Orden de Compra
                    </Button>

                </HStack>

            </Flex>

            <ProveedorPicker
                isOpen={isProveedorPickerOpen}
                onClose={() => setIsProveedorPickerOpen(false)}
                onSelectProveedor={(p) => setSelectedProveedor(p)}
            />
        </Container>
    );
}
