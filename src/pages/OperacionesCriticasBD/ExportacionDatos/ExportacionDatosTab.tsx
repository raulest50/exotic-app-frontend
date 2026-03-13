
import { SimpleGrid, Container } from '@chakra-ui/react';
import { useState } from 'react';
import { FaCube, FaCodeBranch } from 'react-icons/fa';
import { FaCubes } from 'react-icons/fa6';
import ConfirmarExportacionMaterialesModal from './ConfirmarExportacionMaterialesModal';
import ConfirmarExportacionTerminadosConInsumosModal from './ConfirmarExportacionTerminadosConInsumosModal';
import ConfirmarExportacionTerminadosModal from './ConfirmarExportacionTerminadosModal';
import EntidadExportSelectCard from './EntidadExportSelectCard';

interface ExportacionDatosTabProps {}

function ExportacionDatosTab(_props:ExportacionDatosTabProps) {
    const [isModalMaterialesOpen, setIsModalMaterialesOpen] = useState(false);
    const [isModalTerminadosOpen, setIsModalTerminadosOpen] = useState(false);
    const [isModalTerminadosConInsumosOpen, setIsModalTerminadosConInsumosOpen] = useState(false);

    return (
        <Container maxW="container.xl" py={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                <EntidadExportSelectCard
                    titulo="Materiales"
                    descripcion="Exportar datos de materiales registrados en el sistema"
                    icono={FaCube}
                    onClick={() => setIsModalMaterialesOpen(true)}
                />
                <EntidadExportSelectCard
                    titulo="Terminado"
                    descripcion="Exportar datos de productos terminados"
                    icono={FaCubes}
                    onClick={() => setIsModalTerminadosOpen(true)}
                />
                <EntidadExportSelectCard
                    titulo="Terminado con insumos"
                    descripcion="Exportar terminados con su lista de insumos en formato JSON"
                    icono={FaCodeBranch}
                    onClick={() => setIsModalTerminadosConInsumosOpen(true)}
                />
            </SimpleGrid>

            <ConfirmarExportacionMaterialesModal
                isOpen={isModalMaterialesOpen}
                onClose={() => setIsModalMaterialesOpen(false)}
                onConfirm={() => setIsModalMaterialesOpen(false)}
            />
            <ConfirmarExportacionTerminadosModal
                isOpen={isModalTerminadosOpen}
                onClose={() => setIsModalTerminadosOpen(false)}
                onConfirm={() => setIsModalTerminadosOpen(false)}
            />
            <ConfirmarExportacionTerminadosConInsumosModal
                isOpen={isModalTerminadosConInsumosOpen}
                onClose={() => setIsModalTerminadosConInsumosOpen(false)}
                onConfirm={() => setIsModalTerminadosConInsumosOpen(false)}
            />
        </Container>
    );
}

export default ExportacionDatosTab;
