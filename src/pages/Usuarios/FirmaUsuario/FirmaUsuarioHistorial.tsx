import { Badge, Box, Table, Text } from "@chakra-ui/react";
import type { FirmaVisualUsuarioVersion } from "./firmaUsuario.types";

interface FirmaUsuarioHistorialProps {
    versiones: FirmaVisualUsuarioVersion[];
}

function formatDateTime(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("es-CO", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(date);
}

export default function FirmaUsuarioHistorial({ versiones }: FirmaUsuarioHistorialProps) {
    if (versiones.length === 0) {
        return (
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <Text fontSize="sm" color="app.textMuted">Este usuario aún no tiene versiones registradas.</Text>
            </Box>
        );
    }

    return (
        <Box overflowX="auto" borderWidth="1px" borderRadius="md">
            <Table.Root size="sm" variant="line">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>Versión</Table.ColumnHeader>
                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                        <Table.ColumnHeader>Vigencia</Table.ColumnHeader>
                        <Table.ColumnHeader>Configurada por</Table.ColumnHeader>
                        <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                        <Table.ColumnHeader>Retiro</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {versiones.map((version) => (
                        <Table.Row key={version.id}>
                            <Table.Cell>{version.version}</Table.Cell>
                            <Table.Cell>
                                <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>
                                    {version.estado}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell minW="150px">
                                <Text fontSize="xs">Desde: {formatDateTime(version.vigenteDesde)}</Text>
                                <Text fontSize="xs">Hasta: {formatDateTime(version.vigenteHasta)}</Text>
                            </Table.Cell>
                            <Table.Cell minW="160px">
                                <Text fontSize="sm">{version.configuradaPorNombre}</Text>
                                <Text fontSize="xs" color="app.textMuted">
                                    {version.configuradaPorUsername}
                                </Text>
                            </Table.Cell>
                            <Table.Cell minW="180px">{version.motivoCambio}</Table.Cell>
                            <Table.Cell minW="200px">
                                {version.estado === "RETIRADA" ? (
                                    <>
                                        <Text fontSize="sm">{version.motivoRetiro ?? "—"}</Text>
                                        <Text fontSize="xs" color="app.textMuted">
                                            {version.retiradaPorNombre ?? version.retiradaPorUsername ?? "—"}
                                        </Text>
                                    </>
                                ) : "—"}
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
        </Box>
    );
}
