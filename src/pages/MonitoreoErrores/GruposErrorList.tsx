import { useState } from "react";
import { Badge, Box, Table, Text } from "@chakra-ui/react";
import BetterPagination from "../../components/BetterPagination/BetterPagination.tsx";
import type { EstadoGrupoError, GrupoErrorResumen, SeveridadError } from "./types.ts";

interface GruposErrorListProps {
    /** Undefined indica que la consulta aun no esta disponible; [] es una consulta sin resultados. */
    grupos?: readonly GrupoErrorResumen[];
}

const ESTADOS: Record<EstadoGrupoError, { label: string; color: string }> = {
    ABIERTO: { label: "Abierto", color: "red" },
    EN_INVESTIGACION: { label: "En investigación", color: "orange" },
    RESUELTO: { label: "Resuelto", color: "green" },
};

const SEVERIDADES: Record<SeveridadError, { label: string; color: string }> = {
    BAJA: { label: "Baja", color: "gray" },
    MEDIA: { label: "Media", color: "yellow" },
    ALTA: { label: "Alta", color: "orange" },
    CRITICA: { label: "Crítica", color: "red" },
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Bogota",
});

function formatFecha(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export default function GruposErrorList({ grupos }: GruposErrorListProps) {
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const items = grupos ?? [];
    const totalPages = Math.ceil(items.length / size);
    const currentPage = Math.min(page, Math.max(0, totalPages - 1));
    const visibleItems = items.slice(currentPage * size, (currentPage + 1) * size);

    return (
        <Box>
            <Box overflowX="auto">
                <Table.Root size="sm" variant="line" minW="640px" aria-label="Grupos de errores del módulo">
                    <Table.Header bg="app.tableHeader">
                        <Table.Row>
                            <Table.ColumnHeader>Error</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader>Severidad</Table.ColumnHeader>
                            <Table.ColumnHeader textAlign="end">Eventos</Table.ColumnHeader>
                            <Table.ColumnHeader>Última aparición</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {visibleItems.length === 0 ? (
                            <Table.Row>
                                <Table.Cell colSpan={5} textAlign="center" py={12}>
                                    <Text color="app.textMuted" role="status">
                                        {grupos === undefined
                                            ? "La consulta de errores aún no está disponible."
                                            : "No hay errores registrados para este módulo."}
                                    </Text>
                                </Table.Cell>
                            </Table.Row>
                        ) : visibleItems.map((grupo) => (
                            <Table.Row key={grupo.id}>
                                <Table.Cell minW="200px" maxW="360px">
                                    <Text fontWeight="medium" overflowWrap="anywhere">{grupo.titulo}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={ESTADOS[grupo.estado].color}>
                                        {ESTADOS[grupo.estado].label}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={SEVERIDADES[grupo.severidad].color}>
                                        {SEVERIDADES[grupo.severidad].label}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell textAlign="end">{grupo.totalEventos}</Table.Cell>
                                <Table.Cell whiteSpace="nowrap">{formatFecha(grupo.ultimaAparicion)}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
            <Box mt={5}>
                <BetterPagination
                    page={currentPage}
                    size={size}
                    totalPages={totalPages}
                    totalItems={items.length}
                    previousLabel="Anterior"
                    nextLabel="Siguiente"
                    ariaLabel="Paginación de grupos de errores"
                    onPageChange={setPage}
                    onSizeChange={setSize}
                />
            </Box>
        </Box>
    );
}
