import { memo } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
    NumberInput,
    NumberInputField,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import type { TerminadoConVentas } from "../PlaneacionProduccionService";
import type { ColumnVisibility } from "./step1Distribucion.utils";
import { formatCantidad, formatMoneda } from "./step1Distribucion.utils";

interface TablaDistribucionTerminadosProps {
    pageData: TerminadoConVentas[];
    columnVisibility: ColumnVisibility;
    necesidades: Record<string, number>;
    draftNecesidades: Record<string, string>;
    setDraftNecesidades: Dispatch<SetStateAction<Record<string, string>>>;
    setNecesidades: Dispatch<SetStateAction<Record<string, number>>>;
    startNecesidadesTransition: (callback: () => void) => void;
    acumulados: number[];
    pageStartIndex: number;
}

const NUMERIC_DRAFT_PATTERN = /^\d*(?:[.,]\d*)?$/;

function parseDraftNecesidad(value: string): number | null {
    const normalized = value.replace(",", ".").trim();
    if (!normalized || normalized === ".") {
        return null;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return null;
    }

    return parsed;
}

interface NecesidadCellProps {
    productoId: string;
    currentValue: number | undefined;
    draftValue: string | undefined;
    setDraftNecesidades: Dispatch<SetStateAction<Record<string, string>>>;
    setNecesidades: Dispatch<SetStateAction<Record<string, number>>>;
    startNecesidadesTransition: (callback: () => void) => void;
}

const NecesidadCell = memo(function NecesidadCell({
    productoId,
    currentValue,
    draftValue,
    setDraftNecesidades,
    setNecesidades,
    startNecesidadesTransition,
}: NecesidadCellProps) {
    const displayValue = draftValue !== undefined ? draftValue : currentValue !== undefined ? String(currentValue) : "";

    const handleChange = (valueAsString: string) => {
        if (valueAsString !== "" && !NUMERIC_DRAFT_PATTERN.test(valueAsString)) {
            return;
        }

        setDraftNecesidades((prev) => ({
            ...prev,
            [productoId]: valueAsString,
        }));

        const parsedValue = parseDraftNecesidad(valueAsString);
        if (parsedValue === null) {
            return;
        }

        startNecesidadesTransition(() => {
            setNecesidades((prev) => ({
                ...prev,
                [productoId]: parsedValue,
            }));
        });
    };

    const handleBlur = () => {
        const normalizedValue = parseDraftNecesidad(displayValue) ?? 0;

        startNecesidadesTransition(() => {
            setNecesidades((prev) => ({
                ...prev,
                [productoId]: normalizedValue,
            }));
        });

        setDraftNecesidades((prev) => {
            if (!(productoId in prev)) {
                return prev;
            }

            const next = { ...prev };
            delete next[productoId];
            return next;
        });
    };

    return (
        <NumberInput.Root
            size="sm"
            min={0}
            clampValueOnBlur={false}
            allowOverflow={true}
            value={String(displayValue)}
            onValueChange={handleChange}
            w="110px"
        >
            <NumberInput.Input
                textAlign="right"
                placeholder="0"
                inputMode="decimal"
                onBlur={handleBlur}
            />
        </NumberInput.Root>
    );
});

