import { useEffect, useState } from 'react';
import { Badge, Box, Button, Text, VStack } from '@chakra-ui/react';
import axios from 'axios';
import IntegrantePersonalPicker from './IntegrantePersonalPicker.tsx';
import {
    EstadoIntegrante,
    getEstadoIntegranteText,
    IntegrantePersonal,
} from '../../../pages/Personal/types.tsx';

const integrantesMock: IntegrantePersonal[] = [
    {
        id: 10101010,
        nombres: 'Laura',
        apellidos: 'Rojas Peña',
        celular: '3001112233',
        direccion: 'Calle 10 # 20-30',
        cargo: 'Analista RH',
        departamento: 'ADMINISTRATIVO',
        estado: EstadoIntegrante.ACTIVO,
    },
    {
        id: 20202020,
        nombres: 'Carlos',
        apellidos: 'Mejía Torres',
        celular: '3002223344',
        direccion: 'Carrera 5 # 15-40',
        cargo: 'Operario',
        departamento: 'PRODUCCION',
        estado: EstadoIntegrante.ACTIVO,
    },
    {
        id: 30303030,
        nombres: 'María',
        apellidos: 'Gómez Díaz',
        celular: '3003334455',
        direccion: 'Transversal 8 # 12-60',
        cargo: 'Auxiliar',
        departamento: 'PRODUCCION',
        estado: EstadoIntegrante.INACTIVO,
    },
];

export const Default = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIntegrante, setSelectedIntegrante] = useState<IntegrantePersonal | null>(null);

    useEffect(() => {
        const originalGet = axios.get;
        axios.get = (async () => ({
            data: {
                content: integrantesMock,
                number: 0,
                totalPages: 1,
                totalElements: integrantesMock.length,
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
        })) as unknown as typeof axios.get;

        return () => {
            axios.get = originalGet;
        };
    }, []);

    return (
        <VStack spacing={4} align="start" p={5}>
            <Button colorScheme="blue" onClick={() => setIsOpen(true)}>
                Abrir selector de integrante
            </Button>

            {selectedIntegrante ? (
                <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" width="100%">
                    <Text fontWeight="bold">Integrante seleccionado:</Text>
                    <Text>Cédula: {selectedIntegrante.id}</Text>
                    <Text>
                        Nombre: {selectedIntegrante.nombres} {selectedIntegrante.apellidos}
                    </Text>
                    <Text>Cargo: {selectedIntegrante.cargo ?? '-'}</Text>
                    <Text>Departamento: {selectedIntegrante.departamento ?? '-'}</Text>
                    <Badge colorScheme="green">{getEstadoIntegranteText(selectedIntegrante.estado)}</Badge>
                </Box>
            ) : (
                <Text>Sin integrante seleccionado</Text>
            )}

            <IntegrantePersonalPicker
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSelectIntegrante={setSelectedIntegrante}
                initialSelectedId={selectedIntegrante?.id}
            />
        </VStack>
    );
};

export default {
    title: 'Components/Pickers/IntegrantePersonalPicker',
    component: IntegrantePersonalPicker,
};
