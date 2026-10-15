import { Container } from "@chakra-ui/react";

import MyHeader from "../../components/MyHeader.tsx";
import ModuleGroupedTabs, { type ModuleTabGroup } from "../../components/ModuleGroupedTabs.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions.ts";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import CodificarMaterialesTab from "./Basic/CodificarMaterialesTab.tsx";
import InformeProductosTab from "./Basic/InformeProductosTab.tsx";
import CodificarSemioTermiTab from "./DefSemiTer/CodificarSemioTermiTab/CodificarSemioTermiTab.tsx";
import { CategoriasTab } from "./DefSemiTer/CategoriasTab.tsx";
import CrearDesdePlantillaTab from "./DefSemiTer/CrearDesdePlantilla/CrearDesdePlantillaTab.tsx";
import InformeProductosTabAdvanced from "./DefSemiTer/consulta/InformeProductosTabAdvanced.tsx";
import DefinicionProcesosTab from "./DefProcesses/ProcesosProduccion/DefinicionProcesosTab.tsx";
import { ConsultaProcesosProduccion } from "./DefProcesses/ProcesosProduccion/ConsultaProcesosProduccion.tsx";
import CrearRecursoProduccion from "./DefProcesses/RecursosProduccion/CrearRecursoProduccion.tsx";
import ConsultaRecursosProduccion from "./DefProcesses/RecursosProduccion/ConsultaRecursosProduccion.tsx";

const groups: ModuleTabGroup[] = [
    {
        key: "basicos",
        label: "Básicos",
        tabs: [
            {
                key: "codificar-material",
                label: "Codificar material",
                render: () => <CodificarMaterialesTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CODIFICAR_MATERIAL", 2),
            },
            {
                key: "consulta",
                label: "Consulta",
                render: () => <InformeProductosTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CONSULTA_PRODUCTOS", 1),
            },
        ],
    },
    {
        key: "terminados-semiterminados",
        label: "Terminados y semiterminados",
        tabs: [
            {
                key: "codificar-semiterminado",
                label: "Codificar terminado/semiterminado",
                render: (isActive) => <CodificarSemioTermiTab isActive={isActive} />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CODIFICAR_TERMINADO_SEMITERMINADO", 2),
            },
            {
                key: "categorias",
                label: "Categorías",
                render: () => <CategoriasTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CATEGORIAS", 2),
            },
            {
                key: "crear-desde-plantilla",
                label: "Crear desde plantilla",
                render: () => <CrearDesdePlantillaTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CREAR_DESDE_PLANTILLA", 2),
            },
            {
                key: "modificaciones",
                label: "Modificaciones",
                render: () => <InformeProductosTabAdvanced />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "MODIFICACIONES_PRODUCTOS", 3),
            },
        ],
    },
    {
        key: "procesos-recursos",
        label: "Procesos y recursos",
        tabs: [
            {
                key: "definicion-procesos",
                label: "Definir proceso",
                render: () => <DefinicionProcesosTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "DEFINIR_PROCESO", 2),
            },
            {
                key: "consultar-procesos",
                label: "Consultar procesos",
                render: () => <ConsultaProcesosProduccion />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CONSULTAR_PROCESOS", 2),
            },
            {
                key: "crear-recurso",
                label: "Crear recurso",
                render: () => <CrearRecursoProduccion />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CREAR_RECURSO_PRODUCCION", 2),
            },
            {
                key: "consultar-recursos",
                label: "Consultar recursos",
                render: () => <ConsultaRecursosProduccion />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CONSULTAR_RECURSOS_PRODUCCION", 2),
            },
        ],
    },
];

export default function ProductosPage() {
    const access = useAccessSnapshot();

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title="Productos" />
            <ModuleGroupedTabs groups={groups} access={access} ariaLabel="Secciones de Productos" />
        </Container>
    );
}