function TablaDistribucionTerminadosComponent({
    pageData,
    columnVisibility,
    necesidades,
    draftNecesidades,
    setDraftNecesidades,
    setNecesidades,
    startNecesidadesTransition,
    acumulados,
    pageStartIndex,
}: TablaDistribucionTerminadosProps) {
    return (
        <Table.ScrollArea w="full" minW={0} overflowX="auto">
            <Table.Root size="sm" variant="simple" colorPalette="teal">
                <Table.Header>
                    <Table.Row>
                        {columnVisibility.index && <Table.ColumnHeader>#</Table.ColumnHeader>}
                        {columnVisibility.codigo && <Table.ColumnHeader>Codigo</Table.ColumnHeader>}
                        {columnVisibility.descripcion && <Table.ColumnHeader>Descripcion</Table.ColumnHeader>}
                        {columnVisibility.categoria && <Table.ColumnHeader>Categoria</Table.ColumnHeader>}
                        {columnVisibility.cantidadVendida && <Table.ColumnHeader textAlign='end'>Cantidad Vendida</Table.ColumnHeader>}
                        {columnVisibility.valorTotal && <Table.ColumnHeader textAlign='end'>Valor Total</Table.ColumnHeader>}
                        {columnVisibility.porcentajeParticipacion && <Table.ColumnHeader textAlign='end'>% Participacion</Table.ColumnHeader>}
                        {columnVisibility.porcentajeAcumulado && <Table.ColumnHeader textAlign='end'>% Acumulado</Table.ColumnHeader>}
                        {columnVisibility.stockActual && <Table.ColumnHeader textAlign='end'>Stock Actual</Table.ColumnHeader>}
                        {columnVisibility.necesidad && <Table.ColumnHeader textAlign='end'>Necesidad</Table.ColumnHeader>}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {pageData.map((fila, localIdx) => {
                        const globalIdx = pageStartIndex + localIdx;
                        const acum = acumulados[globalIdx];
                        const prevAcum = globalIdx > 0 ? acumulados[globalIdx - 1] : 0;
                        const isParetoRow = prevAcum < 80 && acum >= 80;
                        const isAbovePareto = acum <= 80;

                        return (
                            <Table.Row
                                key={fila.terminado.productoId}
                                bg={isAbovePareto ? "teal.50" : undefined}
                                borderBottom={isParetoRow ? "3px solid" : undefined}
                                borderBottomColor={isParetoRow ? "orange.400" : undefined}
                            >
                                {columnVisibility.index && (
                                    <Table.Cell fontWeight={isParetoRow ? "bold" : "normal"}>{globalIdx + 1}</Table.Cell>
                                )}
                                {columnVisibility.codigo && <Table.Cell>{fila.terminado.productoId}</Table.Cell>}
                                {columnVisibility.descripcion && <Table.Cell>{fila.terminado.nombre}</Table.Cell>}
                                {columnVisibility.categoria && <Table.Cell>{fila.terminado.categoria?.categoriaNombre ?? "-"}</Table.Cell>}
                                {columnVisibility.cantidadVendida && (
                                    <Table.Cell textAlign='end'>{formatCantidad(fila.cantidad_vendida)}</Table.Cell>
                                )}
                                {columnVisibility.valorTotal && (
                                    <Table.Cell textAlign='end'>{formatMoneda(fila.valor_total)}</Table.Cell>
                                )}
                                {columnVisibility.porcentajeParticipacion && (
                                    <Table.Cell textAlign='end'>{fila.porcentaje_participacion.toFixed(2)}%</Table.Cell>
                                )}
                                {columnVisibility.porcentajeAcumulado && (
                                    <Table.Cell
                                        fontWeight={isParetoRow ? "bold" : "normal"}
                                        color={isParetoRow ? "orange.600" : undefined}
                                        textAlign='end'
                                    >
                                        {acum.toFixed(2)}%
                                    </Table.Cell>
                                )}
                                {columnVisibility.stockActual && (
                                    <Table.Cell
                                        color={fila.stockActualConsolidado < 0 ? "red.500" : undefined}
                                        fontWeight={fila.stockActualConsolidado < 0 ? "bold" : "normal"}
                                        textAlign='end'
                                    >
                                        {formatCantidad(fila.stockActualConsolidado)}
                                    </Table.Cell>
                                )}
                                {columnVisibility.necesidad && (
                                    <Table.Cell textAlign='end'>
                                        <NecesidadCell
                                            productoId={fila.terminado.productoId}
                                            currentValue={necesidades[fila.terminado.productoId]}
                                            draftValue={draftNecesidades[fila.terminado.productoId]}
                                            setDraftNecesidades={setDraftNecesidades}
                                            setNecesidades={setNecesidades}
                                            startNecesidadesTransition={startNecesidadesTransition}
                                        />
                                    </Table.Cell>
                                )}
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

const TablaDistribucionTerminados = memo(TablaDistribucionTerminadosComponent);

export default TablaDistribucionTerminados;
