import { Button, Container, Flex, SimpleGrid } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { IconType } from "react-icons";
import { FaArrowLeft, FaDatabase, FaKey } from "react-icons/fa";
import { FaBoxesStacked, FaCube, FaWarehouse } from "react-icons/fa6";
import CargaMasivaAlmacenTab from "./CargaMasivaAlmacenTab";
import CargaMasivaMaterialesTab from "../CargaMasivaMateriales/CargaMasivaMaterialesTab";
import CargaMasivaTerminadosTab from "../CargaMasivaTerminados/CargaMasivaTerminadosTab";
import CargaMasivaImportacionTotalBDTab from "../CargaMasivaImportacionTotalBD/CargaMasivaImportacionTotalBDTab";
import OperacionSelectCard from "../shared/OperacionSelectCard";
import ResetPasswordsNoProductivoTab from "./ResetPasswordsNoProductivoTab";

type MassiveLoadView = "selector" | "almacen" | "materiales" | "terminados" | "importacion-total-bd" | "reset-passwords-staging";

interface MassiveLoadOption {
    key: Exclude<MassiveLoadView, "selector">;
    titulo: string;
    descripcion: string;
    icono: IconType;
}

interface CargasMasivasTabProps {
    allowTotalDatabaseImport: boolean;
    allowNonProductionPasswordReset: boolean;
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

export default function CargasMasivasTab({
    allowTotalDatabaseImport,
    allowNonProductionPasswordReset,
}: CargasMasivasTabProps) {
    const [activeView, setActiveView] = useState<MassiveLoadView>("selector");

    const loadOptions = useMemo(() => {
        const options: MassiveLoadOption[] = [...BASE_LOAD_OPTIONS];

        if (allowTotalDatabaseImport) {
            options.push({
                key: "importacion-total-bd" as const,
                titulo: "Importacion total BD",
                descripcion: "Vaciar completamente la base e importar un backup .dump del sistema. Solo local y staging.",
                icono: FaDatabase,
            });
        }

        if (allowNonProductionPasswordReset) {
            options.push({
                key: "reset-passwords-staging" as const,
                titulo: "Reset contrasenas staging",
                descripcion: "Asignar staging1234 a todos los usuarios no privilegiados. Solo local y staging.",
                icono: FaKey,
            });
        }

        return options;
    }, [allowTotalDatabaseImport, allowNonProductionPasswordReset]);

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
        if (activeView === "reset-passwords-staging") {
            return <ResetPasswordsNoProductivoTab />;
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
