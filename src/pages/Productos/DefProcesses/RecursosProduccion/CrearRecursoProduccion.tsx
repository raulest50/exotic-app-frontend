import {useState} from 'react';
import { Box, Button, Heading, Input, VStack, Field } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';

import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {RecursoProduccion} from '../../types.tsx';
import RPAFmanager from './RPAFmanager.tsx';
import {ActivoFijo} from '../../../ActivosFijos/types.tsx';

function CrearRecursoProduccion() {
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [activos, setActivos] = useState<ActivoFijo[]>([]);

    const toast = useAppToast();
    const endPoints = new EndPointsURL();

    const clearFields = () => {
        setNombre('');
        setDescripcion('');
        setActivos([]);
    };

    const handleSubmit = async () => {
        const recurso: RecursoProduccion = {
            nombre,
            descripcion,
        };
        try {
            const resp = await axios.post(endPoints.save_recurso_produccion, recurso);
            const saved: RecursoProduccion = resp.data;
            for(const af of activos){
                try{
                    const getUrl = endPoints.get_activo_fijo.replace('{id}', af.id);
                    const updUrl = endPoints.update_activo_fijo.replace('{id}', af.id);
                    const resAf = await axios.get(getUrl);
                    const fullAf = resAf.data;
                    fullAf.tipoRecurso = {id: saved.id};
                    await axios.put(updUrl, fullAf);
                }catch(err){
                    // ignore individual errors
                }
            }
            toast({
                title: 'Recurso creado',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            clearFields();
        } catch (e) {
            toast({
                title: 'Error al crear recurso',
                description: (e as Error).message,
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    return (
        <Box p={4}>
            <Heading size="md" mb={4}>Crear Recurso de Producción</Heading>
            <VStack gap={4} align="stretch">
                <Field.Root required>
                    <Field.Label>Nombre</Field.Label>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} bg="app.inputFilled" variant="subtle" borderRadius={0} />
                </Field.Root>
                <Field.Root required>
                    <Field.Label>Descripción</Field.Label>
                    <Input value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} bg="app.inputFilled" variant="subtle" borderRadius={0} />
                </Field.Root>
                <RPAFmanager activos={activos} onChange={setActivos} />
                <Button colorPalette="teal" onClick={handleSubmit}>Guardar</Button>
                <Button colorPalette="orange" onClick={clearFields}>Limpiar</Button>
            </VStack>
        </Box>
    );
}

export default CrearRecursoProduccion;

