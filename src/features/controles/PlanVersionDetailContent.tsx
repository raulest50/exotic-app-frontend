import { Alert, Badge, Box, Grid, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { CONTROL_SCOPE_LABEL, formatControlDate, formatEnumLabel } from "./controlUi";
import { planBooleanValue, planNumericValue, planReference } from "./planVersionView";
import StatusBadge from "./StatusBadge";
import type { AplicabilidadPlanControl, CaracteristicaPlanControl, PlanControl, VersionPlanControl } from "./types";

function DetailField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Text fontSize="xs" color="fg.muted">{label}</Text>
            <Text fontSize="sm" whiteSpace="pre-wrap" overflowWrap="anywhere">{children ?? "No definido"}</Text>
        </Box>
    );
}

function ApplicabilityDetail({ rule, ambito, index }: { rule: AplicabilidadPlanControl; ambito: PlanControl["ambito"]; index: number }) {
    const excludedIds = [...new Set([
        ...rule.productosExcluidosIds,
        ...(rule.productosExcluidos ?? []).map((product) => product.productoId),
    ])];
    const pointLabel = rule.puntoAplicacion === "LOTE_FINAL"
        ? "Salida final del lote"
        : ambito === "PROCESO" ? "Dentro de la operación" : "Salida de la operación";

    return (
        <Box borderWidth="1px" borderRadius="md" p={4}>
            <Text fontWeight="semibold" mb={3}>Aplicación {index + 1}</Text>
            {rule.legadoGlobal && (
                <Alert.Root status="info" mb={3}>
                    <Alert.Indicator />
                    <Text fontSize="sm">Aplicación global heredada, sin una ubicación específica en la ruta.</Text>
                </Alert.Root>
            )}
            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                <DetailField label="Producto">{planReference(rule.productoNombre, rule.productoId, "Producto")}</DetailField>
                <DetailField label="Categoría">{planReference(rule.categoriaNombre, rule.categoriaId, "Categoría")}</DetailField>
                <DetailField label="Tipo de orden">{rule.tipoOrden === "AMBAS" ? "OP y OF" : rule.tipoOrden}</DetailField>
                <DetailField label="Punto de aplicación">{pointLabel}</DetailField>
                <DetailField label="Área operativa">{planReference(rule.areaOperativaNombre, rule.areaOperativaId, "Área")}</DetailField>
                <DetailField label="Proceso de producción">{planReference(rule.procesoProduccionNombre, rule.procesoProduccionId, "Proceso")}</DetailField>
                <DetailField label="Nodo de la ruta">{rule.frontendNodeId || "Sin nodo específico registrado"}</DetailField>
                <DetailField label="Momento de ejecución">{formatEnumLabel(rule.momentoEjecucion)}</DetailField>
                <DetailField label="Punto de exigencia">{formatEnumLabel(rule.puntoExigencia)}</DetailField>
                <Box gridColumn={{ md: "1 / -1" }}>
                    <Text fontSize="xs" color="fg.muted" mb={1}>Productos excluidos</Text>
                    {excludedIds.length ? excludedIds.map((id) => (
                        <Text key={id} fontSize="sm" overflowWrap="anywhere">
                            {planReference(rule.productosExcluidos?.find((product) => product.productoId === id)?.nombre, id, "Producto")}
                        </Text>
                    )) : <Text fontSize="sm">Ninguno</Text>}
                </Box>
            </Grid>
        </Box>
    );
}

