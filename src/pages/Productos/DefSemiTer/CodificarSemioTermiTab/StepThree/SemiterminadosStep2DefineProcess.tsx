import { ProductoSemiter, ProcesoDiseñado, ProcesoProduccionCompleto, TIPOS_PRODUCTOS } from "../../../types.tsx";
import ProcessDesigner from "../../../DefProcesses/CreadorProcesos/ProcessDesigner.tsx";
import { 
    Button, 
    Flex, 
    FormControl, 
    FormLabel, 
    InputGroup,
    Input,
    InputRightElement,
    IconButton,
    HStack,
    Box
} from "@chakra-ui/react";
import { SearchIcon } from '@chakra-ui/icons';
import { useState } from "react";
import AreaPickerGeneric from "../../../../../components/Pickers/AreaPickerGeneric/AreaPickerGeneric.tsx";
import PackagingTerminadoDefiner from "./PackagingTerminadoDefiner.tsx";
import CustomDecimalInput from "../../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";

// Interface for AreaProduccion based on the backend model
interface AreaProduccion {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea?: any;
}

// Interface for CasePack
interface CasePack {
    id?: number;
    unitsPerCase: number;
    ean14?: string;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
    grossWeightKg?: number;
    insumosEmpaque: InsumoEmpaque[];
}

interface InsumoEmpaque {
    id?: number;
    material: any;
    cantidad: number;
}

interface Props {
    setActiveStep: (step: number) => void;
    semioter2: ProductoSemiter;
    setSemioter3: (semioter3: ProductoSemiter) => void;
}

export default function SemiterminadosStep2DefineProcess({ setActiveStep, semioter2, setSemioter3 }: Props) {
    // Local state to store whether the process definition is valid.
    const [isProcessValid, setIsProcessValid] = useState(false);
    const [rendimientoTeorico, setRendimientoTeorico] = useState<number>(0);
    const [proceso, setProceso] = useState<ProcesoDiseñado>({ procesosProduccion: [] });

    // State for area picker
    const [isAreaPickerOpen, setIsAreaPickerOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<AreaProduccion | null>(null);

    // State for packaging definer
    const [isPackagingDefinerOpen, setIsPackagingDefinerOpen] = useState(false);
    const [casePack, setCasePack] = useState<CasePack | null>(null);

    // Check if we're creating a Terminado
    const isTerminado = semioter2.tipo_producto === TIPOS_PRODUCTOS.terminado;

    const handleOpenAreaPicker = () => {
        setIsAreaPickerOpen(true);
    };

    const handleCloseAreaPicker = () => {
        setIsAreaPickerOpen(false);
    };

    const handleSelectArea = (area: AreaProduccion) => {
        setSelectedArea(area);
    };

    const handleOpenPackagingDefiner = () => {
        setIsPackagingDefinerOpen(true);
    };

    const handleClosePackagingDefiner = () => {
        setIsPackagingDefinerOpen(false);
    };

    const handleSavePackaging = (newCasePack: CasePack) => {
        setCasePack(newCasePack);
    };

    const onClickSiguiente = () => {
        const procesoCompleto: ProcesoProduccionCompleto = {
            ...proceso,
            rendimientoTeorico,
            areaProduccion: selectedArea || undefined,
        };

        // Add casePack to the semioter3 object if it's a Terminado
        setSemioter3({ 
            ...semioter2, 
            procesoProduccionCompleto: procesoCompleto,
            casePack: isTerminado ? casePack : undefined
        });

        setActiveStep(3);
    };

    const onClickAtras = () => {
        setActiveStep(1);
    };

    return (
        <Flex direction="column" gap={4}>
            <HStack spacing={4} alignItems="flex-start">
                <FormControl w="sm">
                    <FormLabel>Rendimiento Teórico</FormLabel>
                    <CustomDecimalInput
                        value={rendimientoTeorico}
                        onChange={setRendimientoTeorico}
                        min={0}
                        placeholder="0.0000"
                    />
                </FormControl>

                <FormControl w="sm">
                    <FormLabel>Área de Producción</FormLabel>
                    <InputGroup>
                        <Input
                            value={selectedArea ? `${selectedArea.nombre}` : ''}
                            placeholder="Seleccione un área"
                            isReadOnly
                            bg="gray.50"
                        />
                        <InputRightElement>
                            <IconButton
                                aria-label="Buscar área"
                                icon={<SearchIcon />}
                                size="sm"
                                onClick={handleOpenAreaPicker}
                            />
                        </InputRightElement>
                    </InputGroup>
                </FormControl>

                {/* Packaging Definer Button - Only visible for Terminado */}
                {isTerminado && (
                    <Box>
                        <FormLabel>Packaging</FormLabel>
                        <Button
                            colorScheme={casePack ? "green" : "blue"}
                            onClick={handleOpenPackagingDefiner}
                        >
                            {casePack ? "Packaging Definido" : "Definir Packaging"}
                        </Button>
                    </Box>
                )}
            </HStack>

            <ProcessDesigner
                semioter2={semioter2}
                onProcessChange={setProceso}
                onValidityChange={setIsProcessValid}
            />

            <Flex
                direction="row"
                w="full"
                gap={20}
                justifyContent="center"
                pr="2em"
                pl="2em"
            >
                <Button colorScheme="yellow" variant="solid" onClick={onClickAtras} flex={2}>
                    Atras
                </Button>

                <Button
                    colorScheme="teal"
                    variant="solid"
                    onClick={onClickSiguiente}
                    flex={2}
                    isDisabled={
                        !isProcessValid || 
                        rendimientoTeorico <= 0 || 
                        !selectedArea || 
                        (isTerminado && !casePack) // Require casePack for Terminado
                    }
                >
                    Siguiente
                </Button>
            </Flex>

            <AreaPickerGeneric
                isOpen={isAreaPickerOpen}
                onClose={handleCloseAreaPicker}
                onSelectArea={handleSelectArea}
            />

            <PackagingTerminadoDefiner
                isOpen={isPackagingDefinerOpen}
                onClose={handleClosePackagingDefiner}
                onSave={handleSavePackaging}
            />
        </Flex>
    );
}
