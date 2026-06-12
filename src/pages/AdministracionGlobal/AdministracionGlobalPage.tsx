import {
    Alert,
    AlertIcon,
    Badge,
    Box,
    Button,
    Container,
    Flex,
    FormControl,
    FormLabel,
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

const TAB_IDENTIDAD_LEGAL = "IDENTIDAD_LEGAL";

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
    const { canSee, nivel, ready } = useTabPermission(Modulo.ADMINISTRACION_GLOBAL, TAB_IDENTIDAD_LEGAL);
    const [vigente, setVigente] = useState<EmpresaIdentidadLegalVersion | null>(null);
    const [versiones, setVersiones] = useState<EmpresaIdentidadLegalVersion[]>([]);
    const [form, setForm] = useState<EmpresaIdentidadLegalVersionPayload>(EMPTY_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const canEdit = nivel >= 2;

    const loadData = useCallback(async () => {
        if (!canSee) {
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
    }, [canSee, toast]);

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

    if (!ready || loading) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Administracion Global" />
                <Spinner />
            </Container>
        );
    }

    if (!canSee) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Administracion Global" />
                <Alert status="warning" variant="left-accent">
                    <AlertIcon />
                    No tiene acceso a la tab de identidad legal.
                </Alert>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Administracion Global" />
            <Flex direction="column" w="full" h="full">
                <Tabs>
                    <TabList>
                        <Tab sx={my_style_tab}>Identidad Legal</Tab>
                    </TabList>
                    <TabPanels>
                        <TabPanel px={0}>
                            <VStack align="stretch" spacing={6}>
                                <Box borderWidth="1px" borderRadius="md" p={4}>
                                    <HStack justify="space-between" align="flex-start" mb={4}>
                                        <Box>
                                            <Text fontWeight="bold">Version vigente</Text>
                                            <Text fontSize="sm" color="app.textMuted">
                                                {vigente ? `Version ${vigente.version} - ${identificacionVigente}` : "-"}
                                            </Text>
                                        </Box>
                                        {vigente ? <Badge colorScheme="green">{vigente.estado}</Badge> : null}
                                    </HStack>

                                    <Grid templateColumns={["1fr", "repeat(2, 1fr)", "repeat(3, 1fr)"]} gap={4}>
                                        <GridItem colSpan={[1, 2, 2]}>
                                            <FormControl isRequired>
                                                <FormLabel>{FIELD_LABELS.razonSocial}</FormLabel>
                                                <Input
                                                    value={form.razonSocial}
                                                    onChange={(event) => handleChange("razonSocial", event.target.value)}
                                                    isReadOnly={!canEdit}
                                                />
                                            </FormControl>
                                        </GridItem>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.nombreComercial}</FormLabel>
                                            <Input
                                                value={form.nombreComercial}
                                                onChange={(event) => handleChange("nombreComercial", event.target.value)}
                                                isReadOnly={!canEdit}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.tipoIdentificacion}</FormLabel>
                                            <Input
                                                value={form.tipoIdentificacion}
                                                onChange={(event) => handleChange("tipoIdentificacion", event.target.value)}
                                                isReadOnly={!canEdit}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.numeroIdentificacion}</FormLabel>
                                            <Input
                                                value={form.numeroIdentificacion}
                                                onChange={(event) => handleChange("numeroIdentificacion", event.target.value)}
                                                isReadOnly={!canEdit}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.digitoVerificacion}</FormLabel>
                                            <Input
                                                value={form.digitoVerificacion}
                                                onChange={(event) => handleChange("digitoVerificacion", event.target.value)}
                                                isReadOnly={!canEdit}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.telefonoPrincipal}</FormLabel>
                                            <Input
                                                value={form.telefonoPrincipal}
                                                onChange={(event) => handleChange("telefonoPrincipal", event.target.value)}
                                                isReadOnly={!canEdit}
                                            />
                                        </FormControl>
                                        <FormControl isRequired>
                                            <FormLabel>{FIELD_LABELS.emailPrincipal}</FormLabel>
                                            <Input
                                                value={form.emailPrincipal}
                                                onChange={(event) => handleChange("emailPrincipal", event.target.value)}
                                                isReadOnly={!canEdit}
                                                type="email"
                                            />
                                        </FormControl>
                                        <GridItem colSpan={[1, 2, 3]}>
                                            <FormControl isRequired>
                                                <FormLabel>{FIELD_LABELS.motivoCambio}</FormLabel>
                                                <Textarea
                                                    value={form.motivoCambio}
                                                    onChange={(event) => handleChange("motivoCambio", event.target.value)}
                                                    isReadOnly={!canEdit}
                                                    minH="90px"
                                                />
                                            </FormControl>
                                        </GridItem>
                                    </Grid>

                                    <HStack justify="flex-end" mt={4}>
                                        <Button
                                            variant="outline"
                                            onClick={() => vigente && setForm(formFromVersion(vigente))}
                                            isDisabled={!vigente || saving}
                                        >
                                            Restaurar
                                        </Button>
                                        <Button
                                            colorScheme="teal"
                                            onClick={handleSubmit}
                                            isLoading={saving}
                                            isDisabled={!canEdit}
                                        >
                                            Guardar nueva version
                                        </Button>
                                    </HStack>
                                </Box>

                                <LogoDocumentalOcmSection
                                    canEdit={canEdit}
                                    identidadLegalPreview={form}
                                    identidadLegalVigente={vigente}
                                />

                                <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                                    <Table size="sm" variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Version</Th>
                                                <Th>Estado</Th>
                                                <Th>Razon social</Th>
                                                <Th>Nombre comercial</Th>
                                                <Th>Identificacion</Th>
                                                <Th>Telefono</Th>
                                                <Th>Correo</Th>
                                                <Th>Vigente desde</Th>
                                                <Th>Vigente hasta</Th>
                                                <Th>Creado por</Th>
                                                <Th>Motivo</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {versiones.map((version) => (
                                                <Tr key={version.id}>
                                                    <Td>{version.version}</Td>
                                                    <Td>
                                                        <Badge colorScheme={version.estado === "VIGENTE" ? "green" : "gray"}>
                                                            {version.estado}
                                                        </Badge>
                                                    </Td>
                                                    <Td>{version.razonSocial}</Td>
                                                    <Td>{version.nombreComercial}</Td>
                                                    <Td>{formatIdentificacion(version)}</Td>
                                                    <Td>{version.telefonoPrincipal}</Td>
                                                    <Td>{version.emailPrincipal}</Td>
                                                    <Td>{formatDateTime(version.vigenteDesde)}</Td>
                                                    <Td>{formatDateTime(version.vigenteHasta)}</Td>
                                                    <Td>{version.creadoPor ?? "-"}</Td>
                                                    <Td>{version.motivoCambio ?? "-"}</Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                            </VStack>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
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
