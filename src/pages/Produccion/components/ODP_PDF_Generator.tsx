import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import EndPointsURL from "../../../api/EndPointsURL.tsx";
import { InsumoWithStock, OrdenProduccionDTO } from "../types.tsx";

interface AutoTableProperties {
    finalY: number;
}

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable?: AutoTableProperties;
}

type EstadoInfo = { label: string };

const estadoOrdenMap: Record<number, EstadoInfo> = {
    0: { label: "En Producción" },
    1: { label: "Terminada" },
};

// --- Payload types (flexibles) ---
type Data4PDFProductoResponse = {
    productoId?: unknown;
    nombre?: unknown;
    tipo_producto?: unknown;
    tipoProducto?: unknown;
    tipoUnidades?: unknown;
    unidad?: unknown;
    insumos?: Data4PDFInsumoResponse[];
};

type Data4PDFInsumoResponse = {
    insumoId?: unknown;
    cantidadRequerida?: unknown;
    stockActual?: unknown;
    producto?: Data4PDFProductoResponse;
    productoNombre?: unknown;
    tipo_producto?: unknown;
    tipoProducto?: unknown;
    tipoUnidades?: unknown;
    unidad?: unknown;
    subInsumos?: Data4PDFInsumoResponse[];
    insumos?: Data4PDFInsumoResponse[];
};

interface AreaProduccion {
    areaId: number;
    nombre: string;
    descripcion: string;
    responsableArea?: any;
}

type Data4PDFResponse = {
    terminado?: {
        insumos?: Data4PDFInsumoResponse[]; // (se deja, pero NO lo usamos para la tabla 1)
        procesoProduccionCompleto?: {
            areaProduccion?: AreaProduccion;
        };
    };
    // NUEVO: el backend ya separa
    materials?: Data4PDFInsumoResponse[];
    semiterminados?: Data4PDFInsumoResponse[];
    areasProduccion?: AreaProduccion[];
};

export default class ODP_PDF_Generator {
    private readonly endPoints = new EndPointsURL();
    private readonly defaultUnidad = "KG";

    public async downloadPDF(orden: OrdenProduccionDTO): Promise<void> {
        const doc = await this.generatePDF(orden);
        doc.save(`orden-produccion-${orden.ordenId}.pdf`);
    }

    public async getPDFBlob(orden: OrdenProduccionDTO): Promise<Blob> {
        const doc = await this.generatePDF(orden);
        return doc.output("blob");
    }

    // ---------------------- Utils ----------------------
    private toNullableString(value: unknown): string | null {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        return str.length > 0 ? str : null;
    }

    private toNullableNumber(value: unknown): number | null {
        if (value === null || value === undefined) return null;
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!trimmed) return null;
            const parsed = Number(trimmed);
            return Number.isFinite(parsed) ? parsed : null;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private formatNumber(value: number | null | undefined, decimals = 3): string {
        if (value === null || value === undefined || Number.isNaN(value)) return "—";
        return value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    private getErrorMessage(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const responseMessage = (error.response?.data as { message?: string } | undefined)?.message;
            return responseMessage ?? error.message;
        }
        if (error instanceof Error) return error.message;
        return typeof error === "string" ? error : "Error desconocido";
    }

    private formatDate(date: string | null): string {
        if (!date) return "No disponible";
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return "No disponible";
        return parsed.toLocaleDateString();
    }

    private formatNullableNumber(value: number | null): string {
        return value !== null && value !== undefined ? value.toString() : "No especificado";
    }

