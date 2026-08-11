import { useState, useEffect } from 'react';
import {
    Steps,
    Flex,
    Button,
    Heading,
    Box,
    Text,
    Input,
    NativeSelect,
    Textarea,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { OrdenCompraMateriales, ItemOrdenCompra, Material, DIVISAS } from "../types.tsx";
import MateriaPrimaPicker from './MateriaPrimaPicker.tsx';
import ListaItemsOCM from './ListaItemsOCM.tsx';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import MyDatePicker from "../../../components/MyDatePicker.tsx";
import { format } from "date-fns";
import { SelectCurrencyTrm } from "../../../components/SelectCurrencyTRM/SelectCurrencyTRM";

type Props = {
    ocm: OrdenCompraMateriales;
    onVolver: () => void;
};

export function EditarOcmSeleccionada({ ocm, onVolver }: Props) {
    const [ordenActual, setOrdenActual] = useState<OrdenCompraMateriales>({
        ...ocm,
        observaciones: ocm.observaciones || "",
    });
    const [listaItemsOrdenCompra, setListaItemsOrdenCompra] = useState<ItemOrdenCompra[]>(ocm.itemsOrdenCompra);
    const [observaciones, setObservaciones] = useState(ocm.observaciones || "");
    const [isMateriaPrimaPickerOpen, setIsMateriaPrimaPickerOpen] = useState(false);
    const [ivaEnabled, setIvaEnabled] = useState(true);
    const [isFormValid, setIsFormValid] = useState(false);

    // Initialize ivaEnabled based on the actual VAT values in the order
    useEffect(() => {
        // Check if all items have VAT = 0
        const allItemsHaveZeroIVA = ocm.itemsOrdenCompra.every(item => item.ivaCOP === 0);

        // If all items have VAT = 0, disable the switch
        setIvaEnabled(!allItemsHaveZeroIVA);
    }, [ocm.itemsOrdenCompra]); // Only runs when the order changes

    // Nuevos estados para los campos adicionales
    const [condicionPago, setCondicionPago] = useState(ocm.condicionPago || "0");
    const [plazoPago, setPlazoPago] = useState(ocm.plazoPago || 30);
    const [tiempoEntrega, setTiempoEntrega] = useState(ocm.tiempoEntrega || "15");
    const [fechaVencimiento, setFechaVencimiento] = useState(
        ocm.fechaVencimiento 
            ? format(new Date(ocm.fechaVencimiento), "yyyy-MM-dd") 
            : format(new Date(), "yyyy-MM-dd")
    );

    // Estado para moneda y TRM
    const [isUSD, setIsUSD] = useState<boolean>(ocm.divisas === DIVISAS.USD);
    const currencyIsUSDTuple: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = [isUSD, setIsUSD];
    const [currentUsd2Cop, setCurrentUsd2Cop] = useState<number>(ocm.trm || (isUSD ? 0 : 1));

    // Función para actualizar el valor de TRM
    const handleTrmUpdate = (value: number) => {
        setCurrentUsd2Cop(value);
        setOrdenActual(prev => ({
            ...prev,
            trm: value
        }));
    };

    const toast = useAppToast();
    const endPoints = new EndPointsURL();

    // Función personalizada para comparar objetos de forma profunda
    const deepEqual = (obj1: any, obj2: any): boolean => {
        // Si ambos son primitivos, comparar directamente
        if (obj1 === obj2) return true;

        // Si uno es null/undefined pero el otro no, no son iguales
        if (obj1 == null || obj2 == null) return false;

        // Si no son objetos o son de diferente tipo, no son iguales
        if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

        // Si son arrays, verificar longitud y elementos
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            if (obj1.length !== obj2.length) return false;
            return obj1.every((item, index) => deepEqual(item, obj2[index]));
        }

        // Si uno es array y el otro no, no son iguales
        if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

        // Comparar las claves de ambos objetos
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) return false;

        // Verificar que todas las claves de obj1 existan en obj2 y sus valores sean iguales
        return keys1.every(key => 
            Object.prototype.hasOwnProperty.call(obj2, key) && 
            deepEqual(obj1[key], obj2[key])
        );
    };

    // Función para verificar si hay cambios en la orden
    const hasChanges = () => {
        // Comparar la orden original con la actual
        const originalOrder = {
            ...ocm,
            condicionPago: ocm.condicionPago || "0",
            plazoPago: ocm.plazoPago || 30,
            tiempoEntrega: ocm.tiempoEntrega || "15",
            fechaVencimiento: ocm.fechaVencimiento
                ? format(new Date(ocm.fechaVencimiento), "yyyy-MM-dd") + "T00:00:00"
                : format(new Date(), "yyyy-MM-dd") + "T00:00:00",
            observaciones: ocm.observaciones || "",
        };

        const currentOrder = {
            ...ordenActual,
            fechaVencimiento: fechaVencimiento + "T00:00:00"
        };

        return !deepEqual(originalOrder, currentOrder);
    };

    // Función para verificar si todos los inputs son válidos
    const areInputsValid = () => {
        // Verificar que todos los ítems tengan cantidades y precios válidos
        return listaItemsOrdenCompra.every(item => 
            item.cantidad > 0 && 
            item.precioUnitario > 0
        );
    };

    // Actualizar el estado de validación del formulario cuando cambien los datos relevantes
    useEffect(() => {
        const valid = hasChanges() && areInputsValid() && (!isUSD || (currentUsd2Cop && currentUsd2Cop > 0));
        setIsFormValid(valid);
    }, [ordenActual, listaItemsOrdenCompra, condicionPago, plazoPago, tiempoEntrega, fechaVencimiento, isUSD, currentUsd2Cop]);

    // Función para actualizar los totales
    const updateTotalesAndGetValues = () => {
        const calculatedSubTotal = listaItemsOrdenCompra.reduce(
            (sum, item) => sum + item.subTotal,
            0
        );
        const calculatedIva = Math.round(
            listaItemsOrdenCompra.reduce((sum, item) => sum + item.ivaCOP, 0)
        );
        const calculatedTotal = calculatedSubTotal + calculatedIva;

        setOrdenActual(prev => ({
            ...prev,
            subTotal: calculatedSubTotal,
            ivaCOP: calculatedIva,
            totalPagar: calculatedTotal,
            itemsOrdenCompra: listaItemsOrdenCompra,
            // Actualizar los campos adicionales
            condicionPago: condicionPago,
            plazoPago: plazoPago,
            tiempoEntrega: tiempoEntrega,
            fechaVencimiento: fechaVencimiento + "T00:00:00",
            observaciones: observaciones,
            // Actualizar moneda y TRM
            divisas: isUSD ? DIVISAS.USD : DIVISAS.COP,
            trm: isUSD ? currentUsd2Cop : 1 // When COP is selected, TRM should be 1
        }));

        // Actualizar la validación del formulario
        const valid = hasChanges() && areInputsValid() && (!isUSD || (currentUsd2Cop && currentUsd2Cop > 0));
        setIsFormValid(valid);

        return { calculatedSubTotal, calculatedIva, calculatedTotal };
    };

    // Función para añadir un nuevo material
    const handleAddMateriaPrima = (material: Material) => {
        const cantidad = 1;
        const precioUnitario = material.costo;
        const subTotal = cantidad * precioUnitario;
        const ivaPercentage = material.ivaPercentual / 100;
        const ivaCOP = ivaEnabled ? Math.round(subTotal * ivaPercentage) : 0;

        const newItem: ItemOrdenCompra = {
            material: material,
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            ivaCOP: ivaCOP,
            subTotal: subTotal,
            cantidadCorrecta: 0,
            precioCorrecto: 0,
        };

        setListaItemsOrdenCompra(prev => [...prev, newItem]);
        updateTotalesAndGetValues();
    };

    // Función para eliminar un item
    const handleRemoveItem = (index: number) => {
        const newList = listaItemsOrdenCompra.filter((_, i) => i !== index);
        setListaItemsOrdenCompra(newList);
        updateTotalesAndGetValues();
    };

    // Función para actualizar un item
    const handleUpdateItem = (
        index: number,
        field: 'cantidad' | 'precioUnitario',
        value: number
    ) => {
        const newList = [...listaItemsOrdenCompra];
        const item = newList[index];

        if (field === 'cantidad') {
            item.cantidad = value;
        } else if (field === 'precioUnitario') {
            item.precioUnitario = value;
        }

        item.subTotal = item.cantidad * item.precioUnitario;
        const ivaPercentage = item.material.ivaPercentual / 100;
        item.ivaCOP = ivaEnabled ? Math.round(item.subTotal * ivaPercentage) : 0;

        newList[index] = item;
        setListaItemsOrdenCompra(newList);
        updateTotalesAndGetValues();
    };

    // Función para alternar IVA para todos los items
    const toggleIvaForAllItems = (enabled: boolean) => {
        setIvaEnabled(enabled);
        const newList = [...listaItemsOrdenCompra];
        newList.forEach(item => {
            const ivaPercentage = item.material.ivaPercentual / 100;
            item.ivaCOP = enabled ? Math.round(item.subTotal * ivaPercentage) : 0;
        });
        setListaItemsOrdenCompra(newList);
        updateTotalesAndGetValues();
    };

    // Actualizar ordenActual cuando cambian los campos adicionales
    const handleCondicionPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setCondicionPago(value);
        // Si la condición de pago es "Contado", establecer el plazo de pago a 0
        if (value === "1") {
            setPlazoPago(0);
        }
        setOrdenActual(prev => ({
            ...prev,
            condicionPago: value
        }));
    };

    const handlePlazoPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setPlazoPago(value);
        setOrdenActual(prev => ({
            ...prev,
            plazoPago: value
        }));
    };

    const handleTiempoEntregaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTiempoEntrega(value);
        setOrdenActual(prev => ({
            ...prev,
            tiempoEntrega: value
        }));
    };

    const handleFechaVencimientoChange = (date: string) => {
        setFechaVencimiento(date);
        setOrdenActual(prev => ({
            ...prev,
            fechaVencimiento: date + "T00:00:00"
        }));
    };

    const handleObservacionesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setObservaciones(value);
        setOrdenActual(prev => ({
            ...prev,
            observaciones: value,
        }));
    };

    // Función para guardar los cambios
    const handleGuardarCambios = async () => {
        // Add validation for TRM when USD is selected
        if (isUSD && (!currentUsd2Cop || currentUsd2Cop <= 0)) {
            toast({
                title: 'TRM inválida',
                description: 'Por favor, ingrese una TRM válida mayor que cero.',
                status: 'warning',
                duration: 5000,
                isClosable: true,
            });
            return;
        }

        try {
            // Crear una copia profunda del objeto para no modificar el estado original
            const ordenToSend = JSON.parse(JSON.stringify(ordenActual));

            // Eliminar la propiedad precioUnitarioFinal de cada ítem
            // Esta propiedad es un método getter en el backend (ItemOrdenCompra.java) que calcula un valor,
            // no un campo persistente. Cuando el frontend recibe los datos, este método se serializa como propiedad.
            // Al enviar los datos de vuelta al backend, esta propiedad calculada causa un error 403 porque
            // el backend no la reconoce como un campo que pueda ser establecido.
            ordenToSend.itemsOrdenCompra.forEach(item => {
                if ('precioUnitarioFinal' in item) {
                    delete item.precioUnitarioFinal;
                }
            });

            const response = await axios.put(
                `${endPoints.update_orden_compra}/${ordenActual.ordenCompraId}`,
                ordenToSend,
                { headers: { 'Content-Type': 'application/json' } }
            );

            toast({
                title: 'Orden actualizada',
                description: 'La orden de compra ha sido actualizada exitosamente.',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            onVolver(); // Volver a la pantalla de búsqueda
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error al actualizar',
                description: 'Hubo un error al actualizar la orden de compra.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    return (
        <Flex direction="column" p="1em" gap="4">
            <Flex justify="space-between" align="center">
                <Heading size="md">Editar Orden de Compra #{ordenActual.ordenCompraId}</Heading>
                <Button colorPalette="gray" onClick={onVolver}>
                    Volver a Búsqueda
                </Button>
            </Flex>

            <Flex direction="row" gap={4}>
                <Box p={4} borderWidth="1px" borderRadius="lg" flex={2}>
                    <Text fontWeight="bold">Proveedor: {ordenActual.proveedor.nombre}</Text>
                    <Text>Fecha Emisión: {ordenActual.fechaEmision ? new Date(ordenActual.fechaEmision).toLocaleDateString() : '-'}</Text>
                </Box>
                <Flex flex={1}>
                    <Field.Root>
                        <Field.Label>Moneda y TRM</Field.Label>
                        <SelectCurrencyTrm
                            currencyIsUSD={currencyIsUSDTuple}
                            useCurrentUsd2Cop={handleTrmUpdate}
                        />
                    </Field.Root>
                </Flex>
            </Flex>

            {/* Nuevos campos de formulario */}
            <Flex direction="row" gap={4} wrap="wrap">
                <Field.Root>
                    <Field.Label>Condición de Pago</Field.Label>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={condicionPago}
                            onValueChange={handleCondicionPagoChange}
                            width="200px">
                            <option value="0">Crédito</option>
                            <option value="1">Contado</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                </Field.Root>

                <Field.Root required={condicionPago === "0"} disabled={condicionPago === "1"}>
                    <Field.Label>Plazo de pago (días)</Field.Label>
                    <Input
                        value={plazoPago}
                        onValueChange={handlePlazoPagoChange}
                        type="number"
                        min={0}
                    />
                </Field.Root>

                <Field.Root required>
                    <Field.Label>Tiempo de entrega (días)</Field.Label>
                    <Input
                        value={tiempoEntrega}
                        onValueChange={handleTiempoEntregaChange}
                    />
                </Field.Root>

                <MyDatePicker
                    date={fechaVencimiento}
                    setDate={handleFechaVencimientoChange}
                    defaultDate={format(new Date(), "yyyy-MM-dd")}
                    label={"Fecha de Vencimiento Orden"}
                />
            </Flex>

            <Field.Root>
                <Field.Label>Observaciones</Field.Label>
                <Textarea
                    value={observaciones}
                    onValueChange={handleObservacionesChange}
                    placeholder="Ingrese observaciones"
                />
            </Field.Root>

            <Button colorPalette="blue" onClick={() => setIsMateriaPrimaPickerOpen(true)}>
                Agregar Material
            </Button>

            <ListaItemsOCM
                items={listaItemsOrdenCompra}
                onRemoveItem={handleRemoveItem}
                onUpdateItem={handleUpdateItem}
                ivaEnabled={ivaEnabled}
                onToggleIva={toggleIvaForAllItems}
                currency={isUSD ? 'USD' : 'COP'}
            />

            <Flex justify="flex-end" gap={4}>
                <Button colorPalette="red" onClick={onVolver}>
                    Cancelar
                </Button>
                <Button 
                    colorPalette="teal" 
                    onClick={handleGuardarCambios}
                    disabled={!isFormValid}
                >
                    Guardar Cambios
                </Button>
            </Flex>

            {/* MateriaPrimaPicker Modal */}
            <MateriaPrimaPicker
                isOpen={isMateriaPrimaPickerOpen}
                onClose={() => setIsMateriaPrimaPickerOpen(false)}
                onSelectMateriaPrima={handleAddMateriaPrima}
            />
        </Flex>
    );
}
