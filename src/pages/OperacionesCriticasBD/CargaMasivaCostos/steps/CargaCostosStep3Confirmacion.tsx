import { Steps, Alert, Box, Button, Flex, Heading, Input, Text, VStack, Field } from "@chakra-ui/react";
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
    invalidated: boolean;
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
    invalidated,
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
            <VStack align="stretch" gap={5}>
                <Alert.Root status="success">
                    <Alert.Indicator />
                    <Box>
                        <Alert.Title>Carga completada</Alert.Title>
                        <Alert.Description>
                            {result.totalActualizadas} materiales actualizados y{" "}
                            {result.totalSinCambio} sin cambio. La propagacion actualizo{" "}
                            {result.totalDependenciasActualizadas} dependencias y dejo{" "}
                            {result.totalDependenciasSinCambio} sin cambio.{" "}
                            El lote fue {result.loteId}.
                        </Alert.Description>
                    </Box>
                </Alert.Root>
                <Button alignSelf="flex-start" colorPalette="blue" onClick={onNewLoad}>Nueva carga</Button>
            </VStack>
        );
    }

    const expired = !tokenData || tokenSecondsRemaining === 0;
    const generationsExhausted = tokenData?.generacionesRestantes === 0;

    return (
        <VStack align="stretch" gap={5}>
            <Alert.Root status={blocked || invalidated ? "error" : "warning"}>
                <Alert.Indicator />
                <Box>
                    <Alert.Title>
                        {invalidated
                            ? "Preparacion desactualizada"
                            : blocked
                                ? "Preparacion bloqueada"
                                : "Confirmacion final"}
                    </Alert.Title>
                    <Alert.Description>
                        {invalidated
                            ? "Una receta o costo relacionado cambio. Debe preparar nuevamente el archivo."
                            : blocked
                                ? "Se agotaron los intentos de confirmacion. Debe iniciar una nueva carga."
                                : `Se actualizaran ${preparacion.totalActualizadas} materiales y ${preparacion.totalDependenciasActualizadas} dependencias. Cada cambio quedara en el historial.`}
                    </Alert.Description>
                </Box>
            </Alert.Root>

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

            {!blocked && !invalidated && expired && (
                <Button
                    alignSelf="flex-start"
                    colorPalette="orange"
                    onClick={onGenerateToken}
                    loading={busy}
                    disabled={generationsExhausted}
                >
                    Generar nuevo token
                </Button>
            )}

            {!blocked && !invalidated && (
                <Field.Root required disabled={expired || busy}>
                    <Field.Label htmlFor="carga-costos-token">Ingrese el token de cuatro digitos</Field.Label>
                    <Input
                        id="carga-costos-token"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={typedToken}
                        onValueChange={(event) => onTokenChange(event.target.value.replace(/\D/g, ""))}
                    />
                    <Field.HelperText>Dispone de cinco intentos por cada token.</Field.HelperText>
                </Field.Root>
            )}

            <Flex justify="space-between" gap={3} flexWrap="wrap">
                <Button
                    variant="outline"
                    onClick={blocked || invalidated ? onCancel : onBack}
                    disabled={busy}
                >
                    {blocked || invalidated ? "Nueva carga" : "Volver a revisar"}
                </Button>
                {!blocked && !invalidated && (
                    <Button
                        colorPalette="red"
                        onClick={onConfirm}
                        loading={busy}
                        disabled={expired || typedToken.length !== 4}
                    >
                        Confirmar actualizacion
                    </Button>
                )}
            </Flex>
        </VStack>
    );
}
