import { Badge, Divider, Stack } from "@chakra-ui/react";
import BuscadorStockMaterialCard from "./BuscadorStockMaterialCard";
import CoberturaMaterialesCard from "./CoberturaMaterialesCard";
import {
    MovementsSection,
    OpenProductionOrdersSection,
    PendingPurchaseOrdersSection,
} from "./InformeAlmacenFlowSections";
import {
    InventoryAnalyticsSection,
    StockOverviewSection,
} from "./InformeAlmacenStockSections";
import {
    formatDateTime,
    formatPeriod,
    ReportNotes,
    SectionHeading,
} from "./InformeGlobalUi";
import type { InformeInventario } from "./informesGlobales.types";

type TrendWindow = 7 | 30 | 90;

interface InformeAlmacenPageProps {
    report: InformeInventario;
    trendWindowDays: TrendWindow;
    onTrendWindowChange: (days: TrendWindow) => void;
    refreshing: boolean;
}

export default function InformeAlmacenPage({
    report,
    trendWindowDays,
    onTrendWindowChange,
    refreshing,
}: InformeAlmacenPageProps) {
    return (
        <Stack spacing={{ base: 5, md: 6 }}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                spacing={2}
            >
                <SectionHeading
                    title="Informe global de almacén"
                    description={`Stock del almacén General al ${formatDateTime(report.fechaHoraCorteStock)}.`}
                />
                <Badge colorScheme="green">{formatPeriod(report.periodo)}</Badge>
            </Stack>

            <ReportNotes notes={report.notas} />
            <StockOverviewSection stock={report.stock} />
            <BuscadorStockMaterialCard />

            <Divider borderColor="app.border" />
            <InventoryAnalyticsSection stock={report.stock} />

            <Divider borderColor="app.border" />
            <Stack spacing={4}>
                <SectionHeading
                    title="Movimientos del periodo"
                    description="Entradas y salidas clasificadas por su origen operativo."
                />
                <MovementsSection
                    movements={report.movimientos}
                    singleDate={report.periodo.modoFecha === "FECHA_UNICA"}
                    trendWindowDays={trendWindowDays}
                    onTrendWindowChange={onTrendWindowChange}
                    refreshing={refreshing}
                />
            </Stack>

            <Divider borderColor="app.border" />
            <PendingPurchaseOrdersSection report={report.ocmPendientes} />
            {report.materialDirectoOp.items.length > 0 ? (
                <OpenProductionOrdersSection report={report.materialDirectoOp} />
            ) : null}

            <Divider borderColor="app.border" />
            <CoberturaMaterialesCard />
        </Stack>
    );
}
