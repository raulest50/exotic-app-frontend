import { Badge, Box, HStack, Image, Text } from "@chakra-ui/react";
import type {
    FirmaVisualSeleccionada,
    FirmaVisualUsuarioVersion,
} from "./firmaUsuario.types";

interface FirmaUsuarioPreviewProps {
    title: string;
    dataUrl: string | null;
    version?: FirmaVisualUsuarioVersion | null;
    seleccionada?: FirmaVisualSeleccionada | null;
    emptyText: string;
}

export default function FirmaUsuarioPreview({
    title,
    dataUrl,
    version,
    seleccionada,
    emptyText,
}: FirmaUsuarioPreviewProps) {
    const width = version?.anchoPx ?? seleccionada?.anchoPx;
    const height = version?.altoPx ?? seleccionada?.altoPx;

    return (
        <Box borderWidth="1px" borderRadius="md" p={4} h="100%">
            <HStack justify="space-between" mb={3}>
                <Text fontWeight="semibold">{title}</Text>
                {version ? <Badge colorPalette="green">Versión {version.version}</Badge> : null}
            </HStack>
            {dataUrl ? (
                <>
                    <Box bg="white" borderWidth="1px" borderRadius="md" p={3} minH="130px">
                        <Image
                            src={dataUrl}
                            alt={title}
                            maxW="100%"
                            maxH="160px"
                            mx="auto"
                            objectFit="contain"
                        />
                    </Box>
                    {width && height ? (
                        <Text fontSize="xs" color="app.textMuted" mt={2}>
                            {width} x {height} px
                        </Text>
                    ) : null}
                </>
            ) : (
                <Text fontSize="sm" color="app.textMuted">{emptyText}</Text>
            )}
        </Box>
    );
}
