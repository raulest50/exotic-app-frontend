import { useRef, useState, type FormEvent } from "react";
import { Box, Button, Container, Field, Fieldset, Heading, Input, NativeSelect, Stack, Text } from "@chakra-ui/react";
import { LuCheck, LuUserRound } from "react-icons/lu";
import { registrarVisitante } from "./visitantesApi";
import { GENEROS_VISITANTE, type GeneroVisitante, type ReciboVisitante } from "./types";

export default function VisitantesRegistroPage() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [recibo, setRecibo] = useState<ReciboVisitante | null>(null);
    const envioEnCurso = useRef(false);

    const enviar = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (envioEnCurso.current) return;
        const datos = new FormData(event.currentTarget);
        const cedula = String(datos.get("cedula") ?? "").trim();
        const nombreCompleto = String(datos.get("nombreCompleto") ?? "").trim();
        if (!cedula || !nombreCompleto) {
            setError("Ingrese su cédula y nombre completo.");
            return;
        }
        envioEnCurso.current = true;
        setGuardando(true);
        setError("");
        try {
            const edad = String(datos.get("edad") ?? "");
            const genero = String(datos.get("genero") ?? "");
            setRecibo(await registrarVisitante({
                cedula,
                nombreCompleto,
                edad: edad === "" ? null : Number(edad),
                genero: genero === "" ? null : genero as GeneroVisitante,
            }));
        } catch (cause) {
            setError(cause instanceof Error && cause.name !== "TimeoutError" && cause.name !== "TypeError"
                ? cause.message
                : "No fue posible confirmar el registro. Revise su conexión e intente nuevamente.");
        } finally {
            envioEnCurso.current = false;
            setGuardando(false);
        }
    };

    return (
        <Box position="absolute" inset={0} overflowY="auto" minH="100dvh" bg="bg.subtle" textAlign="left" py={{ base: 6, md: 12 }}>
            <Container maxW="lg" px={4}>
                <Stack gap={6}>
                    <Stack gap={1} align="center" textAlign="center">
                        <Box p={3} rounded="full" bg="teal.subtle" color="teal.fg"><LuUserRound size={26} aria-hidden="true" /></Box>
                        <Text fontSize="sm" fontWeight="semibold" color="fg.muted">Gestión Humana</Text>
                        <Heading as="h1" size="2xl">Registro de visitantes</Heading>
                        <Text color="fg.muted">Bienvenido a la planta. Registre sus datos al llegar.</Text>
                    </Stack>
                    <Box bg="bg.panel" borderWidth="1px" rounded="xl" p={{ base: 5, md: 8 }} shadow="sm">
                        {recibo ? (
                            <Stack gap={4} role="status" tabIndex={-1} ref={(node) => { node?.focus(); }} outline="none">
                                <Box color="fg.success"><LuCheck size={32} aria-hidden="true" /></Box>
                                <Heading as="h2" size="xl">Visita registrada</Heading>
                                <Text>Sus datos se guardaron correctamente. Puede continuar con recepción.</Text>
                                <Text color="fg.muted" fontSize="sm">Fecha y hora: {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(recibo.fechaRegistro))}</Text>
                                <Button variant="outline" onClick={() => { setRecibo(null); setError(""); }}>Registrar otro visitante</Button>
                            </Stack>
                        ) : (
                            <form onSubmit={(event) => { void enviar(event); }}>
                                <Fieldset.Root disabled={guardando} gap={5}>
                                    <Text fontSize="sm" color="fg.muted">Los campos con * son obligatorios. No necesita iniciar sesión.</Text>
                                    <Field.Root required>
                                        <Field.Label htmlFor="visitante-cedula">Cédula / documento</Field.Label>
                                        <Input id="visitante-cedula" name="cedula" required maxLength={30} autoComplete="off" placeholder="Número de identificación" />
                                    </Field.Root>
                                    <Field.Root required>
                                        <Field.Label htmlFor="visitante-nombre">Nombre completo</Field.Label>
                                        <Input id="visitante-nombre" name="nombreCompleto" required maxLength={160} autoComplete="name" placeholder="Nombres y apellidos" />
                                    </Field.Root>
                                    <Field.Root>
                                        <Field.Label htmlFor="visitante-edad">Edad (opcional)</Field.Label>
                                        <Input id="visitante-edad" name="edad" type="number" min={0} max={120} step={1} inputMode="numeric" placeholder="Años cumplidos" />
                                    </Field.Root>
                                    <Field.Root>
                                        <Field.Label htmlFor="visitante-genero">Género (opcional)</Field.Label>
                                        <NativeSelect.Root>
                                            <NativeSelect.Field id="visitante-genero" name="genero" defaultValue="">
                                                <option value="">Seleccione una opción</option>
                                                {Object.entries(GENEROS_VISITANTE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                    </Field.Root>
                                    <Text fontSize="sm" color="fg.muted">La fecha y hora de su llegada se registran automáticamente al enviar.</Text>
                                    {error && <Text role="alert" color="fg.error">{error}</Text>}
                                    <Button type="submit" colorPalette="teal" loading={guardando} loadingText="Registrando visita…" disabled={guardando} w="full">Registrar visita</Button>
                                </Fieldset.Root>
                            </form>
                        )}
                    </Box>
                </Stack>
            </Container>
        </Box>
    );
}
