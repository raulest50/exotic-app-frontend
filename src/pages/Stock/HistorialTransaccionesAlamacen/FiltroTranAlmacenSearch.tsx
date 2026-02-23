import { useState } from 'react';
import {
    Box,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Select,
    VStack,
    Alert,
    AlertIcon,
    Divider,
    Grid,
} from '@chakra-ui/react';
import DateRangePicker from '../../../components/DateRangePicker.tsx';
import { FiltroHistorialTransaccionAlmacenDTO, TIPO_ENTIDAD_CAUSANTE_OPTIONS } from './types';

interface Props {
    onBuscar: (filtro: FiltroHistorialTransaccionAlmacenDTO) => void;
    onLimpiar?: () => void;
}

export default function FiltroTranAlmacenSearch({ onBuscar, onLimpiar }: Props) {
    const [tipoEntidadCausante, setTipoEntidadCausante] = useState<string>('');
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const validarFormulario = (): boolean => {
        setErrorMessage('');

        if (!tipoEntidadCausante) {
            setErrorMessage('Debe seleccionar un tipo de entidad causante');
            return false;
        }

        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            setErrorMessage('La fecha de inicio no puede ser posterior a la fecha de fin');
            return false;
        }

        return true;
    };

    const handleBuscar = () => {
        if (!validarFormulario()) return;

        const filtro: FiltroHistorialTransaccionAlmacenDTO = {
            tipoEntidadCausante,
            fechaInicio: fechaInicio || null,
            fechaFin: fechaFin || null,
            page: 0,
            size: 10,
        };

        onBuscar(filtro);
    };

    const handleLimpiar = () => {
        setTipoEntidadCausante('');
        setFechaInicio('');
        setFechaFin('');
        setErrorMessage('');
        onLimpiar?.();
    };

    return (
        <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
            <Heading size="md" mb={6}>
                Filtros de Búsqueda de Transacciones de Almacén
            </Heading>

            {errorMessage && (
                <Alert status="error" mb={4}>
                    <AlertIcon />
                    {errorMessage}
                </Alert>
            )}

            <VStack spacing={6} align="stretch">
                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Tipo de Transacción (Entidad Causante)
                    </FormLabel>
                    <Grid templateColumns="repeat(12, 1fr)" gap={4} alignItems="end">
                        <FormControl gridColumn="span 6">
                            <Select
                                placeholder="Seleccione un tipo..."
                                value={tipoEntidadCausante}
                                onChange={(e) => setTipoEntidadCausante(e.target.value)}
                            >
                                {TIPO_ENTIDAD_CAUSANTE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Box>

                <Divider />

                <Box>
                    <FormLabel fontWeight="bold" mb={3}>
                        Rango de Fechas (opcional)
                    </FormLabel>
                    <DateRangePicker
                        date1={fechaInicio}
                        setDate1={setFechaInicio}
                        date2={fechaFin}
                        setDate2={setFechaFin}
                        flex_direction="row"
                    />
                </Box>

                <Divider />

                <Flex justify="flex-end" gap={4} mt={4}>
                    <Button colorScheme="gray" onClick={handleLimpiar}>
                        Limpiar
                    </Button>
                    <Button colorScheme="blue" onClick={handleBuscar}>
                        Buscar
                    </Button>
                </Flex>
            </VStack>
        </Box>
    );
}
