import {
  Box,
  Button,
  Flex,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Dialog,
  Portal,
} from '@chakra-ui/react';
import {useEffect, useState} from 'react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import {ActivoFijo} from '../../../ActivosFijos/types.tsx';
import MyPagination from '../../../../components/MyPagination.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (activos: ActivoFijo[]) => void;
  alreadySelected: ActivoFijo[];
}

export default function AFpickerRP({isOpen, onClose, onConfirm, alreadySelected}: Props){
  const endpoints = new EndPointsURL();
  const [searchText, setSearchText] = useState('');
  const [available, setAvailable] = useState<ActivoFijo[]>([]);
  const [selected, setSelected] = useState<ActivoFijo[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const fetchAvailable = async (pageNumber:number) => {
    setLoading(true);
    const dto = {nombreBusqueda: searchText, page: pageNumber, size: pageSize};
    try{
      const res = await axios.post(endpoints.activos_fijos_disponibles_rp, dto);
      let list:ActivoFijo[] = res.data.content || [];
      const ids = new Set([...alreadySelected, ...selected].map(a=>a.id));
      list = list.filter(a=>!ids.has(a.id));
      setAvailable(list);
      setTotalPages(res.data.totalPages);
      setPage(pageNumber);
    }catch(e){
      setAvailable([]);
      setTotalPages(1);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{ if(isOpen) fetchAvailable(0); }, [isOpen]);

  const handleAdd = (af:ActivoFijo) => {
    setSelected([...selected, af]);
    setAvailable(available.filter(a=>a.id!==af.id));
  };

  const handleRemove = (af:ActivoFijo) => {
    const newSel = selected.filter(a=>a.id!==af.id);
    setSelected(newSel);
    fetchAvailable(page);
  };

  const handleAccept = () => {
    onConfirm(selected);
    setSelected([]);
    setAvailable([]);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>Seleccionar Activos Fijos</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Flex gap={4}>
                <Box flex={1}>
                  <Flex mb={2} gap={2}>
                    <Input
                      placeholder='Buscar'
                      value={searchText}
                      onChange={(e)=>setSearchText(e.target.value)}
                      onKeyDown={(e)=>{
                        if(e.key==='Enter'){
                          fetchAvailable(0);
                        }
                      }}
                    />
                    <Button
                      onClick={()=>fetchAvailable(0)}
                      loading={loading}
                      loadingText="Buscando..."
                    >
                      Buscar
                    </Button>
                  </Flex>
                  <Table.Root size='sm'>
                    <Table.Header><Table.Row><Table.ColumnHeader>ID</Table.ColumnHeader><Table.ColumnHeader>Nombre</Table.ColumnHeader><Table.ColumnHeader></Table.ColumnHeader></Table.Row></Table.Header>
                    <Table.Body>
                      {available.map(af=> (
                        <Table.Row key={af.id}>
                          <Table.Cell>{af.id}</Table.Cell>
                          <Table.Cell>{af.nombre}</Table.Cell>
                          <Table.Cell><Button size='xs' onClick={()=>handleAdd(af)}>+</Button></Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                  {totalPages>1 && (
                    <MyPagination page={page} totalPages={totalPages} loading={loading} handlePageChange={fetchAvailable} />
                  )}
                </Box>
                <Box flex={1}>
                  <Table.Root size='sm'>
                    <Table.Header><Table.Row><Table.ColumnHeader>ID</Table.ColumnHeader><Table.ColumnHeader>Nombre</Table.ColumnHeader><Table.ColumnHeader></Table.ColumnHeader></Table.Row></Table.Header>
                    <Table.Body>
                      {selected.map(af=> (
                        <Table.Row key={af.id}>
                          <Table.Cell>{af.id}</Table.Cell>
                          <Table.Cell>{af.nombre}</Table.Cell>
                          <Table.Cell><Button size='xs' colorPalette='red' onClick={()=>handleRemove(af)}>-</Button></Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </Box>
              </Flex>
            </Dialog.Body>
            <Dialog.Footer>
              <Button mr={3} onClick={onClose}>Cancelar</Button>
              <Button colorPalette='teal' onClick={handleAccept}>Aceptar</Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
}
