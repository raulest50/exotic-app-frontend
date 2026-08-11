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
import {RecursoProduccion} from '../../types.tsx';
import MyPagination from '../../../../components/MyPagination.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (recursos: RecursoProduccion[]) => void;
  alreadySelected: RecursoProduccion[];
}

export default function RecursoProduccionPicker({isOpen, onClose, onConfirm, alreadySelected}: Props){
  const endpoints = new EndPointsURL();
  const [searchText, setSearchText] = useState('');
  const [available, setAvailable] = useState<RecursoProduccion[]>([]);
  const [selected, setSelected] = useState<RecursoProduccion[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  const fetchAvailable = async (pageNumber:number) => {
    setLoading(true);
    const dto = {tipoBusqueda: 'POR_NOMBRE', valorBusqueda: searchText, page: pageNumber, size: pageSize};
    try{
      const res = await axios.post(endpoints.search_recurso_produccion, dto);
      let list:RecursoProduccion[] = res.data.content || [];
      const ids = new Set([...alreadySelected, ...selected].map(r=>r.id));
      list = list.filter(r=>!ids.has(r.id));
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

  const handleAdd = (r:RecursoProduccion) => {
    setSelected([...selected, r]);
    setAvailable(available.filter(a=>a.id!==r.id));
  };

  const handleRemove = (r:RecursoProduccion) => {
    const newSel = selected.filter(a=>a.id!==r.id);
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
            <Dialog.Header>Seleccionar Recursos de Producción</Dialog.Header>
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
                      {available.map(r=> (
                        <Table.Row key={r.id}>
                          <Table.Cell>{r.id}</Table.Cell>
                          <Table.Cell>{r.nombre}</Table.Cell>
                          <Table.Cell><Button size='xs' onClick={()=>handleAdd(r)}>+</Button></Table.Cell>
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
                      {selected.map(r=> (
                        <Table.Row key={r.id}>
                          <Table.Cell>{r.id}</Table.Cell>
                          <Table.Cell>{r.nombre}</Table.Cell>
                          <Table.Cell><Button size='xs' colorPalette='red' onClick={()=>handleRemove(r)}>-</Button></Table.Cell>
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

