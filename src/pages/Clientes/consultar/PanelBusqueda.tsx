import { useState } from 'react';
import {
    Flex, FormControl, FormLabel, Input, Button, Box, Select, useToast
} from '@chakra-ui/react';
import MyPagination from '../../../components/MyPagination.tsx';
import { ListaSearchClientes } from './panel_busqueda_comp/ListaSearchClientes.tsx';
import axios from 'axios';
import EndPointsURL from '../../../api/EndPointsURL.tsx';
import { Cliente, DTO_SearchCliente, SearchType } from '../types.tsx';

interface Props{
    setEstado: (estado:number)=>void;
    setClienteSeleccionado: (c:Cliente)=>void;
}

export default function PanelBusqueda({setEstado, setClienteSeleccionado}:Props){
    const [searchType, setSearchType] = useState<SearchType>(SearchType.ID);
    const [id, setId] = useState('');
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const endPoints = new EndPointsURL();
    const toast = useToast();
    const pageSize = 10;

    const handleSearch = async (pageNumber:number) => {
        setLoading(true);
        setPage(pageNumber);
        try{
            const dto: DTO_SearchCliente = {
                id: searchType===SearchType.ID? Number(id) : null,
                nombre: searchType===SearchType.NOMBRE_O_EMAIL? nombre||null : null,
                email: searchType===SearchType.NOMBRE_O_EMAIL? email||null : null,
                searchType
            };
            const resp = await axios.post(endPoints.search_clientes_pag, dto, {params:{page:pageNumber,size:pageSize}});
            setClientes(resp.data.content);
            setTotalPages(resp.data.totalPages);
        }catch(err){
            toast({title:'Error al buscar', status:'error', duration:4000, isClosable:true});
            setClientes([]); setTotalPages(1);
        }finally{
            setLoading(false);
        }
    };

    const verDetalle = (c:Cliente)=>{
        setClienteSeleccionado(c);
        setEstado(1);
    };

    return (
        <Flex direction='column' p={4}>
            <Box p={4} borderWidth='1px' borderRadius='lg' mb={4}>
                {searchType===SearchType.ID ? (
                    <FormControl mb={4}>
                        <FormLabel>ID Cliente</FormLabel>
                        <Input value={id} onChange={e=>setId(e.target.value)} />
                    </FormControl>
                ) : (
                    <>
                        <FormControl mb={4}>
                            <FormLabel>Nombre</FormLabel>
                            <Input value={nombre} onChange={e=>setNombre(e.target.value)} />
                        </FormControl>
                        <FormControl mb={4}>
                            <FormLabel>Correo Electrónico</FormLabel>
                            <Input value={email} onChange={e=>setEmail(e.target.value)} />
                        </FormControl>
                    </>
                )}
                <Flex gap={4} align='center'>
                    <FormControl flex={1}>
                        <FormLabel>Tipo de búsqueda</FormLabel>
                        <Select value={searchType} onChange={e=>setSearchType(e.target.value as SearchType)}>
                            <option value={SearchType.ID}>ID</option>
                            <option value={SearchType.NOMBRE_O_EMAIL}>Nombre o Correo</option>
                        </Select>
                    </FormControl>
                    <Button colorScheme='blue' onClick={()=>handleSearch(0)} isLoading={loading} flex={1} mt={6}>Buscar</Button>
                </Flex>
            </Box>
            <Box mb={4}>
                <ListaSearchClientes clientes={clientes} onVerDetalle={verDetalle}/>
            </Box>
            {totalPages>1 && (
                <MyPagination page={page} totalPages={totalPages} loading={loading} handlePageChange={handleSearch}/>
            )}
        </Flex>
    );
}
