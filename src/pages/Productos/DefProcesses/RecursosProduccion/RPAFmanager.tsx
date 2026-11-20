import { Box, Button, Field, Flex, Input, Table, Text } from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import {useState} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {ActivoFijo} from '../../../ActivosFijos/types.tsx';
import AFpickerRP from './AFpickerRP.tsx';

interface Props {
  recursoId?: number;
  activos: ActivoFijo[];
  onChange: (activos: ActivoFijo[]) => void;
  editMode?: boolean;
}

export default function RPAFmanager({recursoId, activos, onChange, editMode = true}: Props){
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [savingCodeId, setSavingCodeId] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<{ id: string; message: string } | null>(null);
  const toast = useAppToast();
  const endpoints = new EndPointsURL();

  const saveCode = async (af: ActivoFijo) => {
    if (savingCodeId || !editMode) return;
    setSavingCodeId(af.id); setCodeError(null);
    try {
      const url = endpoints.update_activo_fijo_codigo_lote_fabricacion.replace('{id}', encodeURIComponent(af.id));
      const codigoLoteFabricacion = (codeDrafts[af.id] ?? af.codigoLoteFabricacion ?? '').trim().toUpperCase() || null;
      const { data: saved } = await axios.put<Pick<ActivoFijo, 'id' | 'codigoLoteFabricacion'>>(url, { codigoLoteFabricacion }, { withCredentials: true });
      onChange(activos.map(item => item.id === af.id ? { ...item, codigoLoteFabricacion: saved.codigoLoteFabricacion } : item));
      setCodeDrafts(current => ({ ...current, [af.id]: saved.codigoLoteFabricacion ?? '' }));
      toast({ title: 'Código del equipo guardado', status: 'success' });
    } catch (error) {
      const body: unknown = axios.isAxiosError(error) ? error.response?.data : null;
      const detail = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      const message = [detail.detail, detail.mensaje, detail.message, detail.error].find(value => typeof value === 'string' && value.trim());
      setCodeError({ id: af.id, message: typeof message === 'string' ? message : 'No se pudo guardar el código. Revisa si otro activo ya lo utiliza.' });
    } finally { setSavingCodeId(null); }
  };

  const unassignActivo = async (af: ActivoFijo) => {
    if(!recursoId) return;
    try{
      const getUrl = endpoints.get_activo_fijo.replace('{id}', af.id);
      const updUrl = endpoints.update_activo_fijo.replace('{id}', af.id);
      const res = await axios.get(getUrl);
      const full = res.data;
      full.tipoRecurso = null;
      await axios.put(updUrl, full);
    }catch(e){
      toast({title:'Error al desasignar activo', status:'error'});
    }
  };

  const handleRemove = async (af: ActivoFijo) => {
    if(recursoId){
      await unassignActivo(af);
    }
    onChange(activos.filter(a => a.id !== af.id));
  };

  const assignActivos = async (lista: ActivoFijo[]) => {
    if(recursoId){
      for(const af of lista){
        try{
          const getUrl = endpoints.get_activo_fijo.replace('{id}', af.id);
          const updUrl = endpoints.update_activo_fijo.replace('{id}', af.id);
          const res = await axios.get(getUrl);
          const full = res.data;
          full.tipoRecurso = {id: recursoId};
          await axios.put(updUrl, full);
        }catch(e){
          toast({title:'Error al asignar activo', status:'error'});
        }
      }
    }
    onChange([...activos, ...lista]);
  };

  return (
    <Box>
      <Flex justify="space-between" mb={2}>
        <Button colorPalette='teal' size='sm' onClick={()=>setIsPickerOpen(true)} disabled={!editMode || !!savingCodeId}>Agregar Activo Fijo</Button>
      </Flex>
      <Table.ScrollArea><Table.Root size='sm'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
            <Table.ColumnHeader>Código de lote OF</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {activos.map(af=> (
            <Table.Row key={af.id}>
              <Table.Cell>{af.id}</Table.Cell>
              <Table.Cell>{af.nombre}</Table.Cell>
              <Table.Cell minW="220px">
                {editMode ? <Field.Root invalid={codeError?.id === af.id}>
                  <Field.Label fontSize="xs">Código del equipo {af.nombre}</Field.Label>
                  <Flex gap={2} flexWrap="wrap"><Input size="sm" maxLength={255} flex="1" minW="80px" value={codeDrafts[af.id] ?? af.codigoLoteFabricacion ?? ''}
                    disabled={!!savingCodeId} onChange={event => setCodeDrafts(current => ({ ...current, [af.id]: event.target.value }))} placeholder="Ej. 01" />
                    <Button size="sm" variant="outline" disabled={!!savingCodeId || (codeDrafts[af.id] ?? af.codigoLoteFabricacion ?? '').trim() === (af.codigoLoteFabricacion ?? '')}
                      loading={savingCodeId === af.id} onClick={() => void saveCode(af)}>Guardar código</Button></Flex>
                  <Field.HelperText>Único. Para identificar lotes OF debe contener dos dígitos. Este botón guarda el código inmediatamente.</Field.HelperText>
                  {codeError?.id === af.id && <Field.ErrorText>{codeError.message}</Field.ErrorText>}
                </Field.Root> : <Text>{af.codigoLoteFabricacion || 'Sin configurar'}</Text>}
              </Table.Cell>
              <Table.Cell><Button size='xs' colorPalette='red' onClick={()=>handleRemove(af)} disabled={!editMode || !!savingCodeId}>Remover</Button></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root></Table.ScrollArea>
      <AFpickerRP
        isOpen={isPickerOpen}
        onClose={()=>setIsPickerOpen(false)}
        onConfirm={(sel)=>{assignActivos(sel); setIsPickerOpen(false);}}
        alreadySelected={activos}
      />
    </Box>
  );
}
