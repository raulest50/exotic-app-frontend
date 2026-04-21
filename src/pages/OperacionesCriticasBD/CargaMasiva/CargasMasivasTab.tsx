import { Button, Container, Flex, SimpleGrid } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import { FaArrowLeft } from "react-icons/fa";
import { FaBoxesStacked, FaCube, FaWarehouse } from "react-icons/fa6";
import CargaMasivaAlmacenTab from "./CargaMasivaAlmacenTab";
import CargaMasivaMaterialesTab from "../CargaMasivaMateriales/CargaMasivaMaterialesTab";
import CargaMasivaTerminadosTab from "../CargaMasivaTerminados/CargaMasivaTerminadosTab";
import OperacionSelectCard from "../shared/OperacionSelectCard";

type MassiveLoadView = "selector" | "almacen" | "materiales" | "terminados";

interface MassiveLoadOption {
    key: Exclude<MassiveLoadView, "selector">;
    titulo: string;
    descripcion: string;
    icono: IconType;
}

const LOAD_OPTIONS: MassiveLoadOption[] = [
    {
        key: "almacen",
        titulo: "Carga Masiva Almacen",
        descripcion: "Actualizar inventario desde plantilla Excel usando el flujo existente de almacén.",
        icono: FaWarehouse,
    },
    {
        key: "materiales",
        titulo: "Carga Masiva Materiales",
        descripcion: "Registrar materiales desde plantilla Excel manteniendo el flujo actual paso a paso.",
        icono: FaCube,
    },
    {
        key: "terminados",
        titulo: "Carga Masiva Terminados",
        descripcion: "Entrar al selector actual de terminados y continuar con sus opciones internas sin cambios.",
        icono: FaBoxesStacked,
    },
];

export default function CargasMasivasTab() {
    const [activeView, setActiveView] = useState<MassiveLoadView>("selector");

    const activeContent = useMemo(() => {
        if (activeView === "almacen") {
            return <CargaMasivaAlmacenTab />;
        }
        if (activeView === "materiales") {
            return <CargaMasivaMaterialesTab />;
        }
        if (activeView === "terminados") {
            return <CargaMasivaTerminadosTab />;
        }
        return null;
    }, [activeView]);

    if (activeView === "selector") {
        return (
            <Container maxW="container.xl" py={6}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {LOAD_OPTIONS.map((opt) => (
                        <OperacionSelectCard
                            key={opt.key}
                            titulo={opt.titulo}
                            descripcion={opt.descripcion}
                            icono={opt.icono}
                            onClick={() => setActiveView(opt.key)}
                        />
                    ))}
                </SimpleGrid>
            </Container>
        );
    }

    return (
        <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
            <Flex direction="column" gap={4} w="full" h="full">
                <Button leftIcon={<FaArrowLeft />} w="fit-content" onClick={() => setActiveView("selector")}>
                    Volver
                </Button>
                {activeContent}
            </Flex>
        </Container>
    );
}
