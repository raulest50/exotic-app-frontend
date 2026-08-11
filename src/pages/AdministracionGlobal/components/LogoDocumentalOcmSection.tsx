import {
    Steps,
    Badge,
    Box,
    Button,
    HStack,
    Image,
    Input,
    Spinner,
    Table,
    Tbody,
    Td,
    Text,
    Textarea,
    Th,
    Thead,
    Tr,
    VStack,
    useToast,
    Field,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
    createEmpresaLogoDocumentalVersion,
    getEmpresaLogoDocumentalImagenVersion,
    getEmpresaLogoDocumentalVersiones,
    getEmpresaLogoDocumentalVigente,
    type EmpresaLogoDocumentalVersion,
} from "../../../api/EmpresaLogoDocumentalApi";
import type {
    EmpresaIdentidadLegalVersion,
    EmpresaIdentidadLegalVersionPayload,
} from "../../../api/EmpresaIdentidadLegalApi";
import OCM_PDF_Generator from "../../Compras/OCM_PDF_Generator";
import { DIVISAS, type OrdenCompraMateriales } from "../../Compras/types";

const MAX_FILE_SIZE_BYTES = 1_048_576;
const MIN_DIMENSION_PX = 100;
const MAX_DIMENSION_PX = 2000;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

interface LogoDocumentalOcmSectionProps {
    canEdit: boolean;
    identidadLegalPreview: EmpresaIdentidadLegalVersionPayload;
    identidadLegalVigente: EmpresaIdentidadLegalVersion | null;
}

