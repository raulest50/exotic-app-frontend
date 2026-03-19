import {
    Alert,
    AlertDescription,
    AlertIcon,
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    Text,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import axios from "axios";
import { useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { IngresoTerminadoConsultaResponse } from "./types.ts";

interface Props {
    setActiveStep: (step: number) => void;
    setConsultaResult: (result: IngresoTerminadoConsultaResponse) => void;
}

export default function IngresoTerminadosStep0_BuscarLote({ setActiveStep, setConsultaResult }: Props) {
    const [loteInput, setLoteInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const endpoints = useMemo(() => new EndPointsURL(), []);

    const handleBuscar = async () => {
        if (!loteInput.trim()) return;
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.get<IngresoTerminadoConsultaResponse>(
                endpoints.buscar_op_por_lote_terminados,
                { params: { loteAsignado: loteInput.trim() } }
            );
            setConsultaResult(response.data);
            setActiveStep(1);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                if (status === 404) {
                    setError(`No se encontró ninguna Orden de Producción con el lote "${loteInput.trim()}". Verifique el número de lote e intente nuevamente.`);
                } else if (status === 409) {
                    setError(err.response?.data?.detail ?? "La Orden de Producción ya está TERMINADA o CANCELADA y no puede recibir ingresos.");
                } else {
                    setError("Ocurrió un error inesperado al buscar el lote. Por favor intente de nuevo.");
                }
            } else {
                setError("Error de conexión. Verifique la red e intente nuevamente.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleBuscar();
    };

    return (
        <Box maxW="520px" mx="auto" mt={8}>
            <Heading size="md" mb={2}>Identificación del Lote de Producción</Heading>
            <Text fontSize="sm" color="gray.500" mb={6}>
                Ingrese el número de lote asignado a la Orden de Producción para iniciar el registro de ingreso al almacén.
            </Text>

            <FormControl mb={4}>
                <FormLabel fontWeight="semibold">Número de Lote</FormLabel>
                <Flex gap={3}>
                    <Input
                        placeholder="Ej: LAC-0042-25"
                        value={loteInput}
                        onChange={(e) => {
                            setLoteInput(e.target.value);
                            if (error) setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <Button
                        colorScheme="blue"
                        leftIcon={<SearchIcon />}
                        onClick={handleBuscar}
                        isLoading={isLoading}
                        loadingText="Buscando..."
                        isDisabled={!loteInput.trim()}
                        minW="120px"
                    >
                        Buscar
                    </Button>
                </Flex>
            </FormControl>

            {error && (
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">{error}</AlertDescription>
                </Alert>
            )}
        </Box>
    );
}
