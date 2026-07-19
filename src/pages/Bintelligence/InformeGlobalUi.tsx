import {
    Alert,
    AlertIcon,
    Box,
    Card,
    CardBody,
    Center,
    Heading,
    HStack,
    Spinner,
    Stack,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
} from "@chakra-ui/react";
import type { NotaInforme, PeriodoInforme } from "./informesGlobales.types";

interface KpiCardProps {
    label: string;
    value: string;
    help: string;
}

export function KpiCard({ label, value, help }: KpiCardProps) {
    return (
        <Card variant="outline" minW={0}>
            <CardBody p={{ base: 3, md: 4 }}>
                <Stat minW={0}>
                    <StatLabel fontSize="sm" noOfLines={2}>
                        {label}
                    </StatLabel>
                    <StatNumber
                        fontSize={{ base: "xl", md: "2xl" }}
                        lineHeight="shorter"
                        overflowWrap="anywhere"
                        mt={1}
                    >
                        {value}
                    </StatNumber>
                    <StatHelpText mb={0} mt={2} noOfLines={2}>
                        {help}
                    </StatHelpText>
                </Stat>
            </CardBody>
        </Card>
    );
}

export function SectionHeading({ title, description }: {
    title: string;
    description?: string;
}) {
    return (
        <Box>
            <Heading as="h3" size="sm">
                {title}
            </Heading>
            {description ? (
                <Text color="app.textMuted" fontSize="sm" mt={1}>
                    {description}
                </Text>
            ) : null}
        </Box>
    );
}

export function LoadingPanel({ label }: { label: string }) {
    return (
        <Card variant="outline">
            <CardBody>
                <Center minH="160px">
                    <HStack spacing={3}>
                        <Spinner color="green.500" />
                        <Text color="app.textMuted">{label}</Text>
                    </HStack>
                </Center>
            </CardBody>
        </Card>
    );
}

export function ErrorPanel({ message }: { message: string }) {
    return (
        <Alert status="error" variant="left-accent" borderRadius="md">
            <AlertIcon />
            {message}
        </Alert>
    );
}

export function EmptyPanel({ message }: { message: string }) {
    return (
        <Card variant="outline">
            <CardBody>
                <Center minH="120px">
                    <Text color="app.textMuted" textAlign="center">
                        {message}
                    </Text>
                </Center>
            </CardBody>
        </Card>
    );
}

export function ReportNotes({ notes }: { notes: NotaInforme[] }) {
    if (notes.length === 0) return null;

    return (
        <Stack spacing={2}>
            {notes.map((note, index) => (
                <Alert
                    key={`${note.tipo}-${index}`}
                    status={note.tipo === "WARNING" ? "warning" : "info"}
                    variant="left-accent"
                    borderRadius="md"
                >
                    <AlertIcon />
                    {note.mensaje}
                </Alert>
            ))}
        </Stack>
    );
}

export function formatInteger(value: number) {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

export function formatQuantity(value: number) {
    return value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
}

export function formatCurrency(value: number) {
    return value.toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    });
}

export function formatPercent(value?: number | null) {
    if (value === null || value === undefined) return "No estimable";
    return `${value.toLocaleString("es-CO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })}%`;
}

export function formatDate(value: string) {
    if (!value) return "Sin fecha";
    return new Intl.DateTimeFormat("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function formatDateTime(value: string) {
    if (!value) return "Sin fecha";
    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
}

export function formatPeriod(period: PeriodoInforme) {
    if (period.modoFecha === "FECHA_UNICA") return formatDate(period.fechaDesde);
    return `${formatDate(period.fechaDesde)} – ${formatDate(period.fechaHasta)}`;
}

export function formatQuantities(
    quantities: Array<{ unidadMedida: string; cantidad: number }>,
) {
    if (quantities.length === 0) return "Sin cantidades";
    return quantities
        .map((item) => `${formatQuantity(item.cantidad)} ${item.unidadMedida}`)
        .join(" · ");
}