export default function LogoDocumentalOcmSection({
    canEdit,
    identidadLegalPreview,
    identidadLegalVigente,
}: LogoDocumentalOcmSectionProps) {
    const toast = useToast();
    const [vigente, setVigente] = useState<EmpresaLogoDocumentalVersion | null>(null);
    const [versiones, setVersiones] = useState<EmpresaLogoDocumentalVersion[]>([]);
    const [vigenteDataUrl, setVigenteDataUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedDataUrl, setSelectedDataUrl] = useState<string | null>(null);
    const [selectedDimensions, setSelectedDimensions] = useState<{ width: number; height: number } | null>(null);
    const [motivoCambio, setMotivoCambio] = useState("");
    const [previewedFileKey, setPreviewedFileKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewing, setPreviewing] = useState(false);
    const [saving, setSaving] = useState(false);

    const selectedFileKey = useMemo(() => {
        if (!selectedFile) return null;
        return `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}`;
    }, [selectedFile]);

    const canSave = Boolean(
        canEdit &&
        selectedFile &&
        selectedDataUrl &&
        selectedFileKey &&
        previewedFileKey === selectedFileKey &&
        motivoCambio.trim()
    );

    const loadLogoData = useCallback(async () => {
        setLoading(true);
        try {
            const [vigenteResponse, versionesResponse] = await Promise.all([
                getEmpresaLogoDocumentalVigente(),
                getEmpresaLogoDocumentalVersiones(),
            ]);
            setVigente(vigenteResponse);
            setVersiones(versionesResponse);
            try {
                setVigenteDataUrl(await getEmpresaLogoDocumentalImagenVersion(vigenteResponse.id));
            } catch (imageError) {
                console.error("Error cargando imagen vigente del logo documental", imageError);
                setVigenteDataUrl(null);
            }
        } catch (error) {
            console.error("Error cargando logo documental", error);
            toast({
                title: "No se pudo cargar el logo documental",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        void loadLogoData();
    }, [loadLogoData]);

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setSelectedFile(null);
        setSelectedDataUrl(null);
        setSelectedDimensions(null);
        setPreviewedFileKey(null);

        if (!file) return;

        try {
            const dimensions = await validatePngFile(file);
            const dataUrl = await fileToDataUrl(file);
            setSelectedFile(file);
            setSelectedDataUrl(dataUrl);
            setSelectedDimensions(dimensions);
        } catch (error) {
            event.target.value = "";
            toast({
                title: "Logo no valido",
                description: error instanceof Error ? error.message : "No se pudo validar el archivo.",
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handlePreview = async () => {
        if (!selectedDataUrl || !selectedFileKey) return;

        setPreviewing(true);
        try {
            const generator = new OCM_PDF_Generator();
            await generator.downloadPDF_OCM(
                buildPreviewOcm(),
                buildPreviewIdentidadLegal(identidadLegalPreview, identidadLegalVigente),
                {
                    logoDataUrl: selectedDataUrl,
                    downloadFileName: "ocm-preview-logo-documental.pdf",
                }
            );
            setPreviewedFileKey(selectedFileKey);
        } catch (error) {
            console.error("Error generando previsualizacion OCM", error);
            toast({
                title: "No se pudo generar la OCM de prueba",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setPreviewing(false);
        }
    };

    const handleSave = async () => {
        if (!selectedFile || !canSave) return;

        setSaving(true);
        try {
            const created = await createEmpresaLogoDocumentalVersion(selectedFile, motivoCambio.trim());
            setVigente(created);
            setVersiones((current) => [
                created,
                ...current
                    .filter((item) => item.id !== created.id)
                    .map((item) => item.estado === "VIGENTE"
                        ? { ...item, estado: "RETIRADA" as const, vigenteHasta: created.vigenteDesde }
                        : item),
            ]);
            try {
                const [versionesActualizadas, createdDataUrl] = await Promise.all([
                    getEmpresaLogoDocumentalVersiones(),
                    getEmpresaLogoDocumentalImagenVersion(created.id),
                ]);
                setVersiones(versionesActualizadas);
                setVigenteDataUrl(createdDataUrl);
            } catch (refreshError) {
                console.error("El logo se guardo pero no se pudo refrescar su vista", refreshError);
                setVigenteDataUrl(null);
                toast({
                    title: "Logo guardado; no se pudo refrescar la vista",
                    description: "Recargue la pantalla para visualizar la nueva imagen.",
                    status: "warning",
                    duration: 5000,
                    isClosable: true,
                });
            }
            toast({
                title: "Logo documental actualizado",
                status: "success",
                duration: 5000,
                isClosable: true,
            });
            setSelectedFile(null);
            setSelectedDataUrl(null);
            setSelectedDimensions(null);
            setPreviewedFileKey(null);
            setMotivoCambio("");
        } catch (error) {
            console.error("Error guardando logo documental", error);
            toast({
                title: "No se pudo guardar el logo documental",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <Spinner />
            </Box>
        );
    }

    return (
        <VStack align="stretch" gap={4}>
            <Box borderWidth="1px" borderRadius="md" p={4}>
                <HStack justify="space-between" align="flex-start" mb={4}>
                    <Box>
                        <Text fontWeight="bold">Logo documental corporativo</Text>
                        <Text fontSize="sm" color="app.textMuted">
                            {vigente
                                ? `Version ${vigente.version} - ${vigente.anchoPx} x ${vigente.altoPx} px`
                                : "-"}
                        </Text>
                    </Box>
                    {vigente ? <Badge colorPalette="green">{vigente.estado}</Badge> : null}
                </HStack>

                <HStack align="flex-start" gap={6}>
                    <Box minW="120px">
                        <Text fontSize="sm" fontWeight="semibold" mb={2}>Vigente</Text>
                        {vigenteDataUrl ? (
                            <Image
                                src={vigenteDataUrl}
                                alt="Logo documental vigente"
                                maxW="120px"
                                maxH="90px"
                                objectFit="contain"
                                borderWidth="1px"
                                borderRadius="md"
                                p={2}
                            />
                        ) : (
                            <Text fontSize="sm">-</Text>
                        )}
                    </Box>

                    <VStack align="stretch" flex={1} gap={4}>
                        <Field.Root disabled={!canEdit}>
                            <Field.Label>Nuevo logo PNG</Field.Label>
                            <Input type="file" accept="image/png" onValueChange={handleFileChange} p={1} />
                        </Field.Root>

                        {selectedDataUrl ? (
                            <HStack align="center" gap={4}>
                                <Image
                                    src={selectedDataUrl}
                                    alt="Logo documental seleccionado"
                                    maxW="120px"
                                    maxH="90px"
                                    objectFit="contain"
                                    borderWidth="1px"
                                    borderRadius="md"
                                    p={2}
                                />
                                <Box fontSize="sm">
                                    <Text>{selectedFile?.name}</Text>
                                    <Text color="app.textMuted">
                                        {selectedDimensions
                                            ? `${selectedDimensions.width} x ${selectedDimensions.height} px`
                                            : "-"}
                                    </Text>
                                    <Text color="app.textMuted">{formatBytes(selectedFile?.size ?? 0)}</Text>
                                </Box>
                            </HStack>
                        ) : null}

                        <Field.Root required disabled={!canEdit}>
                            <Field.Label>Motivo del cambio</Field.Label>
                            <Textarea
                                value={motivoCambio}
                                onValueChange={(event) => setMotivoCambio(event.target.value)}
                                minH="80px"
                            />
                        </Field.Root>

                        <HStack justify="flex-end">
                            <Button
                                variant="outline"
                                onClick={handlePreview}
                                disabled={!selectedDataUrl || !canEdit}
                                loading={previewing}
                            >
                                Descargar OCM de prueba
                            </Button>
                            <Button
                                colorPalette="teal"
                                onClick={handleSave}
                                disabled={!canSave}
                                loading={saving}
                            >
                                Guardar logo
                            </Button>
                        </HStack>
                    </VStack>
                </HStack>
            </Box>

            <Box overflowX="auto" borderWidth="1px" borderRadius="md">
                <Table.Root size="sm" variant="simple">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeader>Version</Table.ColumnHeader>
                            <Table.ColumnHeader>Estado</Table.ColumnHeader>
                            <Table.ColumnHeader>Archivo</Table.ColumnHeader>
                            <Table.ColumnHeader>Dimensiones</Table.ColumnHeader>
                            <Table.ColumnHeader>Tamano</Table.ColumnHeader>
                            <Table.ColumnHeader>Vigente desde</Table.ColumnHeader>
                            <Table.ColumnHeader>Vigente hasta</Table.ColumnHeader>
                            <Table.ColumnHeader>Creado por</Table.ColumnHeader>
                            <Table.ColumnHeader>Motivo</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {versiones.map((version) => (
                            <Table.Row key={version.id}>
                                <Table.Cell>{version.version}</Table.Cell>
                                <Table.Cell>
                                    <Badge colorPalette={version.estado === "VIGENTE" ? "green" : "gray"}>
                                        {version.estado}
                                    </Badge>
                                </Table.Cell>
                                <Table.Cell>{version.nombreArchivoOriginal}</Table.Cell>
                                <Table.Cell>{version.anchoPx} x {version.altoPx}</Table.Cell>
                                <Table.Cell>{formatBytes(version.tamanoBytes)}</Table.Cell>
                                <Table.Cell>{formatDateTime(version.vigenteDesde)}</Table.Cell>
                                <Table.Cell>{formatDateTime(version.vigenteHasta)}</Table.Cell>
                                <Table.Cell>{version.creadoPor ?? "-"}</Table.Cell>
                                <Table.Cell>{version.motivoCambio ?? "-"}</Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </Box>
        </VStack>
    );
}

async function validatePngFile(file: File): Promise<{ width: number; height: number }> {
    if (file.type !== "image/png") {
        throw new Error("El archivo debe ser PNG.");
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new Error("El archivo no puede superar 1 MB.");
    }

    const signatureBytes = new Uint8Array(await file.slice(0, PNG_SIGNATURE.length).arrayBuffer());
    const hasPngSignature = PNG_SIGNATURE.every((value, index) => signatureBytes[index] === value);
    if (!hasPngSignature) {
        throw new Error("El archivo no tiene una firma PNG valida.");
    }

    const dimensions = await readImageDimensions(file);
    if (dimensions.width < MIN_DIMENSION_PX || dimensions.height < MIN_DIMENSION_PX) {
        throw new Error("El logo debe medir al menos 100 x 100 px.");
    }
    if (dimensions.width > MAX_DIMENSION_PX || dimensions.height > MAX_DIMENSION_PX) {
        throw new Error("El logo no puede superar 2000 x 2000 px.");
    }

    return dimensions;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new window.Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("No se pudo leer el PNG."));
        };
        image.src = objectUrl;
    });
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("No se pudo leer el logo."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function buildPreviewIdentidadLegal(
    payload: EmpresaIdentidadLegalVersionPayload,
    vigente: EmpresaIdentidadLegalVersion | null
): EmpresaIdentidadLegalVersion {
    const now = new Date().toISOString();
    return {
        id: vigente?.id ?? 0,
        version: vigente?.version ?? 1,
        estado: "VIGENTE",
        razonSocial: valueOrFallback(payload.razonSocial, vigente?.razonSocial, "Razon social de prueba"),
        nombreComercial: valueOrFallback(payload.nombreComercial, vigente?.nombreComercial, "Nombre comercial"),
        tipoIdentificacion: valueOrFallback(payload.tipoIdentificacion, vigente?.tipoIdentificacion, "NIT"),
        numeroIdentificacion: valueOrFallback(payload.numeroIdentificacion, vigente?.numeroIdentificacion, "900000000"),
        digitoVerificacion: valueOrFallback(payload.digitoVerificacion, vigente?.digitoVerificacion, "0"),
        telefonoPrincipal: valueOrFallback(payload.telefonoPrincipal, vigente?.telefonoPrincipal, "000 000 00 00"),
        emailPrincipal: valueOrFallback(payload.emailPrincipal, vigente?.emailPrincipal, "documental@example.com"),
        vigenteDesde: vigente?.vigenteDesde ?? now,
        vigenteHasta: vigente?.vigenteHasta,
        creadoEn: vigente?.creadoEn ?? now,
        creadoPor: vigente?.creadoPor,
        motivoCambio: vigente?.motivoCambio,
    };
}

function buildPreviewOcm(): OrdenCompraMateriales {
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + 30);

    const cantidad = 20;
    const precioUnitario = 12500;
    const subTotal = cantidad * precioUnitario;
    const ivaCOP = Math.round(subTotal * 0.19);

    return {
        ordenCompraId: 999999,
        fechaEmision: now.toISOString(),
        fechaVencimiento: dueDate.toISOString(),
        proveedor: {
            id: "900000000-0",
            tipoIdentificacion: 0,
            nombre: "Proveedor de Prueba S.A.S.",
            direccion: "Carrera 50 # 72-10",
            regimenTributario: 0,
            ciudad: "Barranquilla",
            departamento: "Atlantico",
            contactos: [],
            categorias: [],
            condicionPago: "0",
        },
        itemsOrdenCompra: [
            {
                itemOrdenId: 1,
                material: {
                    productoId: 1001,
                    nombre: "Materia prima de prueba",
                    observaciones: "",
                    costo: precioUnitario,
                    ivaPercentual: 19,
                    tipoUnidades: "kg",
                    cantidadUnidad: "1",
                    tipo_producto: "MATERIAL",
                },
                cantidad,
                precioUnitario,
                ivaCOP,
                subTotal,
                cantidadCorrecta: 0,
                precioCorrecto: 0,
            },
        ],
        subTotal,
        ivaCOP,
        totalPagar: subTotal + ivaCOP,
        condicionPago: "0",
        tiempoEntrega: "15",
        plazoPago: 30,
        observaciones: "Documento de previsualizacion generado para validar el logo documental.",
        estado: 1,
        divisas: DIVISAS.COP,
        trm: 1,
    };
}

function valueOrFallback(value: string, fallback: string | undefined, defaultValue: string): string {
    const trimmed = value.trim();
    return trimmed || fallback || defaultValue;
}

function formatBytes(value: number): string {
    if (value < 1024) return `${value} B`;
    return `${(value / 1024).toFixed(1)} KB`;
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";
    return new Date(value).toLocaleString();
}
