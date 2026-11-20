import { Badge, Box, Field, HStack, Input, Text, VStack } from "@chakra-ui/react";
import {
    cantidadReporteProduccionValida,
    type ConfiguracionReporteProduccionEtapa,
    type HistorialReporteProduccionEtapa,
    type ReporteProduccionEtapaDato,
} from "./areaOperativaPanel.types";

interface Props {
    configuracion: ConfiguracionReporteProduccionEtapa;
    cantidades: Record<string, string>;
    onChange: (productoId: string, cantidad: string) => void;
    esNodoFinal: boolean;
    cantidadFinal: string;
    disabled?: boolean;
}

export default function ReporteProduccionEtapaFields({ configuracion, cantidades, onChange, esNodoFinal, cantidadFinal, disabled }: Props) {
    if (!configuracion.requerido) return null;
    return <VStack align="stretch" gap={3} borderWidth="1px" borderColor="app.border" borderRadius="md" p={3}>
        <Text fontWeight="semibold">Cantidad observada en esta etapa</Text>
        <Text fontSize="sm" color="app.textSubtle">Expresa cada cantidad en la unidad del producto de referencia. La observación no implica fabricación final ni ingreso a inventario y no se suma a la cantidad final de la orden.</Text>
        {!configuracion.productos.length && <Text role="alert" color="fg.error">No están disponibles los productos que debe reportar esta etapa. Actualiza el tablero antes de continuar.</Text>}
        {configuracion.productos.map(producto => {
            const usaCantidadFinal = esNodoFinal && producto.productoFinalOrden;
            const cantidad = usaCantidadFinal ? cantidadFinal : cantidades[producto.productoId] ?? "";
            return <Field.Root key={producto.productoId} required={!usaCantidadFinal} disabled={disabled}
                invalid={!usaCantidadFinal && cantidad !== "" && !cantidadReporteProduccionValida(cantidad)}>
                <Field.Label>{producto.productoNombre} ({producto.unidadMedida})</Field.Label>
                <Text fontSize="xs" color="app.textSubtle">{producto.productoId}</Text>
                {usaCantidadFinal ? <>
                    <Text>{cantidadFinal || "Pendiente de registrar"}{cantidadFinal ? ` ${producto.unidadMedida}` : ""}</Text>
                    <Field.HelperText>Se usa la cantidad final indicada arriba; no necesitas registrarla de nuevo.</Field.HelperText>
                </> : <>
                    <Input type="text" inputMode="decimal" value={cantidad} placeholder="Cantidad mayor que cero"
                        onChange={event => onChange(producto.productoId, event.target.value.replace(",", "."))} />
                    <Field.HelperText>Mayor que cero, con hasta cuatro decimales.</Field.HelperText>
                    <Field.ErrorText>Ingresa una cantidad positiva con hasta cuatro decimales.</Field.ErrorText>
                </>}
            </Field.Root>;
        })}
    </VStack>;
}

function ReporteItems({ reportes }: { reportes: ReporteProduccionEtapaDato[] }) {
    return <VStack as="ul" align="stretch" gap={1} pl={4} mt={1} fontSize="sm">
        {reportes.map(reporte => <Text as="li" key={reporte.productoId}>
            {reporte.productoNombre} · {reporte.productoId}: {reporte.cantidad} {reporte.unidadMedida}
        </Text>)}
    </VStack>;
}

export function ReporteProduccionEtapaResumen({ reportes, historial }: {
    reportes?: ReporteProduccionEtapaDato[] | null;
    historial?: HistorialReporteProduccionEtapa[] | null;
}) {
    const anteriores = historial?.filter(evento => !evento.vigente && evento.reportesProduccion.length) ?? [];
    const vigente = historial?.find(evento => evento.vigente);
    if (!reportes?.length && !anteriores.length) return null;
    return <Box mt={2} borderTopWidth="1px" borderColor="app.border" pt={2}>
        {!!reportes?.length && <>
            <Text fontSize="sm" fontWeight="semibold">Cantidad observada en esta etapa</Text>
            {(vigente?.fechaEvento || vigente?.usuario) && <HStack gap={2} flexWrap="wrap" fontSize="xs" color="app.textSubtle">
                {vigente.fechaEvento && <Text>{vigente.fechaEvento.replace("T", " ")}</Text>}
                {vigente.usuario && <Text>{vigente.usuario}</Text>}
            </HStack>}
            <ReporteItems reportes={reportes} />
        </>}
        {anteriores.length > 0 && <Box as="details" mt={2}>
            <Box as="summary" cursor="pointer" fontSize="sm">Reportes anteriores ({anteriores.length})</Box>
            <VStack align="stretch" gap={2} mt={2}>
                {anteriores.map(evento => <Box key={evento.eventoId} p={2} bg="app.surfaceSubtle" borderRadius="md">
                    <HStack gap={2} flexWrap="wrap"><Badge variant="outline">Anterior</Badge>
                        {evento.fechaEvento && <Text fontSize="xs">{evento.fechaEvento.replace("T", " ")}</Text>}
                        {evento.usuario && <Text fontSize="xs">{evento.usuario}</Text>}
                    </HStack>
                    <ReporteItems reportes={evento.reportesProduccion} />
                </Box>)}
            </VStack>
        </Box>}
        <Text fontSize="xs" color="app.textSubtle" mt={1}>En la unidad del producto de referencia; no implica fabricación final ni ingreso a inventario.</Text>
    </Box>;
}
