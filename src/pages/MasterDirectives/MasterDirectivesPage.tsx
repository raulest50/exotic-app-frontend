import { useEffect, useState, useMemo } from "react";
import {
    Container,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Switch,
    Button,
    Icon,
    HStack,
    Text,
    Spinner,
    useToast,
} from "@chakra-ui/react";
import { FaCircleExclamation } from "react-icons/fa6";
import axios from "axios";
import EndPointsURL from "../../api/EndPointsURL";
import MyHeader from "../../components/MyHeader";

interface SuperMasterConfig {
    id: number;
    habilitarEliminacionForzada: boolean;
    habilitarCargaMasiva: boolean;
    habilitarAjustesInventario: boolean;
}

const ROWS: { key: keyof Pick<SuperMasterConfig, "habilitarEliminacionForzada" | "habilitarCargaMasiva" | "habilitarAjustesInventario">; label: string; resumen: string }[] = [
    { key: "habilitarEliminacionForzada", label: "Habilitar Eliminación Forzada", resumen: "Permite acceder a Eliminaciones Forzadas en Operaciones Críticas en BD" },
    { key: "habilitarCargaMasiva", label: "Habilitar Carga Masiva", resumen: "Permite acceder a Carga Masiva en Operaciones Críticas en BD" },
    { key: "habilitarAjustesInventario", label: "Habilitar Ajustes Inventario", resumen: "Permite acceder a Ajustes de Inventario en Transacciones de Almacén" },
];

export default function MasterDirectivesPage() {
    const [config, setConfig] = useState<SuperMasterConfig | null>(null);
    const [draft, setDraft] = useState<SuperMasterConfig | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<boolean>(false);
    const endPoints = useMemo(() => new EndPointsURL(), []);
    const toast = useToast();

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await axios.get<SuperMasterConfig>(endPoints.get_super_master_config);
                const data = res.data;
                setConfig(data);
                setDraft({ ...data });
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
        };
        fetchConfig();
    }, [endPoints, toast]);

    const hasChanges =
        draft != null &&
        config != null &&
        (draft.habilitarEliminacionForzada !== config.habilitarEliminacionForzada ||
            draft.habilitarCargaMasiva !== config.habilitarCargaMasiva ||
            draft.habilitarAjustesInventario !== config.habilitarAjustesInventario);

    const updateDraft = (key: keyof Pick<SuperMasterConfig, "habilitarEliminacionForzada" | "habilitarCargaMasiva" | "habilitarAjustesInventario">, value: boolean) => {
        if (draft) setDraft({ ...draft, [key]: value });
    };

    const handleSave = async () => {
        if (!draft || !hasChanges || updating) return;
        setUpdating(true);
        try {
            await axios.put(endPoints.update_super_master_config, draft);
            setConfig({ ...draft });
            toast({
                title: "Directivas actualizadas",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
        } catch (err) {
            console.error("Error updating Super Master config", err);
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

    if (loading || !draft) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <MyHeader title="Directivas Super Master" />
                <Spinner />
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <MyHeader title="Directivas Super Master" />
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
            <Button
                mt={4}
                colorScheme="blue"
                onClick={handleSave}
                isDisabled={!hasChanges || updating}
                isLoading={updating}
            >
                Guardar cambios
            </Button>
        </Container>
    );
}
