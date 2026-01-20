// SemiterminadosStep1DefineInputs.tsx
import React, { useState, useEffect } from "react";
import { Producto, Insumo, ProductoSemiter } from "../../../../types.tsx";
import {Button, Flex, HStack, StatHelpText, useToast, VStack} from "@chakra-ui/react";
import SemioterBriefCard from "../../../../components/SemioterBriefCard.tsx";
import BandejaBusqueda from "./BandejaBusqueda.tsx";
import BandejaSeleccion from "./BandejaSeleccion.tsx";
import cloneDeep from "lodash/cloneDeep";
import {Stat, StatLabel, StatNumber} from "@chakra-ui/icons";

interface Props {
    setActiveStep: (step: number) => void;
    semioter: ProductoSemiter;
    setSemioter2: (semioter: ProductoSemiter) => void;
}

const StepTwo_ModProdMF: React.FC<Props> = ({ setActiveStep, semioter, setSemioter2 }) => {
    const toast = useToast();
    const [selectedInsumos, setSelectedInsumos] = useState<Insumo[]>([]);
    const [costo, setCosto] = useState(0);

    useEffect(() => {
        if (semioter?.insumos && semioter.insumos.length > 0) {
            setSelectedInsumos(
                cloneDeep(semioter.insumos).map((insumo) => ({
                    ...insumo,
                    subtotal: insumo.subtotal ?? insumo.producto.costo * insumo.cantidadRequerida,
                }))
            );
        }
    }, [semioter]);

    // Update total cost whenever selectedInsumos changes
    useEffect(() => {
        const totalCost = selectedInsumos.reduce(
            (sum, insumo) => sum + insumo.producto.costo * insumo.cantidadRequerida,
            0
        );
        setCosto(totalCost);
    }, [selectedInsumos]);

    // Validate if we can continue: at least 1 insumo and each with cantidadRequerida > 0
    const validoContinuar = (): boolean => {
        if (selectedInsumos.length < 1) return false;
        for (const insumo of selectedInsumos) {
            if (isNaN(insumo.cantidadRequerida) || insumo.cantidadRequerida <= 0) {
                return false;
            }
        }
        return true;
    };

    // Function to add a new insumo if not already added
    const handleAddInsumo = (producto: Producto) => {
        const exists = selectedInsumos.some(
            (insumo) => insumo.producto.productoId === producto.productoId
        );
        if (exists) {
            toast({
                title: "Insumo ya agregado",
                description: "El insumo ya está en la lista de selección.",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        const newInsumo: Insumo = {
            producto: producto,
            cantidadRequerida: 0,
            subtotal: 0,
        };
        setSelectedInsumos([...selectedInsumos, newInsumo]);
    };

    // Function to update the quantity of an insumo
    const handleUpdateCantidad = (productoId: string, newCantidad: number) => {
        setSelectedInsumos((prev) =>
            prev.map((insumo) =>
                insumo.producto.productoId === productoId
                    ? {
                        ...insumo,
                        cantidadRequerida: newCantidad,
                        subtotal: newCantidad * insumo.producto.costo,
                    }
                    : insumo
            )
        );
    };

    // Function to remove an insumo from the selection
    const handleRemoveInsumo = (productoId: string) => {
        setSelectedInsumos((prev) =>
            prev.filter((insumo) => insumo.producto.productoId !== productoId)
        );
    };

    const onClickSiguiente = () => {
        if (!validoContinuar()) {
            toast({
                title: "Validación fallida",
                description:
                    "Debe seleccionar al menos 1 insumo y cada uno debe tener una cantidad requerida mayor a 0.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }
        // Create a deep copy of semioter and update its insumos and cost
        const semioter2 = cloneDeep(semioter);
        semioter2.insumos = cloneDeep(selectedInsumos);
        // Assuming you want to store cost as a string in semioter2
        semioter2.costo = String(costo);
        setSemioter2(semioter2);
        setActiveStep(2);
    };

    const onClickAtras = () => {
        setActiveStep(0);
    };

    const onClickCleanLists = () => {
        setSelectedInsumos([]);
    };

    return (
        <Flex direction="column" gap={4} align="center" w="full" >
            <SemioterBriefCard semioter={semioter} />

            <HStack gap={8} w="full" align="flex-start">
                <BandejaBusqueda onAddInsumo={handleAddInsumo} />
                <VStack w={"full"}>
                    <Stat backgroundColor={"gray.50"} p={"1em"} boxShadow={"md"} w={"full"}>
                        <StatLabel>Total Costo: </StatLabel>
                        <StatNumber>{costo} ( $ COP)</StatNumber>
                        <StatHelpText>Costo total sumando todos los insumos</StatHelpText>
                    </Stat>
                    <BandejaSeleccion
                        selectedInsumos={selectedInsumos}
                        onUpdateCantidad={handleUpdateCantidad}
                        onRemoveInsumo={handleRemoveInsumo}
                    />
                </VStack>

            </HStack>

            <Flex direction="row" gap={10}>
                <Button variant="solid" colorScheme="yellow" onClick={onClickAtras}>
                    Atras
                </Button>
                <Button
                    variant="solid"
                    colorScheme="teal"
                    onClick={onClickSiguiente}
                    isDisabled={!validoContinuar()}
                >
                    Siguiente
                </Button>
                <Button variant="solid" colorScheme="red" onClick={onClickCleanLists}>
                    Limpiar Bandeja Seleccion
                </Button>
            </Flex>
        </Flex>
    );
};

export default StepTwo_ModProdMF;
