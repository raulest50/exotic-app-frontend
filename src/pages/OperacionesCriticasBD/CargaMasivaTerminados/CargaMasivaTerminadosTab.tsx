import { Button, Container, Flex } from "@chakra-ui/react";
import { FaArrowLeft } from "react-icons/fa";
import { useState } from "react";
import Step0SelectTipoCarga, { TipoCargaTerminado } from "./Step0SelectTipoCarga";
import CargaMasivaTerminadosSinInsumosFlow from "./SinInsumos/CargaMasivaTerminadosSinInsumosFlow";
import PlaceholderSoloInsumos from "./SoloInsumos/PlaceholderSoloInsumos";
import PlaceholderConProcesoCompleto from "./ConProcesoCompleto/PlaceholderConProcesoCompleto";

export default function CargaMasivaTerminadosTab() {
    const [tipoCargaSeleccionado, setTipoCargaSeleccionado] = useState<TipoCargaTerminado | null>(null);

    if (tipoCargaSeleccionado === null) {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <Step0SelectTipoCarga onSelect={setTipoCargaSeleccionado} />
            </Container>
        );
    }

    if (tipoCargaSeleccionado === "sin_insumos") {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <Flex direction="column" gap={4} w="full" h="full">
                    <Button leftIcon={<FaArrowLeft />} w="fit-content" onClick={() => setTipoCargaSeleccionado(null)}>
                        Volver
                    </Button>
                    <CargaMasivaTerminadosSinInsumosFlow />
                </Flex>
            </Container>
        );
    }

    if (tipoCargaSeleccionado === "solo_insumos") {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <PlaceholderSoloInsumos onVolver={() => setTipoCargaSeleccionado(null)} />
            </Container>
        );
    }

    if (tipoCargaSeleccionado === "con_proceso_completo") {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                <PlaceholderConProcesoCompleto onVolver={() => setTipoCargaSeleccionado(null)} />
            </Container>
        );
    }

    return null;
}
