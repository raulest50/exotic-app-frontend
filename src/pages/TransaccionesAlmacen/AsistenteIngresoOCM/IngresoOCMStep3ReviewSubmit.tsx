import { useEffect, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Flex,
    Heading,
    Image,
    Text,
    Textarea,
    Separator,
    Field,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";

import { IngresoOCM_DTA } from "../types";
import { submitIngresoOcm } from "./ocmIngresoApi";

interface StepThreeComponentProps {
    setActiveStep: (step: number) => void;
    docIngresoDTA: IngresoOCM_DTA | null;
}

function getBackendMessage(error: unknown) {
    const response = typeof error === "object" && error !== null
        ? (error as { response?: { status?: number; data?: unknown } }).response
        : undefined;
    const data = response?.data;

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object" && data !== null) {
        const payload = data as { message?: string; error?: string };
        return payload.message ?? payload.error;
    }

    return undefined;
}

export default function IngresoOCMStep3ReviewSubmit({
    setActiveStep,
    docIngresoDTA,
}: StepThreeComponentProps) {
    const [observaciones, setObservaciones] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [supportPreviewUrl, setSupportPreviewUrl] = useState("");
    const toast = useAppToast();
    const supportFile = docIngresoDTA?.file;
    const isImageSupport = supportFile?.type.startsWith("image/");

    useEffect(() => {
        if (!supportFile) {
            setSupportPreviewUrl("");
            return;
        }

        const objectUrl = URL.createObjectURL(supportFile);
        setSupportPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [supportFile]);

    const onClickEnviar = async () => {
        if (!docIngresoDTA) {
            toast({
                title: "Datos incompletos",
                description: "No se encontro el documento de ingreso.",
                status: "error",
                duration: 4000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        try {
            await submitIngresoOcm(docIngresoDTA, observaciones);
            setActiveStep(4);
        } catch (error: unknown) {
            console.error("Error creating DocIngreso:", error);
            const response = typeof error === "object" && error !== null
                ? (error as { response?: { status?: number } }).response
                : undefined;
            const isConflict = response?.status === 409;
            const backendMessage = getBackendMessage(error);

            toast({
                title: isConflict ? "Limite de recepciones alcanzado" : "Error al registrar ingreso",
                description: backendMessage || "No se pudo registrar el ingreso de materiales.",
                status: "error",
                duration: 6000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Flex
            p="1em"
            direction="column"
            backgroundColor="app.stepperBlue"
            gap={8}
            alignItems="center"
        >
            <Heading fontFamily="Comfortaa Variable">
                Formato De Ingreso A Almacen
            </Heading>
            <Text fontFamily="Comfortaa Variable">
                Verifique el formato de ingreso a almacen. En caso de algun error regrese al paso 1.
            </Text>
            <Text fontFamily="Comfortaa Variable">
                Si el formato esta bien, continue con el envio del mismo para finalizar el procedimiento y dar ingreso de los items a el almacen.
            </Text>

            <Separator/>

            <Box w="full" overflowX="auto">
                <Heading size="md" mb={4}>Materiales y Lotes</Heading>
                {docIngresoDTA?.transaccionAlmacen.movimientosTransaccion.map((movimiento, index) => (
                    <Box key={index} mb={4} p={3} borderWidth="1px" borderRadius="md">
                        <Flex justifyContent="space-between" alignItems="center">
                            <Box>
                                <Text fontWeight="bold">{movimiento.producto.nombre}</Text>
                                <Text>ID: {movimiento.producto.productoId}</Text>
                            </Box>
                            <Badge colorPalette="green">{movimiento.cantidad} {movimiento.producto.tipoUnidades}</Badge>
                        </Flex>
                        <Separator my={2} />
                        <Text fontWeight="bold">Informacion del Lote:</Text>
                        <Text>
                            Lote interno: {movimiento.lote.batchNumber || "se confirma al registrar"}
                        </Text>
                        <Text fontSize="xs" color="app.textMuted">
                            El lote definitivo se confirma al registrar el ingreso.
                        </Text>
                        {movimiento.lote.productionDate && (
                            <Text>Fecha de Fabricacion: {new Date(movimiento.lote.productionDate).toLocaleDateString()}</Text>
                        )}
                        <Text>Fecha de Vencimiento: {new Date(movimiento.lote.expirationDate).toLocaleDateString()}</Text>
                    </Box>
                ))}
            </Box>

            <Text fontFamily="Comfortaa Variable">
                Documento Soporte:
            </Text>
            <Box w="full">
                {supportPreviewUrl && isImageSupport ? (
                    <Image
                        src={supportPreviewUrl}
                        alt="Documento Soporte"
                        objectFit="contain"
                        borderRadius="md"
                        boxSize="100%"
                    />
                ) : (
                    <Box p={4} bg="app.surface" borderRadius="md" borderWidth="1px">
                        <Text fontFamily="Comfortaa Variable">
                            {supportFile?.name || "No hay soporte adjunto."}
                        </Text>
                    </Box>
                )}
            </Box>

            <Field.Root>
                <Field.Label>Observaciones (Opcional)</Field.Label>
                <Textarea
                    placeholder="Escriba aqui sus observaciones si lo considera pertinente"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                />
            </Field.Root>

            <Separator/>

            <Button
                variant="solid"
                colorPalette="teal"
                onClick={onClickEnviar}
                loading={isLoading}
                loadingText="Enviando..."
            >
                Enviar Formato De Ingreso
            </Button>
        </Flex>
    );
}
