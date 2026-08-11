import { Badge, Stack, Separator } from "@chakra-ui/react";
import BuscadorStockMaterialCard from "./BuscadorStockMaterialCard";
import CoberturaMaterialesCard from "./CoberturaMaterialesCard";
import InformeAlmacenAdjustmentsSection from "./InformeAlmacenAdjustmentsSection";
import { MovementsSection } from "./InformeAlmacenFlowSections";
import {
    OpenProductionOrdersSection,
    PendingPurchaseOrdersSection,
} from "./InformeAlmacenPendingSections";
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

interface InformeAlmacenPageProps {
    report: InformeInventario;
}

export default function InformeAlmacenPage({
    report,
}: InformeAlmacenPageProps) {
    return (
        <Stack gap={{ base: 5, md: 6 }}>
            <Stack
                direction={{ base: "column", md: "row" }}
                align={{ base: "flex-start", md: "center" }}
                justify="space-between"
                gap={2}
            >
                <SectionHeading
                    title="Informe global de almacén"
                    description={`Stock del almacén General al ${formatDateTime(report.fechaHoraCorteStock)}.`}
                />
                <Badge colorPalette="green">{formatPeriod(report.periodo)}</Badge>
            </Stack>

            <ReportNotes notes={report.notas} />
            <StockOverviewSection stock={report.stock} />
            <BuscadorStockMaterialCard />

            <Separator borderColor="app.border" />
            <InventoryAnalyticsSection
                stock={report.stock}
                cutoff={report.fechaHoraCorteStock}
            />

            <Separator borderColor="app.border" />
            <Stack gap={4}>
                <SectionHeading
                    title="Movimientos del periodo"
                    description="Entradas y salidas clasificadas por su origen operativo."
                />
                <MovementsSection
                    movements={report.movimientos}
                    singleDate={report.periodo.modoFecha === "FECHA_UNICA"}
                />
            </Stack>

            <Separator borderColor="app.border" />
            {report.ajustesInventario ? (
                <>
                    <InformeAlmacenAdjustmentsSection
                        adjustments={report.ajustesInventario}
                        period={report.periodo}
                    />
                    <Separator borderColor="app.border" />
                </>
            ) : null}
            <PendingPurchaseOrdersSection
                report={report.ocmPendientes}
                contractVersion={report.versionContrato}
                cutoff={report.fechaHoraCorteStock}
            />
            <OpenProductionOrdersSection
                report={report.materialDirectoOp}
                wipReport={report.wipMaterialEstimado}
                contractVersion={report.versionContrato}
                cutoff={report.fechaHoraCorteStock}
            />

            <Separator borderColor="app.border" />
            <CoberturaMaterialesCard />
        </Stack>
    );
}
