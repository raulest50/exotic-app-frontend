import {useState} from 'react';
import {
    Box, Select, FormControl, FormLabel, Flex, useDisclosure,
    Input, Card, CardBody, HStack, IconButton, Text, VStack, Button, Badge
} from "@chakra-ui/react";
import {FaSearch} from "react-icons/fa";
import {format} from "date-fns";
import {Proveedor} from "../../Compras/types.tsx";
import ProveedorFilterOCM from "../../Compras/components/ProveedorFilterOCM.tsx";
import ProveedorPicker from "../../../components/Pickers/ProveedorPicker/ProveedorPicker.tsx";
import TerminadoPicker, {TerminadoPickerResult} from "../../../components/Pickers/TerminadoPicker/TerminadoPicker.tsx";
import DateRangePicker from "../../../components/DateRangePicker.tsx";
import MyDatePicker from "../../../components/MyDatePicker.tsx";

function FiltroTranAlmacenSearch(props) {

    // La idea es que cada Mode para el conditional render corresponda a una entidad caudante
    // de @TransaccionAlmacen ( Ver model en el backend )
    enum MODE {
        OCM = 'OCM', // orden de compra de materiales
        OP = 'OP', // orden de produccion, se usa para backflush, ingreso de producto terminado a almacen
        OAA = 'OAA', // ajustes de almacen
        OD = 'OD', // dispensacion de materiales
        CM = 'CM', // carga masiva de inventario
    }

    const [viewMode, setViewMode] = useState(MODE.OCM);

    // --- OCM state ---
    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const {isOpen: isProveedorPickerOpen, onOpen: onOpenProveedorPicker, onClose: onCloseProveedorPicker} = useDisclosure();

    // --- Date state (shared across modes) ---
    type DateMode = 'range' | 'single';
    const [dateMode, setDateMode] = useState<DateMode>('range');
    const today = format(new Date(), 'yyyy-MM-dd');
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFin, setFechaFin] = useState(today);
    const [fechaEspecifica, setFechaEspecifica] = useState(today);

    // --- OD state ---
    const [odTipoFiltroId, setOdTipoFiltroId] = useState<0 | 1 | 2>(0);
    const [odTransaccionId, setOdTransaccionId] = useState('');
    const [odOrdenProduccionId, setOdOrdenProduccionId] = useState('');
    const [selectedTerminado, setSelectedTerminado] = useState<TerminadoPickerResult | null>(null);
    const {isOpen: isTerminadoPickerOpen, onOpen: onOpenTerminadoPicker, onClose: onCloseTerminadoPicker} = useDisclosure();

    function DateModeSelector() {
        return (
            <>
                <FormControl maxW="220px">
                    <FormLabel>Modo de Fecha</FormLabel>
                    <Select
                        value={dateMode}
                        onChange={(e) => setDateMode(e.target.value as DateMode)}
                    >
                        <option value="range">Rango de Fechas</option>
                        <option value="single">Fecha Específica</option>
                    </Select>
                </FormControl>

                <Box display="grid" minW="300px">
                    <Box
                        gridArea="1 / 1"
                        visibility={dateMode === 'range' ? 'visible' : 'hidden'}
                        pointerEvents={dateMode === 'range' ? 'auto' : 'none'}
                    >
                        <DateRangePicker
                            date1={fechaInicio}
                            setDate1={setFechaInicio}
                            date2={fechaFin}
                            setDate2={setFechaFin}
                            flex_direction="column"
                        />
                    </Box>
                    <Box
                        gridArea="1 / 1"
                        visibility={dateMode === 'single' ? 'visible' : 'hidden'}
                        pointerEvents={dateMode === 'single' ? 'auto' : 'none'}
                    >
                        <MyDatePicker
                            date={fechaEspecifica}
                            setDate={setFechaEspecifica}
                            defaultDate={today}
                            label="Fecha"
                        />
                    </Box>
                </Box>
            </>
        );
    }

    function ConditionalRender(){
        if(viewMode === MODE.OCM){ // ingreso materiales OCM
            return (
                <>
                    <ProveedorFilterOCM
                        selectedProveedor={proveedor}
                        onOpenPicker={onOpenProveedorPicker}
                        onClearFilter={() => setProveedor(null)}
                    />

                    <DateModeSelector />

                    <ProveedorPicker
                        isOpen={isProveedorPickerOpen}
                        onClose={onCloseProveedorPicker}
                        onSelectProveedor={(prov) => setProveedor(prov)}
                    />
                </>
            )
        }

        if(viewMode === MODE.OD){ // Dispensacion
            return (
                <>
                    {/* Filtro por ID */}
                    <FormControl maxW="220px">
                        <FormLabel>Filtrar por ID</FormLabel>
                        <Select
                            value={odTipoFiltroId.toString()}
                            onChange={(e) => {
                                const value = parseInt(e.target.value) as 0 | 1 | 2;
                                setOdTipoFiltroId(value);
                                setOdTransaccionId('');
                                setOdOrdenProduccionId('');
                            }}
                        >
                            <option value="0">Ninguno</option>
                            <option value="1">ID Transacción</option>
                            <option value="2">ID Orden de Producción</option>
                        </Select>
                    </FormControl>

                    <FormControl
                        maxW="200px"
                        visibility={odTipoFiltroId === 0 ? "hidden" : "visible"}
                        pointerEvents={odTipoFiltroId === 0 ? "none" : "auto"}
                    >
                        <FormLabel>
                            {odTipoFiltroId === 2 ? "ID Orden de Producción" : "ID de Transacción"}
                        </FormLabel>
                        <Input
                            type="number"
                            value={odTipoFiltroId === 1 ? odTransaccionId : odOrdenProduccionId}
                            onChange={(e) => {
                                if (odTipoFiltroId === 1) setOdTransaccionId(e.target.value);
                                else setOdOrdenProduccionId(e.target.value);
                            }}
                            placeholder={odTipoFiltroId === 2 ? "Ej: 456" : "Ej: 123"}
                            min="1"
                        />
                    </FormControl>

                    <DateModeSelector />

                    {/* Filtro por Producto Terminado */}
                    <Card variant="outline" borderColor="purple.200" minW="280px">
                        <CardBody>
                            <HStack justifyContent="space-between" alignItems="flex-start">
                                <HStack alignItems="flex-start" spacing={3}>
                                    <IconButton
                                        aria-label="Buscar producto terminado"
                                        icon={<FaSearch />}
                                        onClick={onOpenTerminadoPicker}
                                        size="sm"
                                        variant="outline"
                                    />
                                    <VStack spacing={0} alignItems="flex-start">
                                        <HStack>
                                            <Text fontWeight="semibold">
                                                {selectedTerminado ? selectedTerminado.nombre : "Sin filtro por producto"}
                                            </Text>
                                            {selectedTerminado?.tipo_producto && (
                                                <Badge colorScheme="purple">{selectedTerminado.tipo_producto}</Badge>
                                            )}
                                        </HStack>
                                        {selectedTerminado && (
                                            <Text fontSize="sm" color="gray.600">
                                                ID: {selectedTerminado.productoId}
                                            </Text>
                                        )}
                                    </VStack>
                                </HStack>
                                {selectedTerminado && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        colorScheme="red"
                                        onClick={() => setSelectedTerminado(null)}
                                    >
                                        Quitar filtro
                                    </Button>
                                )}
                            </HStack>
                        </CardBody>
                    </Card>

                    <TerminadoPicker
                        isOpen={isTerminadoPickerOpen}
                        onClose={onCloseTerminadoPicker}
                        onSelectTerminado={(t) => setSelectedTerminado(t)}
                    />
                </>
            )
        }

        if(viewMode === MODE.OAA){ // Ajustes de Almacen
            return (
                <>

                </>
            )
        }


    }

    return (
        <Box w="full" p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
            <Flex gap={4} wrap="wrap" alignItems="flex-end">
                <FormControl maxW="300px">
                    <FormLabel>Tipo de Transacción</FormLabel>
                    <Select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value as MODE)}
                    >
                        <option value={MODE.OCM}>Ingreso de Materiales (OCM) </option>
                        {/*<option value={MODE.OP}>Ingreso Producto Terminado (OP) </option>*/}
                        <option value={MODE.OAA}>Ajustes de Almacén</option>
                        <option value={MODE.OD}>Dispensación de Materiales</option>
                        <option value={MODE.CM}>Carga Masiva de Inventario</option>
                    </Select>
                </FormControl>

                <ConditionalRender />
            </Flex>
        </Box>
    );
}
export default FiltroTranAlmacenSearch;
