// ReporteOrdenesCompras.tsx
import { useState } from "react";
import { Button, Container, Flex, NativeSelect, Spinner, IconButton } from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import { OrdenCompraMateriales, Proveedor } from "./types";
import { format } from "date-fns";
import DateRangePicker from "../../components/DateRangePicker";
import axios from "axios";
import EndPointsURL from '../../api/EndPointsURL';
import ListaOrdenesCompra from "./components/ListaOrdenesCompra";
import MyPagination from "../../components/MyPagination";
import { EditarOcmSeleccionada } from "./components/EditarOCMSeleccionada";
import ProveedorPicker from "./components/ProveedorPicker";
import ProveedorFilterOCM from "./components/ProveedorFilterOCM";
import ColorLegendModal from "./components/ColorLegendModal";
import { LuCircleHelp } from 'react-icons/lu';

export default function ReporteOrdenesCompras() {
    const [listaOrdenesCompras, setListaOrdenesCompras] = useState<OrdenCompraMateriales[]>([]);
    const [date1, setDate1] = useState(format(new Date(), "yyyy-MM-dd"));
    const [date2, setDate2] = useState(format(new Date(), "yyyy-MM-dd"));
    const [estadoOrden_search, setEstadoOrdenSearch] = useState("0,1,2");
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    // Nuevo estado para la orden seleccionada para editar
    const [ordenToEdit, setOrdenToEdit] = useState<OrdenCompraMateriales | null>(null);
    const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
    const [isProveedorPickerOpen, setIsProveedorPickerOpen] = useState(false);
    const [isColorLegendOpen, setIsColorLegendOpen] = useState(false);

    const endPoints = new EndPointsURL();

    const onClickBuscar = async (page = 0) => {
        setLoading(true);
        try {
            const response = await axios.get(endPoints.search_ordenc_date_estado, {
                params: {
                    date1: date1,
                    date2: date2,
                    estados: estadoOrden_search,
                    page: page,
                    size: 10,
                    proveedorId: selectedProveedor?.id,
                },
            });
            const data = response.data;
            setListaOrdenesCompras(data.content);
            setTotalPages(data.totalPages);
            setCurrentPage(data.number);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page: number) => {
        onClickBuscar(page);
    };

    // Nuevo handler para cuando se selecciona una orden para editar
    const handleEditarOrden = (orden: OrdenCompraMateriales) => {
        setOrdenToEdit(orden);
    };

    // Nuevo handler para volver al panel de búsqueda
    const handleVolverABusqueda = () => {
        setOrdenToEdit(null);
        onClickBuscar(currentPage); // Refrescar la lista de órdenes
    };

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w={'full'} h={'full'}>
            {/* Renderizado condicional basado en si hay una orden seleccionada para editar */}
            {ordenToEdit ? (
                <EditarOcmSeleccionada 
                    ocm={ordenToEdit} 
                    onVolver={handleVolverABusqueda}
                />
            ) : (
                <Flex direction="column" p="1em" gap="2">
                    <Flex direction="row" gap={2} align="center" flexWrap="wrap" position="relative">
                        <DateRangePicker
                            date1={date1}
                            setDate1={setDate1}
                            date2={date2}
                            setDate2={setDate2}
                            flex_direction="column"
                        />
                        <ProveedorFilterOCM
                            selectedProveedor={selectedProveedor}
                            onOpenPicker={() => setIsProveedorPickerOpen(true)}
                            onClearFilter={() => setSelectedProveedor(null)}
                        />
                        <NativeSelect.Root>
                            <NativeSelect.Field
                                value={estadoOrden_search}
                                onChange={(e) => setEstadoOrdenSearch(e.target.value)}
                                ml={4}
                                width="200px">
                                <option value="0,1,2">Pendientes</option>
                                <option value="3">Cerradas</option>
                                <option value="-1">Canceladas</option>
                                <option value="-1,0,1,2,3">Todas</option>
                            </NativeSelect.Field>
                            <NativeSelect.Indicator />
                        </NativeSelect.Root>
                        <Button variant="solid" colorPalette="teal" onClick={() => onClickBuscar()}>
                            Buscar
                        </Button>
                        <Tooltip content="Ver convención de colores">
                            <IconButton
                                aria-label="Ayuda"
                                size="sm"
                                variant="outline"
                                colorPalette="blue"
                                onClick={() => setIsColorLegendOpen(true)}
                                ml={2}><LuCircleHelp /></IconButton>
                        </Tooltip>
                    </Flex>

                    {loading ? (
                        <Spinner mt={4} />
                    ) : (
                        <>
                            <ListaOrdenesCompra 
                                ordenes={listaOrdenesCompras} 
                                onClose4Dialogs={onClickBuscar} 
                                page={currentPage}
                                onEditarOrden={handleEditarOrden} // Nuevo prop
                            />
                            <MyPagination
                                page={currentPage}
                                totalPages={totalPages}
                                loading={loading}
                                handlePageChange={handlePageChange}
                            />
                        </>
                    )}
                </Flex>
            )}
            <ProveedorPicker
                isOpen={isProveedorPickerOpen}
                onClose={() => setIsProveedorPickerOpen(false)}
                onSelectProveedor={(proveedor) => setSelectedProveedor(proveedor)}
            />
            <ColorLegendModal 
                isOpen={isColorLegendOpen} 
                onClose={() => setIsColorLegendOpen(false)} 
            />
        </Container>
    );
}
