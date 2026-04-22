import { Button, Container, Flex, SimpleGrid } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import { FaArrowLeft, FaDatabase } from "react-icons/fa";
import { FaBoxesStacked, FaCube, FaWarehouse } from "react-icons/fa6";
import CargaMasivaAlmacenTab from "./CargaMasivaAlmacenTab";
import CargaMasivaMaterialesTab from "../CargaMasivaMateriales/CargaMasivaMaterialesTab";
import CargaMasivaTerminadosTab from "../CargaMasivaTerminados/CargaMasivaTerminadosTab";
import CargaMasivaImportacionTotalBDTab from "../CargaMasivaImportacionTotalBD/CargaMasivaImportacionTotalBDTab";
import OperacionSelectCard from "../shared/OperacionSelectCard";

type MassiveLoadView = "selector" | "almacen" | "materiales" | "terminados" | "importacion-total-bd";

interface MassiveLoadOption {
    key: Exclude<MassiveLoadView, "selector">;
    titulo: string;
    descripcion: string;
    icono: IconType;
}

interface CargasMasivasTabProps {
    allowTotalDatabaseImport: boolean;
}

const BASE_LOAD_OPTIONS: MassiveLoadOption[] = [
    {
        key: "almacen",
        titulo: "Carga Masiva Almacen",
        descripcion: "Actualizar inventario desde plantilla Excel usando el flujo existente de almacen.",
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

export default function CargasMasivasTab({ allowTotalDatabaseImport }: CargasMasivasTabProps) {
    const [activeView, setActiveView] = useState<MassiveLoadView>("selector");

    const loadOptions = useMemo(() => {
        if (!allowTotalDatabaseImport) {
            return BASE_LOAD_OPTIONS;
        }

        return [
            ...BASE_LOAD_OPTIONS,
            {
                key: "importacion-total-bd" as const,
                titulo: "Importacion total BD",
                descripcion: "Vaciar completamente la base e importar un backup .dump del sistema. Solo local y staging.",
                icono: FaDatabase,
            },
        ];
    }, [allowTotalDatabaseImport]);

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
        if (activeView === "importacion-total-bd") {
            return <CargaMasivaImportacionTotalBDTab onBackToSelector={() => setActiveView("selector")} />;
        }
        return null;
    }, [activeView]);

    if (activeView === "selector") {
        return (
            <Container maxW="container.xl" py={6}>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {loadOptions.map((opt) => (
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

    if (activeView === "importacion-total-bd") {
        return (
            <Container minW={["auto", "container.lg", "container.xl"]} w="full" h="full">
                {activeContent}
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
