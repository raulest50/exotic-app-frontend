import { Steps, Box, Button, Flex, Heading, Input, Field } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import {useState} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {RecursoProduccion} from '../../types.tsx';
import RPAFmanager from './RPAFmanager.tsx';
import {ActivoFijo} from '../../../ActivosFijos/types.tsx';

interface Props {
  recurso: RecursoProduccion;
  setEstado: (estado:number)=>void;
  refreshSearch?: ()=>void;
}

export default function DetalleModRecProd({recurso, setEstado, refreshSearch}:Props){
  const [editMode, setEditMode] = useState(false);
  const [recursoData, setRecursoData] = useState<RecursoProduccion>({...recurso});
  const toast = useAppToast();
  const endpoints = new EndPointsURL();

  const handleSave = async () => {
    const dto = {oldRecursoProduccion: recurso, newRecursoProduccion: recursoData};
    try{
      await axios.put(endpoints.update_recurso_produccion, dto);
      setEditMode(false);
      toast({title:'Recurso actualizado',status:'success',duration:3000,isClosable:true});
      if(refreshSearch) refreshSearch();
    }catch(e){
      toast({title:'Error al actualizar recurso',status:'error',duration:3000,isClosable:true});
    }
  };

  const handleActivosChange = (afs: ActivoFijo[]) => {
    setRecursoData({...recursoData, activosFijos: afs});
  };

  const handleBack = () => {
    setEstado(0);
    if(refreshSearch) refreshSearch();
  };

  return (
    <Box p={4}>
      <Button mb={4} onClick={handleBack}>Volver</Button>
      <Heading size='md' mb={4}>Detalle Recurso Producción</Heading>
      <Field.Root mb={4} required>
        <Field.Label>Nombre</Field.Label>
        <Input value={recursoData.nombre} onValueChange={e=>setRecursoData({...recursoData, nombre:e.target.value})} disabled={!editMode} />
      </Field.Root>
      <Field.Root mb={4} required>
        <Field.Label>Descripción</Field.Label>
        <Input value={recursoData.descripcion} onValueChange={e=>setRecursoData({...recursoData, descripcion:e.target.value})} disabled={!editMode} />
      </Field.Root>
      <RPAFmanager recursoId={recursoData.id} activos={recursoData.activosFijos || []} onChange={handleActivosChange} editMode={editMode} />
      <Flex mt={4} gap={2}>
        {editMode ? (
          <>
            <Button colorPalette='teal' onClick={handleSave}>Guardar</Button>
            <Button onClick={()=>{setEditMode(false); setRecursoData({...recurso});}}>Cancelar</Button>
          </>
        ) : (
          <Button onClick={()=>setEditMode(true)}>Editar</Button>
        )}
      </Flex>
    </Box>
  );
}
