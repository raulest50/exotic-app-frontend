import { useState } from "react";
import { Box, Button, Flex, Heading, NativeSelect, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { Link, MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import type { NewFeature } from "./currentFeatures";
import { NewFeaturesProvider } from "./NewFeaturesProvider";
import { NewFeaturesButton, NewFeaturesCard } from "./NewFeaturesModule";
import type { NewFeaturesSession } from "./newFeaturesState";

const gestionHumanaIllustration = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="160" viewBox="0 0 640 160"><rect width="640" height="160" rx="16" fill="#f3e8ff"/><text x="24" y="48" font-family="sans-serif" font-size="22" fill="#3b0764">Gestión Humana → Permisos</text><rect x="24" y="76" width="210" height="54" rx="10" fill="#6b21a8"/><text x="48" y="110" font-family="sans-serif" font-size="19" fill="white">Nueva solicitud</text><text x="265" y="110" font-family="sans-serif" font-size="17" fill="#3b0764">Aquí comienza la solicitud</text></svg>')}`;

const examples: readonly NewFeature[] = [
    { id: "demo-personal", revision: "1", moduleLabel: "Gestión Humana", modulePath: "/GestionHumana", title: "Solicitudes de permisos", description: "Ejemplo de contenido para usuarios: crea una solicitud y consulta su estado.", location: ["Gestión Humana", "Permisos", "Nueva solicitud"], access: { kind: "module", module: "PERSONAL_PLANTA", tabId: "PERMISOS", exactTab: true }, image: { src: gestionHumanaIllustration, alt: "Ilustración del botón Nueva solicitud dentro de Gestión Humana, pestaña Permisos", caption: "Ilustración de ejemplo; no contiene datos de personas." } },
    { id: "demo-compras", revision: "1", moduleLabel: "Compras", modulePath: "/compras", title: "Información de las compras", description: "Ejemplo de mejora visible para quienes pueden consultar Compras.", location: ["Compras", "Consulta"], access: { kind: "module", module: "COMPRAS", tabId: "CONSULTA" } },
    { id: "demo-aprobacion", revision: "1", moduleLabel: "Compras", modulePath: "/compras", title: "Revisión de compras", description: "Este ejemplo requiere nivel 3 y no se anuncia a un usuario que solo puede consultar.", location: ["Compras", "Revisión"], access: { kind: "module", module: "COMPRAS", tabId: "CONSULTA", minLevel: 3 } },
    { id: "demo-calidad", revision: "1", moduleLabel: "Calidad", modulePath: "/calidad", title: "Historial de ensayos", description: "Ejemplo reservado a quienes tienen acceso explícito al historial de Calidad.", location: ["Calidad", "Control de calidad", "Historial de ensayos"], access: { kind: "module", module: "CALIDAD", tabId: "HISTORIAL_CONTROL_CALIDAD", exactTab: true } },
];

const sessions: Record<string, NewFeaturesSession> = {
    consulta: { identity: "demo-consulta", ready: true, isMasterLike: false, isAreaResponsable: false, moduloAccesos: [{ modulo: "PERSONAL_PLANTA", tabs: [{ tabId: "PERMISOS", nivel: 1 }] }, { modulo: "COMPRAS", tabs: [{ tabId: "MAIN", nivel: 1 }] }] },
    otraCuenta: { identity: "demo-otra-cuenta", ready: true, isMasterLike: false, isAreaResponsable: false, moduloAccesos: [{ modulo: "PERSONAL_PLANTA", tabs: [{ tabId: "PERMISOS", nivel: 1 }] }] },
    mainPersonal: { identity: "demo-main", ready: true, isMasterLike: false, isAreaResponsable: false, moduloAccesos: [{ modulo: "PERSONAL_PLANTA", tabs: [{ tabId: "MAIN", nivel: 4 }] }] },
    master: { identity: "demo-master", ready: true, isMasterLike: true, isAreaResponsable: false, moduloAccesos: [] },
    cargando: { identity: "demo-consulta", ready: false, isMasterLike: false, isAreaResponsable: false, moduloAccesos: [] },
};

function DemoContent() {
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <Stack gap={5}>
            <Flex gap={3} align="center" flexWrap="wrap">
                <NewFeaturesButton />
                <Button variant="outline" onClick={() => navigate("/")}>Volver a Inicio</Button>
                <Text>Ruta actual: {location.pathname}</Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                {[{ name: "Gestión Humana", path: "/GestionHumana" }, { name: "Compras", path: "/compras" }, { name: "Calidad", path: "/calidad" }].map((module) => (
                    <NewFeaturesCard key={module.path} modulePath={module.path}>
                        <Box asChild><Link to={module.path}><Box minH="10rem" borderWidth="1px" rounded="lg" p={6} pt={14} bg="bg.subtle"><Heading size="md">{module.name}</Heading><Text>Entrar al módulo de ejemplo</Text></Box></Link></Box>
                    </NewFeaturesCard>
                ))}
            </SimpleGrid>
        </Stack>
    );
}

function Demo() {
    const [account, setAccount] = useState("consulta");
    const [revision, setRevision] = useState(1);
    const features = examples.map((feature) => ({ ...feature, revision: String(revision) }));
    return (
        <Box p={{ base: 3, md: 8 }} maxW="70rem" mx="auto">
            <Heading size="xl" mb={3}>Novedades · revisión aislada</Heading>
            <Text mb={4}>Consulta y visita en ambos órdenes. Solo ambas acciones retiran Nuevo. Los ejemplos no forman parte del catálogo de producción.</Text>
            <Flex gap={3} mb={6} flexWrap="wrap">
                <NativeSelect.Root maxW="20rem"><NativeSelect.Field aria-label="Identidad de ejemplo" value={account} onChange={(event) => setAccount(event.target.value)}><option value="consulta">Consulta: Gestión Humana y Compras nivel 1</option><option value="otraCuenta">Otra cuenta: solo Gestión Humana</option><option value="mainPersonal">Gestión Humana con MAIN, sin PERMISOS exacto</option><option value="master">Master: todos los ejemplos</option><option value="cargando">Accesos cargando</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>Nueva revisión ({revision})</Button>
            </Flex>
            <NewFeaturesProvider features={features} session={sessions[account]} storageScope="new-features-ladle-only">
                <DemoContent />
            </NewFeaturesProvider>
        </Box>
    );
}

export const RecorridoCompleto = () => <MemoryRouter><Demo /></MemoryRouter>;
