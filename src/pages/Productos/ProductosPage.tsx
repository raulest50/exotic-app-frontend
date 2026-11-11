import { Container } from "@chakra-ui/react";
import { useRef, useState } from "react";

import MyHeader from "../../components/MyHeader.tsx";
import ModuleGroupedTabs, { type ModuleTabGroup, type ModuleTabSelection } from "../../components/ModuleGroupedTabs.tsx";
import { tabAccessRule } from "../../auth/accessHelpers.ts";
import { useAccessSnapshot } from "../../auth/usePermissions.ts";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import CodificarMaterialesTab from "./Basic/CodificarMaterialesTab.tsx";
import InformeProductosTab from "./Basic/InformeProductosTab.tsx";
import { CategoriasTab } from "./DefSemiTer/CategoriasTab.tsx";
import InformeProductosTabAdvanced from "./DefSemiTer/consulta/InformeProductosTabAdvanced.tsx";
import DefinicionProcesosTab from "./DefProcesses/ProcesosProduccion/DefinicionProcesosTab.tsx";
import { ConsultaProcesosProduccion } from "./DefProcesses/ProcesosProduccion/ConsultaProcesosProduccion.tsx";
import CrearRecursoProduccion from "./DefProcesses/RecursosProduccion/CrearRecursoProduccion.tsx";
import ConsultaRecursosProduccion from "./DefProcesses/RecursosProduccion/ConsultaRecursosProduccion.tsx";
import ProcessDesignerTab, { type CatalogueEditRequest } from "./ProcessDesigner/ProcessDesignerTab.tsx";
import type { Producto } from "./types.tsx";

export default function ProductosPage() {
    const access = useAccessSnapshot();
    const [selection, setSelection] = useState<ModuleTabSelection>({ groupKey: "", tabKey: "" });
    const [editRequest, setEditRequest] = useState<CatalogueEditRequest | null>(null);
    const [returnToCatalogue, setReturnToCatalogue] = useState(false);
    const [catalogueRevision, setCatalogueRevision] = useState(0);
    const [catalogueReturnRevision, setCatalogueReturnRevision] = useState(0);
    const editSequence = useRef(0);

    function openInDesigner(producto: Producto) {
        if (!tabAccessRule(Modulo.PRODUCTOS, "MODIFICACIONES_PRODUCTOS", 3)(access)
            || !tabAccessRule(Modulo.PRODUCTOS, "PROCESS_DESIGNER", 2)(access)
            || !["T", "S"].includes(producto.tipo_producto)) return;
        setEditRequest({ requestId: ++editSequence.current, productoId: producto.productoId });
        setReturnToCatalogue(true);
        setSelection({ groupKey: "procesos-recursos", tabKey: "nuevo-process-designer" });
    }

    function returnToModifications() {
        setEditRequest(null);
        setReturnToCatalogue(false);
        setSelection({ groupKey: "basicos", tabKey: "modificaciones" });
    }

    function returnToProductList() {
        setCatalogueReturnRevision(revision => revision + 1);
        returnToModifications();
    }

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
            {
                key: "categorias",
                label: "Categorías",
                render: () => <CategoriasTab />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "CATEGORIAS", 2),
            },
            {
                key: "modificaciones",
                label: "Modificaciones",
                render: () => <InformeProductosTabAdvanced onEditInDesigner={openInDesigner}
                    refreshRevision={catalogueRevision} returnRevision={catalogueReturnRevision} />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "MODIFICACIONES_PRODUCTOS", 3),
            },
        ],
    },
    {
        key: "procesos-recursos",
        label: "Process Designer",
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
            {
                key: "nuevo-process-designer",
                label: "Process Designer v2",
                render: (isActive) => <ProcessDesignerTab isActive={isActive} editRequest={editRequest}
                    onEditRequestLoaded={() => setEditRequest(null)} onCancelEditRequest={returnToModifications}
                    onReturnToCatalogue={returnToCatalogue ? returnToProductList : undefined}
                    onSaved={() => setCatalogueRevision(revision => revision + 1)} />,
                accessRule: tabAccessRule(Modulo.PRODUCTOS, "PROCESS_DESIGNER", 2),
                flushContent: true,
            },
        ],
    },
    ];

    return (
        <Container
            w="full"
            maxW={{ base: "100%", xl: "container.xl", "2xl": "container.2xl" }}
            px={{ base: 2, md: 4, xl: 6 }}
            mx="auto"
            h="full"
        >
            <MyHeader title="Productos" />
            <ModuleGroupedTabs groups={groups} access={access} ariaLabel="Secciones de Productos"
                selection={selection} onSelectionChange={setSelection} />
        </Container>
    );
}
