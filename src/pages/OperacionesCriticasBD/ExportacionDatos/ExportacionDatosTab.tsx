
import { SimpleGrid, Container } from '@chakra-ui/react';
import { useState } from 'react';
import { FaCube } from 'react-icons/fa';
import { FaCubes } from 'react-icons/fa6';
import ConfirmarExportacionMaterialesModal from './ConfirmarExportacionMaterialesModal';
import EntidadExportSelectCard from './EntidadExportSelectCard';

interface ExportacionDatosTabProps {}

function ExportacionDatosTab(_props:ExportacionDatosTabProps) {
    const [isModalMaterialesOpen, setIsModalMaterialesOpen] = useState(false);

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
                />
            </SimpleGrid>

            <ConfirmarExportacionMaterialesModal
                isOpen={isModalMaterialesOpen}
                onClose={() => setIsModalMaterialesOpen(false)}
                onConfirm={() => setIsModalMaterialesOpen(false)}
            />
        </Container>
    );
}

export default ExportacionDatosTab;
