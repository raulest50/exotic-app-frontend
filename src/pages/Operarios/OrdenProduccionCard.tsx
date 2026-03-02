// src/components/OrdenProduccionCard.tsx

import React, { useState } from 'react';
import {
    Box,
    Flex,
    HStack,
    Text,
    Badge,
    Button,
} from "@chakra-ui/react";
import { OrdenProduccionDTO } from "./types.tsx";
import { format } from 'date-fns';
import axios from 'axios';
import EndPointsURL from '../../api/EndPointsURL';

interface OrdenProduccionCardProps {
    ordenProduccion: OrdenProduccionDTO;
}

const endPoints = new EndPointsURL();

const OrdenProduccionCard: React.FC<OrdenProduccionCardProps> = ({ ordenProduccion }) => {
    const [orden, setOrden] = useState<OrdenProduccionDTO>(ordenProduccion);

    const getEstadoOrdenInfo = (estado: number): { label: string; colorScheme: string } => {
        switch (estado) {
            case 0:
                return { label: 'En Producción', colorScheme: 'blue' };
            case 1:
                return { label: 'Terminada', colorScheme: 'green' };
            default:
                return { label: 'Desconocido', colorScheme: 'gray' };
        }
    };

    const handleFinishOrdenProduccion = async () => {
        try {
            const response = await axios.put<OrdenProduccionDTO>(
                endPoints.orden_produccion_update_estado.replace("{id}", orden.ordenId.toString()),
                null,
                { params: { estadoOrden: 1 } }
            );
            setOrden(response.data);
        } catch (error) {
            console.error('Error updating OrdenProduccion', error);
        }
    };

    const estadoOrdenInfo = getEstadoOrdenInfo(orden.estadoOrden);

    return (
        <Box borderWidth="1px" borderRadius="lg" p={4} mb={4} boxShadow="sm">
            <Flex direction="column">
                <HStack spacing={4}>
                    <Text fontWeight="bold">Orden ID:</Text>
                    <Text>{orden.ordenId}</Text>
                    <Text fontWeight="bold">Producto:</Text>
                    <Text>{orden.productoNombre}</Text>
                    <Text fontWeight="bold">Fecha Creación:</Text>
                    <Text>{format(new Date(orden.fechaInicio), 'dd/MM/yyyy HH:mm')}</Text>
                    <Badge colorScheme={estadoOrdenInfo.colorScheme}>{estadoOrdenInfo.label}</Badge>
                </HStack>

                <Flex justify="flex-end" mt={2}>
                    <Button
                        colorScheme="green"
                        size="sm"
                        onClick={handleFinishOrdenProduccion}
                        isDisabled={orden.estadoOrden === 1}
                    >
                        Reportar Orden Produccion Terminada
                    </Button>
                </Flex>
            </Flex>
        </Box>
    );
};

export default OrdenProduccionCard;
