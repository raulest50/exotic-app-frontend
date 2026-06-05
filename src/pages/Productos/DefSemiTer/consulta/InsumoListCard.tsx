import {ChevronDownIcon, ChevronRightIcon} from '@chakra-ui/icons';
import {Badge, Box, Heading, IconButton, Table, Tbody, Td, Text, Th, Thead, Tr} from '@chakra-ui/react';
import {useState} from 'react';
import type {ReactNode} from 'react';
import type {Insumo} from '../../types.tsx';

type Props = {
    insumos?: Insumo[] | null;
    nivel?: number;
    titulo?: string;
};

type ProductoConInsumos = Insumo['producto'] & { insumos?: Insumo[] };

const formatCantidad = (cantidad?: number) => {
    if (typeof cantidad !== 'number' || Number.isNaN(cantidad)) {
        return '0';
    }
    return cantidad.toLocaleString('es-CO', { maximumFractionDigits: 2 });
};

const tipoBadge = (tipo?: string) => {
    switch (tipo) {
    case 'M':
        return { label: 'Material', colorScheme: 'blue' as const };
    case 'S':
        return { label: 'Semiterminado', colorScheme: 'orange' as const };
    case 'T':
        return { label: 'Terminado', colorScheme: 'green' as const };
    default:
        return { label: 'Producto', colorScheme: 'gray' as const };
    }
};

function InsumoRow({
    insumo,
    nivelActual,
    renderSubRows,
}: {
    insumo: Insumo;
    nivelActual: number;
    renderSubRows: (subInsumos: Insumo[], nivel: number) => ReactNode;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const producto = insumo.producto as ProductoConInsumos;
    const badge = tipoBadge(producto?.tipo_producto);
    const subInsumos = (insumo as unknown as { insumos?: Insumo[] }).insumos ?? producto?.insumos;
    const hasSubInsumos = Array.isArray(subInsumos) && subInsumos.length > 0;
    const isMaterial = producto?.tipo_producto === 'M';

    return (
        <>
            <Tr>
                <Td>
                    <Box pl={nivelActual * 4} display="flex" alignItems="center" gap={2}>
                        {hasSubInsumos && !isMaterial && (
                            <IconButton
                                aria-label={isExpanded ? 'Ocultar insumos' : 'Ver insumos'}
                                icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsExpanded(!isExpanded)}
                            />
                        )}
                        <Box>
                            <Heading size="sm">{producto?.nombre ?? 'Producto sin nombre'}</Heading>
                            <Text fontSize="sm" color="app.textMuted">ID: {producto?.productoId ?? 'N/D'}</Text>
                        </Box>
                    </Box>
                </Td>
                <Td>{producto?.productoId ?? 'N/D'}</Td>
                <Td>
                    <Badge colorScheme={badge.colorScheme}>{badge.label}</Badge>
                </Td>
                <Td fontWeight="semibold">
                    {formatCantidad(insumo.cantidadRequerida)} {producto?.tipoUnidades ?? ''}
                </Td>
            </Tr>

            {hasSubInsumos && !isMaterial && isExpanded && (
                <Tr>
                    <Td colSpan={4} p={0}>
                        <Box pl={(nivelActual + 1) * 4} py={2}>
                            <Table size="sm" variant="simple">
                                <Tbody>{renderSubRows(subInsumos ?? [], nivelActual + 1)}</Tbody>
                            </Table>
                        </Box>
                    </Td>
                </Tr>
            )}

            {!hasSubInsumos && !isMaterial && (
                <Tr>
                    <Td colSpan={4} p={0}>
                        <Text color="app.textSubtle" pl={nivelActual * 4} py={2}>
                            Sin insumos definidos para este producto.
                        </Text>
                    </Td>
                </Tr>
            )}
        </>
    );
}

export default function InsumoListCard({ insumos, nivel = 0, titulo }: Props) {
    const lista = Array.isArray(insumos) ? insumos : [];

    const renderRows = (insumosList: Insumo[], nivelActual: number): ReactNode =>
        insumosList.map((insumo, index) => (
            <InsumoRow
                key={`${insumo.producto?.productoId ?? index}-${index}`}
                insumo={insumo}
                nivelActual={nivelActual}
                renderSubRows={renderRows}
            />
        ));

    return (
        <Box>
            {titulo && (
                <Heading size="md" mb={4} pl={nivel * 4}>
                    {titulo}
                </Heading>
            )}

            {!lista.length ? (
                <Text color="app.textSubtle" pl={nivel * 4}>
                    Sin insumos para mostrar.
                </Text>
            ) : (
                <Table variant="simple">
                    <Thead>
                        <Tr>
                            <Th>Producto</Th>
                            <Th>ID</Th>
                            <Th>Tipo</Th>
                            <Th>Cantidad requerida</Th>
                        </Tr>
                    </Thead>
                    <Tbody>{renderRows(lista, nivel)}</Tbody>
                </Table>
            )}
        </Box>
    );
}
