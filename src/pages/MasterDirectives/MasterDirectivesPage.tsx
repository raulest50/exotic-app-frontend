import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    FormControl,
    FormErrorMessage,
    HStack,
    Icon,
    Input,
    Spinner,
    Switch,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useToast,
} from "@chakra-ui/react";
import { FaCircleExclamation } from "react-icons/fa6";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";
import { MasterDirective, useMasterDirectives } from "../../context/MasterDirectivesContext";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

interface DTOAllMasterDirectives {
    masterDirectives: MasterDirective[];
}

type SuperMasterConfigKey = keyof Pick<
    SuperMasterConfig,
    "habilitarEliminacionForzada" | "habilitarCargaMasiva" | "habilitarAjustesInventario"
>;

const ROWS: { key: SuperMasterConfigKey; label: string; resumen: string }[] = [
    { key: "habilitarEliminacionForzada", label: "Habilitar Eliminacion Forzada", resumen: "Permite acceder a Eliminaciones Forzadas en Operaciones Criticas en BD" },
    { key: "habilitarCargaMasiva", label: "Habilitar Carga Masiva", resumen: "Permite acceder a Carga Masiva en Operaciones Criticas en BD" },
    { key: "habilitarAjustesInventario", label: "Habilitar Ajustes Inventario", resumen: "Permite acceder a Ajustes de Inventario en Transacciones de Almacen" },
];

function isPositiveInteger(value: string) {
    return /^\d+$/.test(value.trim()) && Number(value.trim()) >= 1;
}

