/**
 * QUICKFIX TEMPORAL: Se han implementado tres mejoras para evitar el error "Cannot read properties of undefined (reading 'map')":
 * 1. En la función buscarActivos: Se usa optional chaining (?.) y valores por defecto para asegurar que data.content sea siempre un array
 * 2. En la función buscarActivos: Se inicializa activos como array vacío en caso de error
 * 3. En el JSX: Se verifica que activos sea un array antes de llamar a map()
 * 
 * Solución a largo plazo: Implementar un manejo de errores más robusto y consistente en toda la aplicación,
 * posiblemente con un componente ErrorBoundary personalizado.
 */
import { useState } from 'react';
import {
    Steps,
    Button,
    Checkbox,
    Container,
    Flex,
    Input,
    NativeSelect,
    Spinner,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
import axios from 'axios';
import { format } from 'date-fns';
import EndPointsURL from '../../../api/EndPointsURL';
import MyPagination from '../../../components/MyPagination';
import { ActivoFijo, TipoActivo } from '../types';

const getEstadoText = (estado?: number) => {
    if (estado === 0) return 'Activo';
    if (estado === 1) return 'Obsoleto';
    if (estado === 2) return 'Baja';
    return '';
};

export default function ReportesActivosFijosTab() {
    const [valorBusqueda, setValorBusqueda] = useState('');
    // QUICKFIX TEMPORAL: Cambiado de 'NOMBRE' a 'POR_NOMBRE' para alinear con los valores de enum en el backend
    // El backend espera valores con prefijo "POR_" en DTO_SearchActivoFijo.TipoBusqueda
    const [tipoBusqueda, setTipoBusqueda] = useState('POR_NOMBRE');
    const [tipoActivo, setTipoActivo] = useState('');
    const [soloActivos, setSoloActivos] = useState(true);
    const [activos, setActivos] = useState<ActivoFijo[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    const endPoints = new EndPointsURL();

    const buscarActivos = async (p = 0) => {
        setLoading(true);
        try {
            const dto = {
                tipoBusqueda,
                valorBusqueda,
                // Si tipoActivo está vacío, significa que se seleccionó "Todas las categorias"
                tipoActivo: tipoActivo && tipoActivo.trim() ? tipoActivo : null,
                soloActivos,
            };

            const resp = await axios.post(endPoints.search_activos_fijos, dto, {
                params: { page: p, size: 10 },
            });

            const data = resp.data;
            // Asegurar que content siempre sea un array
            setActivos(data?.content || []);
            setTotalPages(data?.totalPages || 0);
            setPage(data?.number || 0);
        } catch (e) {
            console.error(e);
            // Establecer activos como array vacío en caso de error para evitar el error "Cannot read properties of undefined (reading 'map')"
            setActivos([]);
            setTotalPages(0);
            setPage(0);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (p: number) => buscarActivos(p);

    return (
        <Container minW={['auto', 'container.lg', 'container.xl']} w="full" h="full">
            <Flex direction="column" p="1em" gap={4}>
                <Flex gap={2} align="center" flexWrap="wrap">
                    <Input
                        placeholder="Buscar"
                        value={valorBusqueda}
                        onValueChange={(e) => setValorBusqueda(e.target.value)}
                    />
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={tipoBusqueda}
                            onValueChange={(e) => setTipoBusqueda(e.target.value)}
                            width="200px">
                            {/* QUICKFIX TEMPORAL: Valores actualizados con prefijo "POR_" para coincidir con el backend */}
                            <option value="POR_ID">ID</option>
                            <option value="POR_NOMBRE">Nombre</option>
                            <option value="POR_UBICACION">Ubicación</option>
                            <option value="POR_RESPONSABLE">Responsable</option>
                            <option value="POR_MARCA">Marca</option>
                            <option value="POR_CAPACIDAD">Capacidad</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            placeholder="Todas las categorias"
                            value={tipoActivo}
                            onValueChange={(e) => setTipoActivo(e.target.value)}
                            width="200px">
                            <option value={TipoActivo.PRODUCCION}>Producción</option>
                            <option value={TipoActivo.MOBILIARIO}>Mobiliario</option>
                            <option value={TipoActivo.EQUIPO}>Equipo</option>
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                    </NativeSelect.Root>
                    <Checkbox.Root
                        checked={soloActivos}
                        onCheckedChange={(e) => setSoloActivos(e.target.checked)}
                    ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Solo activos
                                                </Checkbox.Label></Checkbox.Root>
                    <Button
                        variant="solid"
                        colorPalette="teal"
                        onClick={() => buscarActivos()}
                        loading={loading}
                        loadingText="Buscando..."
                    >
                        Buscar
                    </Button>
                </Flex>

                {loading ? (
                    <Spinner mt={4} />
                ) : (
                    <>
                        <Table.Root size="sm">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>ID</Table.ColumnHeader>
                                    <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                                    <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                                    <Table.ColumnHeader>Ubicación</Table.ColumnHeader>
                                    <Table.ColumnHeader>Responsable</Table.ColumnHeader>
                                    <Table.ColumnHeader>Marca</Table.ColumnHeader>
                                    <Table.ColumnHeader>Capacidad</Table.ColumnHeader>
                                    <Table.ColumnHeader>Fecha Incorp.</Table.ColumnHeader>
                                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {/* Verificar que activos sea un array antes de llamar a map() */}
                                {Array.isArray(activos) && activos.map((a) => (
                                    <Table.Row key={a.id}>
                                        <Table.Cell>{a.id}</Table.Cell>
                                        <Table.Cell>{a.nombre}</Table.Cell>
                                        <Table.Cell>{a.tipo}</Table.Cell>
                                        <Table.Cell>{a.ubicacion}</Table.Cell>
                                        <Table.Cell>{a.responsable}</Table.Cell>
                                        <Table.Cell>{a.brand}</Table.Cell>
                                        <Table.Cell>{a.capacidad ?? ''}</Table.Cell>
                                        <Table.Cell>
                                            {a.fechaCodificacion
                                                ? format(
                                                      new Date(a.fechaCodificacion),
                                                      'yyyy-MM-dd'
                                                  )
                                                : ''}
                                        </Table.Cell>
                                        <Table.Cell>{getEstadoText(a.estado)}</Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                        <MyPagination
                            page={page}
                            totalPages={totalPages}
                            loading={loading}
                            handlePageChange={handlePageChange}
                        />
                    </>
                )}
            </Flex>
        </Container>
    );
}
