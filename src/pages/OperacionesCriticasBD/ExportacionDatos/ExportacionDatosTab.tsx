import { SimpleGrid, Container } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { FaDatabase } from 'react-icons/fa';
import { FaCube, FaCodeBranch, FaTruck } from 'react-icons/fa';
import { FaCubes } from 'react-icons/fa6';
import { IconType } from 'react-icons';
import EndPointsURL from '../../../api/EndPointsURL';
import ConfirmarExportacionModal, { ExportConfig } from './ConfirmarExportacionModal';
import EntidadExportSelectCard from './EntidadExportSelectCard';

interface ExportOption {
    titulo: string;
    descripcion: string;
    icono: IconType;
    config: ExportConfig;
}

interface ExportacionDatosTabProps {}

function ExportacionDatosTab(_props: ExportacionDatosTabProps) {
    const [activeConfig, setActiveConfig] = useState<ExportConfig | null>(null);
    const endpoints = useMemo(() => new EndPointsURL(), []);

    const exportOptions: ExportOption[] = [
        {
            titulo: "Backup total PostgreSQL",
            descripcion: "Generar un archivo técnico único con esquema y datos completos de la base de datos",
            icono: FaDatabase,
            config: {
                tituloModal: "Confirmar exportación total PostgreSQL",
                alertDescripcion:
                    "Se generará un archivo técnico de respaldo en formato .dump con el esquema y los datos " +
                    "completos de la base usada por la aplicación. Este archivo no está pensado para editarse " +
                    "manualmente ni para abrirse en Excel; su uso es restauración o migración técnica.",
                endpointUrl: endpoints.exportacion_backup_total_create_job,
                defaultFilename: "backup_total_postgresql.dump",
                blobMimeType: "application/octet-stream",
                successDescription:
                    "El backup total PostgreSQL se ha descargado correctamente.",
                asyncJob: {
                    createJobUrl: endpoints.exportacion_backup_total_create_job,
                    getJobUrl: (jobId) => endpoints.exportacionBackupTotalJob(jobId),
                    downloadUrl: (jobId) => endpoints.exportacionBackupTotalDownload(jobId),
                    deleteJobUrl: (jobId) => endpoints.exportacionBackupTotalJob(jobId),
                    pollingIntervalMs: 2000,
                },
            },
        },
        {
            titulo: "Materiales",
            descripcion: "Exportar datos de materiales registrados en el sistema",
            icono: FaCube,
            config: {
                tituloModal: "Confirmar exportación de materiales",
                alertDescripcion:
                    "Se exportará la información completa de los materiales registrados en el sistema. " +
                    "El archivo Excel tendrá una estructura compatible con la carga masiva de materiales.",
                endpointUrl: endpoints.exportacion_materiales_excel,
                defaultFilename: "exportacion_materiales.xlsx",
                successDescription: "El archivo Excel de materiales se ha descargado correctamente.",
            },
        },
        {
            titulo: "Terminado",
            descripcion: "Exportar datos de productos terminados",
            icono: FaCubes,
            config: {
                tituloModal: "Confirmar exportación de productos terminados",
                alertDescripcion:
                    'Se exportará la información de los productos terminados en formato "sin insumos" ' +
                    "(sin lista de insumos, proceso de producción ni case pack). El archivo Excel tendrá " +
                    "una estructura compatible con la carga masiva de terminados sin insumos.",
                endpointUrl: endpoints.exportacion_terminados_excel,
                defaultFilename: "exportacion_terminados.xlsx",
                successDescription: "El archivo Excel de productos terminados se ha descargado correctamente.",
            },
        },
        {
            titulo: "Terminado con insumos",
            descripcion: "Exportar terminados con su lista de insumos en formato JSON",
            icono: FaCodeBranch,
            config: {
                tituloModal: "Confirmar exportación de terminados con insumos",
                alertDescripcion:
                    "Se exportará un archivo JSON técnico con los metadatos del producto terminado y " +
                    "su lista de insumos. Este formato está pensado para intercambio técnico y no " +
                    "para edición manual en Excel.",
                endpointUrl: endpoints.exportacion_terminados_json_con_insumos,
                defaultFilename: "exportacion_terminados_con_insumos.json",
                blobMimeType: "application/json",
                successDescription:
                    "El archivo JSON de productos terminados con insumos se ha descargado correctamente.",
            },
        },
        {
            titulo: "Proveedores",
            descripcion: "Exportar proveedores con sus contactos en formato JSON",
            icono: FaTruck,
            config: {
                tituloModal: "Confirmar exportación de proveedores",
                alertDescripcion:
                    "Se exportará un archivo JSON con los datos de todos los proveedores registrados, " +
                    "incluyendo su lista de contactos anidada. Este formato está pensado para " +
                    "intercambio técnico entre sistemas.",
                endpointUrl: endpoints.exportacion_proveedores_json_con_contactos,
                defaultFilename: "exportacion_proveedores.json",
                blobMimeType: "application/json",
                successDescription:
                    "El archivo JSON de proveedores con contactos se ha descargado correctamente.",
            },
        },
    ];

    return (
        <Container maxW="container.xl" py={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                {exportOptions.map((opt) => (
                    <EntidadExportSelectCard
                        key={opt.titulo}
                        titulo={opt.titulo}
                        descripcion={opt.descripcion}
                        icono={opt.icono}
                        onClick={() => setActiveConfig(opt.config)}
                    />
                ))}
            </SimpleGrid>

            <ConfirmarExportacionModal
                isOpen={activeConfig !== null}
                config={activeConfig}
                onClose={() => setActiveConfig(null)}
                onConfirm={() => setActiveConfig(null)}
            />
        </Container>
    );
}

export default ExportacionDatosTab;
