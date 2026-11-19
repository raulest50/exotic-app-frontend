import { useRef, useState, type FormEvent } from "react";
import { Box, Button, Container, Field, Fieldset, Heading, Image, Input, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { LuCheck } from "react-icons/lu";
import { deploymentPath } from "../../../utils/deploymentPaths";
import { registrarVisitante } from "./visitantesApi";
import { GENEROS_REGISTRO_VISITANTE, MOTIVOS_VISITA, type GeneroRegistroVisitante, type MotivoVisita, type ReciboVisitante } from "./types";

type ErroresFormulario = Partial<Record<"cedula" | "nombreCompleto" | "edad" | "motivo" | "motivoOtro", string>>;

const CEDULA_PATTERN = /^[0-9]{3,10}$/;
const NOMBRE_PATTERN = /^[\p{L}\p{M} '\u2019\u2010\u2011-]+$/u;

export default function VisitantesRegistroPage() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [erroresFormulario, setErroresFormulario] = useState<ErroresFormulario>({});
    const [motivoSeleccionado, setMotivoSeleccionado] = useState<MotivoVisita | "">("");
    const [detalleOtro, setDetalleOtro] = useState("");
    const [recibo, setRecibo] = useState<ReciboVisitante | null>(null);
    const envioEnCurso = useRef(false);

    const enviar = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (envioEnCurso.current) return;
        const formulario = event.currentTarget;
        const datos = new FormData(formulario);
        const cedula = String(datos.get("cedula") ?? "").trim();
        const nombreCompleto = String(datos.get("nombreCompleto") ?? "").normalize("NFC").replace(/\p{Zs}+/gu, " ").trim();
        const edadTexto = String(datos.get("edad") ?? "");
        const edad = edadTexto === "" ? null : Number(edadTexto);
        const motivo = String(datos.get("motivo") ?? "");
        const motivoOtro = motivo === "OTROS"
            ? detalleOtro.normalize("NFC").replace(/[\p{Zs}\t\r\n]+/gu, " ").trim()
            : null;
        const errores: ErroresFormulario = {};
        if (!CEDULA_PATTERN.test(cedula)) errores.cedula = "Ingrese entre 3 y 10 dígitos, sin puntos, espacios ni guiones.";
        if (!NOMBRE_PATTERN.test(nombreCompleto) || !/\p{L}/u.test(nombreCompleto) || [...nombreCompleto].length > 160) {
            errores.nombreCompleto = "Ingrese su nombre con letras, espacios, apóstrofos o guiones, hasta 160 caracteres.";
        }
        const edadInput = formulario.elements.namedItem("edad") as HTMLInputElement;
        if (edadInput.validity.badInput || (edad !== null && (!Number.isInteger(edad) || edad < 0 || edad > 120))) {
            errores.edad = "Ingrese una edad entera entre 0 y 120 años o deje el campo vacío.";
        }
        if (!Object.keys(MOTIVOS_VISITA).includes(motivo)) errores.motivo = "Seleccione el motivo de su visita.";
        if (motivo === "OTROS" && (!motivoOtro || [...motivoOtro].length > 300 || /[\p{Cc}\p{Cf}]/u.test(motivoOtro))) {
            errores.motivoOtro = "Describa el motivo de su visita, hasta 300 caracteres.";
        }
        setErroresFormulario(errores);
        setError("");
        if (Object.keys(errores).length > 0) {
            const primerCampo = Object.keys(errores)[0];
            (formulario.elements.namedItem(primerCampo) as HTMLInputElement).focus();
            return;
        }
        envioEnCurso.current = true;
        setGuardando(true);
        setError("");
        try {
            const genero = String(datos.get("genero") ?? "");
            setRecibo(await registrarVisitante({
                cedula,
                nombreCompleto,
                edad,
                genero: genero === "" ? null : genero as GeneroRegistroVisitante,
                motivo: motivo as MotivoVisita,
                motivoOtro,
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
                        <Box bg="white" p={2} rounded="lg">
                            <Image src={deploymentPath("/logo_novum.png")} alt="Laboratorios Novum S.A.S." w={{ base: "120px", md: "144px" }} h={{ base: "120px", md: "144px" }} objectFit="contain" />
                        </Box>
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
                                <Button variant="outline" onClick={() => { setRecibo(null); setError(""); setMotivoSeleccionado(""); setDetalleOtro(""); }}>Registrar otro visitante</Button>
                            </Stack>
                        ) : (
                            <form noValidate onSubmit={(event) => { void enviar(event); }}>
                                <Fieldset.Root disabled={guardando} gap={5}>
                                    <Text fontSize="sm" color="fg.muted">Los campos con * son obligatorios. No necesita iniciar sesión.</Text>
                                    <Field.Root required invalid={!!erroresFormulario.cedula}>
                                        <Field.Label htmlFor="visitante-cedula">Cédula de ciudadanía colombiana</Field.Label>
                                        <Input id="visitante-cedula" name="cedula" required minLength={3} maxLength={10} pattern="[0-9]{3,10}" inputMode="numeric" autoComplete="off" placeholder="Número de cédula" onChange={() => setErroresFormulario((value) => ({ ...value, cedula: undefined }))} />
                                        <Field.HelperText>De 3 a 10 dígitos. Sin puntos, espacios ni guiones.</Field.HelperText>
                                        <Field.ErrorText>{erroresFormulario.cedula}</Field.ErrorText>
                                    </Field.Root>
                                    <Field.Root required invalid={!!erroresFormulario.nombreCompleto}>
                                        <Field.Label htmlFor="visitante-nombre">Nombre completo</Field.Label>
                                        <Input id="visitante-nombre" name="nombreCompleto" required maxLength={160} autoComplete="name" placeholder="Nombre como aparece en su cédula" onChange={() => setErroresFormulario((value) => ({ ...value, nombreCompleto: undefined }))} />
                                        <Field.HelperText>Se admiten tildes, ñ, espacios, apóstrofos y guiones.</Field.HelperText>
                                        <Field.ErrorText>{erroresFormulario.nombreCompleto}</Field.ErrorText>
                                    </Field.Root>
                                    <Field.Root invalid={!!erroresFormulario.edad}>
                                        <Field.Label htmlFor="visitante-edad">Edad (opcional)</Field.Label>
                                        <Input id="visitante-edad" name="edad" type="number" min={0} max={120} step={1} inputMode="numeric" placeholder="Años cumplidos" onChange={() => setErroresFormulario((value) => ({ ...value, edad: undefined }))} />
                                        <Field.ErrorText>{erroresFormulario.edad}</Field.ErrorText>
                                    </Field.Root>
                                    <Field.Root>
                                        <Field.Label htmlFor="visitante-genero">Género (opcional)</Field.Label>
                                        <NativeSelect.Root>
                                            <NativeSelect.Field id="visitante-genero" name="genero" defaultValue="">
                                                <option value="">Seleccione una opción</option>
                                                {Object.entries(GENEROS_REGISTRO_VISITANTE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                    </Field.Root>
                                    <Field.Root required invalid={!!erroresFormulario.motivo}>
                                        <Field.Label htmlFor="visitante-motivo">Motivo de la visita</Field.Label>
                                        <NativeSelect.Root>
                                            <NativeSelect.Field id="visitante-motivo" name="motivo" value={motivoSeleccionado} onChange={(event) => {
                                                setMotivoSeleccionado(event.target.value as MotivoVisita | "");
                                                setDetalleOtro("");
                                                setErroresFormulario((value) => ({ ...value, motivo: undefined, motivoOtro: undefined }));
                                            }}>
                                                <option value="">Seleccione el motivo de su visita</option>
                                                {Object.entries(MOTIVOS_VISITA).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                            </NativeSelect.Field>
                                            <NativeSelect.Indicator />
                                        </NativeSelect.Root>
                                        <Field.ErrorText>{erroresFormulario.motivo}</Field.ErrorText>
                                    </Field.Root>
                                    {motivoSeleccionado === "OTROS" && <Field.Root required invalid={!!erroresFormulario.motivoOtro}>
                                        <Field.Label htmlFor="visitante-motivo-otro">Describa el motivo de su visita</Field.Label>
                                        <Textarea id="visitante-motivo-otro" name="motivoOtro" required maxLength={300} rows={3} value={detalleOtro} placeholder="Cuéntenos brevemente a qué viene a la planta" onChange={(event) => {
                                            setDetalleOtro(event.target.value);
                                            setErroresFormulario((value) => ({ ...value, motivoOtro: undefined }));
                                        }} />
                                        <Field.HelperText>Máximo 300 caracteres.</Field.HelperText>
                                        <Field.ErrorText>{erroresFormulario.motivoOtro}</Field.ErrorText>
                                    </Field.Root>}
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