function MeasurementDetail({ measurement }: { measurement: CaracteristicaPlanControl }) {
    return (
        <Box borderWidth="1px" borderRadius="md" p={4}>
            <HStack justify="space-between" flexWrap="wrap" mb={3}>
                <Text fontWeight="semibold">{measurement.orden}. {measurement.nombre}</Text>
                <Badge>{measurement.tipo === "NUMERICA" ? "Numérica" : "Booleana"}</Badge>
            </HStack>
            {measurement.requiereDepuracion && (
                <Alert.Root status="warning" mb={3}>
                    <Alert.Indicator />
                    <Text fontSize="sm">Esta medición histórica requiere depuración de sus catálogos.</Text>
                </Alert.Root>
            )}
            <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                <DetailField label="Magnitud">
                    {planReference(measurement.magnitudNombre, measurement.magnitudCodigo ?? measurement.magnitudId, "Magnitud")}
                </DetailField>
                {measurement.tipo === "NUMERICA" ? (
                    <>
                        <DetailField label="Unidad">
                            {planReference(measurement.unidadNombre, measurement.unidadCodigo ?? measurement.unidadId, "Unidad")}
                            {measurement.unidadSimbolo ? ` · ${measurement.unidadSimbolo}` : ""}
                        </DetailField>
                        <DetailField label="Decimales visibles">{measurement.escala}</DetailField>
                        <DetailField label="Objetivo">{planNumericValue(measurement.objetivo, measurement.escala)}</DetailField>
                        <DetailField label="Límite inferior">{planNumericValue(measurement.limiteInferior, measurement.escala)}</DetailField>
                        <DetailField label="Límite superior">{planNumericValue(measurement.limiteSuperior, measurement.escala)}</DetailField>
                    </>
                ) : (
                    <DetailField label="Valor esperado">{planBooleanValue(measurement.valorBooleanoEsperado)}</DetailField>
                )}
                <DetailField label="Muestras">{measurement.cantidadMuestras}</DetailField>
                <DetailField label="Unidades por muestra">{measurement.unidadesPorMuestra}</DetailField>
            </Grid>
        </Box>
    );
}

export default function PlanVersionDetailContent({ plan, version }: {
    plan: Omit<PlanControl, "versiones">;
    version: VersionPlanControl;
}) {
    return (
        <VStack align="stretch" gap={6}>
            <Box>
                <HStack mb={3} flexWrap="wrap">
                    <Badge colorPalette={plan.ambito === "CALIDAD" ? "purple" : "blue"}>{CONTROL_SCOPE_LABEL[plan.ambito]}</Badge>
                    <StatusBadge status={version.estado} />
                </HStack>
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                    <DetailField label="Nombre del plan">{plan.nombre}</DetailField>
                    <DetailField label="Propósito">{version.proposito || "No definido"}</DetailField>
                    <Box gridColumn={{ md: "1 / -1" }}><DetailField label="Motivo del cambio">{version.motivoCambio || "No definido"}</DetailField></Box>
                    <DetailField label="Responsable de ejecución">{version.responsableEjecucion || "No definido"}</DetailField>
                    <DetailField label="Responsable de revisión">{version.responsableRevision || "No definido"}</DetailField>
                    <DetailField label="Responsable de disposición">{version.responsableDisposicion || "No definido"}</DetailField>
                    <DetailField label="Creada">{formatControlDate(version.creadaEn)}</DetailField>
                    <DetailField label="Publicada">{formatControlDate(version.publicadaEn)}</DetailField>
                    <DetailField label="Retirada">{formatControlDate(version.retiradaEn)}</DetailField>
                </Grid>
            </Box>
            <VStack align="stretch" gap={3}>
                <Heading size="sm">Aplicaciones y ubicaciones ({version.aplicabilidades.length})</Heading>
                {version.aplicabilidades.map((rule, index) => (
                    <ApplicabilityDetail key={rule.id ?? index} rule={rule} ambito={plan.ambito} index={index} />
                ))}
                {!version.aplicabilidades.length && <Text color="fg.muted">Sin aplicaciones registradas.</Text>}
            </VStack>
            <VStack align="stretch" gap={3}>
                <Heading size="sm">Mediciones ({version.caracteristicas.length})</Heading>
                {[...version.caracteristicas].sort((left, right) => left.orden - right.orden).map((measurement, index) => (
                    <MeasurementDetail key={measurement.id ?? index} measurement={measurement} />
                ))}
                {!version.caracteristicas.length && <Text color="fg.muted">Sin mediciones registradas.</Text>}
            </VStack>
        </VStack>
    );
}
