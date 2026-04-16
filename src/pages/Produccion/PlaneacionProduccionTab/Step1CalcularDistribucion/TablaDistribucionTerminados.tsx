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
        <NumberInput
            size="sm"
            min={0}
            clampValueOnBlur={false}
            keepWithinRange={false}
            value={displayValue}
            onChange={handleChange}
            w="110px"
        >
            <NumberInputField
                textAlign="right"
                placeholder="0"
                inputMode="decimal"
                onBlur={handleBlur}
            />
        </NumberInput>
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
        <TableContainer w="full" minW={0} overflowX="auto">
            <Table size="sm" variant="simple" colorScheme="teal">
                <Thead>
                    <Tr>
                        {columnVisibility.index && <Th>#</Th>}
                        {columnVisibility.codigo && <Th>Codigo</Th>}
                        {columnVisibility.descripcion && <Th>Descripcion</Th>}
                        {columnVisibility.categoria && <Th>Categoria</Th>}
                        {columnVisibility.cantidadVendida && <Th isNumeric>Cantidad Vendida</Th>}
                        {columnVisibility.valorTotal && <Th isNumeric>Valor Total</Th>}
                        {columnVisibility.porcentajeParticipacion && <Th isNumeric>% Participacion</Th>}
                        {columnVisibility.porcentajeAcumulado && <Th isNumeric>% Acumulado</Th>}
                        {columnVisibility.stockActual && <Th isNumeric>Stock Actual</Th>}
                        {columnVisibility.necesidad && <Th isNumeric>Necesidad</Th>}
                    </Tr>
                </Thead>
                <Tbody>
                    {pageData.map((fila, localIdx) => {
                        const globalIdx = pageStartIndex + localIdx;
                        const acum = acumulados[globalIdx];
                        const prevAcum = globalIdx > 0 ? acumulados[globalIdx - 1] : 0;
                        const isParetoRow = prevAcum < 80 && acum >= 80;
                        const isAbovePareto = acum <= 80;

                        return (
                            <Tr
                                key={fila.terminado.productoId}
                                bg={isAbovePareto ? "teal.50" : undefined}
                                borderBottom={isParetoRow ? "3px solid" : undefined}
                                borderBottomColor={isParetoRow ? "orange.400" : undefined}
                            >
                                {columnVisibility.index && (
                                    <Td fontWeight={isParetoRow ? "bold" : "normal"}>{globalIdx + 1}</Td>
                                )}
                                {columnVisibility.codigo && <Td>{fila.terminado.productoId}</Td>}
                                {columnVisibility.descripcion && <Td>{fila.terminado.nombre}</Td>}
                                {columnVisibility.categoria && <Td>{fila.terminado.categoria?.categoriaNombre ?? "-"}</Td>}
                                {columnVisibility.cantidadVendida && (
                                    <Td isNumeric>{formatCantidad(fila.cantidad_vendida)}</Td>
                                )}
                                {columnVisibility.valorTotal && (
                                    <Td isNumeric>{formatMoneda(fila.valor_total)}</Td>
                                )}
                                {columnVisibility.porcentajeParticipacion && (
                                    <Td isNumeric>{fila.porcentaje_participacion.toFixed(2)}%</Td>
                                )}
                                {columnVisibility.porcentajeAcumulado && (
                                    <Td
                                        isNumeric
                                        fontWeight={isParetoRow ? "bold" : "normal"}
                                        color={isParetoRow ? "orange.600" : undefined}
                                    >
                                        {acum.toFixed(2)}%
                                    </Td>
                                )}
                                {columnVisibility.stockActual && (
                                    <Td
                                        isNumeric
                                        color={fila.stockActualConsolidado < 0 ? "red.500" : undefined}
                                        fontWeight={fila.stockActualConsolidado < 0 ? "bold" : "normal"}
                                    >
                                        {formatCantidad(fila.stockActualConsolidado)}
                                    </Td>
                                )}
                                {columnVisibility.necesidad && (
                                    <Td isNumeric>
                                        <NecesidadCell
                                            productoId={fila.terminado.productoId}
                                            currentValue={necesidades[fila.terminado.productoId]}
                                            draftValue={draftNecesidades[fila.terminado.productoId]}
                                            setDraftNecesidades={setDraftNecesidades}
                                            setNecesidades={setNecesidades}
                                            startNecesidadesTransition={startNecesidadesTransition}
                                        />
                                    </Td>
                                )}
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>
        </TableContainer>
    );
}

const TablaDistribucionTerminados = memo(TablaDistribucionTerminadosComponent);

export default TablaDistribucionTerminados;