export default function MasterDirectivesPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [draft, setDraft] = useState<SuperMasterConfig | null>(null);
    const [masterDirectives, setMasterDirectives] = useState<MasterDirective[]>([]);
    const [directiveDrafts, setDirectiveDrafts] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<boolean>(false);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();
    const { refreshDirectives } = useMasterDirectives();

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const superRes = await axios.get<SuperMasterConfig>(endPoints.get_super_master_config);
            const superData = superRes.data;
            setConfig(superData);
            setDraft({ ...superData });

            try {
                const directivesRes = await axios.get<DTOAllMasterDirectives>(endPoints.get_master_directives);
                const directives = directivesRes.data.masterDirectives ?? [];
                setMasterDirectives(directives);
                setDirectiveDrafts(Object.fromEntries(directives.map(directive => [directive.id, directive.valor])));
            } catch (err) {
                console.error("Error fetching Master Directives", err);
                setMasterDirectives([]);
                setDirectiveDrafts({});
                toast({
                    title: "Error al cargar directivas maestras",
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
            }
        } catch (err) {
            console.error("Error fetching Super Master config", err);
            toast({
                title: "Error al cargar Directivas Super Master",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [endPoints, toast]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const numericDirectives = useMemo(
        () => masterDirectives.filter(directive => directive.tipoDato === "NUMERO"),
        [masterDirectives]
    );

    const superMasterHasChanges =
        draft != null &&
        config != null &&
        (draft.habilitarEliminacionForzada !== config.habilitarEliminacionForzada ||
            draft.habilitarCargaMasiva !== config.habilitarCargaMasiva ||
            draft.habilitarAjustesInventario !== config.habilitarAjustesInventario);

    const directiveErrors = useMemo(() => {
        const errors: Record<number, string> = {};
        numericDirectives.forEach(directive => {
            const value = directiveDrafts[directive.id] ?? directive.valor;
            if (!isPositiveInteger(value)) {
                errors[directive.id] = "Debe ser un entero mayor o igual a 1";
            }
        });
        return errors;
    }, [numericDirectives, directiveDrafts]);

    const masterDirectivesHaveChanges = numericDirectives.some(directive => {
        const value = directiveDrafts[directive.id] ?? directive.valor;
        return value.trim() !== directive.valor;
    });

    const hasDirectiveErrors = Object.keys(directiveErrors).length > 0;
    const hasChanges = superMasterHasChanges || masterDirectivesHaveChanges;

    const updateDraft = (key: SuperMasterConfigKey, value: boolean) => {
        if (draft) setDraft({ ...draft, [key]: value });
    };

    const updateDirectiveDraft = (directiveId: number, value: string) => {
        setDirectiveDrafts(prev => ({
            ...prev,
            [directiveId]: value,
        }));
    };

    const handleCancel = () => {
        if (config) setDraft({ ...config });
        setDirectiveDrafts(Object.fromEntries(masterDirectives.map(directive => [directive.id, directive.valor])));
    };

    const handleSave = async () => {
        if (!draft || !hasChanges || hasDirectiveErrors || updating) return;
        setUpdating(true);
        try {
            if (superMasterHasChanges) {
                await axios.put(endPoints.update_super_master_config, draft);
                setConfig({ ...draft });
            }

            const changedDirectives = numericDirectives.filter(directive => {
                const value = directiveDrafts[directive.id] ?? directive.valor;
                return value.trim() !== directive.valor;
            });

            await Promise.all(changedDirectives.map(directive => {
                const newDirective = {
                    ...directive,
                    valor: (directiveDrafts[directive.id] ?? directive.valor).trim(),
                };
                return axios.put(endPoints.update_master_directive, {
                    oldMasterDirective: directive,
                    newMasterDirective: newDirective,
                });
            }));

            if (changedDirectives.length > 0) {
                await refreshDirectives();
            }
            await fetchConfig();

            toast({
                title: "Directivas actualizadas",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Error updating directives", err);
            toast({
                title: "Error al actualizar directivas",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setUpdating(false);
        }
    };

    if (loading || !draft || !config) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Directivas Maestras" />
                <Spinner />
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Directivas Maestras" />

            <Table variant="simple">
                <Thead>
                    <Tr>
                        <Th>Nombre</Th>
                        <Th>Valor</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {ROWS.map(({ key, label, resumen }) => {
                        const value = draft[key];
                        const original = config[key];
                        const hasRowChange = value !== original;
                        return (
                            <Tr key={key}>
                                <Td>
                                    <Text fontWeight="bold">{label}</Text>
                                    <Text fontSize="sm" color="gray.500">
                                        {resumen}
                                    </Text>
                                </Td>
                                <Td>
                                    <HStack>
                                        <Switch
                                            isChecked={value}
                                            onChange={e => updateDraft(key, e.target.checked)}
                                        />
                                        {hasRowChange && (
                                            <Icon as={FaCircleExclamation} color="orange.400" />
                                        )}
                                    </HStack>
                                </Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>

            {numericDirectives.length > 0 && (
                <Box mt={8}>
                    <Text mb={2} fontWeight="bold">
                        Directivas numericas
                    </Text>
                    <Table variant="simple">
                        <Thead>
                            <Tr>
                                <Th>Nombre</Th>
                                <Th>Valor</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {numericDirectives.map(directive => {
                                const value = directiveDrafts[directive.id] ?? directive.valor;
                                const hasRowChange = value.trim() !== directive.valor;
                                const error = directiveErrors[directive.id];
                                return (
                                    <Tr key={directive.id}>
                                        <Td>
                                            <Text fontWeight="bold">{directive.nombre}</Text>
                                            <Text fontSize="sm" color="gray.500">
                                                {directive.resumen}
                                            </Text>
                                        </Td>
                                        <Td>
                                            <HStack align="flex-start">
                                                <FormControl isInvalid={Boolean(error)} maxW="180px">
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        step={1}
                                                        value={value}
                                                        onChange={e => updateDirectiveDraft(directive.id, e.target.value)}
                                                    />
                                                    {error && <FormErrorMessage>{error}</FormErrorMessage>}
                                                </FormControl>
                                                {hasRowChange && (
                                                    <Icon as={FaCircleExclamation} color="orange.400" mt={2} />
                                                )}
                                            </HStack>
                                        </Td>
                                    </Tr>
                                );
                            })}
                        </Tbody>
                    </Table>
                </Box>
            )}

            <HStack mt={4}>
                <Button
                    colorScheme="blue"
                    onClick={handleSave}
                    isDisabled={!hasChanges || hasDirectiveErrors || updating}
                    isLoading={updating}
                >
                    Guardar cambios
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCancel}
                    isDisabled={!hasChanges || updating}
                >
                    Cancelar cambios
                </Button>
            </HStack>
        </Container>
    );
}
