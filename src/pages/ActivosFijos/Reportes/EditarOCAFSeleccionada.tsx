import { useState, useEffect } from 'react';
import {
    Flex,
    Button,
    Heading,
    Box,
    Text,
    Input,
    NativeSelect,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Tfoot,
    Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import { OrdenCompraActivo, ItemOrdenCompraActivo, DIVISAS, getEstadoOCAFText } from "../types";
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL';
import MyDatePicker from "../../../components/MyDatePicker";
import { format } from "date-fns";
import { formatCOP } from '../../../utils/formatters';
import { SelectCurrencyTrm } from "../../../components/SelectCurrencyTRM/SelectCurrencyTRM";
type Props = {
    ocaf: OrdenCompraActivo;
    onVolver: () => void;
    accessLevel: number;
};

export function EditarOCAFSeleccionada({ ocaf, onVolver, accessLevel }: Props) {
    const [ordenActual, setOrdenActual] = useState<OrdenCompraActivo>({...ocaf});
    const [listaItemsOrdenCompra, setListaItemsOrdenCompra] = useState<ItemOrdenCompraActivo[]>(ocaf.itemsOrdenCompra || []);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isEditable, setIsEditable] = useState(false);

    // Estados para los campos editables
    const [condicionPago, setCondicionPago] = useState(ocaf.condicionPago || "0");
    const [plazoPago, setPlazoPago] = useState(ocaf.plazoPago || 30);
    const [tiempoEntrega, setTiempoEntrega] = useState(ocaf.tiempoEntrega || "15");
    const [fechaVencimiento, setFechaVencimiento] = useState(
        ocaf.fechaVencimiento 
            ? format(new Date(ocaf.fechaVencimiento), "yyyy-MM-dd") 
            : format(new Date(), "yyyy-MM-dd")
    );

    // Estado para moneda y TRM
    const [isUSD, setIsUSD] = useState<boolean>(ocaf.divisa === 'USD');
    const currencyIsUSDTuple: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = [isUSD, setIsUSD];
    const [currentUsd2Cop, setCurrentUsd2Cop] = useState<number>(ocaf.trm || (isUSD ? 0 : 1));

    const toast = useAppToast();
    const endpoints = new EndPointsURL();

    // Verificar si el usuario tiene permisos para editar
    useEffect(() => {
        setIsEditable(accessLevel >= 2 && ocaf.estado <= 0);
    }, [accessLevel, ocaf.estado]);

    // Función para actualizar el valor de TRM
    const handleTrmUpdate = (value: number) => {
        setCurrentUsd2Cop(value);
        setOrdenActual(prev => ({
            ...prev,
            trm: value
        }));
    };

    // Función para verificar si hay cambios en la orden
    const hasChanges = () => {
        const originalOrder = {
            ...ocaf,
            condicionPago: ocaf.condicionPago || "0",
            plazoPago: ocaf.plazoPago || 30,
            tiempoEntrega: ocaf.tiempoEntrega || "15",
            fechaVencimiento: ocaf.fechaVencimiento 
                ? format(new Date(ocaf.fechaVencimiento), "yyyy-MM-dd") + "T00:00:00"
                : format(new Date(), "yyyy-MM-dd") + "T00:00:00"
        };

        const currentOrder = {
            ...ordenActual,
            fechaVencimiento: fechaVencimiento + "T00:00:00"
        };

        // Comparación simplificada para este ejemplo
        return JSON.stringify(originalOrder) !== JSON.stringify(currentOrder);
    };

    // Actualizar el estado de validación del formulario cuando cambien los datos relevantes
    useEffect(() => {
        const valid = hasChanges() && (!isUSD || (currentUsd2Cop && currentUsd2Cop > 0));
        setIsFormValid(valid);
    }, [ordenActual, condicionPago, plazoPago, tiempoEntrega, fechaVencimiento, isUSD, currentUsd2Cop]);

    // Actualizar ordenActual cuando cambian los campos
    const handleCondicionPagoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setCondicionPago(value);
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

    // Función para guardar los cambios
    const handleGuardarCambios = async () => {
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
            // Crear una copia del objeto para no modificar el estado original
            const ordenToSend = {
                ...ordenActual,
                divisa: isUSD ? 'USD' : 'COP',
                trm: isUSD ? currentUsd2Cop : 1,
                fechaVencimiento: fechaVencimiento + "T00:00:00",
                condicionPago,
                plazoPago,
                tiempoEntrega
            };

            await axios.put(
                endpoints.update_orden_compra_activo.replace('{ordenCompraActivoId}', String(ordenActual.ordenCompraActivoId)),
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

            onVolver();
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
                <Heading size="md">
                    {isEditable ? 'Editar' : 'Ver'} Orden de Compra AF #{ordenActual.ordenCompraActivoId}
                </Heading>
                <Button colorPalette="gray" onClick={onVolver}>
                    Volver a Búsqueda
                </Button>
            </Flex>

            <Flex direction="row" gap={4}>
                <Box p={4} borderWidth="1px" borderRadius="lg" flex={2}>
                    <Text fontWeight="bold">Proveedor: {ordenActual.proveedor?.nombre}</Text>
                    <Text>Fecha Emisión: {ordenActual.fechaEmision ? new Date(ordenActual.fechaEmision).toLocaleDateString() : '-'}</Text>
                    <Text>Estado: {getEstadoOCAFText(ordenActual.estado)}</Text>
                </Box>
                {isEditable && (
                    <Flex flex={1}>
                        <Field.Root>
                            <Field.Label>Moneda y TRM</Field.Label>
                            <SelectCurrencyTrm
                                currencyIsUSD={currencyIsUSDTuple}
                                useCurrentUsd2Cop={handleTrmUpdate}
                            />
                        </Field.Root>
                    </Flex>
                )}
            </Flex>

            {/* Campos de formulario editables */}
            {isEditable ? (
                <Flex direction="row" gap={4} wrap="wrap">
                    <Field.Root>
                        <Field.Label>Condición de Pago</Field.Label>
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={condicionPago}
                                onChange={handleCondicionPagoChange}
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
                            onChange={handlePlazoPagoChange}
                            type="number"
                            min={0}
                        />
                    </Field.Root>

                    <Field.Root required>
                        <Field.Label>Tiempo de entrega (días)</Field.Label>
                        <Input
                            value={tiempoEntrega}
                            onChange={handleTiempoEntregaChange}
                        />
                    </Field.Root>

                    <MyDatePicker
                        date={fechaVencimiento}
                        setDate={handleFechaVencimientoChange}
                        defaultDate={format(new Date(), "yyyy-MM-dd")}
                        label={"Fecha de Vencimiento Orden"}
                    />
                </Flex>
            ) : (
                <Box p={4} borderWidth="1px" borderRadius="lg">
                    <Text><strong>Condición de Pago:</strong> {condicionPago === "0" ? "Crédito" : "Contado"}</Text>
                    <Text><strong>Plazo de Pago:</strong> {plazoPago} días</Text>
                    <Text><strong>Tiempo de Entrega:</strong> {tiempoEntrega} días</Text>
                    <Text><strong>Fecha Vencimiento:</strong> {fechaVencimiento}</Text>
                    <Text><strong>Moneda:</strong> {isUSD ? 'USD' : 'COP'}</Text>
                    {isUSD && <Text><strong>TRM:</strong> {formatCOP(currentUsd2Cop)}</Text>}
                </Box>
            )}

            {/* Tabla de items */}
            <Box overflowX="auto">
                <Table.Root variant="simple" size="sm">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Cantidad</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Precio Unitario</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>IVA</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='end'>Subtotal</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {listaItemsOrdenCompra.map(item => (
                            <Table.Row key={item.itemOrdenId}>
                                <Table.Cell>{item.itemOrdenId}</Table.Cell>
                                <Table.Cell>{item.nombre}</Table.Cell>
                                <Table.Cell textAlign='end'>{item.cantidad}</Table.Cell>
                                <Table.Cell textAlign='end'>{formatCOP(item.precioUnitario)}</Table.Cell>
                                <Table.Cell textAlign='end'>{formatCOP(item.ivaValue)}</Table.Cell>
                                <Table.Cell textAlign='end'>{formatCOP(item.subTotal)}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                    <Table.Footer>
                        <Table.Row>
                            <Table.Cell colSpan={4} textAlign="right"><strong>SubTotal:</strong></Table.Cell>
                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(ordenActual.subTotal)}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell colSpan={4} textAlign="right"><strong>IVA:</strong></Table.Cell>
                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(ordenActual.iva)}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                            <Table.Cell colSpan={4} textAlign="right"><strong>Total a Pagar:</strong></Table.Cell>
                            <Table.Cell colSpan={2} textAlign='end'>{formatCOP(ordenActual.totalPagar)}</Table.Cell>
                        </Table.Row>
                    </Table.Footer>
                </Table.Root>
            </Box>

            {/* Botones de acción */}
            {isEditable && (
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
            )}
        </Flex>
    );
}

export default EditarOCAFSeleccionada;