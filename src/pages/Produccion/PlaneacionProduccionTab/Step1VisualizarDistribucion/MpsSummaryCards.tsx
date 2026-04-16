import { Box, Flex, Text } from "@chakra-ui/react";
import type { PropuestaMpsSemanalSummaryDTO } from "../PlaneacionProduccionService";
import type { CalendarInsights } from "./mpsCalendar.utils";
import { formatNumber } from "./mpsCalendar.utils";

interface MpsSummaryCardsProps {
    summary: PropuestaMpsSemanalSummaryDTO;
    insights: CalendarInsights;
}

export default function MpsSummaryCards({ summary, insights }: MpsSummaryCardsProps) {
    const cards = [
        { label: "Terminados evaluados", value: String(summary.totalTerminadosEvaluados) },
        { label: "Categorias programadas", value: String(insights.categoriasProgramadas) },
        { label: "Categorias con sobrecarga", value: String(insights.categoriasConSobrecarga) },
        { label: "Lotes propuestos", value: String(summary.totalLotesPropuestos) },
        { label: "Unidades propuestas", value: formatNumber(summary.totalUnidadesPropuestas) },
        { label: "No programados", value: String(insights.noProgramados) },
    ];

    return (
        <Flex gap={4} wrap="wrap">
            {cards.map((card) => (
                <Box key={card.label} bg="white" borderRadius="md" boxShadow="sm" p={4} minW="180px">
                    <Text fontSize="sm" color="gray.500">{card.label}</Text>
                    <Text fontWeight="bold" fontSize="lg">{card.value}</Text>
                </Box>
            ))}
        </Flex>
    );
}
