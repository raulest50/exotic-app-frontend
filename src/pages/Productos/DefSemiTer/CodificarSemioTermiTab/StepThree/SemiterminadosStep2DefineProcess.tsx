import { useMemo, useState } from "react";
import { Box, Button, Flex, FormControl, FormLabel, HStack } from "@chakra-ui/react";
import ProcessDesigner from "../../../DefProcesses/CreadorProcesos/ProcessDesigner.tsx";
import PackagingTerminadoDefiner from "./PackagingTerminadoDefiner.tsx";
import CustomDecimalInput from "../../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";
import {
    CasePack,
    ProductoSemiter,
    ProcesoProduccionCompleto,
    TIPOS_PRODUCTOS,
} from "../../../types.tsx";

interface Props {
    setActiveStep: (step: number) => void;
    semioter2: ProductoSemiter;
    setSemioter3: (semioter3: ProductoSemiter) => void;
}

export default function SemiterminadosStep2DefineProcess({ setActiveStep, semioter2, setSemioter3 }: Props) {
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

    const isTerminado = semioter2.tipo_producto === TIPOS_PRODUCTOS.terminado;

    const onClickSiguiente = () => {
        setSemioter3({
            ...semioter2,
            procesoProduccionCompleto: {
                ...proceso,
                rendimientoTeorico,
            },
            casePack: isTerminado ? casePack : undefined,
        });
        setActiveStep(3);
    };

    return (
        <Flex direction="column" gap={4}>
            <HStack spacing={4} alignItems="flex-start">
                <FormControl w="sm">
                    <FormLabel>Rendimiento Teorico</FormLabel>
                    <CustomDecimalInput
                        value={rendimientoTeorico}
                        onChange={setRendimientoTeorico}
                        min={0}
                        placeholder="0.0000"
                    />
                </FormControl>

                {isTerminado && (
                    <Box>
                        <FormLabel>Packaging</FormLabel>
                        <Button colorScheme={casePack ? "green" : "blue"} onClick={() => setIsPackagingDefinerOpen(true)}>
                            {casePack ? "Packaging definido" : "Definir packaging"}
                        </Button>
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
                <Button colorScheme="yellow" variant="solid" onClick={() => setActiveStep(1)} flex={2}>
                    Atras
                </Button>

                <Button
                    colorScheme="teal"
                    variant="solid"
                    onClick={onClickSiguiente}
                    flex={2}
                    isDisabled={!isProcessValid || rendimientoTeorico <= 0 || (isTerminado && !casePack)}
                >
                    Siguiente
                </Button>
            </Flex>

            <PackagingTerminadoDefiner
                isOpen={isPackagingDefinerOpen}
                onClose={() => setIsPackagingDefinerOpen(false)}
                onSave={(nuevoCasePack) => setCasePack(nuevoCasePack)}
            />
        </Flex>
    );
}
