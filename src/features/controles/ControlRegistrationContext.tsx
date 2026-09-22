import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";

import { contextOrderLabel, formatEnumLabel } from "./controlUi";
import type { ControlRequerido } from "./types";

export default function ControlRegistrationContext({ requirement }: { requirement: ControlRequerido }) {
    const context = requirement.contexto;
    const area = context.areaOperativaNombre
        ?? (context.areaOperativaId != null ? `Área #${context.areaOperativaId}` : "Lote final");
    return (
        <Box bg="bg.subtle" borderWidth="1px" borderRadius="md" p={4}>
            <HStack justify="space-between" align="start" gap={3} flexWrap="wrap">
                <Box>
                    <Text fontWeight="bold">{requirement.planCodigo} · {requirement.planNombre}</Text>
                    <Text fontSize="sm" color="fg.muted">Versión {requirement.versionNumero} asignada al requisito #{requirement.id}</Text>
                </Box>
                <HStack flexWrap="wrap">
                    <Badge colorPalette={requirement.ambito === "PROCESO" ? "blue" : "purple"}>{requirement.ambito === "PROCESO" ? "Control de proceso" : "Control de calidad"}</Badge>
                    <Badge>{formatEnumLabel(requirement.momentoEjecucion)}</Badge>
                    <Badge>{formatEnumLabel(requirement.puntoExigencia)}</Badge>
                </HStack>
            </HStack>
            <VStack align="stretch" gap={1} mt={3} fontSize="sm">
                <Text><strong>Producto:</strong> {context.productoNombre} · {context.productoId}</Text>
                <Text><strong>Lote:</strong> {context.lote} · <strong>Orden:</strong> {contextOrderLabel(context.tipoOrden, context.ordenId, context.ordenCodigo)}</Text>
                <Text><strong>Área operativa:</strong> {area}{context.etapaNombre ? ` · Etapa: ${context.etapaNombre}` : ""}</Text>
                {context.procesoProduccionNombre && <Text><strong>Proceso:</strong> {context.procesoProduccionNombre}</Text>}
                {context.batchRecordId != null && <Text><strong>Batch Record:</strong> {context.batchRecordCodigo ?? `#${context.batchRecordId}`}</Text>}
                <Text color="fg.muted">Estos datos provienen del control pendiente seleccionado.</Text>
            </VStack>
        </Box>
    );
}
