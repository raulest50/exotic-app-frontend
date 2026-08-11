import {
    Steps,
    Badge,
    Box,
    Heading,
    IconButton,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from '@chakra-ui/react';
import {useState} from 'react';
import type {ReactNode} from 'react';
import type {Insumo} from '../../types.tsx';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

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
            <Table.Row>
                <Table.Cell>
                    <Box pl={nivelActual * 4} display="flex" alignItems="center" gap={2}>
                        {hasSubInsumos && !isMaterial && (
                            <IconButton
                                aria-label={isExpanded ? 'Ocultar insumos' : 'Ver insumos'}
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <LuChevronDown /> : <LuChevronRight />}</IconButton>
                        )}
                        <Box>
                            <Heading size="sm">{producto?.nombre ?? 'Producto sin nombre'}</Heading>
                            <Text fontSize="sm" color="app.textMuted">ID: {producto?.productoId ?? 'N/D'}</Text>
                        </Box>
                    </Box>
                </Table.Cell>
                <Table.Cell>{producto?.productoId ?? 'N/D'}</Table.Cell>
                <Table.Cell>
                    <Badge colorPalette={badge.colorScheme}>{badge.label}</Badge>
                </Table.Cell>
                <Table.Cell fontWeight="semibold">
                    {formatCantidad(insumo.cantidadRequerida)} {producto?.tipoUnidades ?? ''}
                </Table.Cell>
            </Table.Row>

            {hasSubInsumos && !isMaterial && isExpanded && (
                <Table.Row>
                    <Table.Cell colSpan={4} p={0}>
                        <Box pl={(nivelActual + 1) * 4} py={2}>
                            <Table.Root size="sm" variant="simple">
                                <Table.Body>{renderSubRows(subInsumos ?? [], nivelActual + 1)}</Table.Body>
                            </Table.Root>
                        </Box>
                    </Table.Cell>
                </Table.Row>
            )}

            {!hasSubInsumos && !isMaterial && (
                <Table.Row>
                    <Table.Cell colSpan={4} p={0}>
                        <Text color="app.textSubtle" pl={nivelActual * 4} py={2}>
                            Sin insumos definidos para este producto.
                        </Text>
                    </Table.Cell>
                </Table.Row>
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
                <Table.Root variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Producto</Table.ColumnHeader>
                            <Table.ColumnHeader>ID</Table.ColumnHeader>
                            <Table.ColumnHeader>Tipo</Table.ColumnHeader>
                            <Table.ColumnHeader>Cantidad requerida</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>{renderRows(lista, nivel)}</Table.Body>
                </Table.Root>
            )}
        </Box>
    );
}
