import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    Input,
    Text,
    VStack,
} from "@chakra-ui/react";
import {
    CargaCostosConfirmacion,
    CargaCostosPreparacion,
    CargaCostosToken,
} from "../types";

interface CargaCostosStep3ConfirmacionProps {
    preparacion: CargaCostosPreparacion;
    tokenData: CargaCostosToken | null;
    typedToken: string;
    intentosRestantes: number | null;
    tokenSecondsRemaining: number;
    blocked: boolean;
    result: CargaCostosConfirmacion | null;
    busy: boolean;
    onTokenChange: (value: string) => void;
    onBack: () => void;
    onGenerateToken: () => void;
    onConfirm: () => void;
    onCancel: () => void;
    onNewLoad: () => void;
}

function remainingTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function CargaCostosStep3Confirmacion({
    preparacion,
    tokenData,
    typedToken,
    intentosRestantes,
    tokenSecondsRemaining,
    blocked,
    result,
    busy,
    onTokenChange,
    onBack,
    onGenerateToken,
    onConfirm,
    onCancel,
    onNewLoad,
}: CargaCostosStep3ConfirmacionProps) {
    if (result) {
        return (
            <VStack align="stretch" spacing={5}>
                <Alert status="success">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Carga completada</AlertTitle>
                        <AlertDescription>
                            {result.totalActualizadas} costos actualizados y {result.totalSinCambio} sin cambio.
                            El lote fue {result.loteId}.
                        </AlertDescription>
                    </Box>
                </Alert>
                <Button alignSelf="flex-start" colorScheme="blue" onClick={onNewLoad}>Nueva carga</Button>
            </VStack>
        );
    }

    const expired = !tokenData || tokenSecondsRemaining === 0;
    const generationsExhausted = tokenData?.generacionesRestantes === 0;

    return (
        <VStack align="stretch" spacing={5}>
            <Alert status={blocked ? "error" : "warning"}>
                <AlertIcon />
                <Box>
                    <AlertTitle>{blocked ? "Preparacion bloqueada" : "Confirmacion final"}</AlertTitle>
                    <AlertDescription>
                        {blocked
                            ? "Se agotaron los intentos de confirmacion. Debe iniciar una nueva carga."
                            : `Se actualizaran ${preparacion.totalActualizadas} costos y cada cambio quedara en el historial.`}
                    </AlertDescription>
                </Box>
            </Alert>

            <Box borderWidth="1px" borderRadius="md" p={3}>
                <Text fontWeight="semibold">{preparacion.nombreArchivo}</Text>
                <Text fontSize="sm">Motivo: {preparacion.motivo}</Text>
            </Box>

            {tokenData && (
                <Box borderWidth="1px" borderRadius="md" p={5} textAlign="center">
                    <Text>Token dinamico de confirmacion</Text>
                    <Heading
                        as="p"
                        size="2xl"
                        letterSpacing="widest"
                        aria-label={`Token ${tokenData.token.split("").join(" ")}`}
                    >
                        {tokenData.token}
                    </Heading>
                    <Text fontSize="sm" color={expired ? "red.500" : undefined}>
                        {expired ? "Token expirado" : `Expira en ${remainingTime(tokenSecondsRemaining)}`}
                    </Text>
                    <Text fontSize="sm">
                        Intentos restantes: {intentosRestantes ?? tokenData.intentosPermitidos}
                    </Text>
                </Box>
            )}

            {!blocked && expired && (
                <Button
                    alignSelf="flex-start"
                    colorScheme="orange"
                    onClick={onGenerateToken}
                    isLoading={busy}
                    isDisabled={generationsExhausted}
                >
                    Generar nuevo token
                </Button>
            )}

            {!blocked && (
                <FormControl isRequired isDisabled={expired || busy}>
                    <FormLabel htmlFor="carga-costos-token">Ingrese el token de cuatro digitos</FormLabel>
                    <Input
                        id="carga-costos-token"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={typedToken}
                        onChange={(event) => onTokenChange(event.target.value.replace(/\D/g, ""))}
                    />
                    <FormHelperText>Dispone de cinco intentos por cada token.</FormHelperText>
                </FormControl>
            )}

            <Flex justify="space-between" gap={3} flexWrap="wrap">
                <Button variant="outline" onClick={blocked ? onCancel : onBack} isDisabled={busy}>
                    {blocked ? "Nueva carga" : "Volver a revisar"}
                </Button>
                {!blocked && (
                    <Button
                        colorScheme="red"
                        onClick={onConfirm}
                        isLoading={busy}
                        isDisabled={expired || typedToken.length !== 4}
                    >
                        Confirmar actualizacion
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
