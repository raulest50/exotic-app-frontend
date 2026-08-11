import {
    Steps,
    Alert,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    Grid,
    GridItem,
    HStack,
    Input,
    Spinner,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Table,
    Tabs,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
    Field,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import MyHeader from "../../components/MyHeader";
import { my_style_tab } from "../../styles/styles_general";
import { Modulo } from "../Usuarios/GestionUsuarios/types";
import { useTabPermission } from "../../auth/usePermissions";
import {
    createEmpresaIdentidadLegalVersion,
    getEmpresaIdentidadLegalVersiones,
    getEmpresaIdentidadLegalVigente,
    type EmpresaIdentidadLegalVersion,
    type EmpresaIdentidadLegalVersionPayload,
} from "../../api/EmpresaIdentidadLegalApi";
import LogoDocumentalOcmSection from "./components/LogoDocumentalOcmSection";
import JornadaLaboralSection from "./components/JornadaLaboralSection";

const TAB_IDENTIDAD_LEGAL = "IDENTIDAD_LEGAL";
const TAB_JORNADA_LABORAL = "JORNADA_LABORAL";

const FIELD_LABELS: Record<keyof EmpresaIdentidadLegalVersionPayload, string> = {
    razonSocial: "Razon social",
    nombreComercial: "Nombre comercial",
    tipoIdentificacion: "Tipo identificacion",
    numeroIdentificacion: "Numero identificacion",
    digitoVerificacion: "Digito verificacion",
    telefonoPrincipal: "Telefono principal",
    emailPrincipal: "Correo principal",
    motivoCambio: "Motivo del cambio",
};

const EMPTY_FORM: EmpresaIdentidadLegalVersionPayload = {
    razonSocial: "",
    nombreComercial: "",
    tipoIdentificacion: "",
    numeroIdentificacion: "",
    digitoVerificacion: "",
    telefonoPrincipal: "",
    emailPrincipal: "",
    motivoCambio: "",
};

export default function AdministracionGlobalPage() {
    const toast = useToast();
    const {
        canSee: canSeeIdentidadLegal,
        nivel: nivelIdentidadLegal,
        ready: identidadLegalReady,
    } = useTabPermission(Modulo.ADMINISTRACION_GLOBAL, TAB_IDENTIDAD_LEGAL);
    const {
        canSee: canSeeJornadaLaboral,
        nivel: nivelJornadaLaboral,
        ready: jornadaLaboralReady,
    } = useTabPermission(Modulo.ADMINISTRACION_GLOBAL, TAB_JORNADA_LABORAL);
    const [vigente, setVigente] = useState<EmpresaIdentidadLegalVersion | null>(null);
    const [versiones, setVersiones] = useState<EmpresaIdentidadLegalVersion[]>([]);
    const [form, setForm] = useState<EmpresaIdentidadLegalVersionPayload>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const ready = identidadLegalReady && jornadaLaboralReady;
    const canSeeAnyTab = canSeeIdentidadLegal || canSeeJornadaLaboral;
    const canEditIdentidadLegal = nivelIdentidadLegal >= 2;
    const canEditJornadaLaboral = nivelJornadaLaboral >= 2;

    const loadData = useCallback(async () => {
        if (!canSeeIdentidadLegal) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [vigenteResponse, versionesResponse] = await Promise.all([
                getEmpresaIdentidadLegalVigente(),
                getEmpresaIdentidadLegalVersiones(),
            ]);
            setVigente(vigenteResponse);
            setVersiones(versionesResponse);
            setForm(formFromVersion(vigenteResponse));
        } catch (error) {
            console.error("Error cargando identidad legal", error);
            toast({
                title: "No se pudo cargar la identidad legal",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [canSeeIdentidadLegal, toast]);

    useEffect(() => {
        if (!ready) return;
        void loadData();
    }, [loadData, ready]);

    const identificacionVigente = useMemo(() => {
        if (!vigente) return "-";
        return formatIdentificacion(vigente);
    }, [vigente]);

    const handleChange = (field: keyof EmpresaIdentidadLegalVersionPayload, value: string) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async () => {
        const invalidField = (Object.keys(FIELD_LABELS) as Array<keyof EmpresaIdentidadLegalVersionPayload>)
            .find((field) => form[field].trim() === "");

        if (invalidField) {
            toast({
                title: "Campo obligatorio",
                description: FIELD_LABELS[invalidField],
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        if (!form.emailPrincipal.includes("@")) {
            toast({
                title: "Correo invalido",
                status: "warning",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setSaving(true);
        try {
            await createEmpresaIdentidadLegalVersion(trimPayload(form));
            toast({
                title: "Identidad legal actualizada",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            await loadData();
        } catch (error) {
            console.error("Error guardando identidad legal", error);
            toast({
                title: "No se pudo guardar la nueva version",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    if (!ready) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Administracion Global" />
                <Spinner />
            </Container>
        );
    }

    if (!canSeeAnyTab) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Administracion Global" />
                <Alert.Root
                    status="warning"
                    variant='subtle'
                    borderStartWidth='3px'
                    borderStartColor='colorPalette.solid'>
                    <Alert.Indicator />
                    No tiene acceso a las tabs de Administracion Global.
                </Alert.Root>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Administracion Global" />
            <Flex direction="column" w="full" h="full">
                <Tabs.Root>
                    <Tabs.List>
                        {canSeeIdentidadLegal && <Tab sx={my_style_tab}>Identidad Legal</Tab>}
                        {canSeeJornadaLaboral && <Tab sx={my_style_tab}>Jornada Laboral</Tab>}
                    </Tabs.List>
                    <TabPanels>
                        {canSeeIdentidadLegal && (
                            <TabPanel px={0}>
                                {loading ? (
                                    <Spinner />
                                ) : (
                                    <VStack align="stretch" gap={6}>
                                        <Box borderWidth="1px" borderRadius="md" p={4}>
                                            <HStack justify="space-between" align="flex-start" mb={4}>
                                                <Box>
                                                    <Text fontWeight="bold">Version vigente</Text>
                                                    <Text fontSize="sm" color="app.textMuted">
                                                        {vigente ? `Version ${vigente.version} - ${identificacionVigente}` : "-"}
                                                    </Text>
                                                </Box>
                                                {vigente ? <Badge colorPalette="green">{vigente.estado}</Badge> : null}
                                            </HStack>

                                            <Grid templateColumns={["1fr", "repeat(2, 1fr)", "repeat(3, 1fr)"]} gap={4}>
                                                <GridItem colSpan={[1, 2, 2]}>
                                                    <Field.Root required>
                                                        <Field.Label>{FIELD_LABELS.razonSocial}</Field.Label>
                                                        <Input
                                                            value={form.razonSocial}
                                                            onValueChange={(event) => handleChange("razonSocial", event.target.value)}
                                                            readOnly={!canEditIdentidadLegal}
                                                        />
                                                    </Field.Root>
                                                </GridItem>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.nombreComercial}</Field.Label>
                                                    <Input
                                                        value={form.nombreComercial}
                                                        onValueChange={(event) => handleChange("nombreComercial", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                    />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.tipoIdentificacion}</Field.Label>
                                                    <Input
                                                        value={form.tipoIdentificacion}
                                                        onValueChange={(event) => handleChange("tipoIdentificacion", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                    />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.numeroIdentificacion}</Field.Label>
                                                    <Input
                                                        value={form.numeroIdentificacion}
                                                        onValueChange={(event) => handleChange("numeroIdentificacion", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                    />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.digitoVerificacion}</Field.Label>
                                                    <Input
                                                        value={form.digitoVerificacion}
                                                        onValueChange={(event) => handleChange("digitoVerificacion", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                    />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.telefonoPrincipal}</Field.Label>
                                                    <Input
                                                        value={form.telefonoPrincipal}
                                                        onValueChange={(event) => handleChange("telefonoPrincipal", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                    />
                                                </Field.Root>
                                                <Field.Root required>
                                                    <Field.Label>{FIELD_LABELS.emailPrincipal}</Field.Label>
                                                    <Input
                                                        value={form.emailPrincipal}
                                                        onValueChange={(event) => handleChange("emailPrincipal", event.target.value)}
                                                        readOnly={!canEditIdentidadLegal}
                                                        type="email"
                                                    />
                                                </Field.Root>
                                                <GridItem colSpan={[1, 2, 3]}>
                                                    <Field.Root required>
                                                        <Field.Label>{FIELD_LABELS.motivoCambio}</Field.Label>
                                                        <Textarea
                                                            value={form.motivoCambio}
                                                            onValueChange={(event) => handleChange("motivoCambio", event.target.value)}
                                                            readOnly={!canEditIdentidadLegal}
                                                            minH="90px"
                                                        />
                                                    </Field.Root>
                                                </GridItem>
                                            </Grid>

                                            <HStack justify="flex-end" mt={4}>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => vigente && setForm(formFromVersion(vigente))}
                                                    disabled={!vigente || saving}
                                                >
                                                    Restaurar
                                                </Button>
                                                <Button
                                                    colorPalette="teal"
                                                    onClick={handleSubmit}
                                                    loading={saving}
                                                    disabled={!canEditIdentidadLegal}
                                                >
                                                    Guardar nueva version
                                                </Button>
                                            </HStack>
                                        </Box>

                                        <LogoDocumentalOcmSection
                                            canEdit={canEditIdentidadLegal}
                                            identidadLegalPreview={form}
                                            identidadLegalVigente={vigente}
                                        />

                                        <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                                            <Table.Root size="sm" variant="simple">
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.ColumnHeader>Version</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Estado</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Razon social</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Nombre comercial</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Identificacion</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Telefono</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Correo</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Vigente desde</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Vigente hasta</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Creado por</Table.ColumnHeader>
                                                        <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {versiones.map((version) => (
                                                        <Table.Row key={version.id}>
                                                            <Table.Cell>{version.version}</Table.Cell>
                                                            <Table.Cell>
                                                                <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>
                                                                    {version.estado}
                                                                </Badge>
                                                            </Table.Cell>
                                                            <Table.Cell>{version.razonSocial}</Table.Cell>
                                                            <Table.Cell>{version.nombreComercial}</Table.Cell>
                                                            <Table.Cell>{formatIdentificacion(version)}</Table.Cell>
                                                            <Table.Cell>{version.telefonoPrincipal}</Table.Cell>
                                                            <Table.Cell>{version.emailPrincipal}</Table.Cell>
                                                            <Table.Cell>{formatDateTime(version.vigenteDesde)}</Table.Cell>
                                                            <Table.Cell>{formatDateTime(version.vigenteHasta)}</Table.Cell>
                                                            <Table.Cell>{version.creadoPor ?? "-"}</Table.Cell>
                                                            <Table.Cell>{version.motivoCambio ?? "-"}</Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table.Root>
                                        </Box>
                                    </VStack>
                                )}
                            </TabPanel>
                        )}
                        {canSeeJornadaLaboral && (
                            <TabPanel px={0}>
                                <JornadaLaboralSection canEdit={canEditJornadaLaboral} />
                            </TabPanel>
                        )}
                    </TabPanels>
                </Tabs.Root>
            </Flex>
        </Container>
    );
}

function formFromVersion(version: EmpresaIdentidadLegalVersion): EmpresaIdentidadLegalVersionPayload {
    return {
        razonSocial: version.razonSocial,
        nombreComercial: version.nombreComercial,
        tipoIdentificacion: version.tipoIdentificacion,
        numeroIdentificacion: version.numeroIdentificacion,
        digitoVerificacion: version.digitoVerificacion,
        telefonoPrincipal: version.telefonoPrincipal,
        emailPrincipal: version.emailPrincipal,
        motivoCambio: "",
    };
}

function trimPayload(payload: EmpresaIdentidadLegalVersionPayload): EmpresaIdentidadLegalVersionPayload {
    return {
        razonSocial: payload.razonSocial.trim(),
        nombreComercial: payload.nombreComercial.trim(),
        tipoIdentificacion: payload.tipoIdentificacion.trim(),
        numeroIdentificacion: payload.numeroIdentificacion.trim(),
        digitoVerificacion: payload.digitoVerificacion.trim(),
        telefonoPrincipal: payload.telefonoPrincipal.trim(),
        emailPrincipal: payload.emailPrincipal.trim(),
        motivoCambio: payload.motivoCambio.trim(),
    };
}

function formatIdentificacion(version: EmpresaIdentidadLegalVersion): string {
    const digitoVerificacion = version.digitoVerificacion?.trim();
    const numero = digitoVerificacion
        ? `${version.numeroIdentificacion}-${digitoVerificacion}`
        : version.numeroIdentificacion;
    return `${version.tipoIdentificacion}: ${numero}`;
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";
    return new Date(value).toLocaleString();
}
