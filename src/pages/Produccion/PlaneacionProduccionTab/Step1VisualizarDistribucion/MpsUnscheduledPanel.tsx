import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Box, SimpleGrid, Text, Tooltip } from "@chakra-ui/react";
import type { PropuestaMpsUnscheduledBlockDTO } from "../PlaneacionProduccionService";
import { formatNumber, getUnscheduledDroppableId } from "./mpsCalendar.utils";

interface MpsUnscheduledPanelProps {
    items: PropuestaMpsUnscheduledBlockDTO[];
}

function UnscheduledCard({ block }: { block: PropuestaMpsUnscheduledBlockDTO }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: block.blockId,
        data: { blockId: block.blockId, categoriaId: block.categoriaId },
    });

    return (
        <Tooltip label={block.warning ?? block.reason} openDelay={250}>
            <Box
                ref={setNodeRef}
                transform={CSS.Translate.toString(transform)}
                opacity={isDragging ? 0.45 : 1}
                cursor="grab"
                borderWidth="1px"
                borderColor="orange.200"
                borderRadius="md"
                bg="orange.50"
                p={3}
                {...listeners}
                {...attributes}
            >
                <Text fontWeight="semibold" fontSize="sm" noOfLines={2}>{block.productoNombre}</Text>
                <Text fontSize="xs" color="gray.600">{block.productoId}</Text>
                <Text fontSize="xs" mt={1}>{block.lotesAsignados} lotes - {formatNumber(block.cantidadAsignada)} und</Text>
                <Badge mt={2} colorScheme="orange">{block.reason}</Badge>
            </Box>
        </Tooltip>
    );
}

export default function MpsUnscheduledPanel({ items }: MpsUnscheduledPanelProps) {
    const { setNodeRef, isOver } = useDroppable({ id: getUnscheduledDroppableId() });

    return (
        <Box
            ref={setNodeRef}
            bg={isOver ? "orange.100" : "white"}
            borderRadius="md"
            boxShadow="sm"
            p={4}
            borderWidth="1px"
            borderColor={isOver ? "orange.300" : "orange.100"}
        >
            <Text fontWeight="bold" mb={3}>No programados</Text>
            {items.length === 0 ? (
                <Text color="gray.500" fontSize="sm">No hay bloques fuera del calendario.</Text>
            ) : (
                <SimpleGrid columns={[1, 1, 2, 3]} gap={3}>
                    {items.map((block) => (
                        <UnscheduledCard key={block.blockId} block={block} />
                    ))}
                </SimpleGrid>
            )}
        </Box>
    );
}
