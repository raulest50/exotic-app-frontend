import { useMemo, useState } from "react";
import { Box, Button, Checkbox, Flex, HStack, Field, Text } from "@chakra-ui/react";
import ProcessDesigner from "../../../../DefProcesses/CreadorProcesos/ProcessDesigner.tsx";
import PackagingTerminadoDefiner from "./PackagingTerminadoDefiner.tsx";
import CustomDecimalInput from "../../../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";
import {
    CasePack,
    ProductoSemiter,
    ProcesoProduccionCompleto,
    TIPOS_PRODUCTOS,
} from "../../../../types.tsx";

interface Props {
    setActiveStep: (step: number) => void;
    semioter2: ProductoSemiter;
    setSemioter3: (semioter3: ProductoSemiter) => void;
}

export default function StepThree_ModProdMF({ setActiveStep, semioter2, setSemioter3 }: Props) {
    const procesoInicial = useMemo<ProcesoProduccionCompleto>(
        () =>
            semioter2.procesoProduccionCompleto ?? {
                rendimientoTeorico: 0,
                nodes: [],
                edges: [],
            },
        [semioter2.procesoProduccionCompleto]
    );

    const [isProcessValid, setIsProcessValid] = useState(false);
    const [rendimientoTeorico, setRendimientoTeorico] = useState<number>(procesoInicial.rendimientoTeorico ?? 0);
    const [proceso, setProceso] = useState<ProcesoProduccionCompleto>(procesoInicial);
    const [isPackagingDefinerOpen, setIsPackagingDefinerOpen] = useState(false);
    const [casePack, setCasePack] = useState<CasePack | undefined>(semioter2.casePack);
    const [requiereOrdenFabricacion, setRequiereOrdenFabricacion] = useState(
        Boolean(semioter2.requiereOrdenFabricacion),
    );

    const isTerminado = semioter2.tipo_producto === TIPOS_PRODUCTOS.terminado;

    const onClickSiguiente = () => {
        setSemioter3({
            ...semioter2,
            procesoProduccionCompleto: {
                ...proceso,
                rendimientoTeorico,
            },
            casePack: isTerminado ? casePack : undefined,
            requiereOrdenFabricacion: isTerminado ? false : requiereOrdenFabricacion,
            inventareable: isTerminado || requiereOrdenFabricacion
                ? true
                : semioter2.inventareable,
        });
        setActiveStep(3);
    };

    return (
        <Flex direction="column" gap={4}>
            <HStack gap={4} alignItems="flex-start">
                <Field.Root w="sm">
                    <Field.Label>Rendimiento Teorico</Field.Label>
                    <CustomDecimalInput
                        value={rendimientoTeorico}
                        onChange={setRendimientoTeorico}
                        min={0}
                        placeholder="0.0000"
                    />
                </Field.Root>

                {isTerminado && (
                    <Box>
                        <Text fontWeight="medium" mb={2}>Packaging</Text>
                        <Button colorPalette={casePack ? "green" : "blue"} onClick={() => setIsPackagingDefinerOpen(true)}>
                            {casePack ? "Packaging definido" : "Definir packaging"}
                        </Button>
                    </Box>
                )}

                {!isTerminado && (
                    <Box borderWidth="1px" borderRadius="md" px={4} py={3} maxW="lg">
                        <Checkbox.Root
                            checked={requiereOrdenFabricacion}
                            onCheckedChange={({ checked }) => setRequiereOrdenFabricacion(checked === true)}
                        >
                            <Checkbox.HiddenInput />
                            <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                            <Checkbox.Label>Aplica para orden de fabricación</Checkbox.Label>
                        </Checkbox.Root>
                        <Text mt={1} fontSize="sm" color="app.textSubtle">
                            El semiterminado tendrá lote propio y podrá fabricarse mediante una OF independiente.
                        </Text>
                    </Box>
                )}
            </HStack>

            <ProcessDesigner
                semioter2={semioter2}
                onProcessChange={(nuevoProceso) =>
                    setProceso((prev) => ({
                        ...prev,
                        ...nuevoProceso,
                    }))
                }
                onValidityChange={setIsProcessValid}
            />

            <Flex direction="row" w="full" gap={20} justifyContent="center" pr="2em" pl="2em">
                <Button colorPalette="yellow" variant="solid" onClick={() => setActiveStep(1)} flex={2}>
                    Volver a insumos
                </Button>

                <Button
                    colorPalette="teal"
                    variant="solid"
                    onClick={onClickSiguiente}
                    flex={2}
                    disabled={!isProcessValid || rendimientoTeorico <= 0 || (isTerminado && !casePack)}
                >
                    Continuar con confirmacion
                </Button>
            </Flex>

            <PackagingTerminadoDefiner
                isOpen={isPackagingDefinerOpen}
                onClose={() => setIsPackagingDefinerOpen(false)}
                onSave={(nuevoCasePack) => setCasePack(nuevoCasePack)}
                initialCasePack={casePack}
            />
        </Flex>
    );
}
