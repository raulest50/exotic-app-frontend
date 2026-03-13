import {Box} from "@chakra-ui/react";

interface Step1VisualizarDistribucionProps {
    setActiveStep: (step: number) => void;
}

export default function Step2PlaneacionProduccion({ setActiveStep }: Step1VisualizarDistribucionProps) {
    return (
        <Box>
            {/* Aquí irá la visualización de la distribución */}
        </Box>
    );
}
