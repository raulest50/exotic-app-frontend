import {useState} from 'react';
import {
  Box,
  Button,
  Flex,
  Input,
  NativeSelect,
  Table,
  Field,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL.tsx';
import MyPagination from '../../../../components/MyPagination.tsx';
import DetalleModRecProd from './DetalleModRecProd.tsx';
import {RecursoProduccion} from '../../types.tsx';

enum TipoBusqueda{ ID='POR_ID', NOMBRE='POR_NOMBRE' }

export default function ConsultaRecursosProduccion(){
  const [estado, setEstado] = useState(0);
  const [recursoSel, setRecursoSel] = useState<RecursoProduccion>();
  const [refreshFn, setRefreshFn] = useState<()=>void>(()=>()=>{});

  if(estado===1 && recursoSel){
    return <DetalleModRecProd recurso={recursoSel} setEstado={setEstado} refreshSearch={refreshFn} />;
  }

  return <PanelBusqueda setEstado={setEstado} setRecursoSel={setRecursoSel} setRefreshFn={setRefreshFn}/>;
}

type PanelProps = {
  setEstado: (n:number)=>void;
  setRecursoSel: (r:RecursoProduccion)=>void;
  setRefreshFn: (fn:()=>void)=>void;
};

function PanelBusqueda({setEstado,setRecursoSel,setRefreshFn}:PanelProps){
  const [searchType, setSearchType] = useState<TipoBusqueda>(TipoBusqueda.ID);
  const [searchText, setSearchText] = useState('');
  const [recursos, setRecursos] = useState<RecursoProduccion[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const toast = useAppToast();
  const endpoints = new EndPointsURL();

  const fetchRecursos = async (pageNumber:number) => {
    setPage(pageNumber);
    const dto = {tipoBusqueda: searchType, valorBusqueda: searchText, page: pageNumber, size: pageSize};
    try{
      const res = await axios.post(endpoints.search_recurso_produccion, dto);
      setRecursos(res.data.content);
      setTotalPages(res.data.totalPages);
    }catch(e){
      toast({title:'Error al buscar', status:'error', duration:3000, isClosable:true});
      setRecursos([]);
      setTotalPages(1);
    }
  };

  const handleSearch = () => fetchRecursos(0);

  const verDetalles = (r:RecursoProduccion) => {
    setRecursoSel(r);
    setRefreshFn(()=>()=>fetchRecursos(page));
    setEstado(1);
  };

  return (
    <Flex direction="column" p={4} gap={4}>
      <Box p={4} borderWidth="1px" borderRadius="lg">
        <Flex gap={4} alignItems="end">
          <Field.Root flex={2}>
            <Field.Label>{searchType===TipoBusqueda.ID? 'ID' : 'Nombre'}</Field.Label>
            <Input
              value={searchText}
              onChange={e=>setSearchText(e.target.value)}
              onKeyDown={(e)=>{
                if(e.key==='Enter'){
                  handleSearch();
                }
              }}
            />
          </Field.Root>
          <Field.Root flex={1}>
            <Field.Label>Tipo de Búsqueda</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={searchType}
                onChange={e=>setSearchType(e.target.value as TipoBusqueda)}>
                <option value={TipoBusqueda.ID}>ID</option>
                <option value={TipoBusqueda.NOMBRE}>Nombre</option>
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>
          <Button colorPalette='blue' onClick={handleSearch}>Buscar</Button>
        </Flex>
      </Box>
      <Box>
        <Table.Root size='sm'>
          <Table.Header><Table.Row><Table.ColumnHeader>ID</Table.ColumnHeader><Table.ColumnHeader>Nombre</Table.ColumnHeader><Table.ColumnHeader>Descripción</Table.ColumnHeader><Table.ColumnHeader></Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {recursos.map(r=>(
              <Table.Row key={r.id}>
                <Table.Cell>{r.id}</Table.Cell>
                <Table.Cell>{r.nombre}</Table.Cell>
                <Table.Cell>{r.descripcion}</Table.Cell>
                <Table.Cell><Button size='xs' onClick={()=>verDetalles(r)}>Ver Detalles</Button></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      {totalPages>1 && (
        <MyPagination page={page} totalPages={totalPages} loading={false} handlePageChange={fetchRecursos} />
      )}
    </Flex>
  );
}

