import { useState } from "react";
import { Box, Button, Container, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { ACCESS_DOCUMENTATION_CATALOG } from "../Usuarios/GestionUsuarios/access-help/accessDocumentationCatalog.ts";
import GruposErrorList from "./GruposErrorList.tsx";

// Catalogo de consulta, independiente de los permisos asignables de cada usuario.
const MODULOS_MONITOREO = [
    ...Object.values(Modulo).map((modulo) => ({
        id: String(modulo),
        label: ACCESS_DOCUMENTATION_CATALOG[modulo].label,
    })),
    { id: "AREA_OPERATIVA", label: "Panel de área operativa" },
    { id: "MONITOREO_ERRORES", label: "Monitoreo de Errores" },
    { id: "SISTEMA", label: "Sistema / Sin módulo" },
];

export default function MonitoreoErroresPage() {
    const [selectedModuloId, setSelectedModuloId] = useState<string | null>(null);
    const selectedModulo = MODULOS_MONITOREO.find((modulo) => modulo.id === selectedModuloId);

    return (
        <Container maxW="full" minH="100vh" px={{ base: 3, md: 6 }} py={4}>
            <MyHeader title="Monitoreo de Errores" />
            <Grid templateColumns={{ base: "1fr", md: "260px minmax(0, 1fr)" }} gap={5} alignItems="start">
                <Box
                    as="aside"
                    aria-labelledby="monitoreo-modulos-title"
                    bg="app.surface"
                    borderWidth="1px"
                    borderColor="app.border"
                    borderRadius="lg"
                    p={3}
                >
                    <Heading id="monitoreo-modulos-title" size="md" px={2} mb={3}>Módulos</Heading>
                    <Flex
                        direction="column"
                        gap={1}
                        maxH={{ base: "240px", md: "calc(100vh - 210px)" }}
                        overflowY="auto"
                    >
                        {MODULOS_MONITOREO.map((modulo) => (
                            <Button
                                key={modulo.id}
                                variant={selectedModuloId === modulo.id ? "subtle" : "ghost"}
                                colorPalette={selectedModuloId === modulo.id ? "red" : "gray"}
                                justifyContent="flex-start"
                                textAlign="start"
                                whiteSpace="normal"
                                h="auto"
                                minH="44px"
                                flexShrink={0}
                                py={2}
                                aria-pressed={selectedModuloId === modulo.id}
                                onClick={() => setSelectedModuloId(modulo.id)}
                            >
                                {modulo.label}
                            </Button>
                        ))}
                    </Flex>
                </Box>

                <Box
                    as="section"
                    aria-labelledby="monitoreo-errores-title"
                    minW={0}
                    bg="app.surface"
                    borderWidth="1px"
                    borderColor="app.border"
                    borderRadius="lg"
                    p={{ base: 3, md: 5 }}
                >
                    <Heading id="monitoreo-errores-title" size="lg" mb={2}>
                        {selectedModulo ? `Errores registrados · ${selectedModulo.label}` : "Errores registrados"}
                    </Heading>
                    {selectedModulo ? (
                        <>
                            <Text color="app.textMuted" mb={5}>Repeticiones agrupadas por error.</Text>
                            {/* La consulta real se conectara cuando se implementen los endpoints. */}
                            <GruposErrorList key={selectedModulo.id} />
                        </>
                    ) : (
                        <Text color="app.textMuted" py={12} textAlign="center" role="status">
                            Selecciona un módulo para consultar sus errores.
                        </Text>
                    )}
                </Box>
            </Grid>
        </Container>
    );
}
