import { useState, type ReactNode } from "react";
import type { StoryDefault } from "@ladle/react";
import { Box, Button, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";

import type { EmpresaIdentidadDocumento } from "@/api/EmpresaIdentidadDocumentalApi";
import OCAF_PDF_Generator from "@/pages/ActivosFijos/OCAF_PDF_Generator";
import type { OrdenCompraActivo } from "@/pages/ActivosFijos/types";
import OCM_PDF_Generator from "@/pages/Compras/OCM_PDF_Generator";
import { DIVISAS, type OrdenCompraMateriales, type Proveedor } from "@/pages/Compras/types";
import ODP_PDF_Generator from "@/pages/Produccion/components/ODP_PDF_Generator";
import type { MpsSemanalDraftDTO } from "@/pages/Produccion/ProgProdSemanalTab/MpsSemanalService";
import { getMpsSemanalPdfBlob } from "@/pages/Produccion/ProgProdSemanalTab/pdf/MpsSemanalPdfGenerator";
import type { OrdenProduccionDTO } from "@/pages/Produccion/types";
import DispensacionPDF_Generator from "@/pages/TransaccionesAlmacen/AsistenteDispensacion/AsistenteDispensacionComponents/DispensacionPDF_Generator";

let logoDataUrlPromise: Promise<string> | undefined;

function getFixtureLogoDataUrl(): Promise<string> {
  logoDataUrlPromise ??= fetch("/logo_exotic.png")
    .then(response => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar el logo de fixture (${response.status}).`);
      }
      return response.blob();
    })
    .then(
      blob =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("El logo de fixture no se pudo convertir a data URL."));
          reader.onerror = () => reject(new Error("No se pudo leer el logo de fixture."));
          reader.readAsDataURL(blob);
        }),
    );

  return logoDataUrlPromise;
}

const COMPANY: EmpresaIdentidadDocumento = {
  id: 101,
  version: 1,
  razonSocial: "Exotic Test S.A.S.",
  nombreComercial: "Exotic Test",
  tipoIdentificacion: "NIT",
  numeroIdentificacion: "900123456",
  digitoVerificacion: "7",
  telefonoPrincipal: "+57 300 000 0000",
  emailPrincipal: "qa@example.test",
};

const PROVIDER: Proveedor = {
  id: "901000111",
  tipoIdentificacion: 0,
  nombre: "Proveedor de caracterizacion",
  direccion: "Calle 1 # 2-3",
  regimenTributario: 0,
  ciudad: "Barranquilla",
  departamento: "Atlantico",
  contactos: [],
  categorias: [],
  condicionPago: "0",
};

const OCM_FIXTURE: OrdenCompraMateriales = {
  ordenCompraId: 1101,
  fechaEmision: "2026-08-12T00:00:00Z",
  fechaVencimiento: "2026-08-20T00:00:00Z",
  proveedor: PROVIDER,
  itemsOrdenCompra: [
    {
      itemOrdenId: 1,
      material: {
        productoId: 501,
        nombre: "Material de caracterizacion",
        observaciones: "",
        costo: 12500,
        ivaPercentual: 19,
        tipoUnidades: "KG",
        cantidadUnidad: "1",
        tipo_producto: "material",
      },
      cantidad: 4,
      precioUnitario: 12500,
      ivaCOP: 9500,
      subTotal: 50000,
      cantidadCorrecta: 0,
      precioCorrecto: 0,
    },
  ],
  subTotal: 50000,
  ivaCOP: 9500,
  totalPagar: 59500,
  condicionPago: "0",
  tiempoEntrega: "5",
  plazoPago: 30,
  observaciones: "Documento de caracterizacion.",
  estado: 1,
  divisas: DIVISAS.COP,
};

const OCAF_FIXTURE: OrdenCompraActivo = {
  ordenCompraActivoId: 2101,
  fechaEmision: new Date("2026-08-12T00:00:00Z"),
  fechaVencimiento: new Date("2026-08-25T00:00:00Z"),
  proveedor: PROVIDER,
  subTotal: 800000,
  iva: 152000,
  totalPagar: 952000,
  condicionPago: "0",
  tiempoEntrega: "10",
  plazoPago: 30,
  observaciones: "Activo de caracterizacion.",
  estado: 1,
  divisa: "COP",
  trm: 1,
  itemsOrdenCompra: [
    {
      itemOrdenId: 1,
      ordenCompraActivoId: 2101,
      nombre: "Equipo de caracterizacion",
      cantidad: 1,
      precioUnitario: 800000,
      ivaPercentage: 19,
      ivaValue: 152000,
      subTotal: 800000,
    },
  ],
};

const ODP_FIXTURE: OrdenProduccionDTO = {
  ordenId: 3101,
  productoId: "TERM-001",
  productoNombre: "Terminado de caracterizacion",
  productoTipo: "terminado",
  productoCategoriaId: 41,
  productoCategoriaNombre: "Categoria QA",
  productoUnidad: "UN",
  fechaCreacion: "2026-08-12T08:00:00Z",
  fechaInicio: "2026-08-13",
  fechaLanzamiento: "2026-08-14",
  fechaFinalPlanificada: "2026-08-18",
  estadoOrden: 0,
  cantidadProducir: 12,
  numeroPedidoComercial: "PED-QA-01",
  areaOperativa: "Mezclas",
  departamentoOperativo: "Produccion",
  loteAsignado: "LOTE-QA-01",
  observaciones: "Orden determinista de caracterizacion.",
};

const MPS_FIXTURE: MpsSemanalDraftDTO = {
  mpsId: 4101,
  estado: "APROBADO",
  fechaCreacion: "2026-08-10T08:00:00Z",
  fechaActualizacion: "2026-08-11T09:00:00Z",
  fechaAprobacion: "2026-08-11T10:00:00Z",
  aprobadoPorUsername: "qa.master",
  fechaGeneracionOdps: null,
  generadoPorUsername: null,
  semanaMpsId: 32,
  semanaMpsCodigo: "2026-W33",
  anioSemana: 2026,
  numeroSemana: 33,
  standard: "ISO",
  revisionNumero: 1,
  weekStartDate: "2026-08-10",
  weekEndDate: "2026-08-15",
  dias: [
    {
      id: 1,
      fecha: "2026-08-10",
      dayIndex: 0,
      displayOrder: 0,
      items: [
        {
          id: 1,
          terminadoId: "TERM-001",
          terminadoNombre: "Terminado de caracterizacion",
          categoriaId: 41,
          categoriaNombre: "Categoria QA",
          loteSize: 6,
          tiempoDiasFabricacion: 2,
          numeroLotes: 2,
          estadoItem: "ACTIVO",
          cantidadTotal: 12,
          fechaLanzamiento: "2026-08-10",
          fechaFinalPlanificada: "2026-08-12",
          observacion: "Fixture MPS",
          warning: null,
          displayOrder: 0,
          editable: false,
          blockedReason: null,
          ordenesIniciadas: 0,
          ordenesCancelables: 0,
          lotesActivos: 2,
          lotesCancelados: 0,
          lotesCancelables: 2,
          lotesNoCancelables: 0,
          lotesPlanificados: [
            {
              id: 11,
              loteOrdinal: 1,
              cantidadPlanificada: 6,
              estado: "PENDIENTE_ODP",
              ordenProduccionId: null,
              loteAsignado: null,
              ordenIniciada: false,
              ordenCancelable: true,
            },
            {
              id: 12,
              loteOrdinal: 2,
              cantidadPlanificada: 6,
              estado: "PENDIENTE_ODP",
              ordenProduccionId: null,
              loteAsignado: null,
              ordenIniciada: false,
              ordenCancelable: true,
            },
          ],
        },
      ],
    },
  ],
  totalItems: 1,
  totalLotesPlanificados: 2,
  totalOdpsGeneradas: 0,
};

type GeneratorId = "ocm" | "ocaf" | "odp" | "mps" | "dispensacion";
type GeneratorState = "idle" | "running" | "success" | "error";

interface PdfResult {
  state: GeneratorState;
  detail: string;
}

async function characterizeBlob(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 5));

  if (blob.type !== "application/pdf") {
    throw new Error(`MIME inesperado: ${blob.type || "vacio"}`);
  }
  if (header !== "%PDF-") {
    throw new Error(`Cabecera inesperada: ${JSON.stringify(header)}`);
  }
  if (bytes.byteLength < 750) {
    throw new Error(`PDF demasiado pequeno: ${bytes.byteLength} bytes`);
  }

  return `${header} · ${bytes.byteLength} bytes`;
}

const GENERATORS: Array<{
  id: GeneratorId;
  label: string;
  generate: () => Promise<Blob>;
}> = [
  {
    id: "ocm",
    label: "Orden de compra de materiales",
    generate: async () =>
      new OCM_PDF_Generator().getOCMpdf_Blob(OCM_FIXTURE, COMPANY, {
        logoDataUrl: await getFixtureLogoDataUrl(),
      }),
  },
  {
    id: "ocaf",
    label: "Orden de compra de activos fijos",
    generate: async () =>
      new OCAF_PDF_Generator().getOCAFpdf_Blob(OCAF_FIXTURE, COMPANY, {
        logoDataUrl: await getFixtureLogoDataUrl(),
      }),
  },
  {
    id: "odp",
    label: "Orden de produccion",
    generate: () => new ODP_PDF_Generator().getPDFBlob(ODP_FIXTURE),
  },
  {
    id: "mps",
    label: "Programacion semanal MPS",
    generate: () => getMpsSemanalPdfBlob(MPS_FIXTURE),
  },
  {
    id: "dispensacion",
    label: "Dispensacion de materiales",
    generate: async () => {
      const doc = await new DispensacionPDF_Generator().generatePDF_Dispensacion(
        3101,
        {
          productoNombre: "Terminado de caracterizacion",
          fechaCreacion: "2026-08-12T08:00:00Z",
        },
        [
          {
            productoId: "MAT-001",
            productoNombre: "Material de caracterizacion",
            loteBatch: "BATCH-QA-01",
            cantidad: 3.5,
            unidad: "KG",
            fechaVencimiento: "2027-08-12",
          },
        ],
        [{ id: 1, nombreCompleto: "Operador QA", username: "qa.operator" }],
        { id: 2, nombreCompleto: "Aprobador QA", username: "qa.approver" },
        "Dispensacion determinista de caracterizacion.",
        true,
      );
      return doc.output("blob");
    },
  },
];

const initialResults = Object.fromEntries(
  GENERATORS.map(({ id }) => [id, { state: "idle", detail: "Pendiente" }]),
) as Record<GeneratorId, PdfResult>;

function ResultCard({ children, generator }: { children?: ReactNode; generator: (typeof GENERATORS)[number] }) {
  return children ?? <Text>{generator.label}</Text>;
}

export default {
  title: "PDF Generators Characterization",
} satisfies StoryDefault;

export const AllGenerators = () => {
  const [results, setResults] = useState<Record<GeneratorId, PdfResult>>(initialResults);

  const run = async (generator: (typeof GENERATORS)[number]) => {
    setResults(current => ({
      ...current,
      [generator.id]: { state: "running", detail: "Generando..." },
    }));

    try {
      const detail = await characterizeBlob(await generator.generate());
      setResults(current => ({
        ...current,
        [generator.id]: { state: "success", detail },
      }));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setResults(current => ({
        ...current,
        [generator.id]: { state: "error", detail },
      }));
    }
  };

  return (
    <Box minH="100vh" bg="app.surfaceSubtle" color="fg" p={{ base: 4, md: 8 }}>
      <VStack data-testid="pdf-generators-characterization" align="stretch" gap={6} maxW="960px" mx="auto">
        <Box>
          <Heading as="h1" size="xl">
            Generadores PDF
          </Heading>
          <Text mt={2} color="app.textMuted" fontSize="sm">
            Caracterizacion aislada de jsPDF y jsPDF-AutoTable con datos deterministas.
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {GENERATORS.map(generator => {
            const result = results[generator.id];
            return (
              <Box key={generator.id} bg="app.surface" borderWidth="1px" borderRadius="md" p={4}>
                <VStack align="stretch" gap={3}>
                  <ResultCard generator={generator}>
                    <Text fontWeight="semibold">{generator.label}</Text>
                  </ResultCard>
                  <Button
                    type="button"
                    onClick={() => void run(generator)}
                    loading={result.state === "running"}
                  >
                    Generar {generator.id.toUpperCase()}
                  </Button>
                  <Text
                    as="output"
                    data-testid={`pdf-result-${generator.id}`}
                    data-state={result.state}
                    aria-live="polite"
                    color={result.state === "error" ? "red.600" : "app.textMuted"}
                    fontFamily="mono"
                    fontSize="sm"
                  >
                    {result.detail}
                  </Text>
                </VStack>
              </Box>
            );
          })}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};