    private async getImageBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") resolve(reader.result);
                else reject("Error converting image to base64.");
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ---------------------- Nueva lógica: construir árbol limpio ----------------------
    /**
     * Extrae SOLO materiales de un arreglo mixto (materiales y/o semiterminados),
     * "aplastando" los semiterminados anidados para subir sus materiales.
     */
    private extractMaterialsRecursively(items: Data4PDFInsumoResponse[] | undefined): Data4PDFInsumoResponse[] {
        if (!Array.isArray(items)) return [];

        const getChildren = (x: Data4PDFInsumoResponse): Data4PDFInsumoResponse[] => {
            if (Array.isArray(x.subInsumos)) return x.subInsumos;
            if (Array.isArray(x.insumos)) return x.insumos;
            if (Array.isArray(x.producto?.insumos)) return x.producto!.insumos!;
            return [];
        };

        const looksSemi = (x: Data4PDFInsumoResponse): boolean => {
            const kids = getChildren(x);
            if (kids.length > 0) return true;
            const rawTipo =
                this.toNullableString(x.tipo_producto) ??
                this.toNullableString(x.tipoProducto) ??
                "";
            const t = (rawTipo ?? "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .replace(/[^a-z]/g, "");
            return t.includes("semi") && t.includes("termin");
        };

        const out: Data4PDFInsumoResponse[] = [];
        for (const it of items) {
            if (looksSemi(it)) {
                out.push(...this.extractMaterialsRecursively(getChildren(it)));
            } else {
                out.push(it);
            }
        }
        return out;
    }

    /**
     * Normaliza cualquier item (material) a InsumoWithStock.
     * Lee PRIMERO de producto.*, luego de campos planos, para evitar IDs/nombres 0/idx.
     */
    private normalizeMaterial(m: Data4PDFInsumoResponse, idx: number): InsumoWithStock {
        const p = (m as any).producto ?? {};

        const nombre =
            this.toNullableString((m as any).productoNombre) ??
            this.toNullableString((m as any).nombre) ??
            this.toNullableString((p as any).productoNombre) ??
            this.toNullableString((p as any).nombre) ??
            `Material ${idx + 1}`;

        const productoIdRaw =
            this.toNullableString((m as any).productoId) ??
            this.toNullableString((p as any).productoId) ??
            this.toNullableNumber((m as any).productoId) ??
            this.toNullableNumber((p as any).productoId) ??
            idx;

        const unidad =
            this.toNullableString((m as any).tipoUnidades) ??
            this.toNullableString((m as any).unidad) ??
            this.toNullableString((p as any).tipoUnidades) ??
            this.toNullableString((p as any).unidad) ??
            this.defaultUnidad;

        const cantidadRequerida =
            this.toNullableNumber((m as any).cantidadRequerida) ??
            this.toNullableNumber((p as any).cantidadRequerida) ??
            1;

        const stockActual =
            this.toNullableNumber((m as any).stockActual) ??
            this.toNullableNumber((p as any).stockActual) ??
            0;

        return {
            insumoId:
                this.toNullableNumber((m as any).insumoId) ??
                this.toNullableNumber((p as any).insumoId) ??
                idx,
            productoId: productoIdRaw,
            productoNombre: nombre,
            cantidadRequerida,
            stockActual,
            tipo_producto: "material",
            tipoUnidades: unidad,
            subInsumos: [],
        };
    }

    /**
     * Normaliza un semiterminado de primer nivel a InsumoWithStock,
     * pero purgando semiterminados anidados (sube sus materiales).
     */
    private normalizeSemiTopLevel(s: Data4PDFInsumoResponse, idx: number): InsumoWithStock {
        const p = (s as any).producto ?? {};

        const rawChildren: Data4PDFInsumoResponse[] =
            Array.isArray(s.subInsumos) ? s.subInsumos :
                Array.isArray(s.insumos) ? s.insumos :
                    Array.isArray(p?.insumos) ? p.insumos : [];

        const onlyMaterials = this.extractMaterialsRecursively(rawChildren);

        const nombre =
            this.toNullableString((s as any).productoNombre) ??
            this.toNullableString((s as any).nombre) ??
            this.toNullableString((p as any).productoNombre) ??
            this.toNullableString((p as any).nombre) ??
            `Semiterminado ${idx + 1}`;

        const productoIdRaw =
            this.toNullableString((s as any).productoId) ??
            this.toNullableString((p as any).productoId) ??
            this.toNullableNumber((s as any).productoId) ??
            this.toNullableNumber((p as any).productoId) ??
            `semi-${idx}`;

        const unidad =
            this.toNullableString((s as any).tipoUnidades) ??
            this.toNullableString((s as any).unidad) ??
            this.toNullableString((p as any).tipoUnidades) ??
            this.toNullableString((p as any).unidad) ??
            this.defaultUnidad;

        const cantidadRequerida =
            this.toNullableNumber((s as any).cantidadRequerida) ??
            this.toNullableNumber((p as any).cantidadRequerida) ??
            1;

        const stockActual =
            this.toNullableNumber((s as any).stockActual) ??
            this.toNullableNumber((p as any).stockActual) ??
            0;

        return {
            insumoId:
                this.toNullableNumber((s as any).insumoId) ??
                this.toNullableNumber((p as any).insumoId) ??
                idx,
            productoId: productoIdRaw,
            productoNombre: nombre,
            cantidadRequerida,
            stockActual,
            tipo_producto: "semiterminado",
            tipoUnidades: unidad,
            subInsumos: onlyMaterials.map((m, i) => this.normalizeMaterial(m, i)),
        };
    }

    /**
     * Crea el árbol raíz a partir del payload nuevo (materials + semiterminados).
     * - Materiales van directo a la raíz
     * - Semiterminados de primer nivel van a la raíz con SOLO materiales como hijos
     */
    private buildTreeFromPayload(resp: Data4PDFResponse): InsumoWithStock[] {
        const materials = Array.isArray((resp as any).materials) ? (resp as any).materials : [];
        const semis = Array.isArray((resp as any).semiterminados) ? (resp as any).semiterminados : [];

        const rootMaterials = materials.map((m: Data4PDFInsumoResponse, i: number) => this.normalizeMaterial(m, i));
        const rootSemis = semis.map((s: Data4PDFInsumoResponse, i: number) => this.normalizeSemiTopLevel(s, i));

        const tree = [...rootMaterials, ...rootSemis];
        console.log("Árbol construido (materials + semis top-level purgados):", tree);
        return tree;
    }

    /**
     * Flatten simple (sin reglas especiales): solo calcula niveles para indentación en la tabla.
     */
    private flattenInsumos(
        insumos: InsumoWithStock[],
        level = 0
    ): Array<{ item: InsumoWithStock; level: number }> {
        return insumos.flatMap((insumo) => {
            const current = [{ item: insumo, level }];
            const kids = Array.isArray(insumo.subInsumos) ? insumo.subInsumos : [];
            if (kids.length === 0) return current;
            return current.concat(this.flattenInsumos(kids, level + 1));
        });
    }

    // ---------------------- Data fetch (usa payload nuevo) ----------------------
    private async fetchData4PDF(
        productoId: string | null,
    ): Promise<{ data: InsumoWithStock[]; areasProduccion: AreaProduccion[]; error?: string }> {
        console.log("fetchData4PDF - productoId recibido:", productoId, "Tipo:", typeof productoId);

        if (!productoId) {
            console.log("fetchData4PDF - productoId es nulo o vacío");
            return { data: [], areasProduccion: [], error: "Identificador de producto no disponible." };
        }

        try {
            const url = this.endPoints.produccion_terminado_data4pdf.replace("{id}", encodeURIComponent(productoId));
            console.log("URL para obtener data4pdf:", url);

            const response = await axios.get<Data4PDFResponse>(url);
            console.log("Respuesta del servidor (data4pdf):", response.data);

            // NUEVO: construir el árbol desde materials + semiterminados
            const data = this.buildTreeFromPayload(response.data);

            // Áreas de producción (igual que antes)
            const areasProduccion: AreaProduccion[] = [];
            const terminadoArea = response.data?.terminado?.procesoProduccionCompleto?.areaProduccion;
            if (terminadoArea && typeof terminadoArea === "object" && "areaId" in terminadoArea) {
                areasProduccion.push(terminadoArea as AreaProduccion);
            }
            const areasFromRoot = Array.isArray(response.data?.areasProduccion) ? response.data!.areasProduccion! : [];
            for (const a of areasFromRoot) {
                if (!areasProduccion.some((x) => x.areaId === a.areaId)) {
                    areasProduccion.push(a);
                }
            }

            return { data, areasProduccion };
        } catch (error) {
            console.error("Error en fetchData4PDF:", error);
            const message = this.getErrorMessage(error);
            return { data: [], areasProduccion: [], error: message };
        }
    }

    // ---------------------- PDF generation (cabezote y tabla 2 intactos) ----------------------
    private async generatePDF(orden: OrdenProduccionDTO): Promise<jsPDFWithAutoTable> {
        console.log("Orden completa:", orden);

        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" }) as jsPDFWithAutoTable;
        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = margin;

        // Logo
        let logoBase64: string | null = null;
        try {
            logoBase64 = await this.getImageBase64("/logo_exotic.png");
        } catch (error) {
            console.error("Error fetching logo image", error);
        }
        if (logoBase64) {
            doc.addImage(logoBase64, "PNG", margin, currentY, 30, 24);
        }

        // Título y estado (IDENTICO)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("ORDEN DE PRODUCCIÓN", pageWidth / 2, currentY + 10, { align: "center" });

        const estadoOrdenLabel = estadoOrdenMap[orden.estadoOrden]?.label ?? "Desconocido";
        doc.setFontSize(10);
        doc.text(`Orden ID: ${orden.ordenId}`, pageWidth / 2, currentY + 18, { align: "center" });
        doc.text(`Estado: ${estadoOrdenLabel}`, pageWidth / 2, currentY + 24, { align: "center" });

        currentY += 32;

        // Datos empresa (IDENTICO)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Napolitana J.P S.A.S.", margin, currentY);
        currentY += 4;
        doc.text("Nit: 901751897-1", margin, currentY);
        currentY += 4;
        doc.text("Tel: 301 711 51 81", margin, currentY);
        currentY += 4;
        doc.text("produccion.exotic@gmail.com", margin, currentY);

        // Fechas (IDENTICO)
        let detailY = margin + 20;
        const detailX = pageWidth - margin - 60;
        doc.setFontSize(8);
        doc.text("Fecha inicio:", detailX, detailY);
        doc.text(this.formatDate(orden.fechaInicio), detailX + 24, detailY);
        detailY += 4;
        doc.text("Fecha lanzamiento:", detailX, detailY);
        doc.text(this.formatDate(orden.fechaLanzamiento), detailX + 24, detailY);
        detailY += 4;
        doc.text("Fecha final planificada:", detailX, detailY);
        doc.text(this.formatDate(orden.fechaFinalPlanificada), detailX + 30, detailY);

        currentY += 12;

        // Resumen del producto (IDENTICO)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Resumen del producto", margin, currentY);
        currentY += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const productoInfo = [
            `Producto: ${orden.productoNombre}`,
            `Lote: ${orden.loteAsignado?.trim() ? orden.loteAsignado : "______________________"}`,
            `Cantidad a producir: ${this.formatNullableNumber(orden.cantidadProducir)}`,
            `Pedido comercial: ${orden.numeroPedidoComercial ?? "No especificado"}`,
            `Área operativa: ${orden.areaOperativa ?? "No especificada"}`,
            `Departamento operativo: ${orden.departamentoOperativo ?? "No especificado"}`,
        ];
        productoInfo.forEach((line) => {
            doc.text(line, margin, currentY);
            currentY += 5;
        });

        // ---------------------- TABLA 1 (Árbol de insumos) ----------------------
        currentY += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Árbol de insumos", margin, currentY);
        currentY += 6;

        const { data: insumosTree, areasProduccion, error: insumosError } = await this.fetchData4PDF(orden.productoId);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        const flattened = !insumosError && insumosTree.length ? this.flattenInsumos(insumosTree, 0) : [];
        const multiplicador = orden.cantidadProducir ?? 0;

        const tableBody = flattened.map(({ item, level }) => {
            const codigo = this.toNullableString(item.productoId) ?? String(item.productoId ?? "");
            const indent = `${"    ".repeat(level)}`;
            const unidad = this.toNullableString(item.tipoUnidades) ?? this.defaultUnidad;
            const cantidadBase = item.cantidadRequerida ?? 0;
            const cantidadADispensar = cantidadBase * multiplicador;
            const nombreMaterial = level > 0 ? `${indent}${item.productoNombre}` : item.productoNombre;

            return [
                codigo,
                nombreMaterial,
                unidad,
                "",
                this.formatNumber(cantidadADispensar),
                "",
                "",
            ];
        });

        if (insumosError) {
            doc.text(`Información no disponible (${insumosError})`, margin, currentY);
            currentY += 6;
        } else if (!insumosTree.length) {
            doc.text("No se registran insumos para este producto.", margin, currentY);
            currentY += 6;
        }

        autoTable(doc, {
            head: [[
                "Código Insumo",
                "Nombre Insumo",
                "Unidad de medida",
                "Lote",
                "Cantidad a dispensar",
                "Responsable Dispensación",
                "Área de Ejecucion",
            ]],
            body: tableBody,
            startY: currentY,
            styles: { fontSize: 8, halign: "center", valign: "middle" },
            headStyles: { fillColor: [217, 234, 249], textColor: 40 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { halign: "left", cellWidth: 60 },
                2: { cellWidth: 26 },
                4: { halign: "right", cellWidth: 32 },
            },
            theme: "grid",
        });

        currentY = (doc.lastAutoTable?.finalY ?? currentY) + 6;

        // ---------------------- TABLA 2 (Áreas de Producción) IDENTICA ----------------------
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Áreas de Producción", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        if (insumosError) {
            doc.text("Información no disponible por error al obtener insumos.", margin, currentY);
            currentY += 6;
        } else {
            const areasProduccionRows = (areasProduccion ?? []).map(area => [area.nombre, "", ""]);
            const procesosBody = areasProduccionRows.length > 0 ? areasProduccionRows : [["No hay áreas de producción registradas", "", ""]];

            if (!procesosBody.length) {
                doc.text("Información no disponible.", margin, currentY);
                currentY += 6;
            } else {
                autoTable(doc, {
                    head: [["Area Proceso", "Estado", "Responsable"]],
                    body: procesosBody,
                    startY: currentY,
                    styles: { fontSize: 8, halign: "center", valign: "middle" },
                    headStyles: { fillColor: [234, 223, 255], textColor: 40 },
                    columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "center" } },
                    theme: "grid",
                    didDrawCell: (data) => {
                        if (data.section === "body" && data.column.index === 1) {
                            const { x, y, width, height } = data.cell;
                            const size = Math.min(5, height - 2);
                            const cx = x + (width - size) / 2;
                            const cy = y + (height - size) / 2;
                            data.doc.setLineWidth(0.3);
                            data.doc.rect(cx, cy, size, size);
                        }
                    },
                });

                currentY = (doc.lastAutoTable?.finalY ?? currentY) + 6;
            }
        }

        // Observaciones (IDENTICO)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Observaciones", margin, currentY);
        currentY += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const observaciones = orden.observaciones?.trim();
        const obsText = observaciones && observaciones.length > 0 ? observaciones : "Sin observaciones";
        const obsLines = doc.splitTextToSize(obsText, pageWidth - margin * 2);
        doc.text(obsLines, margin, currentY);

        return doc;
    }
}
