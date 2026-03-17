import {Box} from "@chakra-ui/react";
import type { TerminadoConVentas } from "../PlaneacionProduccionService.tsx";

interface Step2PlaneacionProduccionProps {
    rawData: TerminadoConVentas[];
    necesidades: Record<string, number>;
    setActiveStep: (step: number) => void;
}

export default function Step2PlaneacionProduccion({ rawData, necesidades, setActiveStep }: Step2PlaneacionProduccionProps) {
    return (
        <Box>
            {/* Aquí irá la planeación de producción */}
        </Box>
    );
}
