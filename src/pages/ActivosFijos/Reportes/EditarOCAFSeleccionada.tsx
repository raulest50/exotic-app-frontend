import { useState, useEffect } from 'react';
import { 
    Flex, 
    Button, 
    Heading, 
    Box, 
    Text,
    useToast,
    FormControl,
    FormLabel,
    Input,
    Select,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Tfoot
} from '@chakra-ui/react';
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

    const toast = useToast();
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
                <Button colorScheme="gray" onClick={onVolver}>
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
                        <FormControl>
                            <FormLabel>Moneda y TRM</FormLabel>
                            <SelectCurrencyTrm
                                currencyIsUSD={currencyIsUSDTuple}
                                useCurrentUsd2Cop={handleTrmUpdate}
                            />
                        </FormControl>
                    </Flex>
                )}
            </Flex>

            {/* Campos de formulario editables */}
            {isEditable ? (
                <Flex direction="row" gap={4} wrap="wrap">
                    <FormControl>
                        <FormLabel>Condición de Pago</FormLabel>
                        <Select
                            value={condicionPago}
                            onChange={handleCondicionPagoChange}
                            width="200px"
                        >
                            <option value="0">Crédito</option>
                            <option value="1">Contado</option>
                        </Select>
                    </FormControl>

                    <FormControl isRequired={condicionPago === "0"} isDisabled={condicionPago === "1"}>
                        <FormLabel>Plazo de pago (días)</FormLabel>
                        <Input
                            value={plazoPago}
                            onChange={handlePlazoPagoChange}
                            type="number"
                            min={0}
                        />
                    </FormControl>

                    <FormControl isRequired>
                        <FormLabel>Tiempo de entrega (días)</FormLabel>
                        <Input
                            value={tiempoEntrega}
                            onChange={handleTiempoEntregaChange}
                        />
                    </FormControl>

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
                <Table variant="simple" size="sm">
                    <Thead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Descripción</Th>
                            <Th isNumeric>Cantidad</Th>
                            <Th isNumeric>Precio Unitario</Th>
                            <Th isNumeric>IVA</Th>
                            <Th isNumeric>Subtotal</Th>
                        </Tr>
                    </Thead>
                    <Tbody>
                        {listaItemsOrdenCompra.map(item => (
                            <Tr key={item.itemOrdenId}>
                                <Td>{item.itemOrdenId}</Td>
                                <Td>{item.nombre}</Td>
                                <Td isNumeric>{item.cantidad}</Td>
                                <Td isNumeric>{formatCOP(item.precioUnitario)}</Td>
                                <Td isNumeric>{formatCOP(item.ivaValue)}</Td>
                                <Td isNumeric>{formatCOP(item.subTotal)}</Td>
                            </Tr>
                        ))}
                    </Tbody>
                    <Tfoot>
                        <Tr>
                            <Td colSpan={4} textAlign="right"><strong>SubTotal:</strong></Td>
                            <Td isNumeric colSpan={2}>{formatCOP(ordenActual.subTotal)}</Td>
                        </Tr>
                        <Tr>
                            <Td colSpan={4} textAlign="right"><strong>IVA:</strong></Td>
                            <Td isNumeric colSpan={2}>{formatCOP(ordenActual.iva)}</Td>
                        </Tr>
                        <Tr>
                            <Td colSpan={4} textAlign="right"><strong>Total a Pagar:</strong></Td>
                            <Td isNumeric colSpan={2}>{formatCOP(ordenActual.totalPagar)}</Td>
                        </Tr>
                    </Tfoot>
                </Table>
            </Box>

            {/* Botones de acción */}
            {isEditable && (
                <Flex justify="flex-end" gap={4}>
                    <Button colorScheme="red" onClick={onVolver}>
                        Cancelar
                    </Button>
                    <Button 
                        colorScheme="teal" 
                        onClick={handleGuardarCambios}
                        isDisabled={!isFormValid}
                    >
                        Guardar Cambios
                    </Button>
                </Flex>
            )}
        </Flex>
    );
}

export default EditarOCAFSeleccionada;